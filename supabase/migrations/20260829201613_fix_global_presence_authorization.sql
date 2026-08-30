create policy "zunoplay_global_presence_read"
on realtime.messages
as permissive
for select
to authenticated
using (
  extension = 'presence'
  and (select realtime.topic()) = 'zuno-global-presence'
);

create policy "zunoplay_global_presence_track"
on realtime.messages
as permissive
for insert
to authenticated
with check (
  extension = 'presence'
  and (select realtime.topic()) = 'zuno-global-presence'
);
