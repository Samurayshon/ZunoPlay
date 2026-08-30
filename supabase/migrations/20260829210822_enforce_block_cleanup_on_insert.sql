create or replace function public.enforce_user_block_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.blocker_id = new.blocked_id then
    raise exception 'invalid_target';
  end if;

  delete from public.friendships
  where (user_id=new.blocker_id and friend_id=new.blocked_id)
     or (user_id=new.blocked_id and friend_id=new.blocker_id);

  delete from public.friend_requests
  where (sender_id=new.blocker_id and receiver_id=new.blocked_id)
     or (sender_id=new.blocked_id and receiver_id=new.blocker_id);

  return new;
end;
$$;

revoke all on function public.enforce_user_block_cleanup() from public, anon, authenticated;

drop trigger if exists trg_enforce_user_block_cleanup on public.user_blocks;
create trigger trg_enforce_user_block_cleanup
after insert on public.user_blocks
for each row execute function public.enforce_user_block_cleanup();
