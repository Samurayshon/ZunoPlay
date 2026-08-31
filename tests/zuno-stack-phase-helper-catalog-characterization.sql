\set ON_ERROR_STOP on

-- Final-catalog guard for the tenth canonical extraction.
do $$
declare
  v_sig text;
  v_def text;
  v_inline text := 'v_phase:=casewhenv_removed<27then''opening''whenv_removed<45then''development''whenv_removed<68then''pressure''else''final''end;';
  v_helper text := 'v_phase:=zuno_private.zuno_stack_phase_from_removed(v_removed);';
  v_inline_count integer;
  v_helper_count integer;
  v_volatility "char";
  v_security_definer boolean;
begin
  if to_regprocedure('zuno_private.zuno_stack_phase_from_removed(integer)') is null then
    raise exception 'stack_phase_catalog_helper_missing';
  end if;

  select p.provolatile,p.prosecdef
    into v_volatility,v_security_definer
  from pg_proc p
  where p.oid='zuno_private.zuno_stack_phase_from_removed(integer)'::regprocedure;

  if v_volatility <> 'i' or v_security_definer then
    raise exception 'stack_phase_catalog_helper_properties_invalid';
  end if;
  if has_function_privilege('anon','zuno_private.zuno_stack_phase_from_removed(integer)','EXECUTE')
     or has_function_privilege('authenticated','zuno_private.zuno_stack_phase_from_removed(integer)','EXECUTE') then
    raise exception 'stack_phase_catalog_helper_client_executable';
  end if;

  if zuno_private.zuno_stack_phase_from_removed(0) <> 'opening' then raise exception 'stack_phase_catalog_0'; end if;
  if zuno_private.zuno_stack_phase_from_removed(26) <> 'opening' then raise exception 'stack_phase_catalog_26'; end if;
  if zuno_private.zuno_stack_phase_from_removed(27) <> 'development' then raise exception 'stack_phase_catalog_27'; end if;
  if zuno_private.zuno_stack_phase_from_removed(44) <> 'development' then raise exception 'stack_phase_catalog_44'; end if;
  if zuno_private.zuno_stack_phase_from_removed(45) <> 'pressure' then raise exception 'stack_phase_catalog_45'; end if;
  if zuno_private.zuno_stack_phase_from_removed(67) <> 'pressure' then raise exception 'stack_phase_catalog_67'; end if;
  if zuno_private.zuno_stack_phase_from_removed(68) <> 'final' then raise exception 'stack_phase_catalog_68'; end if;
  if zuno_private.zuno_stack_phase_from_removed(90) <> 'final' then raise exception 'stack_phase_catalog_90'; end if;

  foreach v_sig in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select regexp_replace(pg_get_functiondef(to_regprocedure(v_sig)),'\s+','','g') into v_def;
    if v_def is null then raise exception 'stack_phase_catalog_target_missing:%',v_sig; end if;

    v_inline_count := (length(v_def)-length(replace(v_def,v_inline,''))) / length(v_inline);
    v_helper_count := (length(v_def)-length(replace(v_def,v_helper,''))) / length(v_helper);
    if v_inline_count<>0 or v_helper_count<>1 then
      raise exception 'stack_phase_catalog_wiring_invalid:%:inline=%:helper=%',v_sig,v_inline_count,v_helper_count;
    end if;

    if v_sig like '%apply_power_internal%'
       and position('v_cost:=casep_powerwhen''explosion''then3when''elo''then2when''fase''then2when''vortice''then2when''fluxo''then1when''ima''then1when''troca''thencasewhenv_phase=''final''then0else1endelse99end;' in v_def)=0 then
      raise exception 'stack_phase_catalog_power_cost';
    elsif v_sig like '%apply_gelo_internal%'
       and position('v_cost:=casewhenv_phase=''pressure''then1else2end;' in v_def)=0 then
      raise exception 'stack_phase_catalog_gelo_cost';
    elsif v_sig like '%apply_desfazer_internal%'
       and position('v_cost:=casewhenv_phase=''final''then0else1end;' in v_def)=0 then
      raise exception 'stack_phase_catalog_desfazer_cost';
    end if;
  end loop;
end;
$$;

select 'zuno_stack_phase_helper_catalog_characterization_ok' as marker;
