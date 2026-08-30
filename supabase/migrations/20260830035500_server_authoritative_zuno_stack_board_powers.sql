create or replace function zuno_private.zuno_stack_apply_power_internal(p_room_id uuid,p_expected_revision bigint,p_action_id text,p_power text)
returns public.zuno_stack_match_state
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_row public.zuno_stack_match_state; v_existing public.zuno_stack_game_events;
  v_state jsonb; v_engine jsonb; v_tiles jsonb; v_tray jsonb; v_server jsonb; v_selected jsonb; v_charges jsonb; v_systems jsonb;
  v_score integer; v_matches integer; v_energy integer; v_combo integer; v_best integer; v_last bigint; v_removed integer; v_removed_after integer; v_cost integer; v_now bigint:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_salt text; v_tray_index integer; v_target jsonb; v_target_ord integer; v_old_tray text; v_incoming text; v_target_type text; v_type_count integer; v_remove_ord integer[]; v_phase text; v_combo_rewards jsonb; v_mult integer:=1; v_new_revision bigint;
  v_active_type text; v_top_layer integer; v_match_delta integer:=0; v_meta_done jsonb; v_seed bigint; v_round integer; v_used text[]; v_recharge text; v_idx integer; v_threshold integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision<1 or p_action_id is null or length(p_action_id)<8 or length(p_action_id)>160 or p_power not in ('fluxo','troca','explosion','elo','fase','vortice','ima') then raise exception 'invalid_stack_power_request' using errcode='22023'; end if;
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
  if jsonb_typeof(v_tiles)<>'array' or jsonb_typeof(v_tray)<>'array' then raise exception 'stack_power_state_invalid' using errcode='22023'; end if;
  select count(*) into v_removed from jsonb_array_elements(v_tiles) e(tile) where coalesce((e.tile->>'removed')::boolean,false);
  v_phase:=case when v_removed<27 then 'opening' when v_removed<45 then 'development' when v_removed<68 then 'pressure' else 'final' end;
  v_cost:=case p_power when 'explosion' then 3 when 'elo' then 2 when 'fase' then 2 when 'vortice' then 2 when 'fluxo' then 1 when 'ima' then 1 when 'troca' then case when v_phase='final' then 0 else 1 end else 99 end;
  v_energy:=coalesce((v_engine->>'energy')::integer,0); if v_energy<v_cost then raise exception 'stack_power_not_ready' using errcode='22023'; end if;
  v_score:=coalesce((v_engine->>'score')::integer,0); v_matches:=coalesce((v_engine->>'matches')::integer,0); v_combo:=coalesce((v_engine->>'combo')::integer,0); v_best:=coalesce((v_engine->>'bestCombo')::integer,0); v_last:=coalesce((v_engine->>'lastMatchAt')::bigint,0); v_energy:=v_energy-v_cost;
  v_systems:=coalesce(v_state->'systems',v_state->'mechanics','{}'::jsonb); v_combo_rewards:=coalesce(v_systems->'comboRewards','[]'::jsonb); v_meta_done:=coalesce(v_systems->'metaDone','[]'::jsonb); v_seed:=coalesce((v_engine->>'seed')::bigint,0); v_round:=coalesce((v_server->>'round')::integer,1);

  if p_power='fluxo' then
    if (select count(*) from jsonb_array_elements(v_tiles) e(tile) where not coalesce((e.tile->>'removed')::boolean,false))<2 then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    v_salt:=gen_random_uuid()::text;
    with rem as (select e.ord::integer ord,e.tile from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false)), pos as (select ord,row_number() over(order by ord) rn from rem), typ as (select tile->>'type' type,row_number() over(order by md5(v_salt||':'||ord::text),ord) rn from rem), mp as (select pos.ord,typ.type from pos join typ using(rn))
    select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=least(25000,v_score+40);
  elsif p_power='troca' then
    if jsonb_array_length(v_tray)=0 then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    with tc as (select val,count(*) n,min(ord) first_ord from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) group by val)
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
      v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=least(25000,v_score+310);
    end if;
    v_score:=least(25000,v_score+55);
  elsif p_power='explosion' then
    with active as (select e.ord::integer ord,e.tile from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false) and not exists(select 1 from jsonb_array_elements(v_tiles) h(tile) where not coalesce((h.tile->>'removed')::boolean,false) and (h.tile->>'x')::integer=(e.tile->>'x')::integer and (h.tile->>'y')::integer=(e.tile->>'y')::integer and (h.tile->>'layer')::integer>(e.tile->>'layer')::integer)), grouped as (select tile->>'type' typ,count(*) n,min(ord) first_ord from active group by tile->>'type')
    select typ into v_active_type from grouped where n>=3 order by first_ord limit 1;
    if v_active_type is null then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    with active as (select e.ord::integer ord,e.tile from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false) and e.tile->>'type'=v_active_type and not exists(select 1 from jsonb_array_elements(v_tiles) h(tile) where not coalesce((h.tile->>'removed')::boolean,false) and (h.tile->>'x')::integer=(e.tile->>'x')::integer and (h.tile->>'y')::integer=(e.tile->>'y')::integer and (h.tile->>'layer')::integer>(e.tile->>'layer')::integer) order by e.ord limit 3), chosen as (select array_agg(ord) ords from active)
    select jsonb_agg(case when e.ord::integer=any(chosen.ords) then jsonb_set(e.tile,'{removed}','true'::jsonb,false) else e.tile end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) cross join chosen;
    v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=least(25000,v_score+450);
  elsif p_power in ('elo','fase','ima') then
    if p_power='elo' then
      with tc as (select val,count(*) n,min(ord) first_ord from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) group by val)
      select tc.val into v_target_type from tc where tc.n>=2 and exists(select 1 from jsonb_array_elements(v_tiles) t(tile) where not coalesce((t.tile->>'removed')::boolean,false) and t.tile->>'type'=tc.val) order by tc.n desc,tc.first_ord limit 1;
      if v_target_type is null then raise exception 'stack_power_no_target' using errcode='22023'; end if;
      select e.tile,e.ord::integer into v_target,v_target_ord from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false) and e.tile->>'type'=v_target_type order by e.ord limit 1;
    elsif p_power='fase' then
      select e.tile,e.ord::integer into v_target,v_target_ord from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false) and exists(select 1 from jsonb_array_elements(v_tiles) h(tile) where not coalesce((h.tile->>'removed')::boolean,false) and (h.tile->>'x')::integer=(e.tile->>'x')::integer and (h.tile->>'y')::integer=(e.tile->>'y')::integer and (h.tile->>'layer')::integer>(e.tile->>'layer')::integer) order by (select count(*) from jsonb_array_elements_text(v_tray) q(val) where q.val=e.tile->>'type') desc,(e.tile->>'layer')::integer desc,e.ord limit 1;
    else
      select e.tile,e.ord::integer into v_target,v_target_ord from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) where not coalesce((e.tile->>'removed')::boolean,false) and not exists(select 1 from jsonb_array_elements(v_tiles) h(tile) where not coalesce((h.tile->>'removed')::boolean,false) and (h.tile->>'x')::integer=(e.tile->>'x')::integer and (h.tile->>'y')::integer=(e.tile->>'y')::integer and (h.tile->>'layer')::integer>(e.tile->>'layer')::integer) and exists(select 1 from jsonb_array_elements_text(v_tray) q(val) where q.val=e.tile->>'type') order by (select count(*) from jsonb_array_elements_text(v_tray) q(val) where q.val=e.tile->>'type') desc,e.ord limit 1;
    end if;
    if v_target is null then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    if jsonb_array_length(v_tray)>=7 then raise exception 'stack_tray_full' using errcode='22023'; end if;
    v_incoming:=v_target->>'type'; v_tray:=v_tray||to_jsonb(v_incoming);
    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) e(val) where e.val=v_incoming;
    if v_type_count>=3 then
      select array_agg(s.ord::integer) into v_remove_ord from (select e.ord from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where e.val=v_incoming order by e.ord desc limit 3) s;
      select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where not (e.ord::integer=any(v_remove_ord));
      v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=least(25000,v_score+310);
    end if;
    select jsonb_agg(case when e.ord=v_target_ord then jsonb_set(e.tile,'{removed}','true'::jsonb,false) else e.tile end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord);
    v_score:=least(25000,v_score+case p_power when 'elo' then 80 when 'fase' then 70 else 60 end);
  elsif p_power='vortice' then
    select max((e.tile->>'layer')::integer) into v_top_layer from jsonb_array_elements(v_tiles) e(tile) where not coalesce((e.tile->>'removed')::boolean,false);
    if v_top_layer is null then raise exception 'stack_power_no_target' using errcode='22023'; end if;
    select jsonb_agg(case when not coalesce((e.tile->>'removed')::boolean,false) and (e.tile->>'layer')::integer=v_top_layer then jsonb_set(e.tile,'{removed}','true'::jsonb,false) else e.tile end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord);
    select count(*) into v_type_count from jsonb_array_elements(v_tiles) e(tile) where coalesce((e.tile->>'removed')::boolean,false) and (e.tile->>'layer')::integer=v_top_layer;
    v_score:=least(25000,v_score+greatest(1,v_type_count)*35);
  end if;

  if v_match_delta>0 then
    v_matches:=v_matches+v_match_delta;
    if v_last>0 and v_now-v_last<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if; v_last:=v_now; v_best:=greatest(v_best,v_combo);
    if v_phase='development' then v_score:=least(25000,v_score+25); elsif v_phase='pressure' then v_score:=least(25000,v_score+40); elsif v_phase='final' then v_score:=least(25000,v_score+60); end if;
    if v_combo in (3,6,9,12) and not (v_combo_rewards @> to_jsonb(array[v_combo])) then v_mult:=case when coalesce((v_systems->>'metaSurgeUntil')::bigint,0)>v_now then 2 else 1 end; v_score:=least(25000,v_score+v_combo*25*v_mult); v_energy:=least(5,v_energy+1); v_combo_rewards:=v_combo_rewards||to_jsonb(v_combo); end if;
  end if;

  select count(*) into v_removed_after from jsonb_array_elements(v_tiles) e(tile) where coalesce((e.tile->>'removed')::boolean,false);
  foreach v_threshold in array array[15,30,45] loop
    if v_removed_after>=v_threshold and not (v_meta_done @> to_jsonb(array[v_threshold])) then
      v_meta_done:=v_meta_done||to_jsonb(v_threshold);
      if v_threshold=15 then v_energy:=least(5,v_energy+1); end if;
      if v_threshold=30 then
        v_energy:=least(5,v_energy+1);
        select array_agg(s.val order by s.ord) into v_used from jsonb_array_elements_text(v_selected) with ordinality s(val,ord) where coalesce((v_charges->>s.val)::integer,0)=0;
        if coalesce(array_length(v_used,1),0)>0 then v_idx:=mod(abs(v_seed+v_round),array_length(v_used,1))+1; v_recharge:=v_used[v_idx]; v_charges:=jsonb_set(v_charges,array[v_recharge],'1'::jsonb,true); end if;
      end if;
      if v_threshold=45 then v_energy:=least(5,v_energy+2); v_score:=least(25000,v_score+300); v_systems:=jsonb_set(v_systems,'{metaSurgeUntil}',to_jsonb(v_now+8000),true); end if;
    end if;
  end loop;

  v_charges:=jsonb_set(v_charges,array[p_power],'0'::jsonb,true); v_server:=jsonb_set(v_server,'{charges}',v_charges,true); v_systems:=jsonb_set(v_systems,'{charges}',v_charges,true);
  v_systems:=v_systems||jsonb_build_object('combo',v_combo,'bestCombo',v_best,'lastComboAt',v_last,'comboRewards',v_combo_rewards,'phase',v_phase,'metaDone',v_meta_done,'powerLockUntil',v_now+900);
  v_engine:=v_engine||jsonb_build_object('tiles',v_tiles,'tray',v_tray,'score',v_score,'matches',v_matches,'energy',v_energy,'combo',v_combo,'bestCombo',v_best,'lastMatchAt',v_last,'serverUndo','null'::jsonb);
  v_new_revision:=v_row.revision+1; v_state:=v_state||jsonb_build_object('kind','power_'||p_power,'engine',v_engine,'serverPowers',v_server,'systems',v_systems,'mechanics',v_systems,'actor',v_user::text,'at',v_now);
  update public.zuno_stack_match_state set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now() where room_id=p_room_id returning * into v_row;
  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id) values(p_room_id,p_action_id,'server_power',jsonb_build_object('power',p_power,'expected_revision',p_expected_revision,'applied_revision',v_new_revision,'cost',v_cost),v_user);
  return v_row;
end;$$;