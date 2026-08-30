create or replace function public.zunoplay_protect_profile_sensitive_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.coins is distinct from old.coins or new.level is distinct from old.level then
      raise exception 'sensitive_profile_fields_are_server_managed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zunoplay_protect_profile_sensitive_fields_trigger on public.profiles;
create trigger zunoplay_protect_profile_sensitive_fields_trigger
before update on public.profiles
for each row execute function public.zunoplay_protect_profile_sensitive_fields();

create or replace function public.zunoplay_protect_room_member_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select exists(select 1 from public.rooms r where r.id = old.room_id and r.owner_id = v_uid) into v_is_owner;
  if v_is_owner and old.user_id <> v_uid then
    if new.room_id is distinct from old.room_id
       or new.user_id is distinct from old.user_id
       or new.joined_at is distinct from old.joined_at
       or new.last_seen_at is distinct from old.last_seen_at then
      raise exception 'owner_can_only_change_seat' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.user_id = v_uid then
    if new.room_id is distinct from old.room_id
       or new.user_id is distinct from old.user_id
       or new.joined_at is distinct from old.joined_at
       or new.seat_index is distinct from old.seat_index then
      raise exception 'member_can_only_touch_heartbeat' using errcode = '42501';
    end if;
    return new;
  end if;
  raise exception 'room_member_update_forbidden' using errcode = '42501';
end;
$$;

drop trigger if exists zunoplay_protect_room_member_updates_trigger on public.room_members;
create trigger zunoplay_protect_room_member_updates_trigger
before update on public.room_members
for each row execute function public.zunoplay_protect_room_member_updates();

create or replace function public.zunoplay_protect_message_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id
       or new.sender_id is distinct from old.sender_id
       or new.receiver_id is distinct from old.receiver_id
       or new.content is distinct from old.content
       or new.created_at is distinct from old.created_at then
      raise exception 'message_fields_are_immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zunoplay_protect_message_updates_trigger on public.messages;
create trigger zunoplay_protect_message_updates_trigger
before update on public.messages
for each row execute function public.zunoplay_protect_message_updates();

create or replace function public.zunoplay_protect_notification_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.type is distinct from old.type
       or new.title is distinct from old.title
       or new."message" is distinct from old."message"
       or new.related_id is distinct from old.related_id
       or new.related_user_id is distinct from old.related_user_id
       or new.created_at is distinct from old.created_at then
      raise exception 'notification_fields_are_immutable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zunoplay_protect_notification_updates_trigger on public.notifications;
create trigger zunoplay_protect_notification_updates_trigger
before update on public.notifications
for each row execute function public.zunoplay_protect_notification_updates();

drop policy if exists zunoplay_receive_authorized_broadcasts on realtime.messages;
create policy zunoplay_receive_authorized_broadcasts
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (
    realtime.topic() = ('user:' || (select auth.uid())::text || ':messages')
    or exists (
      select 1 from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() in (
          'room:' || rm.room_id::text || ':messages',
          'room:' || rm.room_id::text || ':voice',
          'room:' || rm.room_id::text || ':reactions',
          'room:' || rm.room_id::text || ':games'
        )
    )
  )
);

drop policy if exists zunoplay_send_authorized_room_interactions on realtime.messages;
create policy zunoplay_send_authorized_room_interactions
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and exists (
    select 1 from public.room_members rm
    where rm.user_id = (select auth.uid())
      and realtime.topic() in (
        'room:' || rm.room_id::text || ':reactions',
        'room:' || rm.room_id::text || ':games'
      )
  )
);

create or replace function public.cleanup_stale_room_members(p_room_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  delete from public.room_members rm
  where (p_room_id is null or rm.room_id = p_room_id)
    and rm.last_seen_at < pg_catalog.now() - interval '60 seconds';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.cleanup_stale_room_members(uuid) from public, anon, authenticated;

create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare v_member public.room_members;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  perform 1 from public.rooms where id=p_room_id;
  if not found then raise exception 'room_not_found' using errcode='P0002'; end if;
  delete from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id<>auth.uid() and rm.last_seen_at<pg_catalog.now()-interval '60 seconds';
  insert into public.room_members(room_id,user_id) values(p_room_id,auth.uid()) returning * into v_member;
  return v_member;
end;
$$;
