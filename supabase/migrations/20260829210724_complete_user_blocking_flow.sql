create or replace function public.block_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if target_user_id is null or target_user_id = me then raise exception 'invalid_target'; end if;
  if not exists(select 1 from public.profiles where id=target_user_id) then raise exception 'target_not_found'; end if;

  insert into public.user_blocks(blocker_id,blocked_id)
  values(me,target_user_id)
  on conflict (blocker_id,blocked_id) do nothing;

  delete from public.friendships
  where (user_id=me and friend_id=target_user_id)
     or (user_id=target_user_id and friend_id=me);

  delete from public.friend_requests
  where (sender_id=me and receiver_id=target_user_id)
     or (sender_id=target_user_id and receiver_id=me);

  return true;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  removed integer := 0;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if target_user_id is null or target_user_id = me then raise exception 'invalid_target'; end if;
  delete from public.user_blocks where blocker_id=me and blocked_id=target_user_id;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.send_friend_request(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req_id uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if target_user_id is null or target_user_id = me then raise exception 'invalid_target'; end if;
  if not exists(select 1 from public.profiles where id=target_user_id) then raise exception 'target_not_found'; end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=me and b.blocked_id=target_user_id) or (b.blocker_id=target_user_id and b.blocked_id=me)) then
    raise exception 'interaction_blocked';
  end if;
  if exists(select 1 from public.friendships where (user_id=me and friend_id=target_user_id) or (user_id=target_user_id and friend_id=me)) then
    raise exception 'already_friends';
  end if;
  if exists(select 1 from public.friend_requests where status='pending' and ((sender_id=me and receiver_id=target_user_id) or (sender_id=target_user_id and receiver_id=me))) then
    raise exception 'request_pending';
  end if;
  insert into public.friend_requests(sender_id,receiver_id,status)
  values(me,target_user_id,'pending') returning id into req_id;
  return req_id;
end;
$$;

create or replace function public.respond_friend_request(request_id uuid, decision text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.friend_requests%rowtype;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if decision not in ('accepted','rejected') then raise exception 'invalid_decision'; end if;
  select * into r from public.friend_requests where id=request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if r.receiver_id <> me then raise exception 'not_receiver'; end if;
  if r.status <> 'pending' then raise exception 'request_not_pending'; end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=r.sender_id and b.blocked_id=r.receiver_id) or (b.blocker_id=r.receiver_id and b.blocked_id=r.sender_id)) then
    raise exception 'interaction_blocked';
  end if;
  update public.friend_requests set status=decision where id=r.id;
  if decision='accepted' then
    begin
      insert into public.friendships(user_id,friend_id) values(r.sender_id,r.receiver_id);
    exception when unique_violation then null;
    end;
  end if;
  return true;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid,text) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid,text) to authenticated;
