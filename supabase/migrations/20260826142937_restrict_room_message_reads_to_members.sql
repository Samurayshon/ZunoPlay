drop policy if exists "Usuários podem ver mensagens das salas" on public.room_messages;
create policy "Membros podem ver mensagens das salas" on public.room_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = room_messages.room_id
      and rm.user_id = (select auth.uid())
  )
);
