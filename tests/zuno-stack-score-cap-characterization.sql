\set ON_ERROR_STOP on

-- Characterization only: freeze current score-cap behavior before any fifth extraction.
-- Runs only against disposable local PostgreSQL/Supabase in CI.

create or replace function pg_temp.stack_score_cap_tiles(p_tile85_type text default 'qa-a')
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

create or replace procedure pg_temp.reset_score_cap_fixture(
  p_mode text,
  p_score integer,
  p_tray jsonb,
  p_double_next boolean default false,
  p_matches integer default 0,
  p_combo integer default 0,
  p_best_combo integer default 0,
  p_last_match_at bigint default 0,
  p_pulse integer default 0,
  p_energy integer default 0
)
language plpgsql as $$
declare
  u uuid := '00000000-0000-0000-0000-000000000001';
  r uuid := '10000000-0000-0000-0000-000000000001';
  v_type text := case when p_mode='relay' then 'qa-r' else 'qa-a' end;
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
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','stack-cap-qa@local.invalid','',now(),'{}'::jsonb,jsonb_build_object('username','stack_cap_qa'),now(),now());
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack Score Cap QA Local');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);

  v_state:=jsonb_build_object(
    'kind','start','actor',u::text,
    'engine',jsonb_build_object(
      'active',true,'tiles',pg_temp.stack_score_cap_tiles(v_type),'tray',p_tray,
      'relay',case when p_mode='relay' then jsonb_build_array(v_type,null,null) else jsonb_build_array(null,null,null) end,
      'score',p_score,'matches',p_matches,'energy',p_energy,'seed',1,'startedAt',1,'undoLeft',1,'hintsLeft',2,
      'pulseEventCount',p_pulse,'doubleNext',p_double_next,'combo',p_combo,'bestCombo',p_best_combo,
      'lastMatchAt',p_last_match_at,'relayRev',0,'serverUndo',null
    ));
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by) values(r,1,v_state,u);
end;
$$;

-- 1) Tile below cap: caller pick bonus remains integral (24900 + 25 = 24925).
call pg_temp.reset_score_cap_fixture('tile',24900,'[]'::jsonb);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-cap-tile-low1','t85');
  if (s.state->'engine'->>'score')::int<>24925 then raise exception 'tile below-cap gain changed'; end if;
end $$; reset role;

-- 2 + 6) Tile crossing cap through caller +25 and shared trio scoring: final score must be exactly 25000.
-- This also freezes the order that both contributions are subject to the final cap.
call pg_temp.reset_score_cap_fixture('tile',24700,'["qa-a","qa-a"]'::jsonb,false,0,0,0,0,0,0);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-cap-tile-cross','t85');
  if (s.state->'engine'->>'score')::int<>25000 or (s.state->'engine'->>'matches')::int<>1 then
    raise exception 'tile score-cap crossing characterization failed';
  end if;
end $$; reset role;

-- 3 + 6) Relay Take crossing cap through shared trio scoring plus caller +10 => exactly 25000.
call pg_temp.reset_score_cap_fixture('relay',24700,'["qa-r","qa-r"]'::jsonb,false,0,0,0,0,0,0);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-cap-relay-cross',0);
  if (s.state->'engine'->>'score')::int<>25000 or (s.state->'engine'->>'matches')::int<>1 then
    raise exception 'relay score-cap crossing characterization failed';
  end if;
end $$; reset role;

-- 4) Already capped: a scoring Tile action cannot exceed 25000.
call pg_temp.reset_score_cap_fixture('tile',25000,'[]'::jsonb);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-cap-at-max001','t85');
  if (s.state->'engine'->>'score')::int<>25000 then raise exception 'score exceeded cap from 25000'; end if;
end $$; reset role;

-- 5) Trio + armed doubleNext near cap: score alone is capped; match/combo/Pulse semantics remain intact.
-- Start at matches=4 and pulseEventCount=0 so this trio becomes match 5 and triggers Pulse cycle %3=1.
-- doubleNext must be consumed by scoring, then Pulse immediately arms the next doubleNext again.
call pg_temp.reset_score_cap_fixture('tile',24900,'["qa-a","qa-a"]'::jsonb,true,4,0,0,0,0,0);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
  s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-cap-double-pulse','t85');
  if (s.state->'engine'->>'score')::int<>25000
     or (s.state->'engine'->>'matches')::int<>5
     or (s.state->'engine'->>'combo')::int<>1
     or (s.state->'engine'->>'bestCombo')::int<>1
     or (s.state->'engine'->>'pulseEventCount')::int<>1
     or (s.state->'engine'->>'doubleNext')::boolean is not true then
    raise exception 'doubleNext/Pulse score-cap characterization failed';
  end if;
end $$; reset role;

select 'zuno_stack_score_cap_characterization_ok' as result;
