\set ON_ERROR_STOP on

-- Eleventh extraction final catalog verification: one private phase helper, wired
-- exactly once into Board Power, Gelo and Desfazer.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_raw text := 'v_phase:=casewhenv_removed<27then''opening''whenv_removed<45then''development''whenv_removed<68then''pressure''else''final''end;';
  v_helper text := 'v_phase:=zuno_private.zuno_stack_resolve_phase(v_removed);';
  v_power_helper_count integer;
  v_gelo_helper_count integer;
  v_desfazer_helper_count integer;
  v_raw_total integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_phase(integer)') is null then
    raise exception 'stack_phase_catalog_helper_missing';
  end if;

  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_power;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_gelo;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_desfazer;

  v_power_helper_count := (length(v_power)-length(replace(v_power,v_helper,'')))/length(v_helper);
  v_gelo_helper_count := (length(v_gelo)-length(replace(v_gelo,v_helper,'')))/length(v_helper);
  v_desfazer_helper_count := (length(v_desfazer)-length(replace(v_desfazer,v_helper,'')))/length(v_helper);
  v_raw_total :=
    (length(v_power)-length(replace(v_power,v_raw,'')))/length(v_raw)
    +(length(v_gelo)-length(replace(v_gelo,v_raw,'')))/length(v_raw)
    +(length(v_desfazer)-length(replace(v_desfazer,v_raw,'')))/length(v_raw);

  if v_power_helper_count<>1
     or v_gelo_helper_count<>1
     or v_desfazer_helper_count<>1 then
    raise exception 'stack_phase_catalog_helper_wiring_invalid:power=%,gelo=%,desfazer=%',
      v_power_helper_count,v_gelo_helper_count,v_desfazer_helper_count;
  end if;
  if v_raw_total<>0 then
    raise exception 'stack_phase_catalog_raw_resolution_remains:%',v_raw_total;
  end if;

  if has_function_privilege('public','zuno_private.zuno_stack_resolve_phase(integer)','EXECUTE')
     or has_function_privilege('anon','zuno_private.zuno_stack_resolve_phase(integer)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_resolve_phase(integer)','EXECUTE') then
    raise exception 'stack_phase_catalog_helper_exposed';
  end if;
end;
$$;

do $$
declare
  c record;
  v_actual text;
begin
  for c in
    select * from (values
      (0,  'opening'),
      (26, 'opening'),
      (27, 'development'),
      (44, 'development'),
      (45, 'pressure'),
      (67, 'pressure'),
      (68, 'final'),
      (90, 'final')
    ) as x(removed, expected)
  loop
    select zuno_private.zuno_stack_resolve_phase(c.removed) into v_actual;
    if v_actual is distinct from c.expected then
      raise exception 'stack_phase_catalog_boundary_invalid:removed=%,expected=%,actual=%',
        c.removed,c.expected,v_actual;
    end if;
  end loop;
end;
$$;

select 'zuno_stack_phase_resolution_catalog_characterization_ok' as result;
