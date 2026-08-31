-- Second canonical Zuno Stack extraction: post-trio scoring only.
-- Intentionally excludes score cap/application, Pulse/relay gift, auth, locking,
-- revision/idempotency/events, rate limits, serverUndo and completion policy.

create or replace function zuno_private.zuno_stack_resolve_post_trio_scoring(
  p_combo integer,
  p_double_next boolean
)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'gain', (case when coalesce(p_double_next,false) then 620 else 310 end) + ((coalesce(p_combo,0)-1)*55),
    'doubleNext', false
  );
$function$;

revoke all on function zuno_private.zuno_stack_resolve_post_trio_scoring(integer,boolean) from public, anon, authenticated;

-- Keep historical migrations immutable. Rebuild only the two current private
-- functions from their catalog definitions, replacing the duplicated gain /
-- doubleNext-consumption statements. Score application/cap remains in callers.
do $migration$
declare
  v_def text;
  v_new text;
  v_old text;
  v_replacement text;
begin
  select pg_get_functiondef('zuno_private.zuno_stack_apply_tile_internal(uuid,bigint,text,text)'::regprocedure) into v_def;
  v_old := $old$    v_gain:=(case when v_double then 620 else 310 end)+((v_combo-1)*55); v_double:=false; v_score:=least(25000,v_score+v_gain);$old$;
  v_replacement := $new$    select (r->>'gain')::integer,(r->>'doubleNext')::boolean
      into v_gain,v_double
      from (select zuno_private.zuno_stack_resolve_post_trio_scoring(v_combo,v_double) r) q;
    v_score:=least(25000,v_score+v_gain);$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def then raise exception 'stack_tile_post_trio_scoring_extraction_anchor_missing'; end if;
  execute v_new;

  select pg_get_functiondef('zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure) into v_def;
  v_old := $old$      v_gain := (case when v_double then 620 else 310 end) + ((v_combo-1)*55); v_double := false;
      v_score := least(25000,v_score+v_gain);$old$;
  v_replacement := $new$      select (r->>'gain')::integer,(r->>'doubleNext')::boolean
        into v_gain,v_double
        from (select zuno_private.zuno_stack_resolve_post_trio_scoring(v_combo,v_double) r) q;
      v_score := least(25000,v_score+v_gain);$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def then raise exception 'stack_relay_post_trio_scoring_extraction_anchor_missing'; end if;
  execute v_new;
end;
$migration$;
