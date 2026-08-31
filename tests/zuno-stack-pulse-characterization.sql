\set ON_ERROR_STOP on

-- Characterize the current duplicated post-match Pulse / Relay-gift behavior.
-- Tests only. This file intentionally does not change production/gameplay functions.

create or replace function pg_temp.pulse_tiles(p_tile_type text default 'qa-a')
returns jsonb language sql as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (select layer, generate_series(0,n-1) as k from spec),
numbered as (select row_number() over(order by layer,k)-1 as idx, layer, k from expanded)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type',case when idx=85 then p_tile_type else 'board-'||(idx%10)::text end,
  'x',(k%6),'y',(k/6),'layer',layer,'removed',false
) order by idx) from numbered;
$$;

create or replace procedure pg_temp.reset_pulse_fixture(
  p_mode text,
  p_tray jsonb,
  p_relay jsonb,
  p_matches integer,
  p_pulse integer,
  p_double boolean default false,
  p_relay_rev bigint default 777
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
  values(u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','stack-pulse-qa@local.invalid','',now(),'{}'::jsonb,jsonb_build_object('username','stack_pulse_qa'),now(),now());
  insert into public.rooms(id,owner_id,name) values(r,u,'Stack Pulse QA Local');
  perform set_config('request.jwt.claim.sub',u::text,false);
  insert into public.room_members(room_id,user_id) values(r,u);
  v_state:=jsonb_build_object('kind','start','actor',u::text,'engine',jsonb_build_object(
    'active',true,'tiles',pg_temp.pulse_tiles(case when p_mode='tile' then 'qa-a' else 'qa-r' end),
    'tray',p_tray,'relay',p_relay,'score',0,'matches',p_matches,'energy',0,'seed',1,'startedAt',1,
    'undoLeft',1,'hintsLeft',2,'pulseEventCount',p_pulse,'doubleNext',p_double,'combo',0,'bestCombo',0,
    'lastMatchAt',0,'relayRev',p_relay_rev,'serverUndo',null));
  insert into public.zuno_stack_match_state(room_id,revision,state,updated_by) values(r,1,v_state,u);
end;
$$;

-- Non-multiple-of-five match: Pulse does not advance or arm doubleNext.
call pg_temp.reset_pulse_fixture('tile','["qa-a","qa-a"]','[null,null,null]',0,0,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-non5','t85'); if (s.state->'engine'->>'matches')::int<>1 or (s.state->'engine'->>'pulseEventCount')::int<>0 or (s.state->'engine'->>'doubleNext')::boolean<>false or (s.state->'engine'->>'relayRev')::bigint<>777 then raise exception 'tile non-5 pulse characterization failed'; end if; end $$; reset role;
call pg_temp.reset_pulse_fixture('relay','["qa-r","qa-r"]','["qa-r",null,null]',0,0,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-non5',0); if (s.state->'engine'->>'matches')::int<>1 or (s.state->'engine'->>'pulseEventCount')::int<>0 or (s.state->'engine'->>'doubleNext')::boolean<>false or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay non-5 pulse/relayRev characterization failed'; end if; end $$; reset role;

-- Pulse cycle %3=1: fifth match increments Pulse and arms doubleNext in both callers.
call pg_temp.reset_pulse_fixture('tile','["qa-a","qa-a"]','[null,null,null]',4,0,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-mod1','t85'); if (s.state->'engine'->>'matches')::int<>5 or (s.state->'engine'->>'pulseEventCount')::int<>1 or (s.state->'engine'->>'doubleNext')::boolean<>true or (s.state->'engine'->>'relayRev')::bigint<>777 then raise exception 'tile pulse mod1 characterization failed'; end if; end $$; reset role;
call pg_temp.reset_pulse_fixture('relay','["qa-r","qa-r"]','["qa-r",null,null]',4,0,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-mod1',0); if (s.state->'engine'->>'matches')::int<>5 or (s.state->'engine'->>'pulseEventCount')::int<>1 or (s.state->'engine'->>'doubleNext')::boolean<>true or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay pulse mod1 characterization failed'; end if; end $$; reset role;

-- Pulse cycle %3=2: gift chooses highest frequency, then earliest tray occurrence as tie-break.
-- Tile leaves b,c,b,c after trio: equal counts => b wins by first occurrence and first free Relay slot is used.
call pg_temp.reset_pulse_fixture('tile','["b","c","b","c","qa-a","qa-a"]','[null,null,null]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-gift','t85'); if (s.state->'engine'->>'pulseEventCount')::int<>2 or s.state->'engine'->'relay'->>0<>'b' or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'tile pulse gift/tiebreak characterization failed'; end if; end $$; reset role;
-- Relay Take clears slot 0 first; after trio b,c remain, so b wins tie-break and is gifted back into that first free slot.
call pg_temp.reset_pulse_fixture('relay','["b","c","qa-r","qa-r"]','["qa-r","occupied-1","occupied-2"]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-gift',0); if (s.state->'engine'->>'pulseEventCount')::int<>2 or s.state->'engine'->'relay'->>0<>'b' or s.state->'engine'->'relay'->>1<>'occupied-1' or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay pulse gift/tiebreak characterization failed'; end if; end $$; reset role;

-- %3=2 fallback: when trio leaves tray empty, current code falls back to the first board element's type.
call pg_temp.reset_pulse_fixture('tile','["qa-a","qa-a"]','[null,null,null]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-fallback','t85'); if s.state->'engine'->'relay'->>0<>'board-0' or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'tile pulse fallback characterization failed'; end if; end $$; reset role;
call pg_temp.reset_pulse_fixture('relay','["qa-r","qa-r"]','["qa-r",null,null]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-fallback',0); if s.state->'engine'->'relay'->>0<>'board-0' or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay pulse fallback characterization failed'; end if; end $$; reset role;

-- Full Relay: Tile cannot gift and therefore preserves Relay and relayRev.
call pg_temp.reset_pulse_fixture('tile','["qa-a","qa-a"]','["full-0","full-1","full-2"]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-full','t85'); if s.state->'engine'->'relay'<>'["full-0","full-1","full-2"]'::jsonb or (s.state->'engine'->>'relayRev')::bigint<>777 or (s.state->'engine'->>'pulseEventCount')::int<>2 then raise exception 'tile full relay characterization failed'; end if; end $$; reset role;
-- Relay Take structurally creates a free slot by taking from Relay; %3=2 may immediately gift into it.
call pg_temp.reset_pulse_fixture('relay','["qa-r","qa-r"]','["qa-r","full-1","full-2"]',9,1,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-full','0'::int); if s.state->'engine'->'relay'->>0<>'board-0' or s.state->'engine'->'relay'->>1<>'full-1' or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay take full-origin relay characterization failed'; end if; end $$; reset role;

-- Pulse cycle %3=0: increment only; no doubleNext and no gift.
call pg_temp.reset_pulse_fixture('tile','["qa-a","qa-a"]','[null,null,null]',14,2,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pulse-t-mod0','t85'); if (s.state->'engine'->>'pulseEventCount')::int<>3 or (s.state->'engine'->>'doubleNext')::boolean<>false or s.state->'engine'->'relay'<>'[null,null,null]'::jsonb or (s.state->'engine'->>'relayRev')::bigint<>777 then raise exception 'tile pulse mod0 characterization failed'; end if; end $$; reset role;
call pg_temp.reset_pulse_fixture('relay','["qa-r","qa-r"]','["qa-r",null,null]',14,2,false,777);
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-pulse-r-mod0',0); if (s.state->'engine'->>'pulseEventCount')::int<>3 or (s.state->'engine'->>'doubleNext')::boolean<>false or s.state->'engine'->'relay'<>'[null,null,null]'::jsonb or (s.state->'engine'->>'relayRev')::bigint<=777 then raise exception 'relay pulse mod0 characterization failed'; end if; end $$; reset role;

select 'zuno_stack_pulse_characterization_ok' as result;
