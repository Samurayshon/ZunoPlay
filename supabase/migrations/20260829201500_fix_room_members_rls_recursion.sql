-- ZunoPlay production QA fix: avoid room_members <-> rooms RLS recursion.
-- rooms SELECT authorization can consult room_members, so room_members policies must
-- not consult rooms through an RLS-protected subquery. Resolve ownership through a
-- narrowly-scoped SECURITY DEFINER helper instead.

create or replace function private.zuno_is_room_owner(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists(
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.owner_id = p_user_id
  );
$function$;

revoke all on function private.zuno_is_room_owner(uuid, uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.zuno_is_room_owner(uuid, uuid) to authenticated;

drop policy if exists room_members_delete_self_or_owner on public.room_members;
create policy room_members_delete_self_or_owner
on public.room_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  or private.zuno_is_room_owner(room_id, (select auth.uid()))
);

drop policy if exists room_members_update_self_or_owner on public.room_members;
create policy room_members_update_self_or_owner
on public.room_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  or private.zuno_is_room_owner(room_id, (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or private.zuno_is_room_owner(room_id, (select auth.uid()))
);
