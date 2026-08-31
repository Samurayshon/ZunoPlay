-- Seventh canonical Zuno Stack extraction: Pulse Shift score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Intentionally preserves Pulse Shift +160/+260 caller gain and all auth/control-plane/event behavior.
-- Historical migrations remain immutable.

do $migration$
declare
  v_def text;
  v_new text;
  v_target constant text := '''score'',least(25000,v_score+v_gain)';
  v_replacement constant text := '''score'',zuno_private.zuno_stack_cap_score(v_score+v_gain)';
  v_target_count integer;
  v_replacement_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'stack_pulse_shift_score_cap_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_pulse_shift_internal(uuid,bigint,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_pulse_shift_score_cap_function_missing';
  end if;

  -- Fail closed unless the exact historical Pulse Shift score-cap anchor occurs exactly once.
  v_target_count := (length(v_def) - length(replace(v_def, v_target, ''))) / length(v_target);
  if v_target_count <> 1 then
    raise exception 'stack_pulse_shift_score_cap_anchor_count_invalid:%', v_target_count;
  end if;

  -- Preserve the exact caller-owned +260 critical / +160 normal gain expression.
  if position('v_gain:=case when v_critical then 260 else 160 end;' in v_def) = 0 then
    raise exception 'stack_pulse_shift_score_cap_gain_precondition_missing';
  end if;

  v_new := replace(v_def, v_target, v_replacement);
  v_replacement_count := (length(v_new) - length(replace(v_new, v_replacement, ''))) / length(v_replacement);

  if v_new = v_def
     or v_replacement_count <> 1
     or position(v_target in v_new) <> 0
     or position('v_gain:=case when v_critical then 260 else 160 end;' in v_new) = 0 then
    raise exception 'stack_pulse_shift_score_cap_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;
