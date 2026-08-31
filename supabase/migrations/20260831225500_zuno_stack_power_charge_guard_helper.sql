-- Thirteenth canonical Zuno Stack extraction: selected-power/charge guard only.
-- Centralizes the identical selected-power + available-charge decision shared by
-- Board Power, Gelo and Desfazer while preserving caller-owned costs, energy,
-- charge consumption, phase behavior, rewards, timers, undo and events.
-- Historical migrations remain immutable.

begin;

create or replace function zuno_private.zuno_stack_require_power_charge(p_server jsonb,p_power text)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $function$
declare
  v_selected jsonb;
  v_charges jsonb;
begin
  v_selected:=coalesce(p_server->'selected','[]'::jsonb);
  v_charges:=coalesce(p_server->'charges','{}'::jsonb);

  if not exists(
    select 1
    from jsonb_array_elements_text(v_selected) x(val)
    where x.val=p_power
  ) then
    raise exception 'stack_power_not_selected' using errcode='42501';
  end if;

  if coalesce((v_charges->>p_power)::integer,0)<=0 then
    raise exception 'stack_power_no_charge' using errcode='22023';
  end if;

  return v_charges;
end;
$function$;

revoke all on function zuno_private.zuno_stack_require_power_charge(jsonb,text) from public, anon, authenticated;

do $migration$
declare
  v_signature text;
  v_def text;
  v_new text;
  v_helper_count integer;
  v_not_selected_count integer;
  v_no_charge_count integer;
begin
  if to_regprocedure('zuno_private.zuno_stack_require_power_charge(jsonb,text)') is null then
    raise exception 'stack_power_charge_guard_helper_missing';
  end if;

  -- Board Power keeps v_selected because threshold-30 recharge still owns it.
  v_signature := 'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_guard_function_missing:%',v_signature; end if;
  v_new := v_def;
  if (length(v_new)-length(replace(v_new,
       'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);','')))
       / length('v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);') <> 1 then
    raise exception 'stack_power_charge_guard_board_state_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);',
    'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=zuno_private.zuno_stack_require_power_charge(v_server,p_power);');
  if (length(v_new)-length(replace(v_new,
       'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=p_power) then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;','')))
       / length('if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=p_power) then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_board_selected_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=p_power) then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;',
    '');
  if (length(v_new)-length(replace(v_new,
       'if coalesce((v_charges->>p_power)::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;','')))
       / length('if coalesce((v_charges->>p_power)::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_board_charge_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'if coalesce((v_charges->>p_power)::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;',
    '');
  execute v_new;

  -- Gelo has the same contract with a fixed power name.
  v_signature := 'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_guard_function_missing:%',v_signature; end if;
  v_new := v_def;
  if (length(v_new)-length(replace(v_new,
       'if not exists(select 1 from jsonb_array_elements_text(coalesce(v_server->''selected'',''[]''::jsonb)) x(val) where x.val=''gelo'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;','')))
       / length('if not exists(select 1 from jsonb_array_elements_text(coalesce(v_server->''selected'',''[]''::jsonb)) x(val) where x.val=''gelo'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_gelo_selected_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'if not exists(select 1 from jsonb_array_elements_text(coalesce(v_server->''selected'',''[]''::jsonb)) x(val) where x.val=''gelo'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;',
    '');
  if (length(v_new)-length(replace(v_new,
       'v_charges:=coalesce(v_server->''charges'',''{}''::jsonb); if coalesce((v_charges->>''gelo'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;','')))
       / length('v_charges:=coalesce(v_server->''charges'',''{}''::jsonb); if coalesce((v_charges->>''gelo'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_gelo_charge_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'v_charges:=coalesce(v_server->''charges'',''{}''::jsonb); if coalesce((v_charges->>''gelo'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;',
    'v_charges:=zuno_private.zuno_stack_require_power_charge(v_server,''gelo'');');
  execute v_new;

  -- Desfazer keeps its local selected snapshot untouched; only the decision moves.
  v_signature := 'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)';
  select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
  if v_def is null then raise exception 'stack_power_charge_guard_function_missing:%',v_signature; end if;
  v_new := v_def;
  if (length(v_new)-length(replace(v_new,
       'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);','')))
       / length('v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);') <> 1 then
    raise exception 'stack_power_charge_guard_desfazer_state_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=coalesce(v_server->''charges'',''{}''::jsonb);',
    'v_selected:=coalesce(v_server->''selected'',''[]''::jsonb); v_charges:=zuno_private.zuno_stack_require_power_charge(v_server,''desfazer'');');
  if (length(v_new)-length(replace(v_new,
       'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=''desfazer'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;','')))
       / length('if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=''desfazer'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_desfazer_selected_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'if not exists(select 1 from jsonb_array_elements_text(v_selected) x(val) where x.val=''desfazer'') then raise exception ''stack_power_not_selected'' using errcode=''42501''; end if;',
    '');
  if (length(v_new)-length(replace(v_new,
       'if coalesce((v_charges->>''desfazer'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;','')))
       / length('if coalesce((v_charges->>''desfazer'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;') <> 1 then
    raise exception 'stack_power_charge_guard_desfazer_charge_anchor_invalid';
  end if;
  v_new := replace(v_new,
    'if coalesce((v_charges->>''desfazer'')::integer,0)<=0 then raise exception ''stack_power_no_charge'' using errcode=''22023''; end if;',
    '');
  execute v_new;

  foreach v_signature in array array[
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)',
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)',
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'
  ] loop
    select pg_get_functiondef(to_regprocedure(v_signature)) into v_def;
    v_helper_count := (length(v_def)-length(replace(v_def,'zuno_private.zuno_stack_require_power_charge(','')))
      / length('zuno_private.zuno_stack_require_power_charge(');
    v_not_selected_count := (length(v_def)-length(replace(v_def,'stack_power_not_selected','')))
      / length('stack_power_not_selected');
    v_no_charge_count := (length(v_def)-length(replace(v_def,'stack_power_no_charge','')))
      / length('stack_power_no_charge');
    if v_helper_count <> 1 or v_not_selected_count <> 0 or v_no_charge_count <> 0 then
      raise exception 'stack_power_charge_guard_extraction_verification_failed:%:helper=%,not_selected=%,no_charge=%',
        v_signature,v_helper_count,v_not_selected_count,v_no_charge_count;
    end if;
  end loop;
end;
$migration$;

commit;
