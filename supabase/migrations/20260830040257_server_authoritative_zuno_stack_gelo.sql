create or replace function zuno_private.zuno_stack_timer_state_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_old_active boolean:=coalesce((old.state#>>'{engine,active}')::boolean,false);
  v_new_active boolean:=coalesce((new.state#>>'{engine,active}')::boolean,false);
  v_kind text:=coalesce(new.state->>'kind','');
  v_started bigint; v_deadline bigint; v_duration bigint; v_timer jsonb; v_systems jsonb;
begin
  if not v_old_active and v_new_active and v_kind='start' then
    v_started:=coalesce((new.state#>>'{engine,startedAt}')::bigint,0);
    v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb);
    v_deadline:=coalesce((v_systems->>'deadlineAt')::bigint,0);
    v_duration:=v_deadline-v_started;
    if v_started<=0 or v_duration not in (180000,300000) then raise exception 'stack_timer_invalid_start' using errcode='22023'; end if;
    v_timer:=jsonb_build_object('version',1,'baseDeadlineAt',v_deadline,'deadlineAt',v_deadline,'freezeUntil',0,'geloExtensions',0);
    v_systems:=v_systems||jsonb_build_object('deadlineAt',v_deadline,'freezeUntil',0);
    new.state:=new.state||jsonb_build_object('serverTimer',v_timer,'systems',v_systems,'mechanics',v_systems);
    return new;
  end if;
  if v_old_active and v_new_active and current_user not in ('postgres','service_role','supabase_admin') then
    v_timer:=old.state->'serverTimer';
    if jsonb_typeof(v_timer)='object' then
      v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb)||jsonb_build_object('deadlineAt',coalesce((v_timer->>'deadlineAt')::bigint,0),'freezeUntil',coalesce((v_timer->>'freezeUntil')::bigint,0));
      new.state:=new.state||jsonb_build_object('serverTimer',v_timer,'systems',v_systems,'mechanics',v_systems);
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_zuno_stack_timer_state_guard on public.zuno_stack_match_state;
create trigger trg_zuno_stack_timer_state_guard before update on public.zuno_stack_match_state for each row execute function zuno_private.zuno_stack_timer_state_guard();

create or replace function zuno_private.zuno_stack_apply_gelo_internal(p_room_id uuid,p_expected_revision bigint,p_action_id text)
returns public.zuno_stack_match_state
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_row public.zuno_stack_match_state; v_existing public.zuno_stack_game_events;
  v_state jsonb; v_engine jsonb; v_server jsonb; v_timer jsonb; v_systems jsonb; v_charges jsonb;
  v_energy integer; v_score integer; v_removed integer; v_phase text; v_cost integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_deadline bigint; v_freeze bigint; v_extensions integer; v_new_revision bigint;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision<1 or p_action_id is null or length(p_action_id)<8 or length(p_action_id)>160 then raise exception 'invalid_stack_gelo_request' using errcode='22023'; end if;
  if not (exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user) or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)) then raise exception 'stack_room_membership_required' using errcode='42501'; end if;
  select * into v_existing from public.zuno_stack_game_events e where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user or v_existing.event_type<>'server_power' or v_existing.payload->>'power'<>'gelo' or coalesce((v_existing.payload->>'expected_revision')::bigint,-1)<>p_expected_revision then raise exception 'stack_action_id_conflict' using errcode='22023'; end if;
    select * into v_row from public.zuno_stack_match_state where room_id=p_room_id; return v_row;
  end if;
  select * into v_row from public.zuno_stack_match_state where room_id=p_room_id for update;
  if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
  if v_row.revision<>p_expected_revision then raise exception 'revision_conflict'; end if;
  if exists(select 1 from public.zuno_stack_game_events e where e.room_id=p_room_id and e.actor_id=v_user and e.event_type='server_power' and e.created_at>now()-interval '900 milliseconds') then raise exception 'stack_power_rate_limited' using errcode='42900'; end if;
  v_state:=v_row.state; v_engine:=v_state->'engine'; v_server:=v_state->'serverPowers'; v_timer:=v_state->'serverTimer';
  if jsonb_typeof(v_engine)<>'object' or coalesce((v_engine->>'active')::boolean,false) is not true then raise exception 'stack_round_not_active' using errcode='22023'; end if;
  if jsonb_typeof(v_server)<>'object' or jsonb_typeof(v_timer)<>'object' then raise exception 'stack_power_state_missing' using errcode='22023'; end if;
  if not exists(select 1 from jsonb_array_elements_text(coalesce(v_server->'selected','[]'::jsonb)) x(val) where x.val='gelo') then raise exception 'stack_power_not_selected' using errcode='42501'; end if;
  v_charges:=coalesce(v_server->'charges','{}'::jsonb); if coalesce((v_charges->>'gelo')::integer,0)<=0 then raise exception 'stack_power_no_charge' using errcode='22023'; end if;
  select count(*) into v_removed from jsonb_array_elements(v_engine->'tiles') e(tile) where coalesce((e.tile->>'removed')::boolean,false);
  v_phase:=case when v_removed<27 then 'opening' when v_removed<45 then 'development' when v_removed<68 then 'pressure' else 'final' end;
  v_cost:=case when v_phase='pressure' then 1 else 2 end;
  v_energy:=coalesce((v_engine->>'energy')::integer,0); if v_energy<v_cost then raise exception 'stack_power_not_ready' using errcode='22023'; end if;
  v_score:=coalesce((v_engine->>'score')::integer,0); v_energy:=v_energy-v_cost; v_score:=least(25000,v_score+40);
  v_deadline:=coalesce((v_timer->>'deadlineAt')::bigint,0)+5000; v_freeze:=greatest(v_now,coalesce((v_timer->>'freezeUntil')::bigint,0))+5000; v_extensions:=coalesce((v_timer->>'geloExtensions')::integer,0)+1;
  v_timer:=v_timer||jsonb_build_object('deadlineAt',v_deadline,'freezeUntil',v_freeze,'geloExtensions',v_extensions);
  v_charges:=jsonb_set(v_charges,'{gelo}','0'::jsonb,true); v_server:=jsonb_set(v_server,'{charges}',v_charges,true);
  v_systems:=coalesce(v_state->'systems',v_state->'mechanics','{}'::jsonb)||jsonb_build_object('deadlineAt',v_deadline,'freezeUntil',v_freeze,'charges',v_charges,'phase',v_phase);
  v_engine:=v_engine||jsonb_build_object('energy',v_energy,'score',v_score);
  v_new_revision:=v_row.revision+1; v_state:=v_state||jsonb_build_object('kind','power_gelo','engine',v_engine,'serverPowers',v_server,'serverTimer',v_timer,'systems',v_systems,'mechanics',v_systems,'actor',v_user::text,'at',v_now);
  update public.zuno_stack_match_state set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now() where room_id=p_room_id returning * into v_row;
  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id) values(p_room_id,p_action_id,'server_power',jsonb_build_object('power','gelo','expected_revision',p_expected_revision,'applied_revision',v_new_revision,'cost',v_cost,'deadlineAt',v_deadline,'freezeUntil',v_freeze),v_user);
  return v_row;
end;$$;

create or replace function public.zuno_stack_gelo(p_room_id uuid,p_expected_revision bigint,p_action_id text)
returns public.zuno_stack_match_state language sql security invoker set search_path='' as $$ select zuno_private.zuno_stack_apply_gelo_internal(p_room_id,p_expected_revision,p_action_id); $$;

revoke all on function public.zuno_stack_gelo(uuid,bigint,text) from public,anon;
grant execute on function public.zuno_stack_gelo(uuid,bigint,text) to authenticated,service_role;
revoke all on function zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text) from public,anon;
grant execute on function zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text) to authenticated,service_role;
revoke all on function zuno_private.zuno_stack_timer_state_guard() from public,anon,authenticated;
grant execute on function zuno_private.zuno_stack_timer_state_guard() to service_role;
