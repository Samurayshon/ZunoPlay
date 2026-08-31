\set ON_ERROR_STOP on

-- Ninth extraction final-catalog contract: Fluxo must use the canonical score-cap helper
-- while the unrelated pressure-phase +40 raw cap remains untouched for a later extraction.
do $$
declare
  v_def text;
  v_fluxo_raw constant text := $anchor$select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=least(25000,v_score+40);$anchor$;
  v_fluxo_helper constant text := $anchor$select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=zuno_private.zuno_stack_cap_score(v_score+40);$anchor$;
  v_helper_call constant text := 'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);';
  v_raw_call constant text := 'v_score:=least(25000,v_score+40);';
  v_helper_count integer;
  v_raw_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'fluxo canonical score-cap helper missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'canonical board power engine missing';
  end if;

  v_helper_count := (length(v_def) - length(replace(v_def, v_helper_call, ''))) / length(v_helper_call);
  v_raw_count := (length(v_def) - length(replace(v_def, v_raw_call, ''))) / length(v_raw_call);

  if position(v_fluxo_helper in v_def) = 0
     or position(v_fluxo_raw in v_def) <> 0
     or v_helper_count <> 1
     or v_raw_count <> 1 then
    raise exception 'fluxo final catalog score-cap contract invalid: helper %, raw %', v_helper_count, v_raw_count;
  end if;

  if position('when ''fluxo'' then 1' in v_def) = 0
     or position('jsonb_build_object(''power'',p_power,''expected_revision'',p_expected_revision,''applied_revision'',v_new_revision,''cost'',v_cost)' in v_def) = 0 then
    raise exception 'fluxo caller-owned control-plane semantics changed';
  end if;
end;
$$;

select 'zuno_stack_fluxo_score_cap_catalog_characterization_ok' as marker;
