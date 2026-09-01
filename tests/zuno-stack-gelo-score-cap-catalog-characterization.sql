\set ON_ERROR_STOP on

-- Final-catalog guard for the ninth canonical extraction.
-- Gelo must use the canonical score-cap helper and preserve its owned contracts.

do $$
declare
  v_def text;
  v_norm text;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'gelo_score_cap_catalog_missing_helper';
  end if;
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is null then
    raise exception 'gelo_score_cap_catalog_missing_cost_helper';
  end if;
  if to_regprocedure('zuno_private.zuno_stack_consume_power_charge(jsonb,text)') is null then
    raise exception 'gelo_score_cap_catalog_missing_charge_consumption_helper';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'gelo_score_cap_catalog_missing_function';
  end if;
  v_norm := regexp_replace(v_def,'\s+','','g');

  if regexp_count(v_def, 'least\(25000,') <> 0 then
    raise exception 'gelo_score_cap_catalog_inline_cap_remains';
  end if;

  if regexp_count(v_def, 'zuno_private\.zuno_stack_cap_score\(') <> 1
     or regexp_count(v_def, 'v_score:=zuno_private\.zuno_stack_cap_score\(v_score\+40\);') <> 1 then
    raise exception 'gelo_score_cap_catalog_helper_scope';
  end if;

  if regexp_count(v_norm,'v_cost:=zuno_private\.zuno_stack_resolve_power_cost\(''gelo'',v_phase\);') <> 1
     or position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_norm) <> 0 then
    raise exception 'gelo_score_cap_catalog_cost';
  end if;
  if position('v_energy:=v_energy-v_cost; v_score:=zuno_private.zuno_stack_cap_score(v_score+40);' in v_def) = 0 then raise exception 'gelo_score_cap_catalog_energy_score'; end if;
  if position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_def) = 0 then raise exception 'gelo_score_cap_catalog_deadline'; end if;
  if position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_def) = 0 then raise exception 'gelo_score_cap_catalog_freeze'; end if;
  if position('v_extensions:=coalesce((v_timer->>''geloExtensions'')::integer,0)+1;' in v_def) = 0 then raise exception 'gelo_score_cap_catalog_extensions'; end if;
  if position('v_charges:=zuno_private.zuno_stack_consume_power_charge(v_charges,''gelo'');' in v_def) = 0
     or position('v_charges:=jsonb_set(v_charges,''{gelo}'',''0''::jsonb,true);' in v_def) <> 0 then
    raise exception 'gelo_score_cap_catalog_charge';
  end if;
  if position('''power'',''gelo''' in v_def) = 0 then raise exception 'gelo_score_cap_catalog_event'; end if;
end;
$$;

select 'zuno_stack_gelo_score_cap_catalog_characterization_ok' as marker;
