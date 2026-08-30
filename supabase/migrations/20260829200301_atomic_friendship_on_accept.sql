create unique index if not exists friendships_unique_pair_idx on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

create or replace function public.zuno_create_friendship_on_accept()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.friendships (user_id, friend_id)
    values (new.sender_id, new.receiver_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friend_request_accept_creates_friendship on public.friend_requests;
create trigger trg_friend_request_accept_creates_friendship
after update of status on public.friend_requests
for each row
when (new.status = 'accepted' and old.status is distinct from 'accepted')
execute function public.zuno_create_friendship_on_accept();
