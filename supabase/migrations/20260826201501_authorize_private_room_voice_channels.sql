drop policy if exists zunoplay_receive_authorized_broadcasts on realtime.messages;
create policy zunoplay_receive_authorized_broadcasts
on realtime.messages for select
to authenticated
using (
  extension = 'broadcast'
  and (
    realtime.topic() = ('user:' || (select auth.uid())::text || ':messages')
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() in (
          'room:' || rm.room_id::text || ':messages',
          'room:' || rm.room_id::text || ':voice'
        )
    )
  )
);

drop policy if exists zunoplay_send_authorized_voice_broadcasts on realtime.messages;
create policy zunoplay_send_authorized_voice_broadcasts
on realtime.messages for insert
to authenticated
with check (
  extension = 'broadcast'
  and exists (
    select 1
    from public.room_members rm
    where rm.user_id = (select auth.uid())
      and realtime.topic() = ('room:' || rm.room_id::text || ':voice')
  )
);

drop policy if exists zunoplay_receive_authorized_presence on realtime.messages;
create policy zunoplay_receive_authorized_presence
on realtime.messages for select
to authenticated
using (
  extension = 'presence'
  and (
    realtime.topic() = 'zuno-global-presence'
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() in (
          'zunoplay-presence-' || rm.room_id::text,
          'room:' || rm.room_id::text || ':voice'
        )
    )
  )
);

drop policy if exists zunoplay_track_authorized_presence on realtime.messages;
create policy zunoplay_track_authorized_presence
on realtime.messages for insert
to authenticated
with check (
  extension = 'presence'
  and (
    realtime.topic() = 'zuno-global-presence'
    or exists (
      select 1
      from public.room_members rm
      where rm.user_id = (select auth.uid())
        and realtime.topic() in (
          'zunoplay-presence-' || rm.room_id::text,
          'room:' || rm.room_id::text || ':voice'
        )
    )
  )
);
