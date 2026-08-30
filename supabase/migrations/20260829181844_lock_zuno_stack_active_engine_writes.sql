-- Make the active Zuno Stack engine server-owned.
-- Authenticated clients may still start a validated round and consume a Hint,
-- but every other active-round engine mutation must come from privileged
-- server-authoritative RPCs (Tile/Undo/Relay today, more actions later).

create or replace function zuno_private.reject_client_stack_active_engine_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_privileged boolean := current_user in ('postgres','service_role','supabase_admin');
  v_old_engine jsonb := old.state->'engine';
  v_new_engine jsonb := new.state->'engine';
  v_old_active boolean := coalesce((v_old_engine->>'active')::boolean,false);
  v_new_active boolean := coalesce((v_new_engine->>'active')::boolean,false);
  v_kind text := coalesce(new.state->>'kind','');
  v_old_hints integer;
  v_new_hints integer;
begin
  if v_privileged or new.state is not distinct from old.state then
    return new;
  end if;

  if jsonb_typeof(v_old_engine) <> 'object' or jsonb_typeof(v_new_engine) <> 'object' then
    return new;
  end if;

  -- A local cached round must never be resurrected as authoritative state.
  -- New rounds still use the already validated `start` transition.
  if not v_old_active and v_new_active and v_kind <> 'start' then
    raise exception 'stack_server_start_required' using errcode='42501';
  end if;

  if v_old_active and v_new_engine is distinct from v_old_engine then
    -- Hint is intentionally the only active client engine write still allowed.
    -- It may decrement hintsLeft by exactly one and change nothing else.
    if v_kind = 'hint' then
      if jsonb_typeof(v_old_engine->'hintsLeft') = 'number'
         and jsonb_typeof(v_new_engine->'hintsLeft') = 'number' then
        v_old_hints := (v_old_engine->>'hintsLeft')::integer;
        v_new_hints := (v_new_engine->>'hintsLeft')::integer;
        if v_old_hints > 0
           and v_new_hints = v_old_hints - 1
           and (v_new_engine - 'hintsLeft') is not distinct from (v_old_engine - 'hintsLeft') then
          return new;
        end if;
      end if;
    end if;

    raise exception 'stack_server_action_required' using errcode='42501';
  end if;

  return new;
end;
$function$;

revoke all on function zuno_private.reject_client_stack_active_engine_write() from public, anon, authenticated;

drop trigger if exists trg_zuno_stack_server_engine_required on public.zuno_stack_match_state;
create trigger trg_zuno_stack_server_engine_required
before update on public.zuno_stack_match_state
for each row execute function zuno_private.reject_client_stack_active_engine_write();
