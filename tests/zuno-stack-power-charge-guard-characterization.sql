\set ON_ERROR_STOP on

-- Thirteenth-extraction pre-change characterization.
-- Freeze the duplicated selected-power/available-charge contract across the
-- Board Power, Gelo and Desfazer authorities before centralizing that decision.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_signature text;
  v_def text;
  v_not_selected_total integer := 0;
  v_no_charge_total integer := 0;
  v_helper_total integer := 0;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_charge(jsonb,text)') is not null then
    raise exception 'stack_power_charge_guard_helper_exists_before_extraction';
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
    raise exception 'stack_power_charge_guard_function_missing';
  end if;

  foreach v_def in array array[v_power,v_gelo,v_desfazer] loop
    v_not_selected_total := v_not_selected_total
      + (length(v_def)-length(replace(v_def,'stack_power_not_selected','')))/length('stack_power_not_selected');
    v_no_charge_total := v_no_charge_total
      + (length(v_def)-length(replace(v_def,'stack_power_no_charge','')))/length('stack_power_no_charge');
    v_helper_total := v_helper_total
      + (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_charge(','')))/length('zuno_private.zuno_stack_require_power_charge(');
  end loop;

  if v_not_selected_total <> 3 or v_no_charge_total <> 3 or v_helper_total <> 0 then
    raise exception 'stack_power_charge_guard_pre_wiring_invalid:not_selected=%,no_charge=%,helper=%',
      v_not_selected_total,v_no_charge_total,v_helper_total;
  end if;

  -- Each caller must still consume the already-canonical shared phase authority.
  foreach v_signature, v_def in array array[
    array['power',v_power],
    array['gelo',v_gelo],
    array['desfazer',v_desfazer]
  ] loop
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_phase(v_removed);','')))
       / length('zuno_private.zuno_stack_resolve_phase(v_removed);') <> 1 then
      raise exception 'stack_power_charge_guard_phase_anchor_changed:%',v_signature;
    end if;
  end loop;

  -- Freeze caller-owned costs and energy handling. #13 must not own these rules.
  if position('v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;' in v_power)=0
     or position('ifv_energy<v_costthenraiseexception''stack_power_not_ready''' in v_power)=0 then
    raise exception 'stack_power_charge_guard_board_cost_anchor_changed';
  end if;
  if position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_gelo)=0
     or position('ifv_energy<v_costthenraiseexception''stack_power_not_ready''' in v_gelo)=0 then
    raise exception 'stack_power_charge_guard_gelo_cost_anchor_changed';
  end if;
  if position('v_cost:=casewhenv_phase=''final''then0else1end;' in v_desfazer)=0
     or position('ifv_current_energy<v_costthenraiseexception''stack_power_not_ready''' in v_desfazer)=0 then
    raise exception 'stack_power_charge_guard_desfazer_cost_anchor_changed';
  end if;

  -- The latest already-extracted Board Power energy-cap ownership must remain intact.
  if (length(v_power)-length(replace(v_power,'zuno_private.zuno_stack_cap_energy(','')))
     / length('zuno_private.zuno_stack_cap_energy(') <> 5 then
    raise exception 'stack_power_charge_guard_energy_cap_anchor_changed';
  end if;
end;
$$;

select 'zuno_stack_power_charge_guard_characterization_ok' as result;
