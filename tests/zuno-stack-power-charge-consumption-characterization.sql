\set ON_ERROR_STOP on

-- Sixteenth-extraction pre-change characterization.
-- Freeze the identical charge-consumption transition shared by Board Power,
-- Gelo and Desfazer before centralizing it. Persistence, rewards, timers,
-- undo, events and Board Power recharge remain caller-owned.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_power_anchor constant text := 'v_charges:=jsonb_set(v_charges,array[p_power],''0''::jsonb,true);';
  v_gelo_anchor constant text := 'v_charges:=jsonb_set(v_charges,''{gelo}'',''0''::jsonb,true);';
  v_desfazer_anchor constant text := 'v_charges:=jsonb_set(v_charges,''{desfazer}'',''0''::jsonb,true);';
  v_recharge_anchor constant text := 'v_charges:=jsonb_set(v_charges,array[v_recharge],''1''::jsonb,true);';
  v_helper constant text := 'zuno_private.zuno_stack_consume_power_charge(';
  v_guard constant text := 'zuno_private.zuno_stack_require_power_charge(';
  v_cost constant text := 'zuno_private.zuno_stack_resolve_power_cost(';
  v_energy constant text := 'zuno_private.zuno_stack_require_power_energy(';
  v_phase constant text := 'zuno_private.zuno_stack_resolve_phase(';
begin
  if to_regprocedure('zuno_private.zuno_stack_consume_power_charge(jsonb,text)') is not null then
    raise exception 'stack_power_charge_consumption_helper_exists_before_extraction';
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
    raise exception 'stack_power_charge_consumption_function_missing';
  end if;

  if (length(v_power)-length(replace(v_power,v_power_anchor,'')))/length(v_power_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_board_anchor_invalid';
  end if;
  if (length(v_gelo)-length(replace(v_gelo,v_gelo_anchor,'')))/length(v_gelo_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_gelo_anchor_invalid';
  end if;
  if (length(v_desfazer)-length(replace(v_desfazer,v_desfazer_anchor,'')))/length(v_desfazer_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_desfazer_anchor_invalid';
  end if;

  -- Board Power's threshold recharge is a different rule and must remain caller-owned.
  if (length(v_power)-length(replace(v_power,v_recharge_anchor,'')))/length(v_recharge_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_recharge_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,v_helper,'')))/length(v_helper) <> 0
     or (length(v_gelo)-length(replace(v_gelo,v_helper,'')))/length(v_helper) <> 0
     or (length(v_desfazer)-length(replace(v_desfazer,v_helper,'')))/length(v_helper) <> 0 then
    raise exception 'stack_power_charge_consumption_helper_already_wired';
  end if;

  -- Prove this is the canonical post-#15 catalog before extracting consumption.
  if (length(v_power)-length(replace(v_power,v_guard,'')))/length(v_guard) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_guard,'')))/length(v_guard) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_guard,'')))/length(v_guard) <> 1 then
    raise exception 'stack_power_charge_consumption_guard_baseline_changed';
  end if;
  if (length(v_power)-length(replace(v_power,v_cost,'')))/length(v_cost) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_cost,'')))/length(v_cost) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_cost,'')))/length(v_cost) <> 1 then
    raise exception 'stack_power_charge_consumption_cost_baseline_changed';
  end if;
  if (length(v_power)-length(replace(v_power,v_energy,'')))/length(v_energy) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_energy,'')))/length(v_energy) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_energy,'')))/length(v_energy) <> 1 then
    raise exception 'stack_power_charge_consumption_energy_baseline_changed';
  end if;
  if (length(v_power)-length(replace(v_power,v_phase,'')))/length(v_phase) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_phase,'')))/length(v_phase) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_phase,'')))/length(v_phase) <> 1 then
    raise exception 'stack_power_charge_consumption_phase_baseline_changed';
  end if;
end;
$$;

select 'zuno_stack_power_charge_consumption_characterization_ok' as result;
