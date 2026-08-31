\set ON_ERROR_STOP on

-- Fifteenth-extraction pre-change characterization.
-- Freeze the shared sufficient-energy guard on the authoritative post-#14 catalog
-- before centralizing it. Cost resolution, charge consumption and mutations stay caller-owned.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_power_anchor constant text := 'ifv_energy<v_costthenraiseexception''stack_power_not_ready''usingerrcode=''22023'';endif;';
  v_desfazer_anchor constant text := 'ifv_current_energy<v_costthenraiseexception''stack_power_not_ready''usingerrcode=''22023'';endif;';
  v_helper constant text := 'zuno_private.zuno_stack_require_power_energy(';
  v_cost constant text := 'zuno_private.zuno_stack_resolve_power_cost(';
  v_charge constant text := 'zuno_private.zuno_stack_require_power_charge(';
  v_phase constant text := 'zuno_private.zuno_stack_resolve_phase(';
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_energy(integer,integer)') is not null then
    raise exception 'stack_power_energy_readiness_helper_exists_before_extraction';
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

  if v_power is null or v_gelo is null or v_desfazer is null then
    raise exception 'stack_power_energy_readiness_function_missing';
  end if;

  if (length(v_power)-length(replace(v_power,v_power_anchor,'')))/length(v_power_anchor) <> 1 then
    raise exception 'stack_power_energy_readiness_board_anchor_invalid';
  end if;
  if (length(v_gelo)-length(replace(v_gelo,v_power_anchor,'')))/length(v_power_anchor) <> 1 then
    raise exception 'stack_power_energy_readiness_gelo_anchor_invalid';
  end if;
  if (length(v_desfazer)-length(replace(v_desfazer,v_desfazer_anchor,'')))/length(v_desfazer_anchor) <> 1 then
    raise exception 'stack_power_energy_readiness_desfazer_anchor_invalid';
  end if;

  if regexp_count(v_power, 'stack_power_not_ready') <> 1
     or regexp_count(v_gelo, 'stack_power_not_ready') <> 1
     or regexp_count(v_desfazer, 'stack_power_not_ready') <> 1 then
    raise exception 'stack_power_energy_readiness_error_contract_changed';
  end if;

  if (length(v_power)-length(replace(v_power,v_helper,'')))/length(v_helper) <> 0
     or (length(v_gelo)-length(replace(v_gelo,v_helper,'')))/length(v_helper) <> 0
     or (length(v_desfazer)-length(replace(v_desfazer,v_helper,'')))/length(v_helper) <> 0 then
    raise exception 'stack_power_energy_readiness_helper_already_wired';
  end if;

  -- Prove this is the authoritative post-#14 catalog before extracting readiness.
  if (length(v_power)-length(replace(v_power,v_cost,'')))/length(v_cost) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_cost,'')))/length(v_cost) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_cost,'')))/length(v_cost) <> 1 then
    raise exception 'stack_power_energy_readiness_cost_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,v_charge,'')))/length(v_charge) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_charge,'')))/length(v_charge) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_charge,'')))/length(v_charge) <> 1 then
    raise exception 'stack_power_energy_readiness_charge_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,v_phase,'')))/length(v_phase) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_phase,'')))/length(v_phase) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_phase,'')))/length(v_phase) <> 1 then
    raise exception 'stack_power_energy_readiness_phase_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,'zuno_private.zuno_stack_resolve_basic_trio(','')))
       / length('zuno_private.zuno_stack_resolve_basic_trio(') <> 2 then
    raise exception 'stack_power_energy_readiness_basic_trio_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,'zuno_private.zuno_stack_cap_energy(','')))
       / length('zuno_private.zuno_stack_cap_energy(') <> 5 then
    raise exception 'stack_power_energy_readiness_energy_cap_baseline_changed';
  end if;
end;
$$;

select 'zuno_stack_power_energy_readiness_characterization_ok' as result;
