create or replace function public.assign_room_member_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seat smallint;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_room_member' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));

  -- Toda entrada explícita representa uma nova sessão.
  -- Remove qualquer membership antigo do próprio usuário antes de escolher o assento.
  delete from public.room_members rm
  where rm.room_id = new.room_id
    and rm.user_id = new.user_id;

  select s::smallint
    into v_seat
  from pg_catalog.generate_series(0, 7) as s
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
  return new;
end;
$$;
