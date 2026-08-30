create or replace function zuno_private.zuno_stack_server_power_loadout(p_seed bigint,p_round integer)
returns text[] language plpgsql immutable set search_path='' as $$
declare v_sal text[]:=array['explosion','vortice','troca','desfazer']; v_ctl text[]:=array['fase','gelo','fluxo']; v_acc text[]:=array['elo','ima']; a bigint; b bigint; c bigint;
begin a:=(('x'||substr(md5(p_seed::text||':'||p_round::text||':salvation'),1,8))::bit(32)::bigint); b:=(('x'||substr(md5(p_seed::text||':'||p_round::text||':control'),1,8))::bit(32)::bigint); c:=(('x'||substr(md5(p_seed::text||':'||p_round::text||':acceleration'),1,8))::bit(32)::bigint); return array[v_sal[(a%4)+1],v_ctl[(b%3)+1],v_acc[(c%2)+1]]; end;$$;

create or replace function zuno_private.zuno_stack_power_state_guard()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_old_active boolean:=coalesce((old.state#>>'{engine,active}')::boolean,false);
  v_new_active boolean:=coalesce((new.state#>>'{engine,active}')::boolean,false);
  v_kind text:=coalesce(new.state->>'kind','');
  v_seed bigint; v_round integer; v_selected text[]; v_charges jsonb; v_systems jsonb; v_server jsonb;
begin
  if not v_old_active and v_new_active and v_kind='start' then
    v_seed:=coalesce((new.state#>>'{engine,seed}')::bigint,0);
    v_round:=coalesce((old.state#>>'{serverPowers,round}')::integer,0)+1;
    v_selected:=zuno_private.zuno_stack_server_power_loadout(v_seed,v_round);
    select coalesce(jsonb_object_agg(x,1),'{}'::jsonb) into v_charges from unnest(v_selected) x;
    v_server:=jsonb_build_object('version',1,'round',v_round,'selected',to_jsonb(v_selected),'charges',v_charges,'recharge30Used',false);
    v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb)||jsonb_build_object('seed',v_seed,'round',v_round,'selected',to_jsonb(v_selected),'charges',v_charges,'powerLockUntil',0);
    new.state:=new.state||jsonb_build_object('serverPowers',v_server,'systems',v_systems,'mechanics',v_systems);
    return new;
  end if;
  if v_old_active and v_new_active and current_user not in ('postgres','service_role','supabase_admin') then
    v_server:=old.state->'serverPowers';
    if jsonb_typeof(v_server)='object' then
      v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb)||jsonb_build_object('round',coalesce((v_server->>'round')::integer,0),'selected',coalesce(v_server->'selected','[]'::jsonb),'charges',coalesce(v_server->'charges','{}'::jsonb));
      new.state:=jsonb_set(new.state,'{serverPowers}',v_server,true)||jsonb_build_object('systems',v_systems,'mechanics',v_systems);
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_zuno_stack_power_state_guard on public.zuno_stack_match_state;
create trigger trg_zuno_stack_power_state_guard before update on public.zuno_stack_match_state for each row execute function zuno_private.zuno_stack_power_state_guard();

create or replace function zuno_private.zuno_stack_apply_power_internal(p_room_id uuid,p_expected_revision bigint,p_action_id text,p_power text)
returns public.zuno_stack_match_state
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_row public.zuno_stack_match_state; v_existing public.zuno_stack_game_events;
  v_state jsonb; v_engine jsonb; v_tiles jsonb; v_tray jsonb; v_server jsonb; v_selected jsonb; v_charges jsonb; v_systems jsonb;
  v_score integer; v_matches integer; v_energy integer; v_combo integer; v_best integer; v_last bigint; v_removed integer; v_cost integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_salt text; v_tray_index integer; v_target jsonb; v_target_ord integer; v_old_tray text; v_incoming text; v_type_count integer; v_remove_ord integer[]; v_phase text; v_combo_rewards jsonb; v_mult integer:=1; v_new_revision bigint;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision<1 or p_action_id is null or length(p_action_id)<8 or length(p_action_id)>160 or p_power not in ('fluxo','troca') then raise exception 'invalid_stack_power_request' using errcode='22023'; end if;
  if not (exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user) or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)) then raise exception 'stack_room_membership_required' using errcode='42501'; end if;
  select * into v_existing from public.zuno_stack_game_events e where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user or v_existing.event_type<>'server_power' or v_existing.payload->>'power' is distinct from p_power or coalesce((v_existing.payload->>'expected_revision')::bigint,-1)<>p_expected_revision then raise exception 'stack_action_id_conflict' using errcode='22023'; end if;
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
  if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=p_power) then raise exception 'stack_power_not_selected' using errcode='42501'; end if;
  if coalesce((v_charges->>p_power)::integer,0)<=0 then raise exception 'stack_power_no_charge' using errcode='22023'; end if;
  v_tiles:=v_engine->'tiles'; v_tray:=v_engine->'tray';
  select count(*) into v_removed from jsonb_array_elements(v_tiles) e(tile) where coalesce((e.tile->>'removed')::boolean,false);
  v_phase:=case when v_removed<27 then 'opening' when v_removed<45 then 'development' when v_removed<68 then 'pressure' else 'final' end;
  v_cost:=case when p_power='troca' and v_phase='final' then 0 else 1 end;
  v_energy:=coalesce((v_engine->>'energy')::integer,0); if v_energy<v_cost then raise exception 'stack_power_not_ready' using errcode='22023'; end if;
  v_score:=coalesce((v_engine->>'score')::integer,0); v_matches:=coalesce((v_engine->>'matches')::integer,0); v_combo:=coalesce((v_engine->>'combo')::integer,0); v_best:=coalesce((v_engine->>'bestCombo')::integer,0); v_last:=coalesce((v_engine->>'lastMatchAt')::bigint,0); v_energy:=v_energy-v_cost;
  v_systems:=coalesce(v_state->'systems',v_state->'mechanics','{}'::jsonb); v_combo_rewards:=coalesce(v_systems->'comboRewards','[]'::jsonb);
  if p_power='fluxo' then
    if (select count(*) from jsonb_array_elements(v_tiles) e(tile) where not coalesce((e.tile->>'removed')::boolean,false))<2 then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    v_salt:=gen_random_uuid()::text;
    with rem as (select e.ord::integer ord,e.tile from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false)), pos as (select ord,row_number() over(order by ord) rn from rem), typ as (select tile->>'type' type,row_number() over(order by md5(v_salt||':'||ord::text),ord) rn from rem), mp as (select pos.ord,typ.type from pos join typ using(rn))
    select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=least(25000,v_score+40);
  else
    if jsonb_array_length(v_tray)=0 then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    with tc as (select val,count(*) n from jsonb_array_elements_text(v_tray) e(val) group by val)
    select (e.ord-1)::integer,e.val into v_tray_index,v_old_tray from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) left join tc on tc.val=e.val order by (case when tc.n=1 then 100 when tc.n=2 then -50 else 0 end) desc,e.ord asc limit 1;
    select e.tile,e.ord::integer into v_target,v_target_ord from jsonb_array_elements(v_tiles) with ordinality e(tile,ord)
    where not coalesce((e.tile->>'removed')::boolean,false) and not exists(select 1 from jsonb_array_elements(v_tiles) h(tile) where not coalesce((h.tile->>'removed')::boolean,false) and (h.tile->>'x')::integer=(e.tile->>'x')::integer and (h.tile->>'y')::integer=(e.tile->>'y')::integer and (h.tile->>'layer')::integer>(e.tile->>'layer')::integer)
    order by (select count(*) from jsonb_array_elements_text(v_tray) q(val) where q.val=e.tile->>'type') desc,e.ord asc limit 1;
    if v_target is null then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    v_incoming:=v_target->>'type'; v_tray:=jsonb_set(v_tray,array[v_tray_index::text],to_jsonb(v_incoming),false);
    select jsonb_agg(case when e.ord=v_target_ord then jsonb_set(e.tile,'{type}',to_jsonb(v_old_tray),false) else e.tile end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord);
    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) e(val) where e.val=v_incoming;
    if v_type_count>=3 then
      select array_agg(s.ord::integer) into v_remove_ord from (select e.ord from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where e.val=v_incoming order by e.ord desc limit 3) s;
      select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where not (e.ord::integer=any(v_remove_ord));
      v_matches:=v_matches+1; if v_last>0 and v_now-v_last<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if; v_last:=v_now; v_best:=greatest(v_best,v_combo); v_energy:=least(5,v_energy+1); v_score:=least(25000,v_score+310);
      if v_phase='development' then v_score:=least(25000,v_score+25); elsif v_phase='pressure' then v_score:=least(25000,v_score+40); elsif v_phase='final' then v_score:=least(25000,v_score+60); end if;
      if v_combo in (3,6,9,12) and not (v_combo_rewards @> to_jsonb(array[v_combo])) then v_mult:=case when coalesce((v_systems->>'metaSurgeUntil')::bigint,0)>v_now then 2 else 1 end; v_score:=least(25000,v_score+v_combo*25*v_mult); v_combo_rewards:=v_combo_rewards||to_jsonb(v_combo); end if;
    end if;
    v_score:=least(25000,v_score+55);
  end if;
  v_charges:=jsonb_set(v_charges,array[p_power],'0'::jsonb,true); v_server:=jsonb_set(v_server,'{charges}',v_charges,true); v_systems:=jsonb_set(v_systems,'{charges}',v_charges,true); v_systems:=v_systems||jsonb_build_object('combo',v_combo,'bestCombo',v_best,'lastComboAt',v_last,'comboRewards',v_combo_rewards,'phase',v_phase);
  v_engine:=v_engine||jsonb_build_object('tiles',v_tiles,'tray',v_tray,'score',v_score,'matches',v_matches,'energy',v_energy,'combo',v_combo,'bestCombo',v_best,'lastMatchAt',v_last,'serverUndo','null'::jsonb);
  v_new_revision:=v_row.revision+1; v_state:=v_state||jsonb_build_object('kind','power_'||p_power,'engine',v_engine,'serverPowers',v_server,'systems',v_systems,'mechanics',v_systems,'actor',v_user::text,'at',v_now);
  update public.zuno_stack_match_state set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now() where room_id=p_room_id returning * into v_row;
  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id) values(p_room_id,p_action_id,'server_power',jsonb_build_object('power',p_power,'expected_revision',p_expected_revision,'applied_revision',v_new_revision,'cost',v_cost),v_user);
  return v_row;
end;$$;

create or replace function public.zuno_stack_power(p_room_id uuid,p_expected_revision bigint,p_action_id text,p_power text)
returns public.zuno_stack_match_state language sql security invoker set search_path='' as $$ select zuno_private.zuno_stack_apply_power_internal(p_room_id,p_expected_revision,p_action_id,p_power); $$;

revoke all on function public.zuno_stack_power(uuid,bigint,text,text) from public,anon;
grant execute on function public.zuno_stack_power(uuid,bigint,text,text) to authenticated,service_role;
revoke all on function zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text) from public,anon;
grant execute on function zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text) to authenticated,service_role;
revoke all on function zuno_private.zuno_stack_server_power_loadout(bigint,integer) from public,anon,authenticated;
grant execute on function zuno_private.zuno_stack_server_power_loadout(bigint,integer) to service_role;
revoke all on function zuno_private.zuno_stack_power_state_guard() from public,anon,authenticated;
grant execute on function zuno_private.zuno_stack_power_state_guard() to service_role;
