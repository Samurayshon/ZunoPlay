-- Ninth canonical Zuno Stack extraction: Gelo score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Preserves Gelo-owned energy cost, phase, timer/freeze extension, charge and event behavior.
-- Historical migrations remain immutable.

do $migration$
declare
  v_def text;
  v_new text;
  v_inline_count integer;
  v_scoped_count integer;
  v_helper_before integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'stack_gelo_score_cap_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_gelo_score_cap_function_missing';
  end if;

  v_inline_count := regexp_count(v_def, 'least\(25000,');
  v_scoped_count := regexp_count(v_def, 'v_score:=least\(25000,v_score\+40\);');
  v_helper_before := regexp_count(v_def, 'zuno_private\.zuno_stack_cap_score\(');

  if v_inline_count <> 1 or v_scoped_count <> 1 or v_helper_before <> 0 then
    raise exception 'stack_gelo_score_cap_precondition_invalid:inline=%,scoped=%,helper=%',
      v_inline_count, v_scoped_count, v_helper_before;
  end if;

  -- Freeze the Gelo-owned behavior adjacent to the score cap. This extraction
  -- must not alter energy, timer/freeze, charge or event semantics.
  if position('v_cost:=case when v_phase=''pressure'' then 1 else 2 end;' in v_def) = 0
     or position('v_energy:=v_energy-v_cost; v_score:=least(25000,v_score+40);' in v_def) = 0
     or position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_def) = 0
     or position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_def) = 0
     or position('v_extensions:=coalesce((v_timer->>''geloExtensions'')::integer,0)+1;' in v_def) = 0
     or position('v_charges:=jsonb_set(v_charges,''{gelo}'',''0''::jsonb,true);' in v_def) = 0
     or position('''power'',''gelo''' in v_def) = 0 then
    raise exception 'stack_gelo_score_cap_owned_contract_changed';
  end if;

  v_new := replace(
    v_def,
    'v_score:=least(25000,v_score+40);',
    'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);'
  );

  if v_new = v_def
     or regexp_count(v_new, 'least\(25000,') <> 0
     or regexp_count(v_new, 'v_score:=zuno_private\.zuno_stack_cap_score\(v_score\+40\);') <> 1
     or regexp_count(v_new, 'zuno_private\.zuno_stack_cap_score\(') <> 1 then
    raise exception 'stack_gelo_score_cap_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;
