-- Sixteenth canonical Zuno Stack extraction: shared power charge consumption only.
-- Centralizes the identical charge -> 0 transition shared by Board Power,
-- Gelo and Desfazer while preserving persistence, recharge, energy, rewards,
-- timers, undo, events and all action-specific mutations as caller-owned.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_consume_power_charge(p_charges jsonb,p_power text)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $function$
  select jsonb_set(p_charges,array[p_power],'0'::jsonb,true)
$function$;

revoke all on function zuno_private.zuno_stack_consume_power_charge(jsonb,text) from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_def text;
  v_new text;
  v_anchor text;
  v_replacement text;
  v_helper_count integer;
  v_old_count integer;
  v_recharge_anchor constant text := 'v_charges:=jsonb_set(v_charges,array[v_recharge],''1''::jsonb,true);';
begin
  if to_regprocedure('zuno_private.zuno_stack_consume_power_charge(jsonb,text)') is null then
    raise exception 'stack_power_charge_consumption_helper_missing';
  end if;

  -- Board Power consumes the selected power charge, while threshold recharge stays local.
  v_signature := 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)';
  v_anchor := 'v_charges:=jsonb_set(v_charges,array[p_power],''0''::jsonb,true);';
  v_replacement := 'v_charges:=zuno_private.zuno_stack_consume_power_charge(v_charges,p_power);';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_consumption_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_consume_power_charge(' in v_def)<>0 then
    raise exception 'stack_power_charge_consumption_board_anchor_invalid';
  end if;
  if (length(v_def)-length(replace(v_def,v_recharge_anchor,'')))/length(v_recharge_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_board_recharge_baseline_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  -- Gelo consumes its own selected charge; timer and score behavior stay local.
  v_signature := 'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)';
  v_anchor := 'v_charges:=jsonb_set(v_charges,''{gelo}'',''0''::jsonb,true);';
  v_replacement := 'v_charges:=zuno_private.zuno_stack_consume_power_charge(v_charges,''gelo'');';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_consumption_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_consume_power_charge(' in v_def)<>0 then
    raise exception 'stack_power_charge_consumption_gelo_anchor_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  -- Desfazer consumes its own charge; undo restoration and energy restoration stay local.
  v_signature := 'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)';
  v_anchor := 'v_charges:=jsonb_set(v_charges,''{desfazer}'',''0''::jsonb,true);';
  v_replacement := 'v_charges:=zuno_private.zuno_stack_consume_power_charge(v_charges,''desfazer'');';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_consumption_function_missing:%',v_signature; end if;
  if (length(v_def)-length(replace(v_def,v_anchor,'')))/length(v_anchor) <> 1
     or position('zuno_private.zuno_stack_consume_power_charge(' in v_def)<>0 then
    raise exception 'stack_power_charge_consumption_desfazer_anchor_invalid';
  end if;
  v_new := replace(v_def,v_anchor,v_replacement);
  execute v_new;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    v_helper_count := (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_consume_power_charge(','')))
      / length('zuno_private.zuno_stack_consume_power_charge(');
    if v_helper_count <> 1 then
      raise exception 'stack_power_charge_consumption_extraction_verification_failed:%:helper=%',v_signature,v_helper_count;
    end if;

    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_charge(','')))
         / length('zuno_private.zuno_stack_require_power_charge(') <> 1 then
      raise exception 'stack_power_charge_consumption_guard_authority_lost:%',v_signature;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_power_cost(','')))
         / length('zuno_private.zuno_stack_resolve_power_cost(') <> 1 then
      raise exception 'stack_power_charge_consumption_cost_authority_lost:%',v_signature;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_energy(','')))
         / length('zuno_private.zuno_stack_require_power_energy(') <> 1 then
      raise exception 'stack_power_charge_consumption_energy_authority_lost:%',v_signature;
    end if;
    if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_phase(','')))
         / length('zuno_private.zuno_stack_resolve_phase(') <> 1 then
      raise exception 'stack_power_charge_consumption_phase_authority_lost:%',v_signature;
    end if;
  end loop;

  select pg_get_functiondef(to_regprocedure('zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)')) into v_def;
  if (length(v_def)-length(replace(v_def,v_recharge_anchor,'')))/length(v_recharge_anchor) <> 1 then
    raise exception 'stack_power_charge_consumption_board_recharge_lost';
  end if;
  if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_resolve_basic_trio(','')))
       / length('zuno_private.zuno_stack_resolve_basic_trio(') <> 2 then
    raise exception 'stack_power_charge_consumption_basic_trio_authority_lost';
  end if;
  if (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_cap_energy(','')))
       / length('zuno_private.zuno_stack_cap_energy(') <> 5 then
    raise exception 'stack_power_charge_consumption_energy_cap_authority_lost';
  end if;
end;
$migration$;

commit;
