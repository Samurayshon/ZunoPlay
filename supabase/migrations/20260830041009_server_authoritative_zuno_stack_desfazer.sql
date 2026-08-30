create or replace function zuno_private.zuno_stack_apply_desfazer_internal(p_room_id uuid,p_expected_revision bigint,p_action_id text)
returns public.zuno_stack_match_state
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid();
  v_row public.zuno_stack_match_state;
  v_existing public.zuno_stack_game_events;
  v_state jsonb; v_engine jsonb; v_undo jsonb; v_before jsonb; v_tiles jsonb;
  v_server jsonb; v_selected jsonb; v_charges jsonb; v_systems jsonb;
  v_tile_id text; v_undo_left integer; v_removed integer; v_phase text; v_cost integer;
  v_current_energy integer; v_restored_energy integer; v_now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint; v_new_revision bigint;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision<1 or p_action_id is null or length(p_action_id)<8 or length(p_action_id)>160 then raise exception 'invalid_stack_desfazer_request' using errcode='22023'; end if;
  if not (exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user) or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)) then raise exception 'stack_room_membership_required' using errcode='42501'; end if;
  select * into v_existing from public.zuno_stack_game_events e where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user or v_existing.event_type<>'server_power' or v_existing.payload->>'power' is distinct from 'desfazer' or coalesce((v_existing.payload->>'expected_revision')::bigint,-1)<>p_expected_revision then raise exception 'stack_action_id_conflict' using errcode='22023'; end if;
    select * into v_row from public.zuno_stack_match_state where room_id=p_room_id; return v_row;
  end if;
  select * into v_row from public.zuno_stack_match_state where room_id=p_room_id for update;
  if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
  if v_row.revision<>p_expected_revision then raise exception 'revision_conflict'; end if;
  if exists(select 1 from public.zuno_stack_game_events e where e.room_id=p_room_id and e.actor_id=v_user and e.event_type='server_power' and e.created_at>now()-interval '900 milliseconds') then raise exception 'stack_power_rate_limited' using errcode='42900'; end if;
  v_state:=v_row.state; v_engine:=v_state->'engine'; v_server:=v_state->'serverPowers';
  if jsonb_typeof(v_engine)<>'object' or coalesce((v_engine->>'active')::boolean,false) is not true then raise exception 'stack_round_not_active' using errcode='22023'; end if;
  if jsonb_typeof(v_server)<>'object' then raise exception 'stack_power_state_missing' using errcode='22023'; end if;
  v_selected:=coalesce(v_server->'selected','[]'::jsonb); v_charges:=coalesce(v_server->'charges','{}'::jsonb);
  if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val='desfazer') then raise exception 'stack_power_not_selected' using errcode='42501'; end if;
  if coalesce((v_charges->>'desfazer')::integer,0)<=0 then raise exception 'stack_power_no_charge' using errcode='22023'; end if;
  select count(*) into v_removed from jsonb_array_elements(v_engine->'tiles') e(tile) where coalesce((e.tile->>'removed')::boolean,false);
  v_phase:=case when v_removed<27 then 'opening' when v_removed<45 then 'development' when v_removed<68 then 'pressure' else 'final' end;
  v_cost:=case when v_phase='final' then 0 else 1 end;
  v_current_energy:=coalesce((v_engine->>'energy')::integer,0); if v_current_energy<v_cost then raise exception 'stack_power_not_ready' using errcode='22023'; end if;
  v_undo:=v_engine->'serverUndo'; v_undo_left:=coalesce((v_engine->>'undoLeft')::integer,0);
  if jsonb_typeof(v_undo)<>'object' or v_undo_left<=0 or v_undo->>'actor' is distinct from v_user::text or coalesce((v_undo->>'revision')::bigint,-1)<>v_row.revision then raise exception 'stack_undo_unavailable' using errcode='42501'; end if;
  v_before:=v_undo->'before'; v_tile_id:=v_undo->>'tileId'; if jsonb_typeof(v_before)<>'object' or v_tile_id is null then raise exception 'stack_undo_corrupt' using errcode='22023'; end if;
  select jsonb_agg(case when e.tile->>'id'=v_tile_id then jsonb_set(e.tile,'{removed}','false'::jsonb,false) else e.tile end order by e.ord) into v_tiles from jsonb_array_elements(v_engine->'tiles') with ordinality as e(tile,ord);
  v_restored_energy:=greatest(0,coalesce((v_before->>'energy')::integer,0)-v_cost);
  v_engine:=v_engine||jsonb_build_object('tiles',v_tiles,'tray',v_before->'tray','relay',v_before->'relay','score',(v_before->>'score')::integer,'matches',(v_before->>'matches')::integer,'energy',v_restored_energy,'pulseEventCount',(v_before->>'pulseEventCount')::integer,'doubleNext',(v_before->>'doubleNext')::boolean,'combo',(v_before->>'combo')::integer,'bestCombo',(v_before->>'bestCombo')::integer,'lastMatchAt',(v_before->>'lastMatchAt')::bigint,'relayRev',(v_before->>'relayRev')::bigint,'undoLeft',v_undo_left-1,'serverUndo','null'::jsonb);
  v_charges:=jsonb_set(v_charges,'{desfazer}','0'::jsonb,true); v_server:=jsonb_set(v_server,'{charges}',v_charges,true);
  v_systems:=coalesce(v_state->'systems',v_state->'mechanics','{}'::jsonb); v_systems:=jsonb_set(v_systems,'{charges}',v_charges,true)||jsonb_build_object('powerLockUntil',v_now_ms+900);
  v_new_revision:=v_row.revision+1;
  v_state:=v_state||jsonb_build_object('kind','power_desfazer','engine',v_engine,'serverPowers',v_server,'systems',v_systems,'mechanics',v_systems,'actor',v_user::text,'at',v_now_ms);
  update public.zuno_stack_match_state set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now() where room_id=p_room_id returning * into v_row;
  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id) values(p_room_id,p_action_id,'server_power',jsonb_build_object('power','desfazer','expected_revision',p_expected_revision,'applied_revision',v_new_revision,'cost',v_cost,'tile_id',v_tile_id),v_user);
  return v_row;
end;$$;

create or replace function public.zuno_stack_desfazer(p_room_id uuid,p_expected_revision bigint,p_action_id text)
returns public.zuno_stack_match_state language sql security invoker set search_path='' as $$ select zuno_private.zuno_stack_apply_desfazer_internal(p_room_id,p_expected_revision,p_action_id); $$;

revoke all on function public.zuno_stack_desfazer(uuid,bigint,text) from public,anon;
grant execute on function public.zuno_stack_desfazer(uuid,bigint,text) to authenticated,service_role;
revoke all on function zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text) from public,anon;
grant execute on function zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text) to authenticated,service_role;