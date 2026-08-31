\set ON_ERROR_STOP on

-- Direct characterization of the third canonical helper only.
do $$
declare
  r jsonb;
  tiles jsonb := '[{"id":"t0","type":"board-0"},{"id":"t1","type":"board-1"}]'::jsonb;
begin
  -- Non-triggering match count preserves Pulse/double/Relay.
  r:=zuno_private.zuno_stack_resolve_pulse(1,0,false,'["a"]'::jsonb,'[null,null,null]'::jsonb,tiles);
  if (r->>'pulseEventCount')::int<>0 or (r->>'doubleNext')::boolean or (r->>'relayGifted')::boolean or r->'relay'<>'[null,null,null]'::jsonb then
    raise exception 'pulse helper non-5 failed';
  end if;

  -- %3=1 arms doubleNext.
  r:=zuno_private.zuno_stack_resolve_pulse(5,0,false,'[]'::jsonb,'[null,null,null]'::jsonb,tiles);
  if (r->>'pulseEventCount')::int<>1 or not (r->>'doubleNext')::boolean or (r->>'relayGifted')::boolean then
    raise exception 'pulse helper mod1 failed';
  end if;

  -- %3=2 gifts dominant tray type; tie breaks by earliest occurrence.
  r:=zuno_private.zuno_stack_resolve_pulse(10,1,false,'["b","c","b","c"]'::jsonb,'[null,"held",null]'::jsonb,tiles);
  if (r->>'pulseEventCount')::int<>2 or (r->>'doubleNext')::boolean or not (r->>'relayGifted')::boolean or r->'relay'->>0<>'b' or r->'relay'->>1<>'held' then
    raise exception 'pulse helper gift/tiebreak failed';
  end if;

  -- Empty tray falls back to first board element.
  r:=zuno_private.zuno_stack_resolve_pulse(10,1,false,'[]'::jsonb,'[null,null,null]'::jsonb,tiles);
  if not (r->>'relayGifted')::boolean or r->'relay'->>0<>'board-0' then
    raise exception 'pulse helper fallback failed';
  end if;

  -- Full Relay cannot gift.
  r:=zuno_private.zuno_stack_resolve_pulse(10,1,false,'["b"]'::jsonb,'["x","y","z"]'::jsonb,tiles);
  if (r->>'pulseEventCount')::int<>2 or (r->>'relayGifted')::boolean or r->'relay'<>'["x","y","z"]'::jsonb then
    raise exception 'pulse helper full relay failed';
  end if;

  -- %3=0 increments Pulse only and preserves an already-false doubleNext.
  r:=zuno_private.zuno_stack_resolve_pulse(15,2,false,'["b"]'::jsonb,'[null,null,null]'::jsonb,tiles);
  if (r->>'pulseEventCount')::int<>3 or (r->>'doubleNext')::boolean or (r->>'relayGifted')::boolean or r->'relay'<>'[null,null,null]'::jsonb then
    raise exception 'pulse helper mod0 failed';
  end if;
end $$;

select 'zuno_stack_pulse_helper_characterization_ok' as result;
