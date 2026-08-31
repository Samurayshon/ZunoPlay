\set ON_ERROR_STOP on

-- Direct characterization of the first private canonical extraction.
do $$
declare r jsonb;
begin
  r:=zuno_private.zuno_stack_resolve_basic_trio('["a","b","a","c","a"]'::jsonb,'a',0,0,0,0,0,1000);
  if r->'tray' <> '["b","c"]'::jsonb then raise exception 'helper must remove three latest matching occurrences'; end if;
  if (r->>'matched')::boolean is not true or (r->>'matches')::int<>1 or (r->>'energy')::int<>1 or (r->>'combo')::int<>1 or (r->>'bestCombo')::int<>1 or (r->>'lastMatchAt')::bigint<>1000 then raise exception 'helper first trio progression changed'; end if;

  r:=zuno_private.zuno_stack_resolve_basic_trio('["x","x","x"]'::jsonb,'x',4,5,2,3,800,1000);
  if (r->>'matches')::int<>5 or (r->>'energy')::int<>5 or (r->>'combo')::int<>3 or (r->>'bestCombo')::int<>3 or (r->>'lastMatchAt')::bigint<>1000 then raise exception 'helper combo/energy cap progression changed'; end if;

  r:=zuno_private.zuno_stack_resolve_basic_trio('["x","y"]'::jsonb,'x',7,2,4,6,900,1200);
  if (r->>'matched')::boolean is not false or r->'tray'<>'["x","y"]'::jsonb or (r->>'matches')::int<>7 or (r->>'energy')::int<>2 or (r->>'combo')::int<>4 or (r->>'bestCombo')::int<>6 or (r->>'lastMatchAt')::bigint<>900 then raise exception 'helper no-match must be identity'; end if;
end $$;

select 'zuno_stack_basic_trio_helper_characterization_ok' as result;
