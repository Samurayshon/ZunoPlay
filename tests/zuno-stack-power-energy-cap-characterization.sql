\set ON_ERROR_STOP on

-- Tenth canonical extraction characterization contract: Board Power energy cap only.
-- Freeze the seven caller-owned energy reward sites while allowing the implementation
-- to move from inline least(5, ...) expressions to a canonical helper later.
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
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  if v_def is null then
    raise exception 'board power function missing';
  end if;

  v_raw_total := (length(v_def) - length(replace(v_def, 'least(5,v_energy', ''))) / length('least(5,v_energy');
  v_helper_total := (length(v_def) - length(replace(v_def, 'zuno_private.zuno_stack_cap_energy(v_energy', ''))) / length('zuno_private.zuno_stack_cap_energy(v_energy');

  v_plus_one_total :=
    (length(v_def) - length(replace(v_def, v_raw_plus_one, ''))) / length(v_raw_plus_one)
    + (length(v_def) - length(replace(v_def, v_helper_plus_one, ''))) / length(v_helper_plus_one);

  v_plus_two_total :=
    (length(v_def) - length(replace(v_def, v_raw_plus_two, ''))) / length(v_raw_plus_two)
    + (length(v_def) - length(replace(v_def, v_helper_plus_two, ''))) / length(v_helper_plus_two);

  if v_raw_total + v_helper_total <> 7 then
    raise exception 'board power energy cap sites expected 7, raw %, helper %', v_raw_total, v_helper_total;
  end if;
  if v_plus_one_total <> 6 then
    raise exception 'board power +1 energy reward sites expected 6, got %', v_plus_one_total;
  end if;
  if v_plus_two_total <> 1 then
    raise exception 'board power +2 energy reward sites expected 1, got %', v_plus_two_total;
  end if;

  -- The tenth extraction is only a cap-operator extraction. Power-owned reward
  -- thresholds and the global energy ceiling must remain unchanged.
  if position('ifv_threshold=15then' in v_def) = 0
     or position('ifv_threshold=30then' in v_def) = 0
     or position('ifv_threshold=45then' in v_def) = 0 then
    raise exception 'board power threshold reward anchors changed';
  end if;
end;
$$;

select 'zuno_stack_power_energy_cap_characterization_ok' as result;
