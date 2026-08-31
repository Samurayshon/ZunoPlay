\set ON_ERROR_STOP on

-- Tenth-extraction characterization: freeze the shared phase mapping before
-- replacing the three identical inline CASE expressions with one private helper.
-- This contract intentionally allows either pre-extraction inline wiring or
-- post-extraction canonical helper wiring so it remains useful after the change.

do $$
declare
  v_power text;
  v_gelo text;
  v_desfazer text;
  v_inline text := 'v_phase:=casewhenv_removed<27then''opening''whenv_removed<45then''development''whenv_removed<68then''pressure''else''final''end;';
  v_helper text := 'v_phase:=zuno_private.zuno_stack_phase_from_removed(v_removed);';
  v_inline_count integer;
  v_helper_count integer;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_power;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_gelo_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_gelo;
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_desfazer_internal(uuid,bigint,text)'::regprocedure
  ), '\s+', '', 'g') into v_desfazer;

  if v_power is null or v_gelo is null or v_desfazer is null then
    raise exception 'stack_phase_characterization_function_missing';
  end if;

  foreach v_power in array array[v_power,v_gelo,v_desfazer] loop
    v_inline_count := (length(v_power)-length(replace(v_power,v_inline,''))) / length(v_inline);
    v_helper_count := (length(v_power)-length(replace(v_power,v_helper,''))) / length(v_helper);
    if v_inline_count + v_helper_count <> 1 then
      raise exception 'stack_phase_characterization_site_count_invalid:inline=%,helper=%', v_inline_count,v_helper_count;
    end if;
  end loop;

  -- Boundary contract of the currently duplicated CASE expression.
  if (case when 0<27 then 'opening' when 0<45 then 'development' when 0<68 then 'pressure' else 'final' end) <> 'opening' then raise exception 'stack_phase_boundary_0'; end if;
  if (case when 26<27 then 'opening' when 26<45 then 'development' when 26<68 then 'pressure' else 'final' end) <> 'opening' then raise exception 'stack_phase_boundary_26'; end if;
  if (case when 27<27 then 'opening' when 27<45 then 'development' when 27<68 then 'pressure' else 'final' end) <> 'development' then raise exception 'stack_phase_boundary_27'; end if;
  if (case when 44<27 then 'opening' when 44<45 then 'development' when 44<68 then 'pressure' else 'final' end) <> 'development' then raise exception 'stack_phase_boundary_44'; end if;
  if (case when 45<27 then 'opening' when 45<45 then 'development' when 45<68 then 'pressure' else 'final' end) <> 'pressure' then raise exception 'stack_phase_boundary_45'; end if;
  if (case when 67<27 then 'opening' when 67<45 then 'development' when 67<68 then 'pressure' else 'final' end) <> 'pressure' then raise exception 'stack_phase_boundary_67'; end if;
  if (case when 68<27 then 'opening' when 68<45 then 'development' when 68<68 then 'pressure' else 'final' end) <> 'final' then raise exception 'stack_phase_boundary_68'; end if;
  if (case when 90<27 then 'opening' when 90<45 then 'development' when 90<68 then 'pressure' else 'final' end) <> 'final' then raise exception 'stack_phase_boundary_90'; end if;
end;
$$;

select 'zuno_stack_phase_helper_characterization_ok' as marker;
