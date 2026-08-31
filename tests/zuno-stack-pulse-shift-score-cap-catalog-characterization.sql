\set ON_ERROR_STOP on

-- Seventh extraction characterization: verify only final catalog wiring for Pulse Shift.
-- Behavioral semantics remain covered by zuno-stack-pulse-shift-score-cap-characterization.sql.

do $$
declare
  v_def text;
  v_raw text := '''score'',least(25000,v_score+v_gain)';
  v_helper text := '''score'',zuno_private.zuno_stack_cap_score(v_score+v_gain)';
  v_helper_count integer;
begin
  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_pulse_shift_internal(uuid,bigint,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'pulse shift final catalog function missing';
  end if;

  v_helper_count := (length(v_def) - length(replace(v_def, v_helper, ''))) / length(v_helper);

  if v_helper_count <> 1 then
    raise exception 'pulse shift canonical score cap helper expected exactly once, got %', v_helper_count;
  end if;
  if position(v_raw in v_def) <> 0 then
    raise exception 'pulse shift raw score cap still present';
  end if;
  if position('v_gain:=case when v_critical then 260 else 160 end;' in v_def) = 0 then
    raise exception 'pulse shift +260/+160 caller gain changed';
  end if;
end;
$$;

select 'zuno_stack_pulse_shift_score_cap_catalog_characterization_ok' as result;
