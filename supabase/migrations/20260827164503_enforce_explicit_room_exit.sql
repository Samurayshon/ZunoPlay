create or replace function public.assign_room_member_session()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing_room uuid;
  v_seat smallint;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_room_member' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));

  select rm.room_id into v_existing_room
  from public.room_members rm
  where rm.user_id = new.user_id
  limit 1;

  if v_existing_room is not null then
    if v_existing_room = new.room_id then
      raise exception 'already_in_room' using errcode = '23505';
    end if;
    raise exception 'leave_current_room_first' using errcode = 'P0001';
  end if;

  select s::smallint
    into v_seat
  from pg_catalog.generate_series(0,7) as s
  where not exists (
    select 1
    from public.room_members rm
    where rm.room_id = new.room_id
      and rm.seat_index = s
  )
  order by s
  limit 1;

  if v_seat is null then
    raise exception using errcode = 'P0001', message = 'room_full';
  end if;

  new.seat_index := v_seat;
  new.joined_at := pg_catalog.now();
  new.last_seen_at := pg_catalog.now();
  return new;
end;
$function$;

create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_member public.room_members;
  v_existing_room uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  perform 1 from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found' using errcode='P0002';
  end if;

  select room_id into v_existing_room
  from public.room_members
  where user_id = auth.uid()
  limit 1;

  if v_existing_room is not null then
    if v_existing_room = p_room_id then
      select * into v_member from public.room_members where user_id = auth.uid() and room_id = p_room_id limit 1;
      return v_member;
    end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;

  insert into public.room_members(room_id,user_id)
  values (p_room_id,auth.uid())
  returning * into v_member;

  return v_member;
end;
$function$;
