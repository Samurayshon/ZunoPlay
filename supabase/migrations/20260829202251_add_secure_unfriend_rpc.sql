create or replace function public.unfriend(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  removed_count integer := 0;
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;
  if target_user_id is null or target_user_id = caller then
    raise exception 'invalid_target';
  end if;

  delete from public.friendships
  where (user_id = caller and friend_id = target_user_id)
     or (user_id = target_user_id and friend_id = caller);
  get diagnostics removed_count = row_count;

  if removed_count = 0 then
    return false;
  end if;

  delete from public.friend_requests
  where status = 'accepted'
    and ((sender_id = caller and receiver_id = target_user_id)
      or (sender_id = target_user_id and receiver_id = caller));

  return true;
end;
$$;

revoke all on function public.unfriend(uuid) from public;
grant execute on function public.unfriend(uuid) to authenticated;
