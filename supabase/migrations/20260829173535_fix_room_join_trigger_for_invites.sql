-- The only application function that inserts room_members is join_room_session.
-- Visibility/invite authorization is therefore enforced once, in that RPC.
-- This trigger keeps concurrency/integrity checks and normalizes the inserted
-- role/seat without re-rejecting an already validated private invite.

create or replace function public.assign_room_member_session()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_existing_room uuid;
  v_room public.rooms;
  v_count integer;
  v_owner_seat smallint;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_room_member' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));

  select * into v_room
    from public.rooms
   where id=new.room_id;
  if not found or v_room.status<>'active' then
    raise exception 'room_not_available' using errcode='P0002';
  end if;

  delete from public.room_members rm
   where (rm.room_id=new.room_id or rm.user_id=new.user_id)
     and (rm.last_seen_at is null or rm.last_seen_at<pg_catalog.now()-interval '60 seconds');

  select rm.room_id into v_existing_room
    from public.room_members rm
   where rm.user_id=new.user_id
   limit 1;

  if v_existing_room is not null then
    if v_existing_room=new.room_id then
      raise exception 'already_in_room' using errcode='23505';
    end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;

  select pg_catalog.count(*) into v_count
    from public.room_members rm
   where rm.room_id=new.room_id;
  if v_count>=v_room.max_audience then
    raise exception 'room_full' using errcode='P0001';
  end if;

  if v_room.owner_id=auth.uid() then
    select gs::smallint into v_owner_seat
      from generate_series(0, least(v_room.max_speakers,8)-1) gs
     where not exists (
       select 1
         from public.room_members rm
        where rm.room_id=new.room_id
          and rm.seat_index=gs
     )
     order by gs
     limit 1;
    new.seat_index:=v_owner_seat;
    new.role:='owner';
  else
    new.seat_index:=null;
    new.role:='audience';
  end if;

  new.mic_state:='muted';
  new.joined_at:=pg_catalog.now();
  new.last_seen_at:=pg_catalog.now();
  return new;
end;
$function$;

revoke all on function public.assign_room_member_session() from public, anon, authenticated;
