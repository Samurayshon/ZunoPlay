\set ON_ERROR_STOP on

-- Fifteenth extraction final catalog verification: Board Power, Gelo and
-- Desfazer share one private sufficient-energy guard while costs, charge,
-- phase behavior and all caller-owned mutations remain intact.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_helper text;
  v_volatility "char";
  v_security_definer boolean;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_energy(integer,integer)') is null then
    raise exception 'stack_power_energy_readiness_catalog_helper_missing';
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
    'zuno_private.zuno_stack_require_power_energy(integer,integer)'::regprocedure
  ), '\s+', '', 'g') into v_helper;

  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_energy\(v_energy,v_cost\);') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_energy\(v_current_energy,v_cost\);') <> 1 then
    raise exception 'stack_power_energy_readiness_catalog_wiring_invalid';
  end if;

  if regexp_count(v_power,'stack_power_not_ready') <> 0
     or regexp_count(v_gelo,'stack_power_not_ready') <> 0
     or regexp_count(v_desfazer,'stack_power_not_ready') <> 0 then
    raise exception 'stack_power_energy_readiness_catalog_inline_guard_survived';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_power_cost\(') <> 1 then
    raise exception 'stack_power_energy_readiness_catalog_cost_authority_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_require_power_charge\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_require_power_charge\(') <> 1 then
    raise exception 'stack_power_energy_readiness_catalog_charge_authority_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_gelo,'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or regexp_count(v_desfazer,'zuno_private\.zuno_stack_resolve_phase\(') <> 1 then
    raise exception 'stack_power_energy_readiness_catalog_phase_authority_changed';
  end if;

  if regexp_count(v_power,'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2
     or regexp_count(v_power,'zuno_private\.zuno_stack_cap_energy\(') <> 5 then
    raise exception 'stack_power_energy_readiness_catalog_board_prior_extractions_changed';
  end if;

  if position('ifp_energy<p_costthenraiseexception''stack_power_not_ready''usingerrcode=''22023'';endif;' in v_helper)=0 then
    raise exception 'stack_power_energy_readiness_catalog_error_contract_changed';
  end if;

  select p.provolatile,p.prosecdef
    into v_volatility,v_security_definer
  from pg_proc p
  where p.oid='zuno_private.zuno_stack_require_power_energy(integer,integer)'::regprocedure;

  if v_volatility <> 'i' or v_security_definer then
    raise exception 'stack_power_energy_readiness_catalog_helper_attributes_changed';
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_require_power_energy(integer,integer)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_require_power_energy(integer,integer)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_require_power_energy(integer,integer)','EXECUTE') then
    raise exception 'stack_power_energy_readiness_catalog_helper_exposed';
  end if;
end;
$$;

-- Direct semantic boundaries. The original caller guard only rejected energy < cost;
-- equality, surplus and SQL NULL comparisons passed through unchanged.
do $$
begin
  perform zuno_private.zuno_stack_require_power_energy(0,0);
  perform zuno_private.zuno_stack_require_power_energy(2,1);
  perform zuno_private.zuno_stack_require_power_energy(null,1);
  perform zuno_private.zuno_stack_require_power_energy(1,null);

  begin
    perform zuno_private.zuno_stack_require_power_energy(1,2);
    raise exception 'stack_power_energy_readiness_catalog_expected_rejection_missing';
  exception
    when sqlstate '22023' then
      if sqlerrm <> 'stack_power_not_ready' then
        raise exception 'stack_power_energy_readiness_catalog_error_message_changed:%',sqlerrm;
      end if;
  end;
end;
$$;

select 'zuno_stack_power_energy_readiness_catalog_characterization_ok' as result;
