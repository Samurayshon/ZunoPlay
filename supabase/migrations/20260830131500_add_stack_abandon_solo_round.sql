create or replace function zuno_private.zuno_stack_abandon_solo_round_internal(
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
  v_new_revision bigint;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_action_id is null or length(p_action_id) < 8 or length(p_action_id) > 160 then
    raise exception 'invalid_stack_abandon_request' using errcode='22023';
  end if;

  if not exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.owner_id = v_user
      and r.status = 'active'
      and r.description = '__zuno_stack_solo_authority__'
      and r.visibility = 'private'
      and r.is_discoverable = false
  ) then
    raise exception 'stack_solo_owner_required' using errcode='42501';
  end if;

  select * into v_existing
  from public.zuno_stack_game_events e
  where e.room_id = p_room_id and e.action_id = p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user
       or v_existing.event_type <> 'server_abandon_solo'
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    select * into v_row from public.zuno_stack_match_state where room_id = p_room_id;
    if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
    return v_row;
  end if;

  select * into v_row
  from public.zuno_stack_match_state
  where room_id = p_room_id
  for update;
  if not found then
    raise exception 'stack_match_state_missing' using errcode='22023';
  end if;
  if v_row.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  v_engine := v_row.state->'engine';
  if jsonb_typeof(v_engine) <> 'object' then
    raise exception 'invalid_stack_round_shape' using errcode='22023';
  end if;
  if coalesce((v_engine->>'active')::boolean,false) is not true then
    return v_row;
  end if;

  v_new_revision := v_row.revision + 1;
  v_engine := v_engine || jsonb_build_object('active',false,'serverUndo','null'::jsonb);
  v_state := v_row.state || jsonb_build_object(
    'kind','server_abandon_solo',
    'engine',v_engine,
    'actor',v_user::text,
    'at',v_now_ms
  );

  update public.zuno_stack_match_state
  set revision = v_new_revision,
      state = v_state,
      updated_by = v_user,
      updated_at = now()
  where room_id = p_room_id
  returning * into v_row;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(
    p_room_id,
    p_action_id,
    'server_abandon_solo',
    jsonb_build_object('expected_revision',p_expected_revision,'applied_revision',v_new_revision),
    v_user
  );

  return v_row;
end;
$function$;

create or replace function public.zuno_stack_abandon_solo_round(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text
)
returns public.zuno_stack_match_state
language sql
set search_path = ''
as $function$
  select zuno_private.zuno_stack_abandon_solo_round_internal(p_room_id,p_expected_revision,p_action_id);
$function$;

revoke all on function zuno_private.zuno_stack_abandon_solo_round_internal(uuid,bigint,text) from public, anon;
grant execute on function zuno_private.zuno_stack_abandon_solo_round_internal(uuid,bigint,text) to authenticated;
revoke all on function public.zuno_stack_abandon_solo_round(uuid,bigint,text) from public, anon;
grant execute on function public.zuno_stack_abandon_solo_round(uuid,bigint,text) to authenticated;
