\set ON_ERROR_STOP on

-- Thirteenth extraction final catalog verification: the selected-power and
-- available-charge decision is private, canonical and wired once into each
-- Board Power, Gelo and Desfazer authority.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_helper text;
  v_def text;
  v_helper_total integer := 0;
  v_not_selected_total integer := 0;
  v_no_charge_total integer := 0;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_charge(jsonb,text)') is null then
    raise exception 'stack_power_charge_guard_catalog_helper_missing';
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
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_require_power_charge(jsonb,text)'::regprocedure
  ), '\s+', '', 'g') into v_helper;

  foreach v_def in array array[v_power,v_gelo,v_desfazer] loop
    v_helper_total := v_helper_total
      + regexp_count(v_def,'zuno_private\.zuno_stack_require_power_charge\(');
    v_not_selected_total := v_not_selected_total
      + (length(v_def)-length(replace(v_def,'stack_power_not_selected','')))/length('stack_power_not_selected');
    v_no_charge_total := v_no_charge_total
      + (length(v_def)-length(replace(v_def,'stack_power_no_charge','')))/length('stack_power_no_charge');
  end loop;

  if v_helper_total <> 3 or v_not_selected_total <> 0 or v_no_charge_total <> 0 then
    raise exception 'stack_power_charge_guard_catalog_wiring_invalid:helper=%,not_selected=%,no_charge=%',
      v_helper_total,v_not_selected_total,v_no_charge_total;
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_charge\(v_server,p_power\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_charge\(v_server,''gelo''\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_charge\(v_server,''desfazer''\);') <> 1 then
    raise exception 'stack_power_charge_guard_catalog_caller_mapping_changed';
  end if;

  if (length(v_helper)-length(replace(v_helper,'stack_power_not_selected','')))/length('stack_power_not_selected') <> 1
     or (length(v_helper)-length(replace(v_helper,'stack_power_no_charge','')))/length('stack_power_no_charge') <> 1 then
    raise exception 'stack_power_charge_guard_catalog_error_contract_changed';
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_require_power_charge(jsonb,text)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_require_power_charge(jsonb,text)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_require_power_charge(jsonb,text)','EXECUTE') then
    raise exception 'stack_power_charge_guard_catalog_helper_exposed';
  end if;

  -- Preserve prior and subsequent canonical ownership. Cost resolution moved in
  -- #14 and energy readiness moved in #15; both remain separate authorities
  -- from the #13 selected/charge guard.
  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_phase\(') <> 1 then
    raise exception 'stack_power_charge_guard_catalog_phase_ownership_changed';
  end if;
  if regexp_count(v_power,'zuno_private\.zuno_stack_cap_energy\(') <> 5 then
    raise exception 'stack_power_charge_guard_catalog_energy_cap_changed';
  end if;
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is null
     or regexp_count(v_power,'zuno_private\.zuno_stack_resolve_power_cost\(p_power,v_phase\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_power_cost\(''gelo'',v_phase\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_power_cost\(''desfazer'',v_phase\);') <> 1 then
    raise exception 'stack_power_charge_guard_catalog_cost_authority_changed';
  end if;
  if position('v_cost:=casep_powerwhen''explosion''then3' in v_power)<>0
     or position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_gelo)<>0
     or position('v_cost:=casewhenv_phase=''final''then0else1end;' in v_desfazer)<>0 then
    raise exception 'stack_power_charge_guard_catalog_inline_cost_returned';
  end if;
  if to_regprocedure('zuno_private.zuno_stack_require_power_energy(integer,integer)') is null
     or regexp_count(v_power,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_energy\(v_current_energy,v_cost\);') <> 1 then
    raise exception 'stack_power_charge_guard_catalog_energy_readiness_changed';
  end if;
end;
$$;

-- Verify helper semantics directly: return the original charges object unchanged
-- when selected and charged, and preserve the exact public error contract otherwise.
do $$
declare
  v_server jsonb := '{"selected":["gelo","desfazer","fluxo"],"charges":{"gelo":1,"desfazer":1,"fluxo":0}}'::jsonb;
  v_actual jsonb;
  v_message text;
  v_state text;
begin
  select zuno_private.zuno_stack_require_power_charge(v_server,'gelo') into v_actual;
  if v_actual is distinct from v_server->'charges' then
    raise exception 'stack_power_charge_guard_catalog_return_changed';
  end if;

  begin
    perform zuno_private.zuno_stack_require_power_charge(v_server,'troca');
    raise exception 'expected_stack_power_not_selected';
  exception when others then
    get stacked diagnostics v_message=message_text,v_state=returned_sqlstate;
    if v_message <> 'stack_power_not_selected' or v_state <> '42501' then
      raise exception 'stack_power_charge_guard_catalog_not_selected_contract_changed:message=%,state=%',v_message,v_state;
    end if;
  end;

  begin
    perform zuno_private.zuno_stack_require_power_charge(v_server,'fluxo');
    raise exception 'expected_stack_power_no_charge';
  exception when others then
    get stacked diagnostics v_message=message_text,v_state=returned_sqlstate;
    if v_message <> 'stack_power_no_charge' or v_state <> '22023' then
      raise exception 'stack_power_charge_guard_catalog_no_charge_contract_changed:message=%,state=%',v_message,v_state;
    end if;
  end;
end;
$$;

select 'zuno_stack_power_charge_guard_catalog_characterization_ok' as result;
