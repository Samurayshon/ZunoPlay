drop policy if exists zuno_stack_events_insert_members on public.zuno_stack_game_events;
create policy zuno_stack_events_insert_members
on public.zuno_stack_game_events
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and event_type !~ '^server_'
  and (
    exists(select 1 from public.room_members rm where rm.room_id=zuno_stack_game_events.room_id and rm.user_id=(select auth.uid()))
    or exists(select 1 from public.rooms r where r.id=zuno_stack_game_events.room_id and r.owner_id=(select auth.uid()))
  )
);

create or replace function zuno_private.zuno_stack_award_on_server_end()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_state public.zuno_stack_match_state%rowtype;
  v_started_ms bigint;
  v_duration integer;
  v_min_seconds integer;
begin
  if new.event_type not in ('server_tile','server_relay_take') then return new; end if;
  if coalesce(new.payload->>'outcome','') not in ('win','finish') then return new; end if;
  if new.actor_id is null then return new; end if;
  select * into v_state from public.zuno_stack_match_state s where s.room_id=new.room_id;
  if not found then return new; end if;
  if coalesce(v_state.state->>'kind','') not in ('win','finish') then return new; end if;
  v_started_ms:=coalesce((v_state.state->'engine'->>'startedAt')::bigint,0);
  if v_started_ms<=0 then return new; end if;
  v_duration:=greatest(0,floor(extract(epoch from (v_state.updated_at-to_timestamp(v_started_ms/1000.0))))::integer);
  select min_participation_seconds into v_min_seconds from public.authority_game_rules where game_id='zuno_stack' and enabled=true;
  if v_min_seconds is null or v_duration < v_min_seconds then return new; end if;
  begin
    perform * from zuno_private.claim_zuno_stack_authority_internal(new.actor_id,new.room_id);
  exception when others then
    raise warning 'zuno_stack_authority_claim_failed room=% actor=% error=%',new.room_id,new.actor_id,sqlerrm;
  end;
  update public.rooms
  set status='ended',ended_at=coalesce(ended_at,now()),updated_at=now()
  where id=new.room_id and owner_id=new.actor_id and visibility='private' and is_discoverable=false and description='__zuno_stack_solo_authority__';
  return new;
end;
$$;
revoke all on function zuno_private.zuno_stack_award_on_server_end() from public,anon,authenticated;

drop trigger if exists trg_zuno_stack_award_on_server_end on public.zuno_stack_game_events;
create trigger trg_zuno_stack_award_on_server_end
after insert on public.zuno_stack_game_events
for each row execute function zuno_private.zuno_stack_award_on_server_end();