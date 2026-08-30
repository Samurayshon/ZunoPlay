-- Make the leased Zuno Stack host the only authenticated client allowed to
-- mutate the shared authoritative state. Non-host members submit narrow,
-- revision-bound action requests instead of complete engine JSON.

create or replace function public.enforce_zuno_stack_host_state_write()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_privileged boolean := current_user in ('postgres','service_role','supabase_admin');
  v_kind text;
  v_active boolean;
begin
  if v_privileged then
    return new;
  end if;
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if tg_op = 'INSERT' then
    v_kind := coalesce(new.state->>'kind','');
    v_active := coalesce((new.state#>>'{engine,active}')::boolean,false);
    if v_kind <> 'bootstrap' or v_active then
      raise exception 'stack_bootstrap_only_before_host' using errcode='42501';
    end if;
    if new.host_id is not null or new.host_lease_until is not null then
      raise exception 'stack_invalid_initial_host' using errcode='42501';
    end if;
    if new.updated_by is distinct from v_user then
      raise exception 'stack_updated_by_mismatch' using errcode='42501';
    end if;
    return new;
  end if;

  if new.updated_by is distinct from v_user then
    raise exception 'stack_updated_by_mismatch' using errcode='42501';
  end if;

  if new.host_id is distinct from old.host_id
     or new.host_lease_until is distinct from old.host_lease_until then
    if new.host_id is null then
      if old.host_id is distinct from v_user then
        raise exception 'stack_host_release_forbidden' using errcode='42501';
      end if;
    else
      if new.host_id is distinct from v_user then
        raise exception 'stack_host_spoof' using errcode='42501';
      end if;
      if not (old.host_id is null
              or old.host_id = v_user
              or old.host_lease_until is null
              or old.host_lease_until < now()) then
        raise exception 'stack_host_lease_held' using errcode='42501';
      end if;
      if new.host_lease_until is null
         or new.host_lease_until <= now()
         or new.host_lease_until > now() + interval '35 seconds' then
        raise exception 'stack_invalid_host_lease' using errcode='22023';
      end if;
    end if;
  end if;

  if new.state is distinct from old.state then
    if old.host_id is distinct from v_user
       or old.host_lease_until is null
       or old.host_lease_until <= now() then
      raise exception 'stack_host_lease_required' using errcode='42501';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_zuno_stack_host_state_write on public.zuno_stack_match_state;
create trigger trg_zuno_stack_host_state_write
before insert or update on public.zuno_stack_match_state
for each row execute function public.enforce_zuno_stack_host_state_write();

create index if not exists idx_zuno_stack_events_actor_recent
  on public.zuno_stack_game_events(room_id, actor_id, created_at desc);

create or replace function public.zuno_stack_request_action(
  p_room_id uuid,
  p_action_id text,
  p_expected_revision bigint,
  p_action_type text,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_row public.zuno_stack_match_state;
  v_id bigint;
  v_index numeric;
  v_tile_id text;
  v_power text;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null
     or p_action_id is null or length(p_action_id) < 8 or length(p_action_id) > 160
     or p_expected_revision is null or p_expected_revision < 1
     or p_action_type is null
     or not (p_action_type = any(array['start','tile','relay_send','relay_take','undo','hint','pulse_shift','power']::text[])) then
    raise exception 'invalid_stack_action_request' using errcode='22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 2048 then
    raise exception 'invalid_stack_action_payload' using errcode='22023';
  end if;

  if not (
    exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user)
    or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)
  ) then
    raise exception 'stack_room_membership_required' using errcode='42501';
  end if;

  select * into v_row
  from public.zuno_stack_match_state
  where room_id=p_room_id;

  if not found or v_row.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;
  if v_row.host_id is null or v_row.host_lease_until is null or v_row.host_lease_until <= now() then
    raise exception 'stack_host_unavailable' using errcode='42501';
  end if;

  if p_action_type = 'start' then
    if coalesce((v_row.state#>>'{engine,active}')::boolean,false) then
      raise exception 'stack_round_already_active' using errcode='22023';
    end if;
  else
    if not coalesce((v_row.state#>>'{engine,active}')::boolean,false) then
      raise exception 'stack_round_not_active' using errcode='22023';
    end if;
  end if;

  if p_action_type = 'tile' then
    v_tile_id := p_payload->>'id';
    if v_tile_id is null or v_tile_id !~ '^t([0-9]|[1-8][0-9])$' then
      raise exception 'invalid_stack_tile_action' using errcode='22023';
    end if;
  elsif p_action_type = 'relay_send' then
    if jsonb_typeof(p_payload->'index') <> 'number' then
      raise exception 'invalid_stack_relay_action' using errcode='22023';
    end if;
    v_index := (p_payload->>'index')::numeric;
    if v_index <> trunc(v_index) or v_index < 0 or v_index > 6 then
      raise exception 'invalid_stack_relay_action' using errcode='22023';
    end if;
  elsif p_action_type = 'relay_take' then
    if jsonb_typeof(p_payload->'index') <> 'number' then
      raise exception 'invalid_stack_relay_action' using errcode='22023';
    end if;
    v_index := (p_payload->>'index')::numeric;
    if v_index <> trunc(v_index) or v_index < 0 or v_index > 2 then
      raise exception 'invalid_stack_relay_action' using errcode='22023';
    end if;
  elsif p_action_type = 'power' then
    v_power := p_payload->>'type';
    if not (v_power = any(array['explosion','elo','fase','vortice','gelo','fluxo','troca','ima','desfazer']::text[])) then
      raise exception 'invalid_stack_power_action' using errcode='22023';
    end if;
  end if;

  if exists(
    select 1 from public.zuno_stack_game_events e
    where e.room_id=p_room_id and e.actor_id=v_user
      and e.event_type like 'action_request_%'
      and e.created_at > now() - interval '100 milliseconds'
  ) then
    raise exception 'stack_action_rate_limited' using errcode='42900';
  end if;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(
    p_room_id,
    p_action_id,
    'action_request_' || p_action_type,
    p_payload || jsonb_build_object('expected_revision',p_expected_revision),
    v_user
  )
  on conflict(room_id,action_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.zuno_stack_game_events
    where room_id=p_room_id and action_id=p_action_id;
  end if;
  return v_id;
end;
$function$;

revoke execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) from public;
revoke execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) from anon;
grant execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) to authenticated, service_role;

do $block$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='zuno_stack_game_events'
  ) then
    alter publication supabase_realtime add table public.zuno_stack_game_events;
  end if;
end;
$block$;
