\set ON_ERROR_STOP on

-- Fourteenth extraction final catalog verification: all three power authorities
-- resolve cost through one private helper while later canonical extractions
-- remain separately owned and mutations remain intact.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_helper text;
  v_power_old constant text := 'v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;';
  v_gelo_old constant text := 'v_cost:=casewhenv_phase=''pressure''then1else2end;';
  v_desfazer_old constant text := 'v_cost:=casewhenv_phase=''final''then0else1end;';
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is null then
    raise exception 'stack_power_cost_catalog_helper_missing';
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
    'zuno_private.zuno_stack_resolve_power_cost(text,text)'::regprocedure
  ), '\s+', '', 'g') into v_helper;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_power_cost\(p_power,v_phase\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_power_cost\(''gelo'',v_phase\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_power_cost\(''desfazer'',v_phase\);') <> 1 then
    raise exception 'stack_power_cost_catalog_wiring_invalid';
  end if;

  if position(v_power_old in v_power)<>0
     or position(v_gelo_old in v_gelo)<>0
     or position(v_desfazer_old in v_desfazer)<>0 then
    raise exception 'stack_power_cost_catalog_inline_cost_survived';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_phase\(') <> 1 then
    raise exception 'stack_power_cost_catalog_phase_ownership_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_charge\(') <> 1 then
    raise exception 'stack_power_cost_catalog_charge_guard_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2
     or regexp_count(v_power,'zuno_private\.zuno_stack_cap_energy\(') <> 5 then
    raise exception 'stack_power_cost_catalog_board_prior_extractions_changed';
  end if;

  -- Energy readiness moved in extraction #15. Keep it a separate authority
  -- from cost resolution and require exactly one canonical guard per caller.
  if to_regprocedure('zuno_private.zuno_stack_require_power_energy(integer,integer)') is null
     or regexp_count(v_power,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_energy\(v_current_energy,v_cost\);') <> 1 then
    raise exception 'stack_power_cost_catalog_readiness_changed';
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_resolve_power_cost(text,text)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_resolve_power_cost(text,text)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_resolve_power_cost(text,text)','EXECUTE') then
    raise exception 'stack_power_cost_catalog_helper_exposed';
  end if;

  if position('else99end' in v_helper)=0 then
    raise exception 'stack_power_cost_catalog_unknown_fallback_changed';
  end if;
end;
$$;

-- Direct semantic matrix. These values are the exact pre-#14 caller rules.
do $$
declare
  v_phase text;
begin
  if zuno_private.zuno_stack_resolve_power_cost('explosion','opening')<>3
     or zuno_private.zuno_stack_resolve_power_cost('elo','opening')<>2
     or zuno_private.zuno_stack_resolve_power_cost('fase','final')<>2
     or zuno_private.zuno_stack_resolve_power_cost('vortice','pressure')<>2
     or zuno_private.zuno_stack_resolve_power_cost('fluxo','final')<>1
     or zuno_private.zuno_stack_resolve_power_cost('ima','development')<>1 then
    raise exception 'stack_power_cost_catalog_fixed_cost_changed';
  end if;

  foreach v_phase in array array['opening','development','pressure'] loop
    if zuno_private.zuno_stack_resolve_power_cost('troca',v_phase)<>1 then
      raise exception 'stack_power_cost_catalog_troca_nonfinal_changed:%',v_phase;
    end if;
    if zuno_private.zuno_stack_resolve_power_cost('desfazer',v_phase)<>1 then
      raise exception 'stack_power_cost_catalog_desfazer_nonfinal_changed:%',v_phase;
    end if;
  end loop;
  if zuno_private.zuno_stack_resolve_power_cost('troca','final')<>0
     or zuno_private.zuno_stack_resolve_power_cost('desfazer','final')<>0 then
    raise exception 'stack_power_cost_catalog_final_zero_changed';
  end if;

  foreach v_phase in array array['opening','development','final'] loop
    if zuno_private.zuno_stack_resolve_power_cost('gelo',v_phase)<>2 then
      raise exception 'stack_power_cost_catalog_gelo_nonpressure_changed:%',v_phase;
    end if;
  end loop;
  if zuno_private.zuno_stack_resolve_power_cost('gelo','pressure')<>1 then
    raise exception 'stack_power_cost_catalog_gelo_pressure_changed';
  end if;

  if zuno_private.zuno_stack_resolve_power_cost('unknown','opening')<>99 then
    raise exception 'stack_power_cost_catalog_unknown_fallback_changed';
  end if;
end;
$$;

select 'zuno_stack_power_cost_catalog_characterization_ok' as result;
