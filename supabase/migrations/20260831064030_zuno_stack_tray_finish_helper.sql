-- Fourth canonical Zuno Stack extraction: tray-finish predicate only.
-- Intentionally excludes win/active/kind, scoring, trio resolution, Pulse, energy,
-- serverUndo, auth, locking, revision/idempotency/events, rate limits and persistence.

create or replace function zuno_private.zuno_stack_should_finish_tray(p_tray jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  v_has_match boolean;
begin
  if jsonb_typeof(coalesce(p_tray,'[]'::jsonb)) <> 'array' then
    raise exception 'invalid_stack_tray_finish_input' using errcode='22023';
  end if;

  if jsonb_array_length(coalesce(p_tray,'[]'::jsonb)) < 7 then
    return false;
  end if;

  select exists(
    select 1
    from (
      select e.val, count(*) as n
      from jsonb_array_elements_text(coalesce(p_tray,'[]'::jsonb)) as e(val)
      group by e.val
    ) s
    where s.n >= 3
  ) into v_has_match;

  return not coalesce(v_has_match,false);
end;
$function$;

revoke all on function zuno_private.zuno_stack_should_finish_tray(jsonb) from public, anon, authenticated;

-- Historical migrations remain immutable. Replace only the duplicated tray-finish
-- predicates in the current catalog definitions. Tile keeps win precedence and both
-- callers keep active/kind ownership.
do $migration$
declare
  v_def text;
  v_new text;
  v_old text;
  v_replacement text;
begin
  select pg_get_functiondef('zuno_private.zuno_stack_apply_tile_internal(uuid,bigint,text,text)'::regprocedure) into v_def;
  v_old := $old$  select exists(select 1 from (select e.val,count(*) as n from jsonb_array_elements_text(v_tray) as e(val) group by e.val) s where s.n>=3) into v_has_match;
  v_active:=true; if v_tiles_left=0 then v_active:=false; v_kind:='win'; elsif jsonb_array_length(v_tray)>=7 and not v_has_match then v_active:=false; v_kind:='finish'; end if;$old$;
  v_replacement := $new$  v_active:=true; if v_tiles_left=0 then v_active:=false; v_kind:='win'; elsif zuno_private.zuno_stack_should_finish_tray(v_tray) then v_active:=false; v_kind:='finish'; end if;$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def or position('zuno_stack_should_finish_tray' in v_new)=0 then
    raise exception 'stack_tile_tray_finish_extraction_anchor_missing';
  end if;
  execute v_new;

  select pg_get_functiondef('zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure) into v_def;
  v_old := $old$    select exists(select 1 from (select e.val,count(*) as n from jsonb_array_elements_text(v_tray) as e(val) group by e.val) s where s.n>=3) into v_has_match;
    if jsonb_array_length(v_tray)>=7 and not v_has_match then v_active := false; v_kind := 'finish'; else v_kind := 'server_relay_take'; end if;$old$;
  v_replacement := $new$    if zuno_private.zuno_stack_should_finish_tray(v_tray) then v_active := false; v_kind := 'finish'; else v_kind := 'server_relay_take'; end if;$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def or position('zuno_stack_should_finish_tray' in v_new)=0 then
    raise exception 'stack_relay_tray_finish_extraction_anchor_missing';
  end if;
  execute v_new;
end;
$migration$;
