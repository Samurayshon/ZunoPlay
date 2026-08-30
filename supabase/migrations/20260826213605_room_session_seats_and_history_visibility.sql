alter table public.room_members add column if not exists seat_index smallint;

with ranked as (
  select id, (row_number() over (partition by room_id order by joined_at, id) - 1)::smallint as seat_index
  from public.room_members
)
update public.room_members rm
set seat_index = ranked.seat_index
from ranked
where ranked.id = rm.id and rm.seat_index is null;

alter table public.room_members
  alter column seat_index set not null;

alter table public.room_members
  drop constraint if exists room_members_seat_index_check;
alter table public.room_members
  add constraint room_members_seat_index_check check (seat_index between 0 and 7);

create unique index if not exists room_members_room_seat_unique
  on public.room_members(room_id, seat_index);

create or replace function public.assign_room_member_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_seat smallint;
  v_existing_joined_at timestamptz;
  v_seat smallint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));

  select rm.seat_index, rm.joined_at
    into v_existing_seat, v_existing_joined_at
  from public.room_members rm
  where rm.room_id = new.room_id
    and rm.user_id = new.user_id
  limit 1;

  if found then
    new.seat_index := v_existing_seat;
    new.joined_at := v_existing_joined_at;
    return new;
  end if;

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

revoke all on function public.assign_room_member_session() from public, anon, authenticated;
grant execute on function public.assign_room_member_session() to postgres, service_role;

drop trigger if exists assign_room_member_session_before_insert on public.room_members;
create trigger assign_room_member_session_before_insert
before insert on public.room_members
for each row execute function public.assign_room_member_session();

drop policy if exists "Usuários podem atualizar sua participação" on public.room_members;
revoke update on public.room_members from anon, authenticated;

drop policy if exists "Membros podem ver mensagens das salas" on public.room_messages;
create policy "Membros veem mensagens da sessão atual"
on public.room_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = room_messages.room_id
      and rm.user_id = (select auth.uid())
      and room_messages.created_at >= rm.joined_at
  )
);
