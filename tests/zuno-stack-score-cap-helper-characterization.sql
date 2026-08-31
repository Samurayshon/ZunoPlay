\set ON_ERROR_STOP on

-- Direct characterization for the fifth canonical helper only.
do $$
begin
  if zuno_private.zuno_stack_cap_score(0) <> 0 then
    raise exception 'score cap changed zero';
  end if;
  if zuno_private.zuno_stack_cap_score(24925) <> 24925 then
    raise exception 'score cap changed below-cap value';
  end if;
  if zuno_private.zuno_stack_cap_score(25000) <> 25000 then
    raise exception 'score cap changed boundary';
  end if;
  if zuno_private.zuno_stack_cap_score(25001) <> 25000 then
    raise exception 'score cap failed one-over boundary';
  end if;
  if zuno_private.zuno_stack_cap_score(25620) <> 25000 then
    raise exception 'score cap failed high value';
  end if;
end
$$;

select 'zuno_stack_score_cap_helper_characterization_ok' as result;
