-- Fourteenth canonical Zuno Stack extraction: power-cost resolution only.
-- Centralizes the cost mapping shared by Board Power, Gelo and Desfazer while
-- preserving caller-owned charge checks, readiness, energy mutation, rewards and events.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_resolve_power_cost(p_power text,p_phase text)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $function$
  select case p_power
    when 'explosion' then 3
    when 'elo' then 2
    when 'fase' then 2
    when 'vortice' then 2
    when 'fluxo' then 1
    when 'ima' then 1
    when 'troca' then case when p_phase='final' then 0 else 1 end
    when 'gelo' then case when p_phase='pressure' then 1 else 2 end
    when 'desfazer' then case when p_phase='final' then 0 else 1 end
    else 99
  end;
$function$;

revoke all on function zuno_private.zuno_stack_resolve_power_cost(text,text) from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_def text;
  v_new text;
  v_target text;
  v_replacement text;
  v_target_count integer;
  v_helper_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_power_cost(text,text)') is null then
    raise exception 'stack_power_cost_helper_missing';
  end if;

  -- Board Power keeps the selected power and phase as caller-owned inputs.
  v_signature := 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)';
  v_target := 'v_cost:=case p_power when ''explosion'' then 3 when ''elo'' then 2 when ''fase'' then 2 when ''vortice'' then 2 when ''fluxo'' then 1 when ''ima'' then 1 when ''troca'' then case when v_phase=''final'' then 0 else 1 end else 99 end;';
  v_replacement := 'v_cost:=zuno_private.zuno_stack_resolve_power_cost(p_power,v_phase);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_cost_function_missing:%',v_signature; end if;
  v_target_count := (length(v_def)-length(replace(v_def,v_target,'')))/length(v_target);
  if v_target_count <> 1 or position(v_replacement in v_def)<>0 then
    raise exception 'stack_power_cost_board_anchor_invalid:target=%',v_target_count;
  end if;
  v_new := replace(v_def,v_target,v_replacement);
  execute v_new;

  -- Gelo preserves its pressure discount through the canonical resolver.
  v_signature := 'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)';
  v_target := 'v_cost:=case when v_phase=''pressure'' then 1 else 2 end;';
  v_replacement := 'v_cost:=zuno_private.zuno_stack_resolve_power_cost(''gelo'',v_phase);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_cost_function_missing:%',v_signature; end if;
  v_target_count := (length(v_def)-length(replace(v_def,v_target,'')))/length(v_target);
  if v_target_count <> 1 or position(v_replacement in v_def)<>0 then
    raise exception 'stack_power_cost_gelo_anchor_invalid:target=%',v_target_count;
  end if;
  v_new := replace(v_def,v_target,v_replacement);
  execute v_new;

  -- Desfazer preserves its zero-cost final phase through the same resolver.
  v_signature := 'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)';
  v_target := 'v_cost:=case when v_phase=''final'' then 0 else 1 end;';
  v_replacement := 'v_cost:=zuno_private.zuno_stack_resolve_power_cost(''desfazer'',v_phase);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_cost_function_missing:%',v_signature; end if;
  v_target_count := (length(v_def)-length(replace(v_def,v_target,'')))/length(v_target);
  if v_target_count <> 1 or position(v_replacement in v_def)<>0 then
    raise exception 'stack_power_cost_desfazer_anchor_invalid:target=%',v_target_count;
  end if;
  v_new := replace(v_def,v_target,v_replacement);
  execute v_new;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    v_helper_count := (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_power_cost(','')))
      / length('zuno_private.zuno_stack_resolve_power_cost(');
    if v_helper_count <> 1 then
      raise exception 'stack_power_cost_extraction_verification_failed:%:helper=%',v_signature,v_helper_count;
    end if;
  end loop;
end;
$migration$;

commit;
