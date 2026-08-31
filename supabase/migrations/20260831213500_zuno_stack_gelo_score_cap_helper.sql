-- Ninth canonical Zuno Stack extraction: Gelo score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Intentionally preserves Gelo +40 caller score gain, energy cost, freeze/timer extension,
-- charges, auth/control-plane behavior, events and persistence.
-- Historical migrations remain immutable.

begin;

do $migration$
declare
  v_def text;
  v_new text;
  v_target constant text := 'v_score:=least(25000,v_score+40);';
  v_replacement constant text := 'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);';
  v_target_count integer;
  v_replacement_count integer;
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

  -- Fail closed unless the exact characterized Gelo score-cap anchor occurs once.
  v_target_count := (length(v_def) - length(replace(v_def, v_target, ''))) / length(v_target);
  if v_target_count <> 1 then
    raise exception 'stack_gelo_score_cap_anchor_count_invalid:%', v_target_count;
  end if;

  -- Preserve caller-owned Gelo semantics around the score operation.
  if position('v_cost:=case when v_phase=''pressure'' then 1 else 2 end;' in v_def) = 0
     or position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_def) = 0
     or position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_def) = 0 then
    raise exception 'stack_gelo_score_cap_precondition_missing';
  end if;

  v_new := replace(v_def, v_target, v_replacement);
  v_replacement_count := (length(v_new) - length(replace(v_new, v_replacement, ''))) / length(v_replacement);

  if v_new = v_def
     or v_replacement_count <> 1
     or position(v_target in v_new) <> 0
     or position('v_cost:=case when v_phase=''pressure'' then 1 else 2 end;' in v_new) = 0
     or position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_new) = 0
     or position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_new) = 0 then
    raise exception 'stack_gelo_score_cap_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;

commit;
