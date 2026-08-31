-- Sixth canonical Zuno Stack extraction: Relay Send score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Intentionally preserves the Relay Send +20 caller bonus and all relay/auth/control-plane behavior.
-- Historical migrations remain immutable.

do $migration$
declare
  v_def text;
  v_new text;
  v_target constant text := 'v_score := least(25000,v_score+20);';
  v_replacement constant text := 'v_score := zuno_private.zuno_stack_cap_score(v_score+20);';
  v_target_count integer;
  v_replacement_count integer;
begin
  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_relay_send_score_cap_function_missing';
  end if;

  -- Fail closed unless the exact historical Relay Send cap anchor occurs exactly once.
  v_target_count := (length(v_def) - length(replace(v_def, v_target, ''))) / length(v_target);
  if v_target_count <> 1 then
    raise exception 'stack_relay_send_score_cap_anchor_count_invalid:%', v_target_count;
  end if;

  -- The fifth extraction must already own the characterized Relay Take score-cap points.
  if position('zuno_stack_cap_score(v_score+v_gain)' in v_def) = 0
     or position('zuno_stack_cap_score(v_score+10)' in v_def) = 0 then
    raise exception 'stack_relay_send_score_cap_relay_take_precondition_missing';
  end if;

  v_new := replace(v_def, v_target, v_replacement);

  v_replacement_count := (length(v_new) - length(replace(v_new, v_replacement, ''))) / length(v_replacement);
  if v_new = v_def
     or v_replacement_count <> 1
     or position(v_target in v_new) <> 0
     or position('zuno_stack_cap_score(v_score+v_gain)' in v_new) = 0
     or position('zuno_stack_cap_score(v_score+10)' in v_new) = 0 then
    raise exception 'stack_relay_send_score_cap_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;
