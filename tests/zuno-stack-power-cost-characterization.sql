\set ON_ERROR_STOP on

-- Fourteenth-extraction pre-change characterization.
-- Freeze the shared power-cost rules on the authoritative post-#13 catalog before
-- centralizing cost resolution. Charge guards, readiness and all mutations stay caller-owned.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_power_cost constant text := 'v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;';
  v_gelo_cost constant text := 'v_cost:=casewhenv_phase=''pressure''then1else2end;';
  v_desfazer_cost constant text := 'v_cost:=casewhenv_phase=''final''then0else1end;';
  v_helper constant text := 'zuno_private.zuno_stack_resolve_power_cost(';
  v_phase constant text := 'zuno_private.zuno_stack_resolve_phase(';
  v_charge constant text := 'zuno_private.zuno_stack_require_power_charge(';
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is not null then
    raise exception 'stack_power_cost_helper_exists_before_extraction';
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
    raise exception 'stack_power_cost_function_missing';
  end if;

  if (length(v_power)-length(replace(v_power,v_power_cost,'')))/length(v_power_cost) <> 1 then
    raise exception 'stack_power_cost_board_anchor_invalid';
  end if;
  if (length(v_gelo)-length(replace(v_gelo,v_gelo_cost,'')))/length(v_gelo_cost) <> 1 then
    raise exception 'stack_power_cost_gelo_anchor_invalid';
  end if;
  if (length(v_desfazer)-length(replace(v_desfazer,v_desfazer_cost,'')))/length(v_desfazer_cost) <> 1 then
    raise exception 'stack_power_cost_desfazer_anchor_invalid';
  end if;

  if (length(v_power)-length(replace(v_power,v_helper,'')))/length(v_helper) <> 0
     or (length(v_gelo)-length(replace(v_gelo,v_helper,'')))/length(v_helper) <> 0
     or (length(v_desfazer)-length(replace(v_desfazer,v_helper,'')))/length(v_helper) <> 0 then
    raise exception 'stack_power_cost_helper_already_wired';
  end if;

  -- Prove this is the authoritative post-#13 catalog.
  if (length(v_power)-length(replace(v_power,v_phase,'')))/length(v_phase) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_phase,'')))/length(v_phase) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_phase,'')))/length(v_phase) <> 1 then
    raise exception 'stack_power_cost_phase_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,v_charge,'')))/length(v_charge) <> 1
     or (length(v_gelo)-length(replace(v_gelo,v_charge,'')))/length(v_charge) <> 1
     or (length(v_desfazer)-length(replace(v_desfazer,v_charge,'')))/length(v_charge) <> 1 then
    raise exception 'stack_power_cost_charge_guard_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,'zuno_private.zuno_stack_resolve_basic_trio(','')))
       / length('zuno_private.zuno_stack_resolve_basic_trio(') <> 2 then
    raise exception 'stack_power_cost_basic_trio_baseline_changed';
  end if;

  if (length(v_power)-length(replace(v_power,'zuno_private.zuno_stack_cap_energy(','')))
       / length('zuno_private.zuno_stack_cap_energy(') <> 5 then
    raise exception 'stack_power_cost_energy_cap_baseline_changed';
  end if;

  -- Readiness remains a caller decision after cost resolution.
  if position('ifv_energy<v_costthenraiseexception''stack_power_not_ready''' in v_power)=0
     or position('ifv_energy<v_costthenraiseexception''stack_power_not_ready''' in v_gelo)=0
     or position('ifv_current_energy<v_costthenraiseexception''stack_power_not_ready''' in v_desfazer)=0 then
    raise exception 'stack_power_cost_readiness_baseline_changed';
  end if;
end;
$$;

select 'zuno_stack_power_cost_characterization_ok' as result;
