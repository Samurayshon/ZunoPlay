\set ON_ERROR_STOP on

-- Eleventh-extraction characterization contract: freeze the phase boundaries and
-- caller-owned phase behavior before and after the canonical helper is wired.
do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_raw text := 'v_phase:=casewhenv_removed<27then''opening''whenv_removed<45then''development''whenv_removed<68then''pressure''else''final''end;';
  v_helper text := 'v_phase:=zuno_private.zuno_stack_resolve_phase(v_removed);';
  v_raw_total integer;
  v_helper_total integer;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_power;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_gelo;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_desfazer;

  if v_power is null or v_gelo is null or v_desfazer is null then
    raise exception 'stack_phase_characterization_function_missing';
  end if;

  v_raw_total := regexp_count(v_power,v_raw)+regexp_count(v_gelo,v_raw)+regexp_count(v_desfazer,v_raw);
  v_helper_total := regexp_count(v_power,v_helper)+regexp_count(v_gelo,v_helper)+regexp_count(v_desfazer,v_helper);

  if not ((v_raw_total=3 and v_helper_total=0) or (v_raw_total=0 and v_helper_total=3)) then
    raise exception 'stack_phase_characterization_wiring_invalid:raw=%,helper=%',v_raw_total,v_helper_total;
  end if;

  -- Preserve caller-owned behavior that consumes the phase result. These anchors
  -- are deliberately independent from the previously extracted score/trio helpers.
  if position('v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;' in v_power) = 0 then
    raise exception 'stack_phase_characterization_power_cost_anchor_changed';
  end if;
  if position('ifv_phase=''development''then' in v_power)=0
     or position('elsifv_phase=''pressure''then' in v_power)=0
     or position('elsifv_phase=''final''then' in v_power)=0
     or position('v_score+25' in v_power)=0
     or position('v_score+40' in v_power)=0
     or position('v_score+60' in v_power)=0 then
    raise exception 'stack_phase_characterization_power_reward_anchor_changed';
  end if;
  if position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_gelo) = 0 then
    raise exception 'stack_phase_characterization_gelo_cost_anchor_changed';
  end if;
  if position('v_cost:=casewhenv_phase=''final''then0else1end;' in v_desfazer) = 0 then
    raise exception 'stack_phase_characterization_desfazer_cost_anchor_changed';
  end if;
end;
$$;

-- Freeze every phase boundary and its immediate neighbors independently of wiring.
do $$
declare
  c record;
  v_phase text;
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
    v_phase := case
      when c.removed < 27 then 'opening'
      when c.removed < 45 then 'development'
      when c.removed < 68 then 'pressure'
      else 'final'
    end;
    if v_phase is distinct from c.expected then
      raise exception 'stack_phase_boundary_changed:removed=%,expected=%,actual=%',
        c.removed,c.expected,v_phase;
    end if;
  end loop;
end;
$$;

select 'zuno_stack_phase_resolution_characterization_ok' as result;
