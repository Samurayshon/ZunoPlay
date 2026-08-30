create policy "Dono pode remover membros da própria sala"
on public.room_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
);

create policy "Dono pode mover membros entre assentos"
on public.room_members
for update
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.rooms r
    where r.id = room_members.room_id
      and r.owner_id = (select auth.uid())
  )
);
