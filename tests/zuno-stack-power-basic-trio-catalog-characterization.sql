\set ON_ERROR_STOP on

-- Final-catalog guard for the tenth canonical extraction.
-- The two Board Power tray-trio sites must delegate to the canonical basic-trio
-- helper while Explosion keeps its distinct board-removal match accounting.

do $$
declare
  v_def text;
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_basic_trio(jsonb,text,integer,integer,integer,integer,bigint,bigint)') is null then
    raise exception 'power_basic_trio_catalog_missing_helper';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'power_basic_trio_catalog_missing_function';
  end if;

  if regexp_count(v_def, 'if v_type_count>=3 then') <> 0 then
    raise exception 'power_basic_trio_catalog_inline_trio_remains';
  end if;

  if regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2 then
    raise exception 'power_basic_trio_catalog_helper_count';
  end if;

  if regexp_count(v_def, "zuno_stack_resolve_basic_trio\(v_tray,v_incoming,v_matches,v_energy,v_combo,v_best,v_last,v_now\)") <> 2 then
    raise exception 'power_basic_trio_catalog_helper_scope';
  end if;

  if position('v_basic_trio_resolved boolean:=false;' in v_def) = 0
     or position('if not v_basic_trio_resolved then' in v_def) = 0 then
    raise exception 'power_basic_trio_catalog_explosion_separation';
  end if;

  if position("elsif p_power='explosion' then" in v_def) = 0
     or position('v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=zuno_private.zuno_stack_cap_score(v_score+450);' in v_def) = 0 then
    raise exception 'power_basic_trio_catalog_explosion_contract';
  end if;

  if regexp_count(v_def, 'v_match_delta:=1; v_score:=zuno_private\.zuno_stack_cap_score\(v_score\+310\);') <> 2 then
    raise exception 'power_basic_trio_catalog_power_trio_score_contract';
  end if;

  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+55);' in v_def) = 0
     or position('v_score:=zuno_private.zuno_stack_cap_score(v_score+case p_power when ''elo'' then 80 when ''fase'' then 70 else 60 end);' in v_def) = 0 then
    raise exception 'power_basic_trio_catalog_caller_owned_gain';
  end if;
end;
$$;

select 'zuno_stack_power_basic_trio_catalog_characterization_ok' as marker;
