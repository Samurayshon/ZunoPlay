-- Prevent authenticated room members from creating unlimited concurrent minigame sessions.
-- Preserve the existing product rule that any current room member may start zuno_stack,
-- but make repeated/concurrent starts idempotent at the database boundary.

create unique index if not exists room_game_sessions_one_active_per_room
  on public.room_game_sessions (room_id)
  where status = 'active';

create or replace function public.start_room_minigame(
  p_room_id uuid,
  p_game_key text
)
returns public.room_game_sessions
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v public.room_game_sessions;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.room_members
    where room_id = p_room_id
      and user_id = auth.uid()
  ) then
    raise exception 'not_in_room' using errcode='42501';
  end if;

  if p_game_key not in ('zuno_stack') then
    raise exception 'invalid_game' using errcode='22023';
  end if;

  -- Serialize starts for the same room so concurrent callers cannot race past
  -- the existence check. The partial unique index is the final DB invariant.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zunoplay:room-minigame:' || p_room_id::text, 0)
  );

  select * into v
  from public.room_game_sessions
  where room_id = p_room_id
    and status = 'active'
  order by created_at desc
  limit 1;

  if found then
    return v;
  end if;

  insert into public.room_game_sessions(room_id, game_key, created_by)
  values(p_room_id, p_game_key, auth.uid())
  returning * into v;

  return v;
end;
$function$;

revoke all on function public.start_room_minigame(uuid,text) from public, anon;
grant execute on function public.start_room_minigame(uuid,text) to authenticated;
