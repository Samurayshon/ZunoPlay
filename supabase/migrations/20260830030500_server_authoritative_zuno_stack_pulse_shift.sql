-- Make Zuno Stack Pulse Shift server-authoritative.
-- Client submits intent only; PostgreSQL validates energy/revision and computes
-- the exact tray reduction, score and combo reset atomically.

create or replace function zuno_private.zuno_stack_apply_pulse_shift_internal(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text
)
returns public.zuno_stack_match_state
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_row public.zuno_stack_match_state;
  v_existing public.zuno_stack_game_events;
  v_state jsonb;
  v_engine jsonb;
  v_tray jsonb;
  v_score integer;
  v_energy integer;
  v_combo integer;
  v_remove_count integer;
  v_critical boolean;
  v_new_revision bigint;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_action_id is null or length(p_action_id) < 8 or length(p_action_id) > 160 then
    raise exception 'invalid_stack_pulse_request' using errcode='22023';
  end if;
  if not (
    exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user)
    or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)
  ) then
    raise exception 'stack_room_membership_required' using errcode='42501';
  end if;

  select * into v_existing
  from public.zuno_stack_game_events e
  where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user
       or v_existing.event_type <> 'server_pulse_shift'
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    select * into v_row from public.zuno_stack_match_state where room_id=p_room_id;
    if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
    return v_row;
  end if;

  select * into v_row
  from public.zuno_stack_match_state
  where room_id=p_room_id
  for update;
  if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;

  select * into v_existing
  from public.zuno_stack_game_events e
  where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user
       or v_existing.event_type <> 'server_pulse_shift'
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    return v_row;
  end if;

  if v_row.revision <> p_expected_revision then raise exception 'revision_conflict'; end if;
  if exists(
    select 1 from public.zuno_stack_game_events e
    where e.room_id=p_room_id and e.actor_id=v_user and e.event_type='server_pulse_shift'
      and e.created_at > clock_timestamp() - interval '150 milliseconds'
  ) then
    raise exception 'stack_action_rate_limited' using errcode='42900';
  end if;

  v_state := v_row.state;
  v_engine := v_state->'engine';
  if jsonb_typeof(v_engine) <> 'object'
     or jsonb_typeof(v_engine->'tray') <> 'array'
     or coalesce((v_engine->>'active')::boolean,false) is not true then
    raise exception 'stack_round_not_active' using errcode='22023';
  end if;

  v_tray := v_engine->'tray';
  v_energy := coalesce((v_engine->>'energy')::integer,0);
  if v_energy < 5 then raise exception 'stack_pulse_not_ready' using errcode='22023'; end if;

  v_critical := jsonb_array_length(v_tray) >= 6;
  v_remove_count := case when v_critical then 3 else 2 end;
  v_score := coalesce((v_engine->>'score')::integer,0);
  v_combo := coalesce((v_engine->>'combo')::integer,0);

  -- Core semantics: count each type, sort by lowest frequency first and, on ties,
  -- by latest tray index first. Remove the first 2, or first 3 in critical risk.
  with tray_items as (
    select e.val, e.ord::integer as ord,
           count(*) over (partition by e.val) as freq
    from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
  ), chosen as (
    select ord
    from tray_items
    order by freq asc, ord desc
    limit v_remove_count
  )
  select coalesce(jsonb_agg(to_jsonb(t.val) order by t.ord),'[]'::jsonb)
    into v_tray
  from tray_items t
  where not exists(select 1 from chosen c where c.ord=t.ord);

  v_score := least(25000, v_score + case when v_critical then 260 else 160 end);
  v_new_revision := v_row.revision + 1;
  v_engine := v_engine || jsonb_build_object(
    'tray',v_tray,
    'energy',0,
    'score',v_score,
    'combo',0,
    'lastMatchAt',0,
    'serverUndo','null'::jsonb
  );
  v_state := v_state || jsonb_build_object(
    'kind','server_pulse_shift',
    'engine',v_engine,
    'actor',v_user::text,
    'at',v_now_ms
  );

  update public.zuno_stack_match_state
     set revision=v_new_revision,
         state=v_state,
         updated_by=v_user,
         updated_at=now()
   where room_id=p_room_id
  returning * into v_row;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(p_room_id,p_action_id,'server_pulse_shift',jsonb_build_object(
    'expected_revision',p_expected_revision,
    'applied_revision',v_new_revision,
    'critical',v_critical,
    'removed_count',least(v_remove_count,jsonb_array_length(v_engine->'tray') + v_remove_count),
    'score_gain',case when v_critical then 260 else 160 end
  ),v_user);

  return v_row;
end;
$function$;

revoke all on function zuno_private.zuno_stack_apply_pulse_shift_internal(uuid,bigint,text) from public, anon;
grant execute on function zuno_private.zuno_stack_apply_pulse_shift_internal(uuid,bigint,text) to authenticated, service_role;
grant usage on schema zuno_private to authenticated, service_role;

create or replace function public.zuno_stack_apply_pulse_shift(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text
)
returns public.zuno_stack_match_state
language sql
security invoker
set search_path = ''
as $function$
  select zuno_private.zuno_stack_apply_pulse_shift_internal(p_room_id,p_expected_revision,p_action_id);
$function$;

revoke all on function public.zuno_stack_apply_pulse_shift(uuid,bigint,text) from public, anon;
grant execute on function public.zuno_stack_apply_pulse_shift(uuid,bigint,text) to authenticated, service_role;
