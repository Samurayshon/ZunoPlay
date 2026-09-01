\set ON_ERROR_STOP on

-- Sixteenth extraction final catalog verification: Board Power, Gelo and
-- Desfazer share one private charge-consumption transition. Recharge,
-- persistence, energy, rewards, timers, undo and events remain caller-owned.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_volatility "char";
  v_security_definer boolean;
  v_recharge_anchor constant text := 'v_charges:=jsonb_set(v_charges,array[v_recharge],''1''::jsonb,true);';
begin
  if to_regprocedure('zuno_private.zuno_stack_consume_power_charge(jsonb,text)') is null then
    raise exception 'stack_power_charge_consumption_catalog_helper_missing';
  end if;

  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_power;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_gelo;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_desfazer;

  if regexp_count(v_power,'zuno_private\.zuno_stack_consume_power_charge\(v_charges,p_power\)') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_consume_power_charge\(v_charges,''gelo''\)') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_consume_power_charge\(v_charges,''desfazer''\)') <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_wiring_invalid';
  end if;

  if position('v_charges:=jsonb_set(v_charges,array[p_power],''0''::jsonb,true);' in v_power) <> 0
     or position('v_charges:=jsonb_set(v_charges,''{gelo}'',''0''::jsonb,true);' in v_gelo) <> 0
     or position('v_charges:=jsonb_set(v_charges,''{desfazer}'',''0''::jsonb,true);' in v_desfazer) <> 0 then
    raise exception 'stack_power_charge_consumption_catalog_inline_consumption_survived';
  end if;

  -- Board Power threshold recharge is intentionally a separate caller-owned rule.
  if (length(v_power)-length(replace(v_power,v_recharge_anchor,'')))/length(v_recharge_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_recharge_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_charge\(') <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_guard_changed';
  end if;
  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_cost_changed';
  end if;
  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_energy\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_energy\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_energy\(') <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_energy_changed';
  end if;
  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_phase\(') <> 1 then
    raise exception 'stack_power_charge_consumption_catalog_phase_changed';
  end if;
  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2
     or regexp_count(v_power,'zuno_private\.zuno_stack_cap_energy\(') <> 5 then
    raise exception 'stack_power_charge_consumption_catalog_board_prior_extractions_changed';
  end if;

  select p.provolatile,p.prosecdef
    into v_volatility,v_security_definer
  from pg_proc p
  where p.oid='zuno_private.zuno_stack_consume_power_charge(jsonb,text)'::regprocedure;

  if v_volatility <> 'i' or v_security_definer then
    raise exception 'stack_power_charge_consumption_catalog_helper_attributes_changed';
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_consume_power_charge(jsonb,text)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_consume_power_charge(jsonb,text)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_consume_power_charge(jsonb,text)','EXECUTE') then
    raise exception 'stack_power_charge_consumption_catalog_helper_exposed';
  end if;
end;
$$;

-- Direct semantic characterization of the original jsonb_set transition.
do $$
declare
  v_result jsonb;
begin
  v_result := zuno_private.zuno_stack_consume_power_charge('{"fluxo":1,"gelo":2}'::jsonb,'fluxo');
  if v_result is distinct from '{"fluxo":0,"gelo":2}'::jsonb then
    raise exception 'stack_power_charge_consumption_catalog_existing_key_changed:%',v_result;
  end if;

  v_result := zuno_private.zuno_stack_consume_power_charge('{"fluxo":1}'::jsonb,'desfazer');
  if v_result is distinct from '{"fluxo":1,"desfazer":0}'::jsonb then
    raise exception 'stack_power_charge_consumption_catalog_missing_key_changed:%',v_result;
  end if;

  v_result := zuno_private.zuno_stack_consume_power_charge('{}'::jsonb,'gelo');
  if v_result is distinct from '{"gelo":0}'::jsonb then
    raise exception 'stack_power_charge_consumption_catalog_empty_map_changed:%',v_result;
  end if;

  if zuno_private.zuno_stack_consume_power_charge(null,'gelo') is not null then
    raise exception 'stack_power_charge_consumption_catalog_null_map_changed';
  end if;
end;
$$;

select 'zuno_stack_power_charge_consumption_catalog_characterization_ok' as result;
