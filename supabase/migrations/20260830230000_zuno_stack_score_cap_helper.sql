-- Fifth canonical Zuno Stack extraction: score cap only.
-- Intentionally excludes caller bonuses, trio/gain calculation, combo, doubleNext,
-- Pulse, energy, relayRev, serverUndo, win/finish, auth, locking,
-- revision/idempotency/events, rate limits and persistence.

create or replace function zuno_private.zuno_stack_cap_score(p_score integer)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $function$
  select least(25000, p_score);
$function$;

revoke all on function zuno_private.zuno_stack_cap_score(integer) from public, anon, authenticated;

-- Historical migrations remain immutable. Replace only the characterized score-cap
-- applications in Tile and Relay Take. Relay Send (+20) is deliberately excluded.
do $migration$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef('zuno_private.zuno_stack_apply_tile_internal(uuid,bigint,text,text)'::regprocedure) into v_def;
  v_new := replace(v_def,
    'v_score:=least(25000,v_score+25);',
    'v_score:=zuno_private.zuno_stack_cap_score(v_score+25);');
  v_new := replace(v_new,
    'v_score:=least(25000,v_score+v_gain);',
    'v_score:=zuno_private.zuno_stack_cap_score(v_score+v_gain);');
  if v_new=v_def
     or position('zuno_stack_cap_score(v_score+25)' in v_new)=0
     or position('zuno_stack_cap_score(v_score+v_gain)' in v_new)=0 then
    raise exception 'stack_tile_score_cap_extraction_anchor_missing';
  end if;
  execute v_new;

  select pg_get_functiondef('zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer)'::regprocedure) into v_def;
  -- The shared trio gain occurs only in Relay Take. Do not touch the Relay Send +20 cap.
  v_new := replace(v_def,
    'v_score := least(25000,v_score+v_gain);',
    'v_score := zuno_private.zuno_stack_cap_score(v_score+v_gain);');
  v_new := replace(v_new,
    'v_score := least(25000,v_score+10);',
    'v_score := zuno_private.zuno_stack_cap_score(v_score+10);');
  if v_new=v_def
     or position('zuno_stack_cap_score(v_score+v_gain)' in v_new)=0
     or position('zuno_stack_cap_score(v_score+10)' in v_new)=0
     or position('least(25000,v_score+20)' in v_new)=0 then
    raise exception 'stack_relay_take_score_cap_extraction_anchor_missing';
  end if;
  execute v_new;
end;
$migration$;
