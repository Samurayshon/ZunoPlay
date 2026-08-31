-- Eighth canonical Zuno Stack extraction: Board Power score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Preserves every power-owned gain, phase/combo/meta reward, charge, target and event behavior.
-- Historical migrations remain immutable.

do $migration$
declare
  v_def text;
  v_new text;
  v_inline_count integer;
  v_scoped_count integer;
  v_helper_before integer;
  v_helper_after integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'stack_power_score_cap_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_power_score_cap_function_missing';
  end if;

  -- Fail closed unless the current Board Power engine still has exactly the
  -- twelve score-cap expressions characterized before this extraction.
  v_inline_count := regexp_count(v_def, 'least\(25000,');
  v_scoped_count := regexp_count(v_def, 'v_score:=least\(25000,');
  v_helper_before := regexp_count(v_def, 'zuno_private\.zuno_stack_cap_score\(');

  if v_inline_count <> 12 or v_scoped_count <> 12 or v_helper_before <> 0 then
    raise exception 'stack_power_score_cap_precondition_invalid:inline=%,scoped=%,helper=%',
      v_inline_count, v_scoped_count, v_helper_before;
  end if;

  v_new := replace(
    v_def,
    'least(25000,',
    'zuno_private.zuno_stack_cap_score('
  );

  v_helper_after := regexp_count(v_new, 'zuno_private\.zuno_stack_cap_score\(');

  if v_new = v_def
     or regexp_count(v_new, 'least\(25000,') <> 0
     or regexp_count(v_new, 'v_score:=zuno_private\.zuno_stack_cap_score\(') <> 12
     or v_helper_after <> 12 then
    raise exception 'stack_power_score_cap_extraction_verification_failed';
  end if;

  -- Freeze the caller-owned score gains that this extraction must not change.
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+40);' in v_new) = 0
     or regexp_count(v_new, 'v_score:=zuno_private\.zuno_stack_cap_score\(v_score\+310\);') <> 2
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+55);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+450);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+case p_power when ''elo'' then 80 when ''fase'' then 70 else 60 end);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+greatest(1,v_type_count)*35);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+25);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+60);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+v_combo*25*v_mult);' in v_new) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+300);' in v_new) = 0 then
    raise exception 'stack_power_score_cap_gain_contract_changed';
  end if;

  execute v_new;
end;
$migration$;
