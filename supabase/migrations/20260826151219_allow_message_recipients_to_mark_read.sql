drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);
