do $$
declare
  v_def text;
  v_old text := '    if jsonb_typeof(v_prev_engine->''tiles'') = ''array''';
  v_new text := '    if v_prev_active and jsonb_typeof(v_prev_engine->''tiles'') = ''array''';
begin
  select pg_get_functiondef('public.zuno_stack_commit_state(uuid,bigint,jsonb)'::regprocedure)
    into v_def;

  if position(v_new in v_def) > 0 then
    return;
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'zuno_stack_commit_state expected invariant block not found';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end
$$;
