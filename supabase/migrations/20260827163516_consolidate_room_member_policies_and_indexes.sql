drop policy if exists "Dono pode remover membros da própria sala" on public.room_members;
drop policy if exists "Usuários podem sair das salas" on public.room_members;
create policy "room_members_delete_self_or_owner"
on public.room_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
);

drop policy if exists "Dono pode mover membros entre assentos" on public.room_members;
drop policy if exists "Room members can touch own heartbeat" on public.room_members;
create policy "room_members_update_self_or_owner"
on public.room_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
);

-- Drop indexes fully covered by existing unique/composite indexes.
drop index if exists public.idx_room_members_room_user;
drop index if exists public.idx_room_members_user_id;
drop index if exists public.idx_friend_requests_sender_id;
drop index if exists public.idx_friend_requests_receiver_id;
