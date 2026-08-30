alter table public.rooms drop constraint if exists rooms_max_speakers_check;
alter table public.rooms add constraint rooms_max_speakers_check check (max_speakers >= 1 and max_speakers <= 10);
alter table public.rooms alter column max_speakers set default 10;
update public.rooms set max_speakers=10 where max_speakers=8;
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

  select s::smallint into v_seat
  from pg_catalog.generate_series(0,9) as s
  where not exists (
    select 1 from public.room_members rm
    where rm.room_id = new.room_id and rm.seat_index = s
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
