\set ON_ERROR_STOP on

-- Twelfth canonical Zuno Stack extraction characterization contract: Board Power energy cap only.
-- Extraction #10 moved two tray-trio energy rewards into the canonical basic-trio helper.
-- Extraction #11 moved phase resolution into the canonical phase helper.
-- Freeze only the five energy-cap sites still owned by Board Power itself.
do $$
declare
  v_def text;
  v_raw_plus_one text := 'v_energy:=least(5,v_energy+1);';
  v_raw_plus_two text := 'v_energy:=least(5,v_energy+2);';
  v_helper_plus_one text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+1);';
  v_helper_plus_two text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+2);';
  v_raw_total integer;
  v_helper_total integer;
  v_plus_one_total integer;
  v_plus_two_total integer;
  v_basic_trio_calls integer;
  v_phase_helper_calls integer;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  if v_def is null then
    raise exception 'board power function missing';
  end if;

  if to_regprocedure('zuno_private.zuno_stack_cap_energy(integer)') is not null then
    raise exception 'energy cap helper already exists before extraction #12';
  end if;

  v_raw_total := (length(v_def) - length(replace(v_def, 'least(5,v_energy', ''))) / length('least(5,v_energy');
  v_helper_total := (length(v_def) - length(replace(v_def, 'zuno_private.zuno_stack_cap_energy(v_energy', ''))) / length('zuno_private.zuno_stack_cap_energy(v_energy');
  v_basic_trio_calls := regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_basic_trio\(');
  v_phase_helper_calls := regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_phase\(');

  v_plus_one_total :=
    (length(v_def) - length(replace(v_def, v_raw_plus_one, ''))) / length(v_raw_plus_one)
    + (length(v_def) - length(replace(v_def, v_helper_plus_one, ''))) / length(v_helper_plus_one);

  v_plus_two_total :=
    (length(v_def) - length(replace(v_def, v_raw_plus_two, ''))) / length(v_raw_plus_two)
    + (length(v_def) - length(replace(v_def, v_helper_plus_two, ''))) / length(v_helper_plus_two);

  if v_basic_trio_calls <> 2 then
    raise exception 'board power basic-trio helper calls expected 2 after extraction #10, got %', v_basic_trio_calls;
  end if;
  if v_phase_helper_calls <> 1 then
    raise exception 'board power phase helper calls expected 1 after extraction #11, got %', v_phase_helper_calls;
  end if;
  if position('v_phase:=casewhenv_removed<27then''opening''whenv_removed<45then''development''whenv_removed<68then''pressure''else''final''end;' in v_def) <> 0 then
    raise exception 'board power inline phase mapping unexpectedly remains after extraction #11';
  end if;
  if v_raw_total <> 5 or v_helper_total <> 0 then
    raise exception 'board power pre-#12 energy cap sites expected raw 5/helper 0, raw %, helper %', v_raw_total, v_helper_total;
  end if;
  if v_plus_one_total <> 4 then
    raise exception 'board power remaining +1 energy reward sites expected 4, got %', v_plus_one_total;
  end if;
  if v_plus_two_total <> 1 then
    raise exception 'board power +2 energy reward sites expected 1, got %', v_plus_two_total;
  end if;

  -- Extraction #12 is only a cap-operator extraction. Board Power-owned threshold
  -- rewards and the already-canonical trio/phase ownership must not move.
  if position('ifv_threshold=15then' in v_def) = 0
     or position('ifv_threshold=30then' in v_def) = 0
     or position('ifv_threshold=45then' in v_def) = 0 then
    raise exception 'board power threshold reward anchors changed';
  end if;
end;
$$;

select 'zuno_stack_power_energy_cap_characterization_ok' as result;
