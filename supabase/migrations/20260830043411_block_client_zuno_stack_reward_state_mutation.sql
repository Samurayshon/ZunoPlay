create or replace function zuno_private.reject_client_stack_reward_system_write()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_old_active boolean:=coalesce((old.state#>>'{engine,active}')::boolean,false);
  v_new_active boolean:=coalesce((new.state#>>'{engine,active}')::boolean,false);
  v_old_systems jsonb:=coalesce(old.state->'systems',old.state->'mechanics','{}'::jsonb);
  v_new_systems jsonb:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb);
begin
  if current_user in ('postgres','service_role','supabase_admin') then
    return new;
  end if;
  if v_old_active and v_new_active and (
       v_new_systems->'metaDone' is distinct from v_old_systems->'metaDone'
       or v_new_systems->'comboRewards' is distinct from v_old_systems->'comboRewards'
       or v_new_systems->'metaSurgeUntil' is distinct from v_old_systems->'metaSurgeUntil'
     ) then
    raise exception 'stack_server_reward_state_required' using errcode='42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_zuno_stack_reward_system_required on public.zuno_stack_match_state;
create trigger trg_zuno_stack_reward_system_required
before update of state on public.zuno_stack_match_state
for each row execute function zuno_private.reject_client_stack_reward_system_write();
