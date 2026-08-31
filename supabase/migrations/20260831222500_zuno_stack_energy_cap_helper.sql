-- Twelfth canonical Zuno Stack extraction: Board Power energy cap only.
-- Centralizes the upper-bound energy cap operator while preserving exact least(5, x)
-- semantics plus caller-owned rewards, thresholds, trio/phase resolution and events.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_cap_energy(p_energy integer)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $function$
  select least(5, p_energy);
$function$;

revoke all on function zuno_private.zuno_stack_cap_energy(integer) from public, anon, authenticated;

do $migration$
declare
  v_signature constant text := 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)';
  v_def text;
  v_new text;
  v_raw_plus_one constant text := 'v_energy:=least(5,v_energy+1);';
  v_raw_plus_two constant text := 'v_energy:=least(5,v_energy+2);';
  v_helper_plus_one constant text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+1);';
  v_helper_plus_two constant text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+2);';
  v_plus_one_count integer;
  v_plus_two_count integer;
  v_helper_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_energy(integer)') is null then
    raise exception 'stack_energy_cap_helper_missing';
  end if;

  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then
    raise exception 'stack_energy_cap_function_missing:%', v_signature;
  end if;

  v_plus_one_count := (length(v_def) - length(replace(v_def, v_raw_plus_one, ''))) / length(v_raw_plus_one);
  v_plus_two_count := (length(v_def) - length(replace(v_def, v_raw_plus_two, ''))) / length(v_raw_plus_two);

  if v_plus_one_count <> 4 or v_plus_two_count <> 1 then
    raise exception 'stack_energy_cap_anchor_count_invalid:+1=%:+2=%', v_plus_one_count, v_plus_two_count;
  end if;
  if position('zuno_private.zuno_stack_cap_energy(v_energy' in v_def) <> 0 then
    raise exception 'stack_energy_cap_helper_already_wired';
  end if;

  v_new := replace(v_def, v_raw_plus_one, v_helper_plus_one);
  v_new := replace(v_new, v_raw_plus_two, v_helper_plus_two);
  v_helper_count := (length(v_new) - length(replace(v_new, 'zuno_private.zuno_stack_cap_energy(v_energy', ''))) / length('zuno_private.zuno_stack_cap_energy(v_energy');

  if v_new = v_def
     or position('least(5,v_energy' in v_new) <> 0
     or v_helper_count <> 5 then
    raise exception 'stack_energy_cap_extraction_verification_failed:%', v_helper_count;
  end if;

  execute v_new;
end;
$migration$;

commit;
