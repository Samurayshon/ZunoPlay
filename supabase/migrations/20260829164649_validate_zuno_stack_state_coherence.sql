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
  v_engine jsonb;
  v_prev_engine jsonb;
  v_active boolean;
  v_prev_active boolean;
  v_tiles integer;
  v_tray integer;
  v_relay integer;
  v_invalid_tiles integer;
  v_distinct_ids integer;
  v_distinct_positions integer;
  v_layer0 integer;
  v_layer1 integer;
  v_layer2 integer;
  v_layer3 integer;
  v_layer4 integer;
  v_removed integer;
  v_prev_removed integer;
  v_score numeric;
  v_prev_score numeric;
  v_matches integer;
  v_prev_matches integer;
  v_energy integer;
  v_seed numeric;
  v_started numeric;
  v_prev_seed numeric;
  v_prev_started numeric;
  v_layout jsonb;
  v_prev_layout jsonb;
  v_piece_identity jsonb;
  v_prev_piece_identity jsonb;
  v_type_groups integer;
  v_min_type_count integer;
  v_max_type_count integer;
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
  if not (v_kind = any(array[
    'bootstrap','start','late_start','tile','relay_send','relay_take','undo','hint',
    'pulse_shift','team_boost','win','finish','timeout','power_desfazer',
    'power_explosion','power_elo','power_fase','power_vortice','power_gelo',
    'power_fluxo','power_troca','power_ima','order_complete','systems_reward',
    'systems','mutation'
  ]::text[])) then
    raise exception 'invalid_stack_state_kind' using errcode='22023';
  end if;

  v_engine := p_state->'engine';
  if jsonb_typeof(v_engine) <> 'object' then
    raise exception 'invalid_stack_engine' using errcode='22023';
  end if;
  if jsonb_typeof(v_engine->'active') <> 'boolean'
     or jsonb_typeof(v_engine->'tiles') <> 'array'
     or jsonb_typeof(v_engine->'tray') <> 'array'
     or jsonb_typeof(v_engine->'relay') <> 'array' then
    raise exception 'invalid_stack_engine_shape' using errcode='22023';
  end if;
  if jsonb_typeof(v_engine->'score') <> 'number'
     or jsonb_typeof(v_engine->'matches') <> 'number'
     or jsonb_typeof(v_engine->'energy') <> 'number'
     or jsonb_typeof(v_engine->'seed') <> 'number'
     or jsonb_typeof(v_engine->'startedAt') <> 'number'
     or jsonb_typeof(v_engine->'undoLeft') <> 'number'
     or jsonb_typeof(v_engine->'hintsLeft') <> 'number' then
    raise exception 'invalid_stack_engine_metrics' using errcode='22023';
  end if;

  v_active := (v_engine->>'active')::boolean;
  v_tiles := jsonb_array_length(v_engine->'tiles');
  v_tray := jsonb_array_length(v_engine->'tray');
  v_relay := jsonb_array_length(v_engine->'relay');
  v_score := (v_engine->>'score')::numeric;
  v_matches := (v_engine->>'matches')::numeric;
  v_energy := (v_engine->>'energy')::numeric;
  v_seed := (v_engine->>'seed')::numeric;
  v_started := (v_engine->>'startedAt')::numeric;

  if v_score <> trunc(v_score) or v_score < 0 or v_score > 25000
     or (v_engine->>'matches')::numeric <> trunc((v_engine->>'matches')::numeric)
     or v_matches < 0 or v_matches > 30
     or (v_engine->>'energy')::numeric <> trunc((v_engine->>'energy')::numeric)
     or v_energy < 0 or v_energy > 5
     or v_seed <> trunc(v_seed) or v_seed < 0 or v_seed > 4294967295
     or v_started <> trunc(v_started) or v_started < 0 or v_started > 9999999999999
     or (v_engine->>'undoLeft')::numeric <> trunc((v_engine->>'undoLeft')::numeric)
     or (v_engine->>'undoLeft')::numeric < 0 or (v_engine->>'undoLeft')::numeric > 1
     or (v_engine->>'hintsLeft')::numeric <> trunc((v_engine->>'hintsLeft')::numeric)
     or (v_engine->>'hintsLeft')::numeric < 0 or (v_engine->>'hintsLeft')::numeric > 2 then
    raise exception 'invalid_stack_engine_metrics' using errcode='22023';
  end if;

  if v_tray > 7 or v_relay <> 3 then
    raise exception 'invalid_stack_containers' using errcode='22023';
  end if;
  if (v_active and v_tiles <> 90) or (not v_active and v_tiles not in (0,90)) then
    raise exception 'invalid_stack_round_shape' using errcode='22023';
  end if;

  if v_tiles > 0 then
    select count(*) into v_invalid_tiles
    from jsonb_array_elements(v_engine->'tiles') as t(tile)
    where jsonb_typeof(tile) <> 'object'
       or jsonb_typeof(tile->'id') <> 'string'
       or (tile->>'id') !~ '^t([0-9]|[1-8][0-9])$'
       or jsonb_typeof(tile->'type') <> 'string'
       or length(tile->>'type') < 1 or length(tile->>'type') > 80
       or jsonb_typeof(tile->'x') <> 'number'
       or (tile->>'x')::numeric <> trunc((tile->>'x')::numeric)
       or (tile->>'x')::numeric < 0 or (tile->>'x')::numeric > 5
       or jsonb_typeof(tile->'y') <> 'number'
       or (tile->>'y')::numeric <> trunc((tile->>'y')::numeric)
       or (tile->>'y')::numeric < 0 or (tile->>'y')::numeric > 5
       or jsonb_typeof(tile->'layer') <> 'number'
       or (tile->>'layer')::numeric <> trunc((tile->>'layer')::numeric)
       or (tile->>'layer')::numeric < 0 or (tile->>'layer')::numeric > 4
       or jsonb_typeof(tile->'removed') <> 'boolean';

    if v_invalid_tiles > 0 then
      raise exception 'invalid_stack_tile_shape' using errcode='22023';
    end if;

    select count(distinct tile->>'id'),
           count(distinct ((tile->>'layer') || ':' || (tile->>'x') || ':' || (tile->>'y'))),
           count(*) filter (where (tile->>'layer')::numeric = 0),
           count(*) filter (where (tile->>'layer')::numeric = 1),
           count(*) filter (where (tile->>'layer')::numeric = 2),
           count(*) filter (where (tile->>'layer')::numeric = 3),
           count(*) filter (where (tile->>'layer')::numeric = 4),
           count(*) filter (where (tile->>'removed')::boolean)
      into v_distinct_ids, v_distinct_positions,
           v_layer0, v_layer1, v_layer2, v_layer3, v_layer4, v_removed
    from jsonb_array_elements(v_engine->'tiles') as t(tile);

    if v_distinct_ids <> v_tiles or v_distinct_positions <> v_tiles then
      raise exception 'invalid_stack_tile_identity' using errcode='22023';
    end if;
    if v_tiles = 90 and (v_layer0 <> 36 or v_layer1 <> 24 or v_layer2 <> 15 or v_layer3 <> 10 or v_layer4 <> 5) then
      raise exception 'invalid_stack_layer_distribution' using errcode='22023';
    end if;
  else
    v_removed := 0;
  end if;

  if v_matches * 3 > v_removed then
    raise exception 'invalid_stack_match_relation' using errcode='22023';
  end if;

  if v_kind = 'start' then
    if not v_active or v_tiles <> 90 or v_score <> 0 or v_matches <> 0 or v_removed <> 0
       or v_tray <> 0 or v_energy <> 0 then
      raise exception 'invalid_stack_start_state' using errcode='22023';
    end if;
    select count(*), min(n), max(n)
      into v_type_groups, v_min_type_count, v_max_type_count
    from (
      select tile->>'type' as type_id, count(*)::integer as n
      from jsonb_array_elements(v_engine->'tiles') as t(tile)
      group by tile->>'type'
    ) s;
    if v_type_groups <> 10 or v_min_type_count <> 9 or v_max_type_count <> 9 then
      raise exception 'invalid_stack_start_distribution' using errcode='22023';
    end if;
  end if;

  select * into current_row
  from public.zuno_stack_match_state
  where room_id = p_room_id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'revision_conflict';
    end if;
    if v_kind not in ('bootstrap','start','late_start') then
      raise exception 'invalid_stack_initial_kind' using errcode='22023';
    end if;
    insert into public.zuno_stack_match_state(room_id, revision, state, updated_by)
    values (p_room_id, 1, p_state, v_user)
    returning * into current_row;
    return current_row;
  end if;

  if current_row.revision <> p_expected_revision then
    raise exception 'revision_conflict';
  end if;

  v_prev_engine := current_row.state->'engine';
  if jsonb_typeof(v_prev_engine) = 'object' and jsonb_typeof(v_prev_engine->'active') = 'boolean' then
    v_prev_active := (v_prev_engine->>'active')::boolean;

    if not v_prev_active and v_active and v_kind not in ('start','late_start') then
      raise exception 'invalid_stack_restart_transition' using errcode='22023';
    end if;
    if v_prev_active and not v_active and v_kind not in ('win','finish','timeout') then
      raise exception 'invalid_stack_end_transition' using errcode='22023';
    end if;

    if v_prev_active then
      if jsonb_typeof(v_prev_engine->'seed') <> 'number'
         or jsonb_typeof(v_prev_engine->'startedAt') <> 'number' then
        raise exception 'invalid_previous_stack_state' using errcode='22023';
      end if;
      v_prev_seed := (v_prev_engine->>'seed')::numeric;
      v_prev_started := (v_prev_engine->>'startedAt')::numeric;
      if v_seed <> v_prev_seed or v_started <> v_prev_started then
        raise exception 'stack_round_identity_mismatch' using errcode='22023';
      end if;
    end if;

    if jsonb_typeof(v_prev_engine->'tiles') = 'array'
       and jsonb_array_length(v_prev_engine->'tiles') = 90
       and v_tiles = 90 then
      select jsonb_agg(jsonb_build_array(tile->>'id',tile->'x',tile->'y',tile->'layer') order by tile->>'id'),
             jsonb_agg(jsonb_build_array(tile->>'id',tile->>'type') order by tile->>'id'),
             count(*) filter (where (tile->>'removed')::boolean)
        into v_prev_layout, v_prev_piece_identity, v_prev_removed
      from jsonb_array_elements(v_prev_engine->'tiles') as t(tile);

      select jsonb_agg(jsonb_build_array(tile->>'id',tile->'x',tile->'y',tile->'layer') order by tile->>'id'),
             jsonb_agg(jsonb_build_array(tile->>'id',tile->>'type') order by tile->>'id')
        into v_layout, v_piece_identity
      from jsonb_array_elements(v_engine->'tiles') as t(tile);

      if v_layout is distinct from v_prev_layout then
        raise exception 'stack_board_layout_mutation' using errcode='22023';
      end if;
      if v_kind not in ('power_fluxo','power_troca')
         and v_piece_identity is distinct from v_prev_piece_identity then
        raise exception 'stack_piece_identity_mutation' using errcode='22023';
      end if;
      if v_removed < v_prev_removed and v_kind not in ('undo','power_desfazer') then
        raise exception 'stack_illegal_tile_restore' using errcode='22023';
      end if;
      if v_removed - v_prev_removed > 36 then
        raise exception 'stack_excessive_tile_delta' using errcode='22023';
      end if;
    end if;

    if v_prev_active and v_active
       and jsonb_typeof(v_prev_engine->'score') = 'number'
       and jsonb_typeof(v_prev_engine->'matches') = 'number' then
      v_prev_score := (v_prev_engine->>'score')::numeric;
      v_prev_matches := (v_prev_engine->>'matches')::numeric;
      if v_kind not in ('undo','power_desfazer') and (v_score < v_prev_score or v_matches < v_prev_matches) then
        raise exception 'stack_progress_regression' using errcode='22023';
      end if;
      if v_matches - v_prev_matches > 1 then
        raise exception 'stack_excessive_match_delta' using errcode='22023';
      end if;
    end if;
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

revoke execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) from public;
revoke execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) from anon;
grant execute on function public.zuno_stack_commit_state(uuid,bigint,jsonb) to authenticated, service_role;
