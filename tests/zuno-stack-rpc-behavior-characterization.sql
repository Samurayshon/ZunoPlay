\set ON_ERROR_STOP on

-- Disposable-local behavioral characterization for the current 90/5 server engine.
-- This file is executed only against the Supabase CLI database in CI.

create or replace function pg_temp.stack_tiles(p_trio boolean default false)
returns jsonb language sql as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (
  select layer, generate_series(0,n-1) as k from spec
), numbered as (
  select row_number() over(order by layer,k)-1 as idx, layer, k from expanded
)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type',case when p_trio and idx=85 then 'qa-a' else 'qa-'||(idx%10)::text end,
  'x',(k%6), 'y',(k/6), 'layer',layer, 'removed',false
) order by idx)
from numbered;
$$;

create or replace function pg_temp.stack_state(p_tray jsonb default '[]'::jsonb, p_energy int default 0, p_trio boolean default false)
returns jsonb language sql as $$
select jsonb_build_object(
 'kind','start','actor','00000000-0000-0000-0000-000000000001',
 'engine',jsonb_build_object(
   'active',true,'tiles',pg_temp.stack_tiles(p_trio),'tray',p_tray,'relay',jsonb_build_array(null,null,null),
   'score',0,'matches',0,'energy',p_energy,'seed',1,'startedAt',1,'undoLeft',1,'hintsLeft',2,
   'pulseEventCount',0,'doubleNext',false,'combo',0,'bestCombo',0,'lastMatchAt',0,'relayRev',0,'serverUndo',null
  ));
$$;

create or replace procedure pg_temp.reset_fixture(p_tray jsonb default '[]'::jsonb, p_energy int default 0, p_trio boolean default false)
language plpgsql as $$
declare u uuid := '00000000-0000-0000-0000-000000000001'; r uuid := '10000000-0000-0000-0000-000000000001';
begin
  delete from public.zuno_stack_game_events where room_id=r;
  delete from public.zuno_stack_match_state where room_id=r;
  delete from public.room_members where room_id=r;
  delete from public.rooms where id=r;
  delete from public.profiles where id=u;
  delete from auth.users where id=u;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','stack-qa@local.invalid','',now(),'{}'::jsonb,jsonb_build_object('username','stack_qa'),now(),now());
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack QA Local');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by) values(r,1,pg_temp.stack_state(p_tray,p_energy,p_trio),u);
end;
$$;

-- Tile: real RPC mutates the authoritative row and writes one event.
call pg_temp.reset_fixture();
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s := public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-tile-0001','t85');
  if s.revision <> 2 or (s.state->'engine'->>'score')::int <> 25 or jsonb_array_length(s.state->'engine'->'tray') <> 1 then raise exception 'tile characterization failed'; end if;
end $$;
reset role;

-- Trio: preloaded pair + matching available tile resolves to empty tray, one match and energy +1.
call pg_temp.reset_fixture('["qa-a","qa-a"]'::jsonb,0,true);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s := public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-trio-0001','t85');
  if jsonb_array_length(s.state->'engine'->'tray') <> 0 or (s.state->'engine'->>'matches')::int <> 1 or (s.state->'engine'->>'energy')::int <> 1 or (s.state->'engine'->>'score')::int <> 335 then raise exception 'trio characterization failed'; end if;
end $$;
reset role;

-- Relay send: moves tray index 0 to the first relay slot.
call pg_temp.reset_fixture('["qa-a"]'::jsonb);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s := public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-relay-0001',0);
  if jsonb_array_length(s.state->'engine'->'tray') <> 0 or s.state->'engine'->'relay'->>0 <> 'qa-a' then raise exception 'relay characterization failed'; end if;
end $$;
reset role;

-- Pulse Shift: energy 5 is consumed and two tray entries are removed in non-critical state.
call pg_temp.reset_fixture('["qa-a","qa-b","qa-c"]'::jsonb,5);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s := public.zuno_stack_pulse_shift('10000000-0000-0000-0000-000000000001',1,'qa-pulse-0001');
  if (s.state->'engine'->>'energy')::int <> 0 or jsonb_array_length(s.state->'engine'->'tray') <> 1 or (s.state->'engine'->>'score')::int <> 160 then raise exception 'pulse characterization failed'; end if;
end $$;
reset role;

-- Idempotency: exact action replay returns the already-applied state without another revision/event.
call pg_temp.reset_fixture();
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare a public.zuno_stack_match_state; b public.zuno_stack_match_state; n int; begin
  a := public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-idem-00001','t85');
  b := public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-idem-00001','t85');
  select count(*) into n from public.zuno_stack_game_events where room_id='10000000-0000-0000-0000-000000000001' and action_id='qa-idem-00001';
  if a.revision <> 2 or b.revision <> 2 or n <> 1 then raise exception 'idempotency characterization failed'; end if;
end $$;
reset role;

-- Revision conflict: stale expected revision must be rejected and leave revision unchanged.
call pg_temp.reset_fixture();
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare msg text; rev bigint; begin
  begin
    perform public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',2,'qa-revconf-01','t85');
    raise exception 'expected revision_conflict';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> 'revision_conflict' then raise; end if;
  end;
  select revision into rev from public.zuno_stack_match_state where room_id='10000000-0000-0000-0000-000000000001';
  if rev <> 1 then raise exception 'revision conflict mutated state'; end if;
end $$;
reset role;

select 'zuno_stack_rpc_behavior_characterization_ok' as result;
