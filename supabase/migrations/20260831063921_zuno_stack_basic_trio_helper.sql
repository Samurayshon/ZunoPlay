-- First canonical Zuno Stack extraction: basic trio resolution only.
-- Intentionally excludes scoring/doubleNext, Pulse/relay gift, auth, locking,
-- revision/idempotency/events, serverUndo and completion policy.

create or replace function zuno_private.zuno_stack_resolve_basic_trio(
  p_tray jsonb,
  p_type text,
  p_matches integer,
  p_energy integer,
  p_combo integer,
  p_best_combo integer,
  p_last_match_at bigint,
  p_now_ms bigint
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  v_tray jsonb := coalesce(p_tray, '[]'::jsonb);
  v_type_count integer;
  v_remove_ord integer[];
  v_matches integer := coalesce(p_matches,0);
  v_energy integer := coalesce(p_energy,0);
  v_combo integer := coalesce(p_combo,0);
  v_best_combo integer := coalesce(p_best_combo,0);
  v_last_match bigint := coalesce(p_last_match_at,0);
begin
  if jsonb_typeof(v_tray) <> 'array' or p_type is null or p_now_ms is null then
    raise exception 'invalid_stack_basic_trio_input' using errcode='22023';
  end if;
  select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=p_type;
  if v_type_count >= 3 then
    select array_agg(s.ord::integer) into v_remove_ord from (
      select e.ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
      where e.val=p_type order by e.ord desc limit 3
    ) s;
    select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray
    from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
    where not (e.ord::integer=any(v_remove_ord));
    if v_last_match>0 and p_now_ms-v_last_match<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if;
    v_last_match:=p_now_ms; v_best_combo:=greatest(v_best_combo,v_combo); v_matches:=v_matches+1; v_energy:=least(5,v_energy+1);
  end if;
  return jsonb_build_object('tray',v_tray,'matched',v_type_count>=3,'matches',v_matches,'energy',v_energy,'combo',v_combo,'bestCombo',v_best_combo,'lastMatchAt',v_last_match);
end;
$function$;
revoke all on function zuno_private.zuno_stack_resolve_basic_trio(jsonb,text,integer,integer,integer,integer,bigint,bigint) from public, anon, authenticated;

-- Keep the historical migrations immutable. Rebuild the two current private functions
-- from their catalog definitions, replacing only the duplicated basic-trio block.
do $migration$
declare
  v_def text;
  v_new text;
  v_old text;
  v_replacement text;
begin
  select pg_get_functiondef('zuno_private.zuno_stack_apply_tile_internal(uuid,bigint,text,text)'::regprocedure) into v_def;
  v_old := $old$  select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=v_type;
  if v_type_count>=3 then
    select array_agg(s.ord::integer) into v_remove_ord from (select e.ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord) where e.val=v_type order by e.ord desc limit 3) s;
    select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord) where not (e.ord::integer=any(v_remove_ord));
    if v_last_match>0 and v_now_ms-v_last_match<=4000 then v_combo:=v_combo+1; else v_combo:=1; end if;
    v_last_match:=v_now_ms; v_best_combo:=greatest(v_best_combo,v_combo); v_matches:=v_matches+1; v_gain:=(case when v_double then 620 else 310 end)+((v_combo-1)*55); v_double:=false; v_score:=least(25000,v_score+v_gain); v_energy:=least(5,v_energy+1);$old$;
  v_replacement := $new$  select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=v_type;
  if v_type_count>=3 then
    select r->'tray',(r->>'matches')::integer,(r->>'energy')::integer,(r->>'combo')::integer,(r->>'bestCombo')::integer,(r->>'lastMatchAt')::bigint
      into v_tray,v_matches,v_energy,v_combo,v_best_combo,v_last_match
      from (select zuno_private.zuno_stack_resolve_basic_trio(v_tray,v_type,v_matches,v_energy,v_combo,v_best_combo,v_last_match,v_now_ms) r) q;
    v_gain:=(case when v_double then 620 else 310 end)+((v_combo-1)*55); v_double:=false; v_score:=least(25000,v_score+v_gain);$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def then raise exception 'stack_tile_basic_trio_extraction_anchor_missing'; end if;
  execute v_new;

  select pg_get_functiondef('zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure) into v_def;
  v_old := $old$    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=v_type;
    if v_type_count >= 3 then
      select array_agg(s.ord::integer) into v_remove_ord from (
        select e.ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
        where e.val=v_type order by e.ord desc limit 3) s;
      select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray
        from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
        where not (e.ord::integer = any(v_remove_ord));
      if v_last_match > 0 and v_now_ms-v_last_match <= 4000 then v_combo := v_combo+1; else v_combo := 1; end if;
      v_last_match := v_now_ms; v_best_combo := greatest(v_best_combo,v_combo); v_matches := v_matches+1;
      v_gain := (case when v_double then 620 else 310 end) + ((v_combo-1)*55); v_double := false;
      v_score := least(25000,v_score+v_gain); v_energy := least(5,v_energy+1);$old$;
  v_replacement := $new$    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=v_type;
    if v_type_count >= 3 then
      select r->'tray',(r->>'matches')::integer,(r->>'energy')::integer,(r->>'combo')::integer,(r->>'bestCombo')::integer,(r->>'lastMatchAt')::bigint
        into v_tray,v_matches,v_energy,v_combo,v_best_combo,v_last_match
        from (select zuno_private.zuno_stack_resolve_basic_trio(v_tray,v_type,v_matches,v_energy,v_combo,v_best_combo,v_last_match,v_now_ms) r) q;
      v_gain := (case when v_double then 620 else 310 end) + ((v_combo-1)*55); v_double := false;
      v_score := least(25000,v_score+v_gain);$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def then raise exception 'stack_relay_basic_trio_extraction_anchor_missing'; end if;
  execute v_new;
end;
$migration$;
