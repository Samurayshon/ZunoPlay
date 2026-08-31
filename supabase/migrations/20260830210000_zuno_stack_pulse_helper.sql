-- Third canonical Zuno Stack extraction: post-match Pulse / Relay gift only.
-- Intentionally excludes relayRev policy, scoring, basic trio, energy, serverUndo,
-- completion, auth, locking, revision/idempotency/events and rate limits.

create or replace function zuno_private.zuno_stack_resolve_pulse(
  p_matches integer,
  p_pulse_event_count integer,
  p_double_next boolean,
  p_tray jsonb,
  p_relay jsonb,
  p_tiles jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  v_pulse integer := coalesce(p_pulse_event_count,0);
  v_double boolean := coalesce(p_double_next,false);
  v_relay jsonb := coalesce(p_relay,'[]'::jsonb);
  v_slot integer;
  v_relay_type text;
  v_gifted boolean := false;
begin
  if jsonb_typeof(v_relay)<>'array' or jsonb_typeof(coalesce(p_tray,'[]'::jsonb))<>'array'
     or jsonb_typeof(coalesce(p_tiles,'[]'::jsonb))<>'array' then
    raise exception 'invalid_stack_pulse_input' using errcode='22023';
  end if;

  if coalesce(p_matches,0) % 5 = 0 and coalesce(p_matches,0) > 0 then
    v_pulse:=v_pulse+1;
    if v_pulse % 3 = 1 then
      v_double:=true;
    elsif v_pulse % 3 = 2 then
      select (e.ord-1)::integer into v_slot
      from jsonb_array_elements(v_relay) with ordinality as e(val,ord)
      where e.val='null'::jsonb order by e.ord limit 1;

      select s.val into v_relay_type from (
        select e.val,count(*) as n,min(e.ord) as first_ord
        from jsonb_array_elements_text(coalesce(p_tray,'[]'::jsonb)) with ordinality as e(val,ord)
        group by e.val order by n desc,first_ord asc limit 1
      ) s;
      if v_relay_type is null then
        select e.tile->>'type' into v_relay_type
        from jsonb_array_elements(coalesce(p_tiles,'[]'::jsonb)) with ordinality as e(tile,ord)
        order by e.ord limit 1;
      end if;
      if v_slot is not null and v_relay_type is not null then
        v_relay:=jsonb_set(v_relay,array[v_slot::text],to_jsonb(v_relay_type),false);
        v_gifted:=true;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'pulseEventCount',v_pulse,
    'doubleNext',v_double,
    'relay',v_relay,
    'relayGifted',v_gifted
  );
end;
$function$;

revoke all on function zuno_private.zuno_stack_resolve_pulse(integer,integer,boolean,jsonb,jsonb,jsonb) from public, anon, authenticated;

-- Historical migrations remain immutable. Replace only the duplicated Pulse blocks
-- in the current catalog definitions. relayRev stays caller-owned to preserve the
-- characterized Tile vs Relay Take asymmetry.
do $migration$
declare
  v_def text;
  v_new text;
  v_old text;
  v_replacement text;
begin
  select pg_get_functiondef('zuno_private.zuno_stack_apply_tile_internal(uuid,bigint,text,text)'::regprocedure) into v_def;
  v_old := $old$    if v_matches%5=0 then
      v_pulse:=v_pulse+1;
      if v_pulse%3=1 then v_double:=true;
      elsif v_pulse%3=2 then
        select (e.ord-1)::integer into v_relay_index from jsonb_array_elements(v_relay) with ordinality as e(val,ord) where e.val='null'::jsonb order by e.ord limit 1;
        select s.val into v_relay_type from (select e.val,count(*) as n,min(e.ord) as first_ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord) group by e.val order by n desc,first_ord asc limit 1) s;
        if v_relay_type is null then select e.tile->>'type' into v_relay_type from jsonb_array_elements(v_tiles) with ordinality as e(tile,ord) order by e.ord limit 1; end if;
        if v_relay_index is not null and v_relay_type is not null then v_relay:=jsonb_set(v_relay,array[v_relay_index::text],to_jsonb(v_relay_type),false); v_relay_rev:=v_now_ms; end if;
      end if;
    end if;$old$;
  v_replacement := $new$    select r->'relay',(r->>'pulseEventCount')::integer,(r->>'doubleNext')::boolean,(r->>'relayGifted')::boolean
      into v_relay,v_pulse,v_double,v_gifted
      from (select zuno_private.zuno_stack_resolve_pulse(v_matches,v_pulse,v_double,v_tray,v_relay,v_tiles) r) q;
    if v_gifted then v_relay_rev:=v_now_ms; end if;$new$;
  -- Add the one local needed to preserve Tile relayRev policy outside the helper.
  v_new := replace(v_def,'  v_relay_type text;','  v_relay_type text;'||E'\n  v_gifted boolean;');
  v_new := replace(v_new,v_old,v_replacement);
  if v_new=v_def or position('v_gifted boolean;' in v_new)=0 or position('zuno_stack_resolve_pulse' in v_new)=0 then
    raise exception 'stack_tile_pulse_extraction_anchor_missing';
  end if;
  execute v_new;

  select pg_get_functiondef('zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure) into v_def;
  v_old := $old$      if v_matches % 5 = 0 then
        v_pulse := v_pulse+1;
        if v_pulse % 3 = 1 then v_double := true;
        elsif v_pulse % 3 = 2 then
          select (e.ord-1)::integer into v_slot from jsonb_array_elements(v_relay) with ordinality as e(val,ord)
            where e.val='null'::jsonb order by e.ord limit 1;
          select s.val into v_relay_type from (
            select e.val,count(*) as n,min(e.ord) as first_ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
            group by e.val order by n desc,first_ord asc limit 1) s;
          if v_relay_type is null then
            select e.tile->>'type' into v_relay_type from jsonb_array_elements(v_tiles) with ordinality as e(tile,ord) order by e.ord limit 1;
          end if;
          if v_slot is not null and v_relay_type is not null then
            v_relay := jsonb_set(v_relay,array[v_slot::text],to_jsonb(v_relay_type),false);
          end if;
        end if;
      end if;$old$;
  v_replacement := $new$      select r->'relay',(r->>'pulseEventCount')::integer,(r->>'doubleNext')::boolean
        into v_relay,v_pulse,v_double
        from (select zuno_private.zuno_stack_resolve_pulse(v_matches,v_pulse,v_double,v_tray,v_relay,v_tiles) r) q;$new$;
  v_new := replace(v_def,v_old,v_replacement);
  if v_new=v_def or position('zuno_stack_resolve_pulse' in v_new)=0 then
    raise exception 'stack_relay_pulse_extraction_anchor_missing';
  end if;
  execute v_new;
end;
$migration$;
