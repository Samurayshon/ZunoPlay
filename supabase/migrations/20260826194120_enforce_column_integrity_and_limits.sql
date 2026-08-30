-- Friend requests: receiver may only transition a pending request to accepted/rejected.
drop policy if exists "Users can accept friend requests" on public.friend_requests;
create policy "Users can respond to pending friend requests"
on public.friend_requests
for update
to authenticated
using (
  receiver_id = (select auth.uid())
  and status = 'pending'
)
with check (
  receiver_id = (select auth.uid())
  and status in ('accepted','rejected')
);

revoke update on table public.friend_requests from authenticated;
grant update (status) on table public.friend_requests to authenticated;

-- Message history: recipients may only mark read_at, never rewrite sender/content.
revoke update on table public.messages from authenticated;
grant update (read_at) on table public.messages to authenticated;

-- Notifications: clients may only mark read_at.
revoke update on table public.notifications from authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Communities: owner-editable fields only.
revoke update on table public.communities from authenticated;
grant update (name, description) on table public.communities to authenticated;

-- No current client workflow requires direct UPDATE of membership rows.
revoke update on table public.community_members from authenticated;
revoke update on table public.room_members from authenticated;

-- Server-side input limits matching the current UI.
alter table public.profiles drop constraint if exists profiles_username_length_chk;
alter table public.profiles add constraint profiles_username_length_chk check (char_length(btrim(username)) between 3 and 20);
alter table public.profiles drop constraint if exists profiles_bio_length_chk;
alter table public.profiles add constraint profiles_bio_length_chk check (bio is null or char_length(bio) <= 300);
alter table public.profiles drop constraint if exists profiles_avatar_url_length_chk;
alter table public.profiles add constraint profiles_avatar_url_length_chk check (avatar_url is null or char_length(avatar_url) <= 100000);

alter table public.messages drop constraint if exists messages_content_length_chk;
alter table public.messages add constraint messages_content_length_chk check (char_length(btrim(content)) between 1 and 2000);
alter table public.messages drop constraint if exists messages_no_self_chk;
alter table public.messages add constraint messages_no_self_chk check (sender_id <> receiver_id);

alter table public.room_messages drop constraint if exists room_messages_message_length_chk;
alter table public.room_messages add constraint room_messages_message_length_chk check (char_length(btrim(message)) between 1 and 500);

alter table public.communities drop constraint if exists communities_name_length_chk;
alter table public.communities add constraint communities_name_length_chk check (char_length(btrim(name)) between 3 and 60);
alter table public.communities drop constraint if exists communities_description_length_chk;
alter table public.communities add constraint communities_description_length_chk check (description is null or char_length(description) <= 500);

alter table public.friend_requests drop constraint if exists friend_requests_status_chk;
alter table public.friend_requests add constraint friend_requests_status_chk check (status in ('pending','accepted','rejected'));

-- Strengthen username trigger with server-side length validation.
create or replace function public.ensure_unique_profile_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is null or char_length(btrim(new.username)) not between 3 and 20 then
    raise exception 'invalid_username' using errcode = '23514';
  end if;

  if tg_op = 'INSERT'
     or lower(btrim(new.username)) is distinct from lower(btrim(old.username)) then
    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(btrim(p.username)) = lower(btrim(new.username))
    ) then
      raise exception 'username_already_exists' using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.ensure_unique_profile_username() from public, anon, authenticated;
