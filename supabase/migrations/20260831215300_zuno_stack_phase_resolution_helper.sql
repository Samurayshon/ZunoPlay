-- Tenth canonical Zuno Stack extraction: phase resolution only.
-- Centralizes the opening/development/pressure/final boundaries used by Board Power,
-- Gelo and Desfazer while preserving every caller-owned cost, reward and event rule.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_resolve_phase(p_removed integer)
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

revoke all on function zuno_private.zuno_stack_resolve_phase(integer) from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_def text;
  v_new text;
  v_target constant text := 'v_phase:=case when v_removed<27 then ''opening'' when v_removed<45 then ''development'' when v_removed<68 then ''pressure'' else ''final'' end;';
  v_replacement constant text := 'v_phase:=zuno_private.zuno_stack_resolve_phase(v_removed);';
  v_target_count integer;
  v_helper_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_resolve_phase(integer)') is null then
    raise exception 'stack_phase_resolution_helper_missing';
  end if;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    if v_def is null then
      raise exception 'stack_phase_resolution_function_missing:%', v_signature;
    end if;

    v_target_count := (length(v_def) - length(replace(v_def, v_target, ''))) / length(v_target);
    if v_target_count <> 1 then
      raise exception 'stack_phase_resolution_anchor_count_invalid:%:%', v_signature, v_target_count;
    end if;

    if position(v_replacement in v_def) <> 0 then
      raise exception 'stack_phase_resolution_helper_already_wired:%', v_signature;
    end if;

    v_new := replace(v_def, v_target, v_replacement);
    v_helper_count := (length(v_new) - length(replace(v_new, v_replacement, ''))) / length(v_replacement);

    if v_new = v_def
       or position(v_target in v_new) <> 0
       or v_helper_count <> 1 then
      raise exception 'stack_phase_resolution_extraction_verification_failed:%', v_signature;
    end if;

    execute v_new;
  end loop;
end;
$migration$;

commit;
