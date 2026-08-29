-- Etapa 19 / ZUN-11
-- Prevent audience members from bypassing room mic approval through move_room_seat.

create or replace function public.move_room_seat(
  p_room_id uuid,
  p_seat_index smallint
)
returns public.room_members
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_member public.room_members;
  v_room public.rooms;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id and status = 'active';
  if not found then
    raise exception 'room_not_available';
  end if;

  select * into v_member
  from public.room_members
  where room_id = p_room_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'not_in_room';
  end if;

  if p_seat_index < 0 or p_seat_index >= v_room.max_speakers then
    raise exception 'invalid_seat';
  end if;

  if v_member.seat_index is null
     and v_room.mic_access <> 'open'
     and not public.is_room_moderator(p_room_id, auth.uid())
     and not exists (
       select 1
       from public.room_seat_requests q
       where q.room_id = p_room_id
         and q.user_id = auth.uid()
         and q.status = 'approved'
     ) then
    raise exception 'speaker_approval_required' using errcode='42501';
  end if;

  if exists (
    select 1
    from public.room_members
    where room_id = p_room_id
      and seat_index = p_seat_index
      and user_id <> auth.uid()
  ) then
    raise exception 'seat_taken';
  end if;

  perform set_config('zuno.room_internal','1',true);
  update public.room_members
  set seat_index = p_seat_index,
      role = case when role in ('owner','admin') then role else 'speaker' end,
      updated_at = now()
  where id = v_member.id
  returning * into v_member;
  get diagnostics v_count = row_count;
  perform set_config('zuno.room_internal','0',true);

  if v_count = 0 then
    raise exception 'not_in_room';
  end if;

  return v_member;
end;
$function$;

revoke execute on function public.move_room_seat(uuid,smallint) from public;
revoke execute on function public.move_room_seat(uuid,smallint) from anon;
grant execute on function public.move_room_seat(uuid,smallint) to authenticated;
