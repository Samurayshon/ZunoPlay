-- Harden the Zuno Stack authoritative RPC surface.
-- Browser/app clients must be authenticated room members, cannot spoof the
-- actor embedded in authoritative state, and cannot submit oversized state or
-- event payloads. PUBLIC/anon execute access is removed explicitly.

create or replace function public.zuno_stack_claim_host(p_room_id uuid)
returns public.zuno_stack_match_state
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  r public.zuno_stack_match_state;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null then
    raise exception 'invalid_room_id' using errcode='22023';
  end if;

  update public.zuno_stack_match_state
  set host_id=v_user,
      host_lease_until=now()+interval '25 seconds',
      updated_by=v_user,
      updated_at=now()
  where room_id=p_room_id
    and (host_id is null or host_id=v_user or host_lease_until is null or host_lease_until<now())
  returning * into r;

  if found then return r; end if;
  select * into r from public.zuno_stack_match_state where room_id=p_room_id;
  return r;
end;
$function$;

create or replace function public.zuno_stack_commit_state(
  p_room_id uuid,
  p_expected_revision bigint,
  p_state jsonb
)
returns public.zuno_stack_match_state
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  current_row public.zuno_stack_match_state;
  v_kind text;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'invalid_stack_commit' using errcode='22023';
  end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid_stack_state' using errcode='22023';
  end if;
  if octet_length(p_state::text) > 262144 then
    raise exception 'stack_state_too_large' using errcode='22023';
  end if;
  if coalesce(p_state->>'actor','') <> v_user::text then
    raise exception 'stack_actor_mismatch' using errcode='42501';
  end if;

  v_kind := coalesce(p_state->>'kind','');
  if v_kind !~ '^[a-z0-9_]{1,64}$' then
    raise exception 'invalid_stack_state_kind' using errcode='22023';
  end if;
  if jsonb_typeof(p_state->'engine') <> 'object' then
    raise exception 'invalid_stack_engine' using errcode='22023';
  end if;
  if jsonb_typeof(p_state#>'{engine,tiles}') = 'array'
     and jsonb_array_length(p_state#>'{engine,tiles}') > 90 then
    raise exception 'invalid_stack_tiles' using errcode='22023';
  end if;
  if jsonb_typeof(p_state#>'{engine,tray}') = 'array'
     and jsonb_array_length(p_state#>'{engine,tray}') > 7 then
    raise exception 'invalid_stack_tray' using errcode='22023';
  end if;
  if jsonb_typeof(p_state#>'{engine,relay}') = 'array'
     and jsonb_array_length(p_state#>'{engine,relay}') > 3 then
    raise exception 'invalid_stack_relay' using errcode='22023';
  end if;

  select * into current_row
  from public.zuno_stack_match_state
  where room_id = p_room_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'revision_conflict';
    end if;
    insert into public.zuno_stack_match_state(room_id, revision, state, updated_by)
    values (p_room_id, 1, p_state, v_user)
    returning * into current_row;
    return current_row;
  end if;

  if current_row.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  update public.zuno_stack_match_state
  set revision = revision + 1,
      state = p_state,
      updated_by = v_user,
      updated_at = now()
  where room_id = p_room_id
  returning * into current_row;

  return current_row;
end;
$function$;

create or replace function public.zuno_stack_release_host(p_room_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null then
    raise exception 'invalid_room_id' using errcode='22023';
  end if;

  update public.zuno_stack_match_state
  set host_id=null,
      host_lease_until=null,
      updated_by=v_user,
      updated_at=now()
  where room_id=p_room_id and host_id=v_user;
end;
$function$;

create or replace function public.zuno_stack_log_event(
  p_room_id uuid,
  p_action_id text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_id bigint;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null
     or p_action_id is null or length(p_action_id) < 1 or length(p_action_id) > 160
     or p_event_type is null or p_event_type !~ '^[a-z0-9_]{1,80}$' then
    raise exception 'invalid_stack_event' using errcode='22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 16384 then
    raise exception 'invalid_stack_event_payload' using errcode='22023';
  end if;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(p_room_id,p_action_id,p_event_type,p_payload,v_user)
  on conflict(room_id,action_id) do nothing
  returning id into v_id;
  return v_id;
end;
$function$;

revoke execute on function public.zuno_stack_claim_host(uuid) from public;
revoke execute on function public.zuno_stack_claim_host(uuid) from anon;
revoke execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) from public;
revoke execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) from anon;
revoke execute on function public.zuno_stack_release_host(uuid) from public;
revoke execute on function public.zuno_stack_release_host(uuid) from anon;
revoke execute on function public.zuno_stack_log_event(uuid,text,text,jsonb) from public;
revoke execute on function public.zuno_stack_log_event(uuid,text,text,jsonb) from anon;

grant execute on function public.zuno_stack_claim_host(uuid) to authenticated, service_role;
grant execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) to authenticated, service_role;
grant execute on function public.zuno_stack_release_host(uuid) to authenticated, service_role;
grant execute on function public.zuno_stack_log_event(uuid,text,text,jsonb) to authenticated, service_role;

