\set ON_ERROR_STOP on

-- Characterize the duplicated post-trio scoring contract before a second canonical extraction.
-- Tests only: no production/gameplay behavior is changed here.

create or replace function pg_temp.stack_scoring_tiles()
returns jsonb language sql as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (select layer, generate_series(0,n-1) as k from spec),
numbered as (select row_number() over(order by layer,k)-1 as idx, layer, k from expanded)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type',case when idx=85 then 'qa-a' else 'qa-'||(idx%10)::text end,
  'x',(k%6), 'y',(k/6), 'layer',layer, 'removed',false
) order by idx) from numbered;
$$;

create or replace procedure pg_temp.reset_scoring_fixture(
  p_mode text,
  p_combo integer,
  p_best_combo integer,
  p_last_match_at bigint,
  p_double_next boolean,
  p_matches integer default 0
)
language plpgsql as $$
declare
  u uuid := '00000000-0000-0000-0000-000000000001';
  r uuid := '10000000-0000-0000-0000-000000000001';
  v_type text := case when p_mode='tile' then 'qa-a' else 'qa-r' end;
  v_state jsonb;
begin
  reset role;
  delete from public.zuno_stack_game_events where room_id=r;
  delete from public.zuno_stack_match_state where room_id=r;
  delete from public.room_members where room_id=r;
  delete from public.rooms where id=r;
  delete from public.profiles where id=u;
  delete from auth.users where id=u;

  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','stack-score-qa@local.invalid','',now(),'{}'::jsonb,jsonb_build_object('username','stack_score_qa'),now(),now());
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack Score QA Local');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);

  v_state := jsonb_build_object(
    'kind','start','actor',u::text,
    'engine',jsonb_build_object(
      'active',true,
      'tiles',pg_temp.stack_scoring_tiles(),
      'tray',jsonb_build_array(v_type,v_type),
      'relay',case when p_mode='relay' then jsonb_build_array(v_type,null,null) else jsonb_build_array(null,null,null) end,
      'score',0,'matches',p_matches,'energy',0,'seed',1,'startedAt',1,'undoLeft',1,'hintsLeft',2,
      'pulseEventCount',0,'doubleNext',p_double_next,'combo',p_combo,'bestCombo',p_best_combo,
      'lastMatchAt',p_last_match_at,'relayRev',0,'serverUndo',null
    )
  );
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by) values(r,1,v_state,u);
end;
$$;

-- Tile: consecutive trio inside 4000 ms => combo 2 and +55 bonus: 25 pick + 310 base + 55 = 390.
call pg_temp.reset_scoring_fixture('tile',1,1,(floor(extract(epoch from clock_timestamp())*1000)::bigint)-1000,false,1);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-score-tc01','t85');
  if (s.state->'engine'->>'combo')::int<>2 or (s.state->'engine'->>'bestCombo')::int<>2 or (s.state->'engine'->>'score')::int<>390 then
    raise exception 'tile consecutive combo scoring characterization failed';
  end if;
end $$; reset role;

-- Relay Take: same consecutive-combo contract => 310 base + 55 + 10 take = 375.
call pg_temp.reset_scoring_fixture('relay',1,1,(floor(extract(epoch from clock_timestamp())*1000)::bigint)-1000,false,1);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-score-rc01',0);
  if (s.state->'engine'->>'combo')::int<>2 or (s.state->'engine'->>'bestCombo')::int<>2 or (s.state->'engine'->>'score')::int<>375 then
    raise exception 'relay consecutive combo scoring characterization failed';
  end if;
end $$; reset role;

-- Tile: expired combo (>4000 ms) resets to 1 and does not receive +55.
call pg_temp.reset_scoring_fixture('tile',3,4,(floor(extract(epoch from clock_timestamp())*1000)::bigint)-5000,false,1);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-score-te01','t85');
  if (s.state->'engine'->>'combo')::int<>1 or (s.state->'engine'->>'bestCombo')::int<>4 or (s.state->'engine'->>'score')::int<>335 then
    raise exception 'tile expired combo characterization failed';
  end if;
end $$; reset role;

-- Relay Take: expired combo has the same reset contract.
call pg_temp.reset_scoring_fixture('relay',3,4,(floor(extract(epoch from clock_timestamp())*1000)::bigint)-5000,false,1);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-score-re01',0);
  if (s.state->'engine'->>'combo')::int<>1 or (s.state->'engine'->>'bestCombo')::int<>4 or (s.state->'engine'->>'score')::int<>320 then
    raise exception 'relay expired combo characterization failed';
  end if;
end $$; reset role;

-- Tile: armed doubleNext uses 620 base once and is consumed: 25 + 620 = 645.
call pg_temp.reset_scoring_fixture('tile',0,0,0,true,0);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-score-td01','t85');
  if (s.state->'engine'->>'score')::int<>645 or (s.state->'engine'->>'doubleNext')::boolean is not false or (s.state->'engine'->>'combo')::int<>1 then
    raise exception 'tile doubleNext consumption characterization failed';
  end if;
end $$; reset role;

-- Relay Take: armed doubleNext uses 620 base once and is consumed: 620 + 10 = 630.
call pg_temp.reset_scoring_fixture('relay',0,0,0,true,0);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-score-rd01',0);
  if (s.state->'engine'->>'score')::int<>630 or (s.state->'engine'->>'doubleNext')::boolean is not false or (s.state->'engine'->>'combo')::int<>1 then
    raise exception 'relay doubleNext consumption characterization failed';
  end if;
end $$; reset role;

select 'zuno_stack_post_trio_scoring_characterization_ok' as result;
