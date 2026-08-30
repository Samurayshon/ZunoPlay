drop trigger if exists purge_room_messages_after_member_leave on public.room_members;
drop function if exists public.purge_room_messages_on_member_leave();

alter table public.room_members
  add column if not exists last_seen_at timestamptz not null default now();

update public.room_members
set last_seen_at = greatest(joined_at, now() - interval '5 seconds')
where last_seen_at is null or last_seen_at < joined_at;

revoke update on public.room_members from authenticated;
grant update(last_seen_at) on public.room_members to authenticated;

DO $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.room_members'::regclass
      and conname = 'room_members_one_active_room_per_user'
  ) then
    alter table public.room_members
      add constraint room_members_one_active_room_per_user unique (user_id);
  end if;
end $$;

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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));

  -- Remove sessões abandonadas da sala. O heartbeat dos participantes ativos
  -- mantém last_seen_at atualizado; isso é apenas fallback para app encerrado à força.
  delete from public.room_members rm
  where rm.room_id = new.room_id
    and rm.user_id <> new.user_id
    and rm.last_seen_at < pg_catalog.now() - interval '45 seconds';

  -- Uma conta só pode estar em uma sala por vez. Entrar em outra libera a anterior.
  delete from public.room_members rm
  where rm.user_id = new.user_id;

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
  new.last_seen_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members
language plpgsql
security invoker
set search_path = 'public', 'pg_temp'
as $$
declare
  v_member public.room_members;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform 1 from public.rooms where id = p_room_id;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  insert into public.room_members(room_id, user_id)
  values (p_room_id, auth.uid())
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_room_session(uuid) from public, anon;
grant execute on function public.join_room_session(uuid) to authenticated;
