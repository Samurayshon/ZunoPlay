-- Ninth canonical Zuno Stack extraction: Fluxo score-cap application only.
-- Reuses the already validated zuno_private.zuno_stack_cap_score(integer) helper.
-- Intentionally preserves Fluxo shuffle behavior, +40 gain, energy/charge handling,
-- auth/control-plane behavior, events and persistence.
-- Historical migrations remain immutable.

begin;

do $migration$
declare
  v_def text;
  v_new text;
  v_target constant text := $anchor$select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=least(25000,v_score+40);$anchor$;
  v_replacement constant text := $anchor$select jsonb_agg(case when mp.type is null then e.tile else jsonb_set(e.tile,'{type}',to_jsonb(mp.type),false) end order by e.ord) into v_tiles from jsonb_array_elements(v_tiles) with ordinality e(tile,ord) left join mp on mp.ord=e.ord;
    v_score:=zuno_private.zuno_stack_cap_score(v_score+40);$anchor$;
  v_helper_call constant text := 'v_score:=zuno_private.zuno_stack_cap_score(v_score+40);';
  v_raw_call constant text := 'v_score:=least(25000,v_score+40);';
  v_target_count integer;
  v_helper_count integer;
  v_raw_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'stack_fluxo_score_cap_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_fluxo_score_cap_function_missing';
  end if;

  -- Fail closed unless the uniquely characterized Fluxo shuffle + score block occurs once.
  v_target_count := (length(v_def) - length(replace(v_def, v_target, ''))) / length(v_target);
  if v_target_count <> 1 then
    raise exception 'stack_fluxo_score_cap_anchor_count_invalid:%', v_target_count;
  end if;

  -- Preserve caller-owned Fluxo control-plane semantics around the isolated score site.
  if position("p_power not in ('fluxo','troca','explosion','elo','fase','vortice','ima')" in v_def) = 0
     or position("when 'fluxo' then 1" in v_def) = 0
     or position("jsonb_build_object('power',p_power,'expected_revision',p_expected_revision,'applied_revision',v_new_revision,'cost',v_cost)" in v_def) = 0 then
    raise exception 'stack_fluxo_score_cap_precondition_missing';
  end if;

  v_new := replace(v_def, v_target, v_replacement);
  v_helper_count := (length(v_new) - length(replace(v_new, v_helper_call, ''))) / length(v_helper_call);
  v_raw_count := (length(v_new) - length(replace(v_new, v_raw_call, ''))) / length(v_raw_call);

  -- One raw +40 remains intentionally in the unrelated pressure-phase match bonus.
  if v_new = v_def
     or v_helper_count <> 1
     or v_raw_count <> 1
     or position(v_target in v_new) <> 0
     or position("when 'fluxo' then 1" in v_new) = 0 then
    raise exception 'stack_fluxo_score_cap_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;

commit;
