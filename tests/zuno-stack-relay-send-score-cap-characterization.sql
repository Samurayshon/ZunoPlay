\set ON_ERROR_STOP on

-- Tests only: freeze current Relay Send score-cap semantics before any sixth extraction.
-- Runs exclusively against disposable local Supabase in CI.

create or replace function pg_temp.stack_tiles()
returns jsonb
language sql
as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (select layer, generate_series(0,n-1) as k from spec),
numbered as (select row_number() over(order by layer,k)-1 as idx, layer, k from expanded)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type','qa-'||(idx%10)::text,
  'x',(k%6), 'y',(k/6), 'layer',layer, 'removed',false
) order by idx) from numbered;
$$;

create or replace function pg_temp.stack_state(p_score integer)
returns jsonb
language sql
as $$
select jsonb_build_object(
  'kind','start',
  'actor','00000000-0000-0000-0000-000000000001',
  'at',1,
  'engine',jsonb_build_object(
    'active',true,
    'tiles',pg_temp.stack_tiles(),
    'tray',jsonb_build_array('qa-send'),
    'relay',jsonb_build_array('qa-held',null,null),
    'score',p_score,
    'matches',7,
    'energy',3,
    'seed',1,
    'startedAt',1,
    'undoLeft',1,
    'hintsLeft',2,
    'pulseEventCount',2,
    'doubleNext',true,
    'combo',4,
    'bestCombo',6,
    'lastMatchAt',123456,
    'relayRev',123,
    'serverUndo',jsonb_build_object('sentinel','must-be-cleared')
  )
);
$$;

create or replace procedure pg_temp.reset_fixture(p_score integer)
language plpgsql
as $$
declare
  u uuid := '00000000-0000-0000-0000-000000000001';
  r uuid := '10000000-0000-0000-0000-000000000001';
begin
  reset role;
  delete from public.zuno_stack_game_events where room_id=r;
  delete from public.zuno_stack_match_state where room_id=r;
  delete from public.room_members where room_id=r;
  delete from public.rooms where id=r;
  delete from public.profiles where id=u;
  delete from auth.users where id=u;

  insert into auth.users(
    id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) values(
    u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    'stack-relay-send-qa@local.invalid','',now(),'{}'::jsonb,
    jsonb_build_object('username','stack_relay_send_qa'),now(),now()
  );
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack Relay Send QA');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by)
  values(r,1,pg_temp.stack_state(p_score),u);
end;
$$;

create or replace procedure pg_temp.assert_send_result(
  p_expected_score integer,
  p_action_id text
)
language plpgsql
as $$
declare
  u uuid := '00000000-0000-0000-0000-000000000001';
  r uuid := '10000000-0000-0000-0000-000000000001';
  s public.zuno_stack_match_state;
  e public.zuno_stack_game_events;
  n integer;
  relay_rev bigint;
  state_at bigint;
begin
  select * into strict s from public.zuno_stack_match_state where room_id=r;

  if s.revision <> 2 then raise exception 'relay send revision changed: %',s.revision; end if;
  if s.updated_by is distinct from u then raise exception 'relay send updated_by changed'; end if;
  if s.state->>'kind' <> 'server_relay_send' then raise exception 'relay send kind changed'; end if;
  if s.state->>'actor' <> u::text then raise exception 'relay send actor changed'; end if;
  if coalesce((s.state#>>'{engine,active}')::boolean,false) is not true then raise exception 'relay send active changed'; end if;
  if (s.state#>>'{engine,score}')::integer <> p_expected_score then raise exception 'relay send score expected %, got %',p_expected_score,s.state#>>'{engine,score}'; end if;

  if s.state#>'{engine,tray}' <> '[]'::jsonb then raise exception 'relay send tray mutation changed'; end if;
  if s.state#>'{engine,relay}' <> '["qa-held","qa-send",null]'::jsonb then raise exception 'relay send did not use first free relay slot'; end if;
  if s.state#>'{engine,tiles}' <> pg_temp.stack_tiles() then raise exception 'relay send mutated tiles'; end if;

  if (s.state#>>'{engine,matches}')::integer <> 7 then raise exception 'relay send mutated matches'; end if;
  if (s.state#>>'{engine,energy}')::integer <> 3 then raise exception 'relay send mutated energy'; end if;
  if (s.state#>>'{engine,pulseEventCount}')::integer <> 2 then raise exception 'relay send mutated pulseEventCount'; end if;
  if (s.state#>>'{engine,doubleNext}')::boolean is not true then raise exception 'relay send mutated doubleNext'; end if;
  if (s.state#>>'{engine,combo}')::integer <> 4 then raise exception 'relay send mutated combo'; end if;
  if (s.state#>>'{engine,bestCombo}')::integer <> 6 then raise exception 'relay send mutated bestCombo'; end if;
  if (s.state#>>'{engine,lastMatchAt}')::bigint <> 123456 then raise exception 'relay send mutated lastMatchAt'; end if;
  if (s.state#>>'{engine,undoLeft}')::integer <> 1 then raise exception 'relay send mutated undoLeft'; end if;
  if (s.state#>>'{engine,hintsLeft}')::integer <> 2 then raise exception 'relay send mutated hintsLeft'; end if;
  if s.state#>'{engine,serverUndo}' <> 'null'::jsonb then raise exception 'relay send serverUndo clear semantics changed'; end if;

  relay_rev := (s.state#>>'{engine,relayRev}')::bigint;
  state_at := (s.state->>'at')::bigint;
  if relay_rev <= 123 or relay_rev <> state_at then raise exception 'relay send relayRev/at semantics changed'; end if;

  select count(*) into n from public.zuno_stack_game_events where room_id=r;
  if n <> 1 then raise exception 'relay send expected exactly one room event, got %',n; end if;
  select count(*) into n from public.zuno_stack_game_events where room_id=r and action_id=p_action_id;
  if n <> 1 then raise exception 'relay send expected exactly one action event, got %',n; end if;

  select * into strict e from public.zuno_stack_game_events where room_id=r and action_id=p_action_id;
  if e.actor_id is distinct from u then raise exception 'relay send event actor changed'; end if;
  if e.event_type <> 'server_relay_send' then raise exception 'relay send event type changed'; end if;
  if coalesce((e.payload->>'expected_revision')::bigint,-1) <> 1 then raise exception 'relay send expected_revision payload changed'; end if;
  if coalesce((e.payload->>'applied_revision')::bigint,-1) <> 2 then raise exception 'relay send applied_revision payload changed'; end if;
  if coalesce((e.payload->>'index')::integer,-1) <> 0 then raise exception 'relay send index payload changed'; end if;
  if e.payload->>'type' <> 'qa-send' then raise exception 'relay send type payload changed'; end if;
  if coalesce((e.payload->>'relay_slot')::integer,-1) <> 1 then raise exception 'relay send relay_slot payload changed'; end if;
  if coalesce((e.payload->>'matched')::boolean,true) is not false then raise exception 'relay send matched payload changed'; end if;
  if e.payload->>'outcome' <> 'server_relay_send' then raise exception 'relay send outcome payload changed'; end if;
end;
$$;

-- 1) score 0 -> 20.
call pg_temp.reset_fixture(0);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-rsend-cap-0001',0); end $$;
reset role;
call pg_temp.assert_send_result(20,'qa-rsend-cap-0001');

-- 2) score 24,970 -> 24,990.
call pg_temp.reset_fixture(24970);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-rsend-cap-0002',0); end $$;
reset role;
call pg_temp.assert_send_result(24990,'qa-rsend-cap-0002');

-- 3) score 24,990 crosses the cap -> exactly 25,000.
call pg_temp.reset_fixture(24990);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-rsend-cap-0003',0); end $$;
reset role;
call pg_temp.assert_send_result(25000,'qa-rsend-cap-0003');

-- 4) score already at 25,000 remains capped.
call pg_temp.reset_fixture(25000);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin perform public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-rsend-cap-0004',0); end $$;
reset role;
call pg_temp.assert_send_result(25000,'qa-rsend-cap-0004');

select 'zuno_stack_relay_send_score_cap_characterization_ok' as result;
