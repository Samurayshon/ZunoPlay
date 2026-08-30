-- Make Zuno Stack Relay send/take server-authoritative.
-- During an active round, authenticated clients can no longer persist relay-array
-- mutations through the generic full-state commit path. They submit only an index;
-- PostgreSQL validates and calculates tray/relay/score/match effects atomically.

create or replace function zuno_private.reject_legacy_stack_relay_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_privileged boolean := current_user in ('postgres','service_role','supabase_admin');
  v_old_active boolean := coalesce((old.state->'engine'->>'active')::boolean,false);
begin
  if v_privileged or new.state is not distinct from old.state then
    return new;
  end if;
  if v_old_active
     and new.state->'engine'->'relay' is distinct from old.state->'engine'->'relay' then
    raise exception 'stack_server_relay_required' using errcode='42501';
  end if;
  return new;
end;
$function$;

revoke all on function zuno_private.reject_legacy_stack_relay_write() from public, anon, authenticated;

drop trigger if exists trg_zuno_stack_server_relay_required on public.zuno_stack_match_state;
create trigger trg_zuno_stack_server_relay_required
before update on public.zuno_stack_match_state
for each row execute function zuno_private.reject_legacy_stack_relay_write();

create or replace function zuno_private.zuno_stack_apply_relay_internal(
  p_room_id uuid,
  p_expected_revision bigint,
  p_action_id text,
  p_mode text,
  p_index integer
)
returns public.zuno_stack_match_state
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_row public.zuno_stack_match_state;
  v_existing public.zuno_stack_game_events;
  v_state jsonb;
  v_engine jsonb;
  v_tiles jsonb;
  v_tray jsonb;
  v_relay jsonb;
  v_type text;
  v_event_type text;
  v_kind text;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_new_revision bigint;
  v_score integer;
  v_matches integer;
  v_energy integer;
  v_pulse integer;
  v_combo integer;
  v_best_combo integer;
  v_last_match bigint;
  v_relay_rev bigint;
  v_double boolean;
  v_type_count integer := 0;
  v_remove_ord integer[];
  v_gain integer;
  v_slot integer;
  v_relay_type text;
  v_has_match boolean;
  v_active boolean;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_room_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_action_id is null or length(p_action_id) < 8 or length(p_action_id) > 160
     or p_mode not in ('send','take') or p_index is null then
    raise exception 'invalid_stack_relay_request' using errcode='22023';
  end if;
  if (p_mode='send' and (p_index<0 or p_index>6)) or (p_mode='take' and (p_index<0 or p_index>2)) then
    raise exception 'invalid_stack_relay_index' using errcode='22023';
  end if;
  if not (exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user)
          or exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=v_user)) then
    raise exception 'stack_room_membership_required' using errcode='42501';
  end if;
  v_event_type := case when p_mode='send' then 'server_relay_send' else 'server_relay_take' end;
  select * into v_existing from public.zuno_stack_game_events e where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user or v_existing.event_type <> v_event_type
       or coalesce((v_existing.payload->>'index')::integer,-1) <> p_index
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    select * into v_row from public.zuno_stack_match_state where room_id=p_room_id;
    if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
    return v_row;
  end if;
  select * into v_row from public.zuno_stack_match_state where room_id=p_room_id for update;
  if not found then raise exception 'stack_match_state_missing' using errcode='22023'; end if;
  select * into v_existing from public.zuno_stack_game_events e where e.room_id=p_room_id and e.action_id=p_action_id;
  if found then
    if v_existing.actor_id is distinct from v_user or v_existing.event_type <> v_event_type
       or coalesce((v_existing.payload->>'index')::integer,-1) <> p_index
       or coalesce((v_existing.payload->>'expected_revision')::bigint,-1) <> p_expected_revision then
      raise exception 'stack_action_id_conflict' using errcode='22023';
    end if;
    return v_row;
  end if;
  if v_row.revision <> p_expected_revision then raise exception 'revision_conflict'; end if;
  if exists(select 1 from public.zuno_stack_game_events e where e.room_id=p_room_id and e.actor_id=v_user
            and e.event_type in ('server_relay_send','server_relay_take')
            and e.created_at > clock_timestamp() - interval '60 milliseconds') then
    raise exception 'stack_action_rate_limited' using errcode='42900';
  end if;
  v_state := v_row.state; v_engine := v_state->'engine';
  if jsonb_typeof(v_engine) <> 'object' or jsonb_typeof(v_engine->'tiles') <> 'array'
     or jsonb_typeof(v_engine->'tray') <> 'array' or jsonb_typeof(v_engine->'relay') <> 'array'
     or coalesce((v_engine->>'active')::boolean,false) is not true then
    raise exception 'stack_round_not_active' using errcode='22023';
  end if;
  v_tiles := v_engine->'tiles'; v_tray := v_engine->'tray'; v_relay := v_engine->'relay';
  if jsonb_array_length(v_tiles) <> 90 or jsonb_array_length(v_relay) <> 3 then
    raise exception 'invalid_stack_round_shape' using errcode='22023';
  end if;
  v_score := coalesce((v_engine->>'score')::integer,0); v_matches := coalesce((v_engine->>'matches')::integer,0);
  v_energy := coalesce((v_engine->>'energy')::integer,0); v_pulse := coalesce((v_engine->>'pulseEventCount')::integer,0);
  v_combo := coalesce((v_engine->>'combo')::integer,0); v_best_combo := coalesce((v_engine->>'bestCombo')::integer,0);
  v_last_match := coalesce((v_engine->>'lastMatchAt')::bigint,0); v_relay_rev := coalesce((v_engine->>'relayRev')::bigint,0);
  v_double := coalesce((v_engine->>'doubleNext')::boolean,false); v_active := true;
  if p_mode='send' then
    if p_index >= jsonb_array_length(v_tray) then raise exception 'stack_tray_index_invalid' using errcode='22023'; end if;
    select e.val into v_type from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord) where e.ord=p_index+1;
    if v_type is null then raise exception 'stack_tray_index_invalid' using errcode='22023'; end if;
    select (e.ord-1)::integer into v_slot from jsonb_array_elements(v_relay) with ordinality as e(val,ord)
      where e.val='null'::jsonb order by e.ord limit 1;
    if v_slot is null then raise exception 'stack_relay_full' using errcode='22023'; end if;
    select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray
      from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord) where e.ord<>p_index+1;
    v_relay := jsonb_set(v_relay,array[v_slot::text],to_jsonb(v_type),false);
    v_score := least(25000,v_score+20); v_kind := 'server_relay_send';
  else
    if jsonb_array_length(v_tray) >= 7 then raise exception 'stack_tray_full' using errcode='22023'; end if;
    v_type := v_relay->>p_index;
    if v_type is null or length(v_type)=0 then raise exception 'stack_relay_empty' using errcode='22023'; end if;
    v_relay := jsonb_set(v_relay,array[p_index::text],'null'::jsonb,false);
    v_tray := v_tray || jsonb_build_array(v_type);
    select count(*) into v_type_count from jsonb_array_elements_text(v_tray) as e(val) where e.val=v_type;
    if v_type_count >= 3 then
      select array_agg(s.ord::integer) into v_remove_ord from (
        select e.ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
        where e.val=v_type order by e.ord desc limit 3) s;
      select coalesce(jsonb_agg(to_jsonb(e.val) order by e.ord),'[]'::jsonb) into v_tray
        from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
        where not (e.ord::integer = any(v_remove_ord));
      if v_last_match > 0 and v_now_ms-v_last_match <= 4000 then v_combo := v_combo+1; else v_combo := 1; end if;
      v_last_match := v_now_ms; v_best_combo := greatest(v_best_combo,v_combo); v_matches := v_matches+1;
      v_gain := (case when v_double then 620 else 310 end) + ((v_combo-1)*55); v_double := false;
      v_score := least(25000,v_score+v_gain); v_energy := least(5,v_energy+1);
      if v_matches % 5 = 0 then
        v_pulse := v_pulse+1;
        if v_pulse % 3 = 1 then v_double := true;
        elsif v_pulse % 3 = 2 then
          select (e.ord-1)::integer into v_slot from jsonb_array_elements(v_relay) with ordinality as e(val,ord)
            where e.val='null'::jsonb order by e.ord limit 1;
          select s.val into v_relay_type from (
            select e.val,count(*) as n,min(e.ord) as first_ord from jsonb_array_elements_text(v_tray) with ordinality as e(val,ord)
            group by e.val order by n desc,first_ord asc limit 1) s;
          if v_relay_type is null then
            select e.tile->>'type' into v_relay_type from jsonb_array_elements(v_tiles) with ordinality as e(tile,ord) order by e.ord limit 1;
          end if;
          if v_slot is not null and v_relay_type is not null then
            v_relay := jsonb_set(v_relay,array[v_slot::text],to_jsonb(v_relay_type),false);
          end if;
        end if;
      end if;
    end if;
    v_score := least(25000,v_score+10);
    select exists(select 1 from (select e.val,count(*) as n from jsonb_array_elements_text(v_tray) as e(val) group by e.val) s where s.n>=3) into v_has_match;
    if jsonb_array_length(v_tray)>=7 and not v_has_match then v_active := false; v_kind := 'finish'; else v_kind := 'server_relay_take'; end if;
  end if;
  v_relay_rev := v_now_ms; v_new_revision := v_row.revision+1;
  v_engine := v_engine || jsonb_build_object('active',v_active,'tray',v_tray,'relay',v_relay,'score',v_score,
    'matches',v_matches,'energy',v_energy,'pulseEventCount',v_pulse,'doubleNext',v_double,'combo',v_combo,
    'bestCombo',v_best_combo,'lastMatchAt',v_last_match,'relayRev',v_relay_rev,'serverUndo','null'::jsonb);
  v_state := v_state || jsonb_build_object('kind',v_kind,'engine',v_engine,'actor',v_user::text,'at',v_now_ms);
  update public.zuno_stack_match_state set revision=v_new_revision,state=v_state,updated_by=v_user,updated_at=now()
    where room_id=p_room_id returning * into v_row;
  insert into public.zuno_stack_game_events(room_id,action_id,event_type,payload,actor_id)
  values(p_room_id,p_action_id,v_event_type,jsonb_build_object('index',p_index,'type',v_type,'expected_revision',p_expected_revision,
    'applied_revision',v_new_revision,'matched',p_mode='take' and v_type_count>=3,'outcome',v_kind,
    'relay_slot',case when p_mode='send' then v_slot else null end),v_user);
  return v_row;
end;
$function$;

revoke all on function zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer) from public, anon;
grant execute on function zuno_private.zuno_stack_apply_relay_internal(uuid,bigint,text,text,integer) to authenticated, service_role;
grant usage on schema zuno_private to authenticated, service_role;

create or replace function public.zuno_stack_relay_send(p_room_id uuid,p_expected_revision bigint,p_action_id text,p_tray_index integer)
returns public.zuno_stack_match_state language sql security invoker set search_path = ''
as $function$ select zuno_private.zuno_stack_apply_relay_internal(p_room_id,p_expected_revision,p_action_id,'send',p_tray_index); $function$;
create or replace function public.zuno_stack_relay_take(p_room_id uuid,p_expected_revision bigint,p_action_id text,p_relay_index integer)
returns public.zuno_stack_match_state language sql security invoker set search_path = ''
as $function$ select zuno_private.zuno_stack_apply_relay_internal(p_room_id,p_expected_revision,p_action_id,'take',p_relay_index); $function$;
revoke all on function public.zuno_stack_relay_send(uuid,bigint,text,integer) from public, anon;
revoke all on function public.zuno_stack_relay_take(uuid,bigint,text,integer) from public, anon;
grant execute on function public.zuno_stack_relay_send(uuid,bigint,text,integer) to authenticated, service_role;
grant execute on function public.zuno_stack_relay_take(uuid,bigint,text,integer) to authenticated, service_role;
