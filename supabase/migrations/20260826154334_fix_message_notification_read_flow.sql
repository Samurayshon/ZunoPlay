create index if not exists idx_messages_unread_receiver_sender on public.messages (receiver_id, sender_id, read_at) where read_at is null;
create index if not exists idx_notifications_unread_user_type on public.notifications (user_id, type, read_at) where read_at is null;

create or replace function public.mark_message_notifications_read(p_sender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read_at = coalesce(read_at, now())
  where receiver_id = auth.uid()
    and sender_id = p_sender_id
    and read_at is null;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and type = 'message'
    and related_user_id = p_sender_id
    and read_at is null;
end;
$$;

grant execute on function public.mark_message_notifications_read(uuid) to authenticated;
