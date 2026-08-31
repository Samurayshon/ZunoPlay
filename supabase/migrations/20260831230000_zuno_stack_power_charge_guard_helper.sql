-- Thirteenth canonical Zuno Stack extraction: selected-power + available-charge guard only.
-- Centralizes the duplicated guard shared by Board Power, Gelo and Desfazer while
-- preserving caller-owned charge mutation, costs, phase behavior, rewards and events.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_require_power_charge(
  p_server jsonb,
  p_power text
)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
begin
  if not exists(
    select 1
    from jsonb_array_elements_text(coalesce(p_server->'selected','[]'::jsonb)) x(val)
    where x.val = p_power
  ) then
    raise exception 'stack_power_not_selected' using errcode='42501';
  end if;

  if coalesce(((coalesce(p_server->'charges','{}'::jsonb))->>p_power)::integer,0) <= 0 then
    raise exception 'stack_power_no_charge' using errcode='22023';
  end if;
end;
$function$;

revoke all on function zuno_private.zuno_stack_require_power_charge(jsonb,text)
  from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_power text;
  v_selected_target text;
  v_charge_target text;
  v_replacement text;
  v_def text;
  v_new text;
  v_selected_count integer;
  v_charge_count integer;
  v_helper_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_charge(jsonb,text)') is null then
    raise exception 'stack_power_charge_guard_helper_missing';
  end if;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    if v_signature = 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)' then
      v_power := 'p_power';
      v_selected_target := 'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=p_power) then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;';
      v_charge_target := 'if coalesce((v_charges->>p_power)::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;';
      v_replacement := 'perform zuno_private.zuno_stack_require_power_charge(v_server,p_power);';
    elsif v_signature = 'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)' then
      v_power := 'gelo';
      v_selected_target := 'if not exists(select 1 from jsonb_array_elements_text(coalesce(v_server->''selected'',''[]''::jsonb)) x(val) where x.val=''gelo'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;';
      v_charge_target := 'if coalesce((v_charges->>''gelo'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;';
      v_replacement := 'perform zuno_private.zuno_stack_require_power_charge(v_server,''gelo'');';
    else
      v_power := 'desfazer';
      v_selected_target := 'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=''desfazer'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;';
      v_charge_target := 'if coalesce((v_charges->>''desfazer'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;';
      v_replacement := 'perform zuno_private.zuno_stack_require_power_charge(v_server,''desfazer'');';
    end if;

    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    if v_def is null then
      raise exception 'stack_power_charge_guard_function_missing:%', v_signature;
    end if;

    v_selected_count := (length(v_def)-length(replace(v_def,v_selected_target,''))) / length(v_selected_target);
    v_charge_count := (length(v_def)-length(replace(v_def,v_charge_target,''))) / length(v_charge_target);
    v_helper_count := (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_charge(',''))) / length('zuno_private.zuno_stack_require_power_charge(');

    if v_selected_count <> 1 or v_charge_count <> 1 or v_helper_count <> 0 then
      raise exception 'stack_power_charge_guard_anchor_count_invalid:%:power=%:selected=%:charge=%:helper=%',
        v_signature,v_power,v_selected_count,v_charge_count,v_helper_count;
    end if;

    v_new := replace(v_def,v_selected_target,v_replacement);
    v_new := replace(v_new,v_charge_target,'');
    v_helper_count := (length(v_new)-length(replace(v_new,'zuno_private.zuno_stack_require_power_charge(',''))) / length('zuno_private.zuno_stack_require_power_charge(');

    if v_new = v_def
       or position(v_selected_target in v_new) <> 0
       or position(v_charge_target in v_new) <> 0
       or v_helper_count <> 1 then
      raise exception 'stack_power_charge_guard_extraction_verification_failed:%', v_signature;
    end if;

    execute v_new;
  end loop;
end;
$migration$;

commit;
