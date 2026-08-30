create table if not exists public.zuno_stack_match_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.zuno_stack_match_state enable row level security;

create policy "zuno_stack_state_select_members"
on public.zuno_stack_match_state for select
to authenticated
using (
  exists (select 1 from public.room_members rm where rm.room_id = zuno_stack_match_state.room_id and rm.user_id = auth.uid())
  or exists (select 1 from public.rooms r where r.id = zuno_stack_match_state.room_id and r.owner_id = auth.uid())
);

create policy "zuno_stack_state_insert_members"
on public.zuno_stack_match_state for insert
to authenticated
with check (
  updated_by = auth.uid()
  and (
    exists (select 1 from public.room_members rm where rm.room_id = zuno_stack_match_state.room_id and rm.user_id = auth.uid())
    or exists (select 1 from public.rooms r where r.id = zuno_stack_match_state.room_id and r.owner_id = auth.uid())
  )
);

create policy "zuno_stack_state_update_members"
on public.zuno_stack_match_state for update
to authenticated
using (
  exists (select 1 from public.room_members rm where rm.room_id = zuno_stack_match_state.room_id and rm.user_id = auth.uid())
  or exists (select 1 from public.rooms r where r.id = zuno_stack_match_state.room_id and r.owner_id = auth.uid())
)
with check (updated_by = auth.uid());

create or replace function public.zuno_stack_commit_state(
  p_room_id uuid,
  p_expected_revision bigint,
  p_state jsonb
) returns public.zuno_stack_match_state
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_row public.zuno_stack_match_state;
begin
  select * into current_row
  from public.zuno_stack_match_state
  where room_id = p_room_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'revision_conflict';
    end if;
    insert into public.zuno_stack_match_state(room_id, revision, state, updated_by)
    values (p_room_id, 1, coalesce(p_state,'{}'::jsonb), auth.uid())
    returning * into current_row;
    return current_row;
  end if;

  if current_row.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  update public.zuno_stack_match_state
  set revision = revision + 1,
      state = coalesce(p_state,'{}'::jsonb),
      updated_by = auth.uid(),
      updated_at = now()
  where room_id = p_room_id
  returning * into current_row;

  return current_row;
end;
$$;

grant execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) to authenticated;

create index if not exists zuno_stack_match_state_updated_at_idx on public.zuno_stack_match_state(updated_at desc);

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='zuno_stack_match_state'
  ) then
    alter publication supabase_realtime add table public.zuno_stack_match_state;
  end if;
end $$;
