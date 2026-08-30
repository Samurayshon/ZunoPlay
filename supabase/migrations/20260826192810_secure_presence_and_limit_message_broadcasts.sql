create policy "zunoplay_receive_authorized_presence"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'presence'
  and (
    realtime.topic() = 'zuno-global-presence'
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() = 'zunoplay-presence-' || rm.room_id::text
    )
  )
);

create policy "zunoplay_track_authorized_presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and (
    realtime.topic() = 'zuno-global-presence'
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() = 'zunoplay-presence-' || rm.room_id::text
    )
  )
);

drop trigger if exists zunoplay_private_messages_broadcast on public.messages;
create trigger zunoplay_private_messages_broadcast
after insert on public.messages
for each row execute function public.zunoplay_broadcast_private_message_changes();

drop trigger if exists zunoplay_room_messages_broadcast on public.room_messages;
create trigger zunoplay_room_messages_broadcast
after insert on public.room_messages
for each row execute function public.zunoplay_broadcast_room_message_changes();
