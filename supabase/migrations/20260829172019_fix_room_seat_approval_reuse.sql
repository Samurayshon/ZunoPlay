create or replace function public.take_room_seat(
  p_room_id uuid,
  p_seat_index smallint default null
)
returns public.room_members
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_member public.room_members;
  v_room public.rooms;
  v_seat smallint;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_room
  from public.rooms
  where id=p_room_id and status='active';
  if not found then
    raise exception 'room_not_available';
  end if;

  select * into v_member
  from public.room_members
  where room_id=p_room_id and user_id=auth.uid()
  for update;
  if not found then
    raise exception 'not_in_room';
  end if;

  if v_member.seat_index is not null then
    return v_member;
  end if;

  if v_room.mic_access<>'open'
     and not public.is_room_moderator(p_room_id,auth.uid()) then
    raise exception 'speaker_approval_required' using errcode='42501';
  end if;

  if p_seat_index is null then
    select s into v_seat
    from generate_series(0,v_room.max_speakers-1) s
    where not exists(
      select 1 from public.room_members m
      where m.room_id=p_room_id and m.seat_index=s
    )
    order by s
    limit 1;
  else
    v_seat:=p_seat_index;
  end if;

  if v_seat is null or v_seat<0 or v_seat>=v_room.max_speakers then
    raise exception 'no_seat_available';
  end if;
  if exists(
    select 1 from public.room_members
    where room_id=p_room_id and seat_index=v_seat
  ) then
    raise exception 'seat_taken';
  end if;

  perform set_config('zuno.room_internal','1',true);
  update public.room_members
  set seat_index=v_seat,
      role=case when role in ('owner','admin') then role else 'speaker' end,
      mic_state='muted',
      promoted_at=now(),
      updated_at=now()
  where id=v_member.id
  returning * into v_member;
  perform set_config('zuno.room_internal','0',true);

  return v_member;
end;
$function$;

revoke execute on function public.take_room_seat(uuid,smallint) from public, anon;
grant execute on function public.take_room_seat(uuid,smallint) to authenticated;
