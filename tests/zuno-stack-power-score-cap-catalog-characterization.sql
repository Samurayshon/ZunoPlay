\set ON_ERROR_STOP on

-- Final-catalog guard for the eighth canonical extraction.
-- The Board Power engine must use the canonical score-cap helper at all twelve
-- caller-owned score mutation sites and must not retain literal least(25000,...).

do $$
declare
  v_def text;
  v_helpers integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_score(integer)') is null then
    raise exception 'power_score_cap_catalog_missing_helper';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'power_score_cap_catalog_missing_function';
  end if;

  if regexp_count(v_def, 'least\(25000,') <> 0 then
    raise exception 'power_score_cap_catalog_inline_cap_remains';
  end if;

  v_helpers := regexp_count(v_def, 'zuno_private\.zuno_stack_cap_score\(');
  if v_helpers <> 12 then
    raise exception 'power_score_cap_catalog_helper_count:%', v_helpers;
  end if;

  if regexp_count(v_def, 'v_score:=zuno_private\.zuno_stack_cap_score\(') <> 12 then
    raise exception 'power_score_cap_catalog_scope_changed';
  end if;

  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+40);' in v_def) = 0 then raise exception 'power_score_cap_catalog_fluxo_gain'; end if;
  if regexp_count(v_def, 'v_score:=zuno_private\.zuno_stack_cap_score\(v_score\+310\);') <> 2 then raise exception 'power_score_cap_catalog_trio_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+55);' in v_def) = 0 then raise exception 'power_score_cap_catalog_troca_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+450);' in v_def) = 0 then raise exception 'power_score_cap_catalog_explosion_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+case p_power when ''elo'' then 80 when ''fase'' then 70 else 60 end);' in v_def) = 0 then raise exception 'power_score_cap_catalog_board_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+greatest(1,v_type_count)*35);' in v_def) = 0 then raise exception 'power_score_cap_catalog_vortice_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+25);' in v_def) = 0 then raise exception 'power_score_cap_catalog_development_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+60);' in v_def) = 0 then raise exception 'power_score_cap_catalog_final_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+v_combo*25*v_mult);' in v_def) = 0 then raise exception 'power_score_cap_catalog_combo_gain'; end if;
  if position('v_score:=zuno_private.zuno_stack_cap_score(v_score+300);' in v_def) = 0 then raise exception 'power_score_cap_catalog_meta_gain'; end if;
end;
$$;

select 'zuno_stack_power_score_cap_catalog_characterization_ok' as marker;
