create or replace function zuno_private.reject_legacy_stack_relay_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_privileged boolean := current_user in ('postgres','service_role','supabase_admin');
  v_old_active boolean := coalesce((old.state->'engine'->>'active')::boolean,false);
  v_kind text := coalesce(new.state->>'kind','');
begin
  if v_privileged or new.state is not distinct from old.state then
    return new;
  end if;

  if v_old_active and (
       v_kind in ('relay_send','relay_take')
       or new.state->'engine'->'relay' is distinct from old.state->'engine'->'relay'
     ) then
    raise exception 'stack_server_relay_required' using errcode='42501';
  end if;
  return new;
end;
$function$;

revoke all on function zuno_private.reject_legacy_stack_relay_write() from public, anon, authenticated;

create or replace function zuno_private.reject_legacy_stack_relay_action_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.event_type in ('action_request_relay_send','action_request_relay_take') then
    raise exception 'stack_server_relay_required' using errcode='42501';
  end if;
  return new;
end;
$function$;

revoke all on function zuno_private.reject_legacy_stack_relay_action_request() from public, anon, authenticated;

drop trigger if exists trg_zuno_stack_server_relay_action_required on public.zuno_stack_game_events;
create trigger trg_zuno_stack_server_relay_action_required
before insert on public.zuno_stack_game_events
for each row execute function zuno_private.reject_legacy_stack_relay_action_request();
