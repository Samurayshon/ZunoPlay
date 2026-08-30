drop policy if exists "Usuários podem ver salas" on public.rooms;
create policy "rooms_select_authorized"
on public.rooms
for select
to authenticated
using (
  visibility = 'public'
  or owner_id = (select auth.uid())
  or exists (
    select 1
    from public.room_members rm
    where rm.room_id = rooms.id
      and rm.user_id = (select auth.uid())
  )
  or (
    visibility = 'friends'
    and public.zuno_are_friends(owner_id, (select auth.uid()))
  )
);

create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_member public.room_members;
  v_existing_room uuid;
  v_room public.rooms;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_room
  from public.rooms
  where id=p_room_id;

  if not found or v_room.status<>'active' then
    raise exception 'room_not_available' using errcode='P0002';
  end if;

  if v_room.visibility='friends'
     and v_room.owner_id<>auth.uid()
     and not public.zuno_are_friends(v_room.owner_id, auth.uid()) then
    raise exception 'room_access_denied' using errcode='42501';
  end if;

  if exists(
    select 1
    from public.room_bans b
    where b.room_id=p_room_id
      and b.user_id=auth.uid()
      and (b.expires_at is null or b.expires_at>pg_catalog.now())
  ) then
    raise exception 'room_banned' using errcode='42501';
  end if;

  perform public.cleanup_stale_room_members(p_room_id);

  delete from public.room_members rm
  where rm.user_id=auth.uid()
    and (rm.last_seen_at is null or rm.last_seen_at < pg_catalog.now()-interval '60 seconds');

  select rm.room_id into v_existing_room
  from public.room_members rm
  where rm.user_id=auth.uid()
  limit 1;

  if v_existing_room is not null then
    if v_existing_room=p_room_id then
      select * into v_member
      from public.room_members rm
      where rm.user_id=auth.uid()
      limit 1;
      return v_member;
    end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;

  select pg_catalog.count(*) into v_count
  from public.room_members rm
  where rm.room_id=p_room_id;

  if v_count>=v_room.max_audience then
    raise exception 'room_full' using errcode='P0001';
  end if;

  insert into public.room_members(room_id,user_id,seat_index,role,mic_state)
  values(
    p_room_id,
    auth.uid(),
    null,
    case when v_room.owner_id=auth.uid() then 'owner' else 'audience' end,
    'muted'
  )
  returning * into v_member;

  return v_member;
end;
$function$;
