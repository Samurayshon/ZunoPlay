\set ON_ERROR_STOP on

-- Direct characterization of the second canonical helper only.
-- Score application/cap and Pulse remain caller responsibilities.

do $$
declare r jsonb;
begin
  r := zuno_private.zuno_stack_resolve_post_trio_scoring(1,false);
  if (r->>'gain')::integer <> 310 or (r->>'doubleNext')::boolean is not false then
    raise exception 'post-trio helper normal base characterization failed';
  end if;

  r := zuno_private.zuno_stack_resolve_post_trio_scoring(2,false);
  if (r->>'gain')::integer <> 365 or (r->>'doubleNext')::boolean is not false then
    raise exception 'post-trio helper combo bonus characterization failed';
  end if;

  r := zuno_private.zuno_stack_resolve_post_trio_scoring(1,true);
  if (r->>'gain')::integer <> 620 or (r->>'doubleNext')::boolean is not false then
    raise exception 'post-trio helper doubleNext characterization failed';
  end if;

  r := zuno_private.zuno_stack_resolve_post_trio_scoring(3,true);
  if (r->>'gain')::integer <> 730 or (r->>'doubleNext')::boolean is not false then
    raise exception 'post-trio helper doubleNext combo characterization failed';
  end if;
end $$;

select 'zuno_stack_post_trio_scoring_helper_characterization_ok' as result;
