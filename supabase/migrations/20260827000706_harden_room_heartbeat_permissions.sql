grant update(last_seen_at) on public.room_members to authenticated;

drop policy if exists "Room members can touch own heartbeat" on public.room_members;
create policy "Room members can touch own heartbeat"
on public.room_members
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.touch_room_session(p_room_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_touched boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.room_members
  set last_seen_at = pg_catalog.now()
  where room_id = p_room_id
    and user_id = auth.uid();

  v_touched := found;
  return v_touched;
end;
$$;

revoke all on function public.touch_room_session(uuid) from public, anon;
grant execute on function public.touch_room_session(uuid) to authenticated;

drop policy if exists "Archive is private" on public.zunoplay_data_archive;
create policy "Archive is private"
on public.zunoplay_data_archive
for select
to authenticated
using (false);
