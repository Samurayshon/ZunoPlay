-- Preserve action idempotency before rate/revision gates: the same action_id
-- with the same immutable request returns the original event id; conflicting
-- reuse of an action_id is rejected.

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
  v_event_type text;
  v_effective_payload jsonb;
  v_existing_event text;
  v_existing_payload jsonb;
  v_existing_actor uuid;
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

  v_event_type := 'action_request_' || p_action_type;
  v_effective_payload := p_payload || jsonb_build_object('expected_revision',p_expected_revision);

  select id,event_type,payload,actor_id
    into v_id,v_existing_event,v_existing_payload,v_existing_actor
  from public.zuno_stack_game_events
  where room_id=p_room_id and action_id=p_action_id;

  if found then
    if v_existing_actor is distinct from v_user
       or v_existing_event is distinct from v_event_type
       or v_existing_payload is distinct from v_effective_payload then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    return v_id;
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

  if exists(
    select 1 from public.zuno_stack_game_events e
    where e.room_id=p_room_id and e.actor_id=v_user
      and e.event_type like 'action_request_%'
      and e.created_at > now() - interval '100 milliseconds'
  ) then
    raise exception 'stack_action_rate_limited' using errcode='42900';
  end if;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(p_room_id,p_action_id,v_event_type,v_effective_payload,v_user)
  on conflict(room_id,action_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id,event_type,payload,actor_id
      into v_id,v_existing_event,v_existing_payload,v_existing_actor
    from public.zuno_stack_game_events
    where room_id=p_room_id and action_id=p_action_id;
    if v_id is null
       or v_existing_actor is distinct from v_user
       or v_existing_event is distinct from v_event_type
       or v_existing_payload is distinct from v_effective_payload then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
  end if;
  return v_id;
end;
$function$;

revoke execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) from public;
revoke execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) from anon;
grant execute on function public.zuno_stack_request_action(uuid,text,bigint,text,jsonb) to authenticated, service_role;
