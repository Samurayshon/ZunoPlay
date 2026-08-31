-- Tenth canonical Zuno Stack extraction: Board Power basic-trio resolution only.
-- Reuses zuno_private.zuno_stack_resolve_basic_trio(...) in the two power paths
-- that currently duplicate tray trio removal (troca and elo/fase/ima).
-- Explosion keeps its distinct board-removal match path. Power-owned score gains,
-- phase/combo rewards, targeting, charges and events remain caller-owned.
-- Historical migrations remain immutable.

do $migration$
declare
  v_def text;
  v_new text;
  v_old text;
  v_replacement text;
  v_inline_before integer;
  v_helper_before integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_basic_trio(jsonb,text,integer,integer,integer,integer,bigint,bigint)') is null then
    raise exception 'stack_power_basic_trio_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_power_basic_trio_function_missing';
  end if;

  v_inline_before := regexp_count(v_def, 'if v_type_count>=3 then');
  v_helper_before := regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_basic_trio\(');

  if v_inline_before <> 2 or v_helper_before <> 0 then
    raise exception 'stack_power_basic_trio_precondition_invalid:inline=%,helper=%',
      v_inline_before, v_helper_before;
  end if;

  -- Introduce a per-call marker so the shared post-match block can distinguish
  -- matches already accounted for by the canonical helper from Explosion's
  -- distinct board-removal match path.
  v_old := 'v_active_type text; v_top_layer integer; v_match_delta integer:=0; v_meta_done jsonb; v_seed bigint; v_round integer; v_used text[]; v_recharge text; v_idx integer; v_threshold integer;';
  v_replacement := 'v_active_type text; v_top_layer integer; v_match_delta integer:=0; v_meta_done jsonb; v_seed bigint; v_round integer; v_used text[]; v_recharge text; v_idx integer; v_threshold integer; v_basic_trio_resolved boolean:=false;';
  v_new := replace(v_def, v_old, v_replacement);
  if v_new = v_def then
    raise exception 'stack_power_basic_trio_declaration_anchor_missing';
  end if;
  v_def := v_new;

  -- Both characterized Board Power tray-trio sites have the same normalized
  -- function text. PostgreSQL replace() is global, so one fail-closed rewrite
  -- must replace both occurrences at once; verify exactly two helper calls.
  v_old := $old$    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) e(val) where e.val=v_incoming;
    if v_type_count>=3 then
      select array_agg(s.ord::integer) into v_remove_ord from (select e.ord from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where e.val=v_incoming order by e.ord desc limit 3) s;
      select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray from jsonb_array_elements_text(v_tray) with ordinality e(val,ord) where not (e.ord::integer=any(v_remove_ord));
      v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=zuno_private.zuno_stack_cap_score(v_score+310);
    end if;$old$;
  v_replacement := $new$    select r->'tray',(r->>'matches')::integer,(r->>'energy')::integer,(r->>'combo')::integer,(r->>'bestCombo')::integer,(r->>'lastMatchAt')::bigint,(r->>'matched')::boolean
      into v_tray,v_matches,v_energy,v_combo,v_best,v_last,v_basic_trio_resolved
      from (select zuno_private.zuno_stack_resolve_basic_trio(v_tray,v_incoming,v_matches,v_energy,v_combo,v_best,v_last,v_now) r) q;
    if v_basic_trio_resolved then
      v_match_delta:=1; v_score:=zuno_private.zuno_stack_cap_score(v_score+310);
    end if;$new$;
  v_new := replace(v_def, v_old, v_replacement);
  if v_new = v_def
     or regexp_count(v_new, 'if v_type_count>=3 then') <> 0
     or regexp_count(v_new, 'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2 then
    raise exception 'stack_power_basic_trio_trio_anchors_invalid';
  end if;
  v_def := v_new;

  -- The helper already advances matches/combo/best/last/energy. Preserve the
  -- historical post-match accounting only for Explosion, which does not use
  -- tray trio resolution and therefore remains outside this extraction.
  v_old := $old$  if v_match_delta>0 then
    v_matches:=v_matches+v_match_delta;
    if v_last>0 and v_now-v_last<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if; v_last:=v_now; v_best:=greatest(v_best,v_combo);
    if v_phase='development' then$old$;
  v_replacement := $new$  if v_match_delta>0 then
    if not v_basic_trio_resolved then
      v_matches:=v_matches+v_match_delta;
      if v_last>0 and v_now-v_last<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if; v_last:=v_now; v_best:=greatest(v_best,v_combo);
    end if;
    if v_phase='development' then$new$;
  v_new := replace(v_def, v_old, v_replacement);
  if v_new = v_def then
    raise exception 'stack_power_basic_trio_post_match_anchor_missing';
  end if;

  if regexp_count(v_new, 'if v_type_count>=3 then') <> 0
     or regexp_count(v_new, 'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2
     or regexp_count(v_new, 'v_basic_trio_resolved') < 6
     or position('if not v_basic_trio_resolved then' in v_new) = 0
     or position($needle$elsif p_power='explosion' then$needle$ in v_new) = 0
     or position('v_match_delta:=1; v_energy:=least(5,v_energy+1); v_score:=zuno_private.zuno_stack_cap_score(v_score+450);' in v_new) = 0 then
    raise exception 'stack_power_basic_trio_extraction_verification_failed';
  end if;

  execute v_new;
end;
$migration$;
