create or replace function public.mark_message_notifications_read(p_sender_id uuid)
returns void
language plpgsql
security invoker
set search_path = 'public'
as $$
begin
  update public.messages
  set read_at = coalesce(read_at, now())
  where receiver_id = (select auth.uid())
    and sender_id = p_sender_id
    and read_at is null;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = (select auth.uid())
    and type = 'message'
    and related_user_id = p_sender_id
    and read_at is null;
end;
$$;

revoke all on function public.mark_message_notifications_read(uuid) from public, anon;
grant execute on function public.mark_message_notifications_read(uuid) to authenticated;
