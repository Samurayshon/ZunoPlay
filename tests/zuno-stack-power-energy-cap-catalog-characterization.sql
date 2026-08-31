\set ON_ERROR_STOP on

-- Twelfth extraction final catalog verification: Board Power energy cap is private,
-- canonical and wired at exactly the five caller-owned reward sites.
do $$
declare
  v_def text;
  v_helpers integer;
  v_plus_one integer;
  v_plus_two integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_energy(integer)') is null then
    raise exception 'power_energy_cap_catalog_missing_helper';
  end if;

  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  if v_def is null then
    raise exception 'power_energy_cap_catalog_missing_function';
  end if;

  if position('least(5,v_energy' in v_def) <> 0 then
    raise exception 'power_energy_cap_catalog_inline_cap_remains';
  end if;

  v_helpers := regexp_count(v_def, 'zuno_private\.zuno_stack_cap_energy\(');
  v_plus_one := regexp_count(v_def, 'v_energy:=zuno_private\.zuno_stack_cap_energy\(v_energy\+1\);');
  v_plus_two := regexp_count(v_def, 'v_energy:=zuno_private\.zuno_stack_cap_energy\(v_energy\+2\);');

  if v_helpers <> 5 or v_plus_one <> 4 or v_plus_two <> 1 then
    raise exception 'power_energy_cap_catalog_wiring_invalid:helpers=%,plus1=%,plus2=%',
      v_helpers, v_plus_one, v_plus_two;
  end if;

  if regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2 then
    raise exception 'power_energy_cap_catalog_basic_trio_changed';
  end if;
  if regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_phase\(') <> 1 then
    raise exception 'power_energy_cap_catalog_phase_helper_changed';
  end if;
  if position('ifv_threshold=15then' in v_def) = 0
     or position('ifv_threshold=30then' in v_def) = 0
     or position('ifv_threshold=45then' in v_def) = 0 then
    raise exception 'power_energy_cap_catalog_threshold_anchor_changed';
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_cap_energy(integer)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_cap_energy(integer)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_cap_energy(integer)','EXECUTE') then
    raise exception 'power_energy_cap_catalog_helper_exposed';
  end if;
end;
$$;

do $$
declare
  c record;
  v_actual integer;
begin
  for c in
    select * from (values
      (-1, -1),
      (0, 0),
      (4, 4),
      (5, 5),
      (6, 5),
      (7, 5)
    ) as x(input, expected)
  loop
    select zuno_private.zuno_stack_cap_energy(c.input) into v_actual;
    if v_actual is distinct from c.expected then
      raise exception 'power_energy_cap_catalog_boundary_invalid:input=%,expected=%,actual=%',
        c.input,c.expected,v_actual;
    end if;
  end loop;

  -- Preserve PostgreSQL LEAST semantics exactly. The original expression
  -- least(5, v_energy + gain) yields 5 when the candidate is NULL, so the
  -- helper must do the same rather than imposing stricter NULL propagation.
  select zuno_private.zuno_stack_cap_energy(null) into v_actual;
  if v_actual is distinct from 5 then
    raise exception 'power_energy_cap_catalog_null_semantics_changed:expected=5,actual=%', v_actual;
  end if;
end;
$$;

select 'zuno_stack_power_energy_cap_catalog_characterization_ok' as result;
