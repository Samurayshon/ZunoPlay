\set ON_ERROR_STOP on

-- Disposable-local behavioral characterization for the current 90/5 server engine.
-- This file is executed only against the Supabase CLI database in CI.

create or replace function pg_temp.stack_tiles(p_trio boolean default false)
returns jsonb language sql as $$
with spec(layer,n) as (values (0,36),(1,24),(2,15),(3,10),(4,5)),
expanded as (select layer, generate_series(0,n-1) as k from spec),
numbered as (select row_number() over(order by layer,k)-1 as idx, layer, k from expanded)
select jsonb_agg(jsonb_build_object(
  'id','t'||idx::text,
  'type',case when p_trio and idx=85 then 'qa-a' else 'qa-'||(idx%10)::text end,
  'x',(k%6), 'y',(k/6), 'layer',layer, 'removed',false
) order by idx) from numbered;
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
  reset role;
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

-- Tile baseline.
call pg_temp.reset_fixture(); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-tile-0001','t85');
 if s.revision<>2 or (s.state->'engine'->>'score')::int<>25 or jsonb_array_length(s.state->'engine'->'tray')<>1 then raise exception 'tile characterization failed'; end if;
end $$; reset role;

-- Tile trio.
call pg_temp.reset_fixture('["qa-a","qa-a"]'::jsonb,0,true); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-trio-0001','t85');
 if jsonb_array_length(s.state->'engine'->'tray')<>0 or (s.state->'engine'->>'matches')::int<>1 or (s.state->'engine'->>'energy')::int<>1 or (s.state->'engine'->>'score')::int<>335 then raise exception 'trio characterization failed'; end if;
end $$; reset role;

-- Relay send.
call pg_temp.reset_fixture('["qa-a"]'::jsonb); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_relay_send('10000000-0000-0000-0000-000000000001',1,'qa-relay-0001',0);
 if jsonb_array_length(s.state->'engine'->'tray')<>0 or s.state->'engine'->'relay'->>0<>'qa-a' then raise exception 'relay send characterization failed'; end if;
end $$; reset role;

-- Relay Take without trio.
call pg_temp.reset_fixture(); update public.zuno_stack_match_state set state=jsonb_set(state,'{engine,relay}','["qa-r",null,null]'::jsonb,false) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-rtake-0001',0);
 if s.revision<>2 or s.state->'engine'->'tray'->>0<>'qa-r' or s.state->'engine'->'relay'->0<>'null'::jsonb or (s.state->'engine'->>'score')::int<>10 then raise exception 'relay take characterization failed'; end if;
end $$; reset role;

-- Trio through Relay Take.
call pg_temp.reset_fixture('["qa-r","qa-r"]'::jsonb); update public.zuno_stack_match_state set state=jsonb_set(state,'{engine,relay}','["qa-r",null,null]'::jsonb,false) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-rtrio-0001',0);
 if jsonb_array_length(s.state->'engine'->'tray')<>0 or (s.state->'engine'->>'matches')::int<>1 or (s.state->'engine'->>'energy')::int<>1 or (s.state->'engine'->>'combo')::int<>1 or (s.state->'engine'->>'score')::int<>320 then raise exception 'relay trio characterization failed'; end if;
end $$; reset role;

-- Fifth match through Relay Take triggers Pulse and arms doubleNext.
call pg_temp.reset_fixture('["qa-r","qa-r"]'::jsonb); update public.zuno_stack_match_state set state=jsonb_set(jsonb_set(jsonb_set(state,'{engine,relay}','["qa-r",null,null]'::jsonb,false),'{engine,matches}','4'::jsonb,false),'{engine,pulseEventCount}','0'::jsonb,false) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_relay_take('10000000-0000-0000-0000-000000000001',1,'qa-rpulse-0001',0);
 if (s.state->'engine'->>'matches')::int<>5 or (s.state->'engine'->>'pulseEventCount')::int<>1 or (s.state->'engine'->>'doubleNext')::boolean is not true or (s.state->'engine'->>'energy')::int<>1 then raise exception 'relay pulse characterization failed'; end if;
end $$; reset role;

-- Tray 7/7 rejects Tile before mutation.
call pg_temp.reset_fixture('["a","b","c","d","e","f","g"]'::jsonb); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare msg text; rev bigint; begin
 begin perform public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-full-00001','t85'); raise exception 'expected stack_tray_full'; exception when others then get stacked diagnostics msg=message_text; if msg<>'stack_tray_full' then raise; end if; end;
 select revision into rev from public.zuno_stack_match_state where room_id='10000000-0000-0000-0000-000000000001'; if rev<>1 then raise exception 'tray full mutated revision'; end if;
end $$; reset role;

-- Finish: sixth nonmatching tray entry + picked tile becomes seven without a trio.
call pg_temp.reset_fixture('["a","b","c","d","e","f"]'::jsonb); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-finish-001','t85');
 if s.state->>'kind'<>'finish' or (s.state->'engine'->>'active')::boolean is not false or jsonb_array_length(s.state->'engine'->'tray')<>7 then raise exception 'finish characterization failed'; end if;
end $$; reset role;

-- Win: only t85 remains; picking it ends the round as win.
call pg_temp.reset_fixture(); update public.zuno_stack_match_state set state=jsonb_set(state,'{engine,tiles}',(select jsonb_agg(case when t->>'id'='t85' then t else jsonb_set(t,'{removed}','true'::jsonb,false) end) from jsonb_array_elements(state->'engine'->'tiles') t),false) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin
 s:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-win-000001','t85');
 if s.state->>'kind'<>'win' or (s.state->'engine'->>'active')::boolean is not false then raise exception 'win characterization failed'; end if;
end $$; reset role;

-- Normal Undo restores the exact pre-Tile engine snapshot fields and consumes undoLeft.
call pg_temp.reset_fixture(); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare a public.zuno_stack_match_state; s public.zuno_stack_match_state; begin
 a:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-undopick01','t85');
 s:=public.zuno_stack_apply_undo('10000000-0000-0000-0000-000000000001',2,'qa-undo-00001');
 if s.revision<>3 or (s.state->'engine'->>'score')::int<>0 or jsonb_array_length(s.state->'engine'->'tray')<>0 or (s.state->'engine'->>'undoLeft')::int<>0 or s.state->'engine'->'serverUndo'<>'null'::jsonb then raise exception 'normal undo characterization failed'; end if;
 if (select (t->>'removed')::boolean from jsonb_array_elements(s.state->'engine'->'tiles') t where t->>'id'='t85') then raise exception 'normal undo did not restore tile'; end if;
end $$; reset role;

-- Pulse Shift baseline.
call pg_temp.reset_fixture('["qa-a","qa-b","qa-c"]'::jsonb,5); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_pulse_shift('10000000-0000-0000-0000-000000000001',1,'qa-pulse-0001'); if (s.state->'engine'->>'energy')::int<>0 or jsonb_array_length(s.state->'engine'->'tray')<>1 or (s.state->'engine'->>'score')::int<>160 then raise exception 'pulse characterization failed'; end if; end $$; reset role;

-- Idempotency and revision conflict baseline.
call pg_temp.reset_fixture(); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare a public.zuno_stack_match_state; b public.zuno_stack_match_state; n int; begin a:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-idem-00001','t85'); b:=public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-idem-00001','t85'); select count(*) into n from public.zuno_stack_game_events where room_id='10000000-0000-0000-0000-000000000001' and action_id='qa-idem-00001'; if a.revision<>2 or b.revision<>2 or n<>1 then raise exception 'idempotency characterization failed'; end if; end $$; reset role;
call pg_temp.reset_fixture(); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare msg text; rev bigint; begin begin perform public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',2,'qa-revconf-01','t85'); raise exception 'expected revision_conflict'; exception when others then get stacked diagnostics msg=message_text; if msg<>'revision_conflict' then raise; end if; end; select revision into rev from public.zuno_stack_match_state where room_id='10000000-0000-0000-0000-000000000001'; if rev<>1 then raise exception 'revision conflict mutated state'; end if; end $$; reset role;

-- Power Undo: create a real serverUndo through Tile, then select/charge desfazer and invoke its public RPC.
call pg_temp.reset_fixture(); set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select public.zuno_stack_apply_tile('10000000-0000-0000-0000-000000000001',1,'qa-pundopick1','t85'); reset role;
update public.zuno_stack_match_state set state=jsonb_set(jsonb_set(jsonb_set(state,'{engine,energy}','1'::jsonb,false),'{serverPowers}',jsonb_build_object('selected',jsonb_build_array('desfazer'),'charges',jsonb_build_object('desfazer',1),'round',1),true),'{systems}',jsonb_build_object('charges',jsonb_build_object('desfazer',1)),true) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=public.zuno_stack_desfazer('10000000-0000-0000-0000-000000000001',2,'qa-pundo-0001'); if s.revision<>3 or s.state->>'kind'<>'power_desfazer' or (s.state->'engine'->>'energy')::int<>0 or (s.state->'engine'->>'score')::int<>0 or jsonb_array_length(s.state->'engine'->'tray')<>0 or (s.state->'serverPowers'->'charges'->>'desfazer')::int<>0 then raise exception 'power undo characterization failed'; end if; end $$; reset role;

-- Board Power: characterize the real canonical private engine boundary with fluxo.
call pg_temp.reset_fixture('[]'::jsonb,1); update public.zuno_stack_match_state set state=jsonb_set(jsonb_set(state,'{serverPowers}',jsonb_build_object('selected',jsonb_build_array('fluxo'),'charges',jsonb_build_object('fluxo',1),'round',1),true),'{systems}',jsonb_build_object('charges',jsonb_build_object('fluxo',1),'comboRewards','[]'::jsonb,'metaDone','[]'::jsonb),true) where room_id='10000000-0000-0000-0000-000000000001';
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ declare s public.zuno_stack_match_state; begin s:=zuno_private.zuno_stack_apply_power_internal('10000000-0000-0000-0000-000000000001',1,'qa-power-0001','fluxo'); if s.revision<>2 or s.state->>'kind'<>'power_fluxo' or (s.state->'engine'->>'energy')::int<>0 or (s.state->'engine'->>'score')::int<>40 or (s.state->'serverPowers'->'charges'->>'fluxo')::int<>0 then raise exception 'board power characterization failed'; end if; end $$; reset role;

select 'zuno_stack_rpc_behavior_characterization_ok' as result;
