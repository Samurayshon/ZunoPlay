-- Fifteenth canonical Zuno Stack extraction: shared power energy readiness only.
-- Centralizes the identical sufficient-energy decision shared by Board Power,
-- Gelo and Desfazer while preserving cost resolution, energy subtraction,
-- charge consumption, phase behavior, rewards, timers, undo and events.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_require_power_energy(p_energy integer,p_cost integer)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
begin
  if p_energy<p_cost then
    raise exception 'stack_power_not_ready' using errcode='22023';
  end if;
end;
$function$;

revoke all on function zuno_private.zuno_stack_require_power_energy(integer,integer) from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_def text;
  v_new text;
  v_anchor text;
  v_replacement text;
  v_helper_count integer;
  v_error_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_energy(integer,integer)') is null then
    raise exception 'stack_power_energy_readiness_helper_missing';
  end if;

  -- Board Power keeps cost resolution, subtraction and charge consumption caller-owned.
  v_signature := 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)';
  v_anchor := 'if v_energy<v_cost then raise exception ''stack_power_not_ready'' using errcode=''22023''; end if;';
  v_replacement := 'perform zuno_private.zuno_stack_require_power_energy(v_energy,v_cost);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_energy_readiness_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_require_power_energy(' in v_def)<>0 then
    raise exception 'stack_power_energy_readiness_board_anchor_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  -- Gelo has the same sufficient-energy contract with its phase-sensitive canonical cost.
  v_signature := 'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)';
  v_anchor := 'if v_energy<v_cost then raise exception ''stack_power_not_ready'' using errcode=''22023''; end if;';
  v_replacement := 'perform zuno_private.zuno_stack_require_power_energy(v_energy,v_cost);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_energy_readiness_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_require_power_energy(' in v_def)<>0 then
    raise exception 'stack_power_energy_readiness_gelo_anchor_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  -- Desfazer reads current energy from its undo state; only the readiness decision moves.
  v_signature := 'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)';
  v_anchor := 'if v_current_energy<v_cost then raise exception ''stack_power_not_ready'' using errcode=''22023''; end if;';
  v_replacement := 'perform zuno_private.zuno_stack_require_power_energy(v_current_energy,v_cost);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_energy_readiness_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_require_power_energy(' in v_def)<>0 then
    raise exception 'stack_power_energy_readiness_desfazer_anchor_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    v_helper_count := (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_energy(','')))
      / length('zuno_private.zuno_stack_require_power_energy(');
    v_error_count := (length(v_def)-length(replace(v_def,'stack_power_not_ready','')))
      / length('stack_power_not_ready');
    if v_helper_count <> 1 or v_error_count <> 0 then
      raise exception 'stack_power_energy_readiness_extraction_verification_failed:%:helper=%,error=%',
        v_signature,v_helper_count,v_error_count;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_power_cost(','')))
         / length('zuno_private.zuno_stack_resolve_power_cost(') <> 1 then
      raise exception 'stack_power_energy_readiness_cost_authority_lost:%',v_signature;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_charge(','')))
         / length('zuno_private.zuno_stack_require_power_charge(') <> 1 then
      raise exception 'stack_power_energy_readiness_charge_authority_lost:%',v_signature;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_phase(','')))
         / length('zuno_private.zuno_stack_resolve_phase(') <> 1 then
      raise exception 'stack_power_energy_readiness_phase_authority_lost:%',v_signature;
    end if;
  end loop;
end;
$migration$;

commit;
