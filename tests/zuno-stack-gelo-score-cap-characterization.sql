\set ON_ERROR_STOP on

-- Eighth extraction pre-characterization: Gelo score-cap application only.
-- Freeze/timer/energy semantics remain caller-owned and must not change.
do $$
declare
  v_def text;
  v_raw text := 'v_score:=least(25000,v_score+40);';
  v_helper text := 'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);';
  v_raw_count integer;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  if v_def is null then
    raise exception 'gelo function missing';
  end if;

  v_raw_count := (length(v_def) - length(replace(v_def, v_raw, ''))) / length(v_raw);
  if v_raw_count <> 1 then
    raise exception 'gelo raw score cap expected exactly once, got %', v_raw_count;
  end if;
  if position(v_helper in v_def) <> 0 then
    raise exception 'gelo score cap already canonicalized unexpectedly';
  end if;
  if position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_def) = 0 then
    raise exception 'gelo energy-cost precondition changed';
  end if;
  if position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_def) = 0
     or position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_def) = 0 then
    raise exception 'gelo timer semantics precondition changed';
  end if;
end;
$$;

select 'zuno_stack_gelo_score_cap_characterization_ok' as result;
