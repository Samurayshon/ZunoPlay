-- Tenth canonical Zuno Stack extraction: shared phase mapping only.
-- Replaces three byte-equivalent removed-count CASE expressions with one private,
-- immutable helper. Power-specific costs/effects, Gelo timers and Desfazer semantics
-- remain caller-owned. Historical migrations remain immutable.

create or replace function zuno_private.zuno_stack_phase_from_removed(p_removed integer)
returns text
language sql
immutable
security invoker
set search_path = ''
as $function$
  select case
    when p_removed < 27 then 'opening'
    when p_removed < 45 then 'development'
    when p_removed < 68 then 'pressure'
    else 'final'
  end;
$function$;

revoke all on function zuno_private.zuno_stack_phase_from_removed(integer) from public, anon, authenticated;

do $migration$
declare
  v_sig text;
  v_def text;
  v_new text;
  v_target constant text := 'v_phase:=case when v_removed<27 then ''opening'' when v_removed<45 then ''development'' when v_removed<68 then ''pressure'' else ''final'' end;';
  v_replacement constant text := 'v_phase:=zuno_private.zuno_stack_phase_from_removed(v_removed);';
  v_target_count integer;
  v_replacement_count integer;
begin
  foreach v_sig in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    if to_regprocedure(v_sig) is null then
      raise exception 'stack_phase_target_function_missing:%', v_sig;
    end if;

    select pg_get_functiondef(to_regprocedure(v_sig)) into v_def;
    v_target_count := (length(v_def)-length(replace(v_def,v_target,''))) / length(v_target);
    v_replacement_count := (length(v_def)-length(replace(v_def,v_replacement,''))) / length(v_replacement);

    if v_target_count <> 1 or v_replacement_count <> 0 then
      raise exception 'stack_phase_precondition_invalid:%:inline=%:helper=%', v_sig,v_target_count,v_replacement_count;
    end if;

    -- Freeze the caller-owned costs that consume v_phase; this extraction changes
    -- phase derivation only, never the meaning of a phase for an individual power.
    if v_sig like '%apply_power_internal%'
       and position('v_cost:=case p_power when ''explosion'' then 3 when ''elo'' then 2 when ''fase'' then 2 when ''vortice'' then 2 when ''fluxo'' then 1 when ''ima'' then 1 when ''troca'' then case when v_phase=''final'' then 0 else 1 end else 99 end;' in v_def)=0 then
      raise exception 'stack_phase_power_cost_contract_changed';
    elsif v_sig like '%apply_gelo_internal%'
       and position('v_cost:=case when v_phase=''pressure'' then 1 else 2 end;' in v_def)=0 then
      raise exception 'stack_phase_gelo_cost_contract_changed';
    elsif v_sig like '%apply_desfazer_internal%'
       and position('v_cost:=case when v_phase=''final'' then 0 else 1 end;' in v_def)=0 then
      raise exception 'stack_phase_desfazer_cost_contract_changed';
    end if;

    v_new := replace(v_def,v_target,v_replacement);
    v_target_count := (length(v_new)-length(replace(v_new,v_target,''))) / length(v_target);
    v_replacement_count := (length(v_new)-length(replace(v_new,v_replacement,''))) / length(v_replacement);

    if v_new=v_def or v_target_count<>0 or v_replacement_count<>1 then
      raise exception 'stack_phase_extraction_verification_failed:%', v_sig;
    end if;

    execute v_new;
  end loop;
end;
$migration$;
