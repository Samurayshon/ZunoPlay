create policy "zunoplay_receive_authorized_broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and (
    realtime.topic() = 'user:' || (select auth.uid())::text || ':messages'
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() = 'room:' || rm.room_id::text || ':messages'
    )
  )
);

create or replace function public.zunoplay_broadcast_private_message_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := coalesce(new.sender_id, old.sender_id);
  v_receiver uuid := coalesce(new.receiver_id, old.receiver_id);
begin
  perform realtime.broadcast_changes(
    'user:' || v_sender::text || ':messages',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  if v_receiver is distinct from v_sender then
    perform realtime.broadcast_changes(
      'user:' || v_receiver::text || ':messages',
      tg_op,
      tg_op,
      tg_table_name,
      tg_table_schema,
      new,
      old
    );
  end if;

  return null;
end;
$$;

revoke all on function public.zunoplay_broadcast_private_message_changes() from public;
revoke all on function public.zunoplay_broadcast_private_message_changes() from anon, authenticated;

drop trigger if exists zunoplay_private_messages_broadcast on public.messages;
create trigger zunoplay_private_messages_broadcast
after insert or update or delete on public.messages
for each row execute function public.zunoplay_broadcast_private_message_changes();

create or replace function public.zunoplay_broadcast_room_message_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room uuid := coalesce(new.room_id, old.room_id);
begin
  perform realtime.broadcast_changes(
    'room:' || v_room::text || ':messages',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );
  return null;
end;
$$;

revoke all on function public.zunoplay_broadcast_room_message_changes() from public;
revoke all on function public.zunoplay_broadcast_room_message_changes() from anon, authenticated;

drop trigger if exists zunoplay_room_messages_broadcast on public.room_messages;
create trigger zunoplay_room_messages_broadcast
after insert or update or delete on public.room_messages
for each row execute function public.zunoplay_broadcast_room_message_changes();
