create or replace function zuno_private.zuno_stack_apply_hint_internal(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.zuno_stack_match_state;
  v_existing public.zuno_stack_game_events;
  v_state jsonb;
  v_engine jsonb;
  v_tiles jsonb;
  v_tray jsonb;
  v_hints integer;
  v_tile_id text;
  v_tile_type text;
  v_same integer;
  v_hint_kind text;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_new_revision bigint;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_action_id is null or length(p_action_id) < 8 or length(p_action_id) > 160 then
    raise exception 'invalid_stack_hint_request' using errcode='22023';
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
       or v_existing.event_type <> 'server_hint'
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    select * into v_row from public.zuno_stack_match_state where room_id=p_room_id;
    if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
    return jsonb_build_object(
      'revision', v_row.revision,
      'tile_id', v_existing.payload->>'tile_id',
      'hint_kind', v_existing.payload->>'hint_kind',
      'hints_left', coalesce((v_row.state#>>'{engine,hintsLeft}')::integer,0)
    );
  end if;

  select * into v_row
  from public.zuno_stack_match_state
  where room_id=p_room_id
  for update;
  if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
  if v_row.revision <> p_expected_revision then raise exception 'revision_conflict'; end if;
  if exists(
    select 1 from public.zuno_stack_game_events e
    where e.room_id=p_room_id and e.actor_id=v_user and e.event_type='server_hint'
      and e.created_at > now()-interval '150 milliseconds'
  ) then
    raise exception 'stack_action_rate_limited' using errcode='42900';
  end if;

  v_state := v_row.state;
  v_engine := v_state->'engine';
  if jsonb_typeof(v_engine)<>'object'
     or jsonb_typeof(v_engine->'tiles')<>'array'
     or jsonb_typeof(v_engine->'tray')<>'array'
     or coalesce((v_engine->>'active')::boolean,false) is not true then
    raise exception 'stack_round_not_active' using errcode='22023';
  end if;
  v_tiles := v_engine->'tiles';
  v_tray := v_engine->'tray';
  v_hints := coalesce((v_engine->>'hintsLeft')::integer,0);
  if jsonb_array_length(v_tiles)<>90 then raise exception 'invalid_stack_round_shape' using errcode='22023'; end if;
  if v_hints <= 0 then raise exception 'stack_hint_unavailable' using errcode='22023'; end if;

  with tray_counts as (
    select val, count(*)::integer as n
    from jsonb_array_elements_text(v_tray) as t(val)
    group by val
  ), candidates as (
    select
      e.tile,
      e.ord,
      coalesce(tc.n,0) as same_count,
      (case coalesce(tc.n,0) when 2 then 100 when 1 then 50 else 0 end)
      + case when jsonb_array_length(v_tray) >= 5 and coalesce(tc.n,0)=0 then -40 else 0 end
      + 4 * (
        select count(*)
        from jsonb_array_elements(v_tiles) as low(tile)
        where not coalesce((low.tile->>'removed')::boolean,false)
          and (low.tile->>'x')::integer=(e.tile->>'x')::integer
          and (low.tile->>'y')::integer=(e.tile->>'y')::integer
          and (low.tile->>'layer')::integer<(e.tile->>'layer')::integer
      ) as hint_score
    from jsonb_array_elements(v_tiles) with ordinality as e(tile,ord)
    left join tray_counts tc on tc.val=e.tile->>'type'
    where not coalesce((e.tile->>'removed')::boolean,false)
      and not exists(
        select 1
        from jsonb_array_elements(v_tiles) as high(tile)
        where not coalesce((high.tile->>'removed')::boolean,false)
          and (high.tile->>'x')::integer=(e.tile->>'x')::integer
          and (high.tile->>'y')::integer=(e.tile->>'y')::integer
          and (high.tile->>'layer')::integer>(e.tile->>'layer')::integer
      )
  )
  select tile->>'id', tile->>'type', same_count
    into v_tile_id, v_tile_type, v_same
  from candidates
  order by hint_score desc, ord asc
  limit 1;

  if v_tile_id is null then raise exception 'stack_hint_target_missing' using errcode='22023'; end if;
  v_hint_kind := case when v_same=2 then 'trio' when v_same=1 then 'pair' else 'opening' end;
  v_hints := v_hints-1;
  v_new_revision := v_row.revision+1;
  v_engine := jsonb_set(v_engine,'{hintsLeft}',to_jsonb(v_hints),false);
  v_state := v_state || jsonb_build_object(
    'kind','server_hint',
    'engine',v_engine,
    'actor',v_user::text,
    'at',v_now_ms
  );

  update public.zuno_stack_match_state
  set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now()
  where room_id=p_room_id
  returning * into v_row;

  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(
    p_room_id,p_action_id,'server_hint',
    jsonb_build_object(
      'expected_revision',p_expected_revision,
      'applied_revision',v_new_revision,
      'tile_id',v_tile_id,
      'tile_type',v_tile_type,
      'hint_kind',v_hint_kind,
      'hints_left',v_hints
    ),
    v_user
  );

  return jsonb_build_object(
    'revision',v_new_revision,
    'tile_id',v_tile_id,
    'hint_kind',v_hint_kind,
    'hints_left',v_hints
  );
end;
$$;

create or replace function public.zuno_stack_hint(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text
)
returns jsonb
language sql
set search_path = ''
as $$
  select zuno_private.zuno_stack_apply_hint_internal(p_room_id,p_expected_revision,p_action_id);
$$;

revoke execute on function zuno_private.zuno_stack_apply_hint_internal(uuid,bigint,text) from public, anon;
revoke execute on function public.zuno_stack_hint(uuid,bigint,text) from public, anon;
grant execute on function zuno_private.zuno_stack_apply_hint_internal(uuid,bigint,text) to authenticated, service_role;
grant execute on function public.zuno_stack_hint(uuid,bigint,text) to authenticated, service_role;

create or replace function zuno_private.reject_client_stack_active_engine_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_privileged boolean := current_user in ('postgres','service_role','supabase_admin');
  v_old_engine jsonb := old.state->'engine';
  v_new_engine jsonb := new.state->'engine';
  v_old_active boolean := coalesce((v_old_engine->>'active')::boolean,false);
  v_new_active boolean := coalesce((v_new_engine->>'active')::boolean,false);
  v_kind text := coalesce(new.state->>'kind','');
begin
  if v_privileged or new.state is not distinct from old.state then
    return new;
  end if;
  if jsonb_typeof(v_old_engine) <> 'object' or jsonb_typeof(v_new_engine) <> 'object' then
    return new;
  end if;
  if not v_old_active and v_new_active and v_kind <> 'start' then
    raise exception 'stack_server_start_required' using errcode='42501';
  end if;
  if v_old_active and v_new_engine is distinct from v_old_engine then
    raise exception 'stack_server_action_required' using errcode='42501';
  end if;
  return new;
end;
$$;
