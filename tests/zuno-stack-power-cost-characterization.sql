\set ON_ERROR_STOP on

-- Extraction #13 pre-change characterization.
-- The same power-cost authority is still split across Board Power, Gelo and Desfazer.
-- Freeze the exact post-#12 catalog before introducing a shared resolver.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_power_cost text := 'v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;';
  v_gelo_cost text := 'v_cost:=casewhenv_phase=''pressure''then1else2end;';
  v_desfazer_cost text := 'v_cost:=casewhenv_phase=''final''then0else1end;';
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is not null then
    raise exception 'stack_power_cost_preexisting_helper';
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

  -- These are literal catalog anchors, not regexes. Count by exact replacement so
  -- punctuation in pg_get_functiondef cannot change the meaning of the test.
  if (length(v_power) - length(replace(v_power, v_power_cost, ''))) / length(v_power_cost) <> 1 then
    raise exception 'stack_power_cost_board_anchor_invalid';
  end if;
  if (length(v_gelo) - length(replace(v_gelo, v_gelo_cost, ''))) / length(v_gelo_cost) <> 1 then
    raise exception 'stack_power_cost_gelo_anchor_invalid';
  end if;
  if (length(v_desfazer) - length(replace(v_desfazer, v_desfazer_cost, ''))) / length(v_desfazer_cost) <> 1 then
    raise exception 'stack_power_cost_desfazer_anchor_invalid';
  end if;

  if regexp_count(v_power, 'zuno_private\\.zuno_stack_resolve_power_cost\\(') <> 0
     or regexp_count(v_gelo, 'zuno_private\\.zuno_stack_resolve_power_cost\\(') <> 0
     or regexp_count(v_desfazer, 'zuno_private\\.zuno_stack_resolve_power_cost\\(') <> 0 then
    raise exception 'stack_power_cost_helper_already_wired';
  end if;

  -- Prove this is the post-#12 catalog, not a stale engine definition.
  if regexp_count(v_power, 'zuno_private\\.zuno_stack_resolve_phase\\(') <> 1
     or regexp_count(v_gelo, 'zuno_private\\.zuno_stack_resolve_phase\\(') <> 1
     or regexp_count(v_desfazer, 'zuno_private\\.zuno_stack_resolve_phase\\(') <> 1 then
    raise exception 'stack_power_cost_phase_baseline_changed';
  end if;

  if regexp_count(v_power, 'zuno_private\\.zuno_stack_resolve_basic_trio\\(') <> 2 then
    raise exception 'stack_power_cost_basic_trio_baseline_changed';
  end if;

  if regexp_count(v_power, 'zuno_private\\.zuno_stack_cap_energy\\(') <> 5 then
    raise exception 'stack_power_cost_energy_cap_baseline_changed';
  end if;
end;
$$;

select 'zuno_stack_power_cost_characterization_ok' as result;
