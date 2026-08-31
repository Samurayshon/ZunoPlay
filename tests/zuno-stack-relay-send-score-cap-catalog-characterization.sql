\set ON_ERROR_STOP on

-- Sixth extraction characterization: verify only the final catalog wiring for Relay Send.
-- Behavioral Relay Send semantics remain covered by zuno-stack-relay-send-score-cap-characterization.sql.

do $$
declare
  v_def text;
  v_raw text := 'v_score := least(25000,v_score+20);';
  v_helper text := 'v_score := zuno_private.zuno_stack_cap_score(v_score+20);';
  v_helper_count integer;
begin
  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'relay send final catalog function missing';
  end if;

  v_helper_count := (length(v_def) - length(replace(v_def, v_helper, ''))) / length(v_helper);

  if v_helper_count <> 1 then
    raise exception 'relay send canonical score cap helper expected exactly once, got %', v_helper_count;
  end if;
  if position(v_raw in v_def) <> 0 then
    raise exception 'relay send raw score cap +20 still present';
  end if;
  if position('zuno_stack_cap_score(v_score+v_gain)' in v_def) = 0 then
    raise exception 'relay take trio-gain score cap helper wiring changed';
  end if;
  if position('zuno_stack_cap_score(v_score+10)' in v_def) = 0 then
    raise exception 'relay take +10 score cap helper wiring changed';
  end if;
end;
$$;

select 'zuno_stack_relay_send_score_cap_catalog_characterization_ok' as result;
