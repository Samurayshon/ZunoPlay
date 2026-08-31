\set ON_ERROR_STOP on

-- Characterization only: freeze current tray-finish behavior before any fourth extraction.
-- Runs only against disposable local PostgreSQL/Supabase in CI.

create or replace function pg_temp.stack_finish_tiles(p_tile85_type text default 'qa-tile')
returns jsonb language sql as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (select layer, generate_series(0,n-1) as k from spec),
numbered as (select row_number() over(order by layer,k)-1 as idx, layer, k from expanded)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type',case when idx=85 then p_tile85_type else 'qa-'||(idx%10)::text end,
  'x',(k%6), 'y',(k/6), 'layer',layer, 'removed',false
) order by idx) from numbered;
$$;

create or replace function pg_temp.stack_finish_state(p_tray jsonb, p_relay jsonb, p_tile85_type text default 'qa-tile')
returns jsonb language sql as $$
select jsonb_build_object(
 'kind','start','actor','00000000-0000-0000-0000-000000000001',
 'engine',jsonb_build_object(
   'active',true,'tiles',pg_temp.stack_finish_tiles(p_tile85_type),'tray',p_tray,'relay',p_relay,
   'score',0,'matches',0,'energy',0,'seed',1,'startedAt',1,'undoLeft',1,'hintsLeft',2,
   'pulseEventCount',0,'doubleNext',false,'combo',0,'bestCombo',0,'lastMatchAt',0,'relayRev',0,'serverUndo',null
  ));
$$;

create or replace procedure pg_temp.reset_finish_fixture(
  p_tray jsonb,
  p_relay jsonb default jsonb_build_array(null,null,null),
  p_tile85_type text default 'qa-tile'
)
language plpgsql as $$
declare u uuid := '00000000-0000-0000-0000-000000000001'; r uuid := '10000000-0000-0000-0000-000000000001';
begin
  reset role;
  delete from public.zuno_stack_game_events where room_id=r;
  delete from public.zuno_stack_match_state where room_id=r;
  delete from public.room_members where room_id=r;
  delete from public.rooms where id=r;
  delete from public.profiles where id=u;
  delete from auth.users where id=u;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','stack-finish-qa@local.invalid','',now(),'{}'::jsonb,jsonb_build_object('username','stack_finish_qa'),now(),now());
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack Finish QA Local');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by)
  values(r,1,pg_temp.stack_finish_state(p_tray,p_relay,p_tile85_type),u);
end;
$$;

-- 1) Tile: six nonmatching tray entries + different tile => seven, no trio => finish.
call pg_temp.reset_finish_fixture('["a","b","c","d","e","f"]'::jsonb, jsonb_build_array(null,null,null), 'g');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-finish-tile-01','t85');
  if s.state->>'kind'<>'finish'
     or (s.state->'engine'->>'active')::boolean is not false
     or jsonb_array_length(s.state->'engine'->'tray')<>7 then
    raise exception 'tile tray-finish characterization failed';
  end if;
end $$; reset role;

-- 2) Relay Take: six nonmatching tray entries + different relay type => seven, no trio => finish.
call pg_temp.reset_finish_fixture('["a","b","c","d","e","f"]'::jsonb, '["g",null,null]'::jsonb, 'qa-tile');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-finish-relay01',0);
  if s.state->>'kind'<>'finish'
     or (s.state->'engine'->>'active')::boolean is not false
     or jsonb_array_length(s.state->'engine'->'tray')<>7 then
    raise exception 'relay tray-finish characterization failed';
  end if;
end $$; reset role;

-- 3a) Tile forming a trio from a six-entry tray must resolve the trio and stay active.
call pg_temp.reset_finish_fixture('["a","a","b","c","d","e"]'::jsonb, jsonb_build_array(null,null,null), 'a');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-trio-safe-tile1','t85');
  if s.state->>'kind'<>'server_tile'
     or (s.state->'engine'->>'active')::boolean is not true
     or jsonb_array_length(s.state->'engine'->'tray')<>4
     or (s.state->'engine'->>'matches')::integer<>1 then
    raise exception 'tile trio incorrectly finished round';
  end if;
end $$; reset role;

-- 3b) Relay Take forming a trio from a six-entry tray must resolve the trio and stay active.
call pg_temp.reset_finish_fixture('["a","a","b","c","d","e"]'::jsonb, '["a",null,null]'::jsonb, 'qa-tile');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-trio-safe-relay1',0);
  if s.state->>'kind'<>'server_relay_take'
     or (s.state->'engine'->>'active')::boolean is not true
     or jsonb_array_length(s.state->'engine'->'tray')<>4
     or (s.state->'engine'->>'matches')::integer<>1 then
    raise exception 'relay trio incorrectly finished round';
  end if;
end $$; reset role;

select 'zuno_stack_tray_finish_characterization_ok' as result;
