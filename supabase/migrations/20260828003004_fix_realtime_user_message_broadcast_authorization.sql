drop policy if exists zunoplay_send_own_message_broadcasts on realtime.messages;

create policy zunoplay_send_own_message_broadcasts
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and realtime.topic() = ('user:' || (select auth.uid())::text || ':messages')
);
