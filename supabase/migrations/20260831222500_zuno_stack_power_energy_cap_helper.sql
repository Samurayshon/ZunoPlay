-- Twelfth canonical Zuno Stack extraction: Board Power energy-cap application only.
-- Introduces a private canonical cap helper while preserving all caller-owned energy gains,
-- threshold rewards, trio ownership, phase behavior, charges, targets and events.
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
  v_def text;
  v_new text;
  v_raw_plus_one constant text := 'v_energy:=least(5,v_energy+1);';
  v_raw_plus_two constant text := 'v_energy:=least(5,v_energy+2);';
  v_helper_plus_one constant text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+1);';
  v_helper_plus_two constant text := 'v_energy:=zuno_private.zuno_stack_cap_energy(v_energy+2);';
  v_raw_one_count integer;
  v_raw_two_count integer;
  v_raw_total integer;
  v_helper_before integer;
  v_helper_after integer;
  v_basic_trio_calls integer;
  v_phase_helper_calls integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_cap_energy(integer)') is null then
    raise exception 'stack_power_energy_cap_helper_missing';
  end if;

  select pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ) into v_def;

  if v_def is null then
    raise exception 'stack_power_energy_cap_function_missing';
  end if;

  v_raw_one_count := (length(v_def) - length(replace(v_def, v_raw_plus_one, ''))) / length(v_raw_plus_one);
  v_raw_two_count := (length(v_def) - length(replace(v_def, v_raw_plus_two, ''))) / length(v_raw_plus_two);
  v_raw_total := regexp_count(v_def, 'least\(5,v_energy');
  v_helper_before := regexp_count(v_def, 'zuno_private\.zuno_stack_cap_energy\(');
  v_basic_trio_calls := regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_basic_trio\(');
  v_phase_helper_calls := regexp_count(v_def, 'zuno_private\.zuno_stack_resolve_phase\(');

  if v_raw_one_count <> 4
     or v_raw_two_count <> 1
     or v_raw_total <> 5
     or v_helper_before <> 0 then
    raise exception 'stack_power_energy_cap_precondition_invalid:plus1=%,plus2=%,raw=%,helper=%',
      v_raw_one_count, v_raw_two_count, v_raw_total, v_helper_before;
  end if;

  if v_basic_trio_calls <> 2 or v_phase_helper_calls <> 1 then
    raise exception 'stack_power_energy_cap_prior_helpers_invalid:trio=%,phase=%',
      v_basic_trio_calls, v_phase_helper_calls;
  end if;

  v_new := replace(v_def, v_raw_plus_one, v_helper_plus_one);
  v_new := replace(v_new, v_raw_plus_two, v_helper_plus_two);
  v_helper_after := regexp_count(v_new, 'zuno_private\.zuno_stack_cap_energy\(');

  if v_new = v_def
     or regexp_count(v_new, 'least\(5,v_energy') <> 0
     or regexp_count(v_new, 'v_energy:=zuno_private\.zuno_stack_cap_energy\(') <> 5
     or v_helper_after <> 5 then
    raise exception 'stack_power_energy_cap_extraction_verification_failed';
  end if;

  if regexp_count(v_new, 'v_energy:=zuno_private\.zuno_stack_cap_energy\(v_energy\+1\);') <> 4
     or regexp_count(v_new, 'v_energy:=zuno_private\.zuno_stack_cap_energy\(v_energy\+2\);') <> 1
     or regexp_count(v_new, 'zuno_private\.zuno_stack_resolve_basic_trio\(') <> 2
     or regexp_count(v_new, 'zuno_private\.zuno_stack_resolve_phase\(') <> 1
     or position('ifv_threshold=15then' in regexp_replace(v_new, '\s+', '', 'g')) = 0
     or position('ifv_threshold=30then' in regexp_replace(v_new, '\s+', '', 'g')) = 0
     or position('ifv_threshold=45then' in regexp_replace(v_new, '\s+', '', 'g')) = 0 then
    raise exception 'stack_power_energy_cap_contract_changed';
  end if;

  execute v_new;
end;
$migration$;

commit;
