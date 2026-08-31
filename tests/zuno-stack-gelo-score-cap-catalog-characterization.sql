\set ON_ERROR_STOP on

-- Ninth extraction final catalog verification: Gelo score cap only.
do $$
declare
  v_def text;
  v_raw text := 'v_score:=least(25000,v_score+40);';
  v_helper text := 'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);';
  v_helper_count integer;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  if v_def is null then
    raise exception 'gelo final catalog function missing';
  end if;

  v_helper_count := (length(v_def) - length(replace(v_def, v_helper, ''))) / length(v_helper);
  if v_helper_count <> 1 then
    raise exception 'gelo canonical score cap helper expected exactly once, got %', v_helper_count;
  end if;
  if position(v_raw in v_def) <> 0 then
    raise exception 'gelo raw score cap still present';
  end if;
  if position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_def) = 0 then
    raise exception 'gelo energy cost changed';
  end if;
  if position('v_deadline:=coalesce((v_timer->>''deadlineAt'')::bigint,0)+5000;' in v_def) = 0
     or position('v_freeze:=greatest(v_now,coalesce((v_timer->>''freezeUntil'')::bigint,0))+5000;' in v_def) = 0 then
    raise exception 'gelo timer semantics changed';
  end if;
end;
$$;

select 'zuno_stack_gelo_score_cap_catalog_characterization_ok' as result;
