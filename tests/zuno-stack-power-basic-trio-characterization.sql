\set ON_ERROR_STOP on

-- Tenth-extraction characterization: freeze the two Board Power tray-trio paths
-- and an Explosion control before/after reusing the canonical basic-trio helper.
-- Runs only against disposable local Supabase in CI.

begin;

create or replace function pg_temp.assert_true(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_ok,false) is not true then
    raise exception 'power_basic_trio_characterization_failed:%', p_message;
  end if;
end;
$$;

create temporary table power_trio_cases(
  label text primary key,
  user_id uuid not null,
  room_id uuid not null,
  power text not null,
  tray jsonb not null,
  start_matches integer not null,
  start_energy integer not null,
  start_combo integer not null,
  start_best integer not null,
  recent_last boolean not null,
  expected_score integer not null,
  expected_matches integer not null,
  expected_energy integer not null,
  expected_combo integer not null,
  expected_best integer not null,
  expected_removed integer not null,
  expected_cost integer not null,
  expected_combo_rewards jsonb not null
) on commit drop;

insert into power_trio_cases values
  ('troca_trio_combo', '77000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001', 'troca', '["B","B","A"]'::jsonb, 10, 2, 2, 2, true,  440, 11, 3, 3, 3, 0, 1, '[3]'::jsonb),
  ('elo_trio',         '77000000-0000-0000-0000-000000000002', '78000000-0000-0000-0000-000000000002', 'elo',   '["B","B"]'::jsonb,     4, 3, 0, 0, false, 390,  5, 2, 1, 1, 1, 2, '[]'::jsonb),
  ('explosion_control','77000000-0000-0000-0000-000000000003', '78000000-0000-0000-0000-000000000003', 'explosion','[]'::jsonb,         7, 3, 2, 2, true,  525,  8, 2, 3, 3, 3, 3, '[3]'::jsonb);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',label||'@power-trio.test','',now(),'{}'::jsonb,jsonb_build_object('username','stack_power_trio_'||label),now(),now()
from power_trio_cases
on conflict (id) do nothing;

insert into public.rooms(id,owner_id,name)
select room_id,user_id,'Power basic-trio characterization '||label
from power_trio_cases
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in select * from power_trio_cases order by label loop
    perform set_config('request.jwt.claim.sub',c.user_id::text,true);
    insert into public.room_members(room_id,user_id) values(c.room_id,c.user_id) on conflict do nothing;
  end loop;
end;
$$;

insert into public.zuno_stack_match_state(room_id,revision,state,updated_by)
select c.room_id,1,
  jsonb_build_object(
    'kind','fixture',
    'engine',jsonb_build_object(
      'active',true,
      'tiles',(
        select jsonb_agg(jsonb_build_object(
          'id','t'||g::text,
          'type',case
            when c.power='explosion' and g between 0 and 2 then 'X'
            when g=0 then 'B'
            else 'type'||g::text
          end,
          'x',g,
          'y',0,
          'layer',0,
          'removed',false
        ) order by g)
        from generate_series(0,89) g
      ),
      'tray',c.tray,
      'relay','[null,null,null]'::jsonb,
      'score',0,
      'matches',c.start_matches,
      'energy',c.start_energy,
      'seed',1,
      'startedAt',1,
      'undoLeft',1,
      'hintsLeft',2,
      'pulseEventCount',0,
      'doubleNext',false,
      'combo',c.start_combo,
      'bestCombo',c.start_best,
      'lastMatchAt',case when c.recent_last then floor(extract(epoch from clock_timestamp())*1000)::bigint-1000 else 0 end,
      'relayRev',0,
      'serverUndo',null
    ),
    'serverPowers',jsonb_build_object(
      'selected',jsonb_build_array(c.power),
      'charges',jsonb_build_object(c.power,1),
      'round',1
    ),
    'systems',jsonb_build_object(
      'charges',jsonb_build_object(c.power,1),
      'comboRewards','[]'::jsonb,
      'metaDone','[]'::jsonb
    )
  ),c.user_id
from power_trio_cases c;

do $$
declare
  c record;
  s public.zuno_stack_match_state;
  e public.zuno_stack_game_events;
  eng jsonb;
  systems jsonb;
  v_action_id text;
  v_removed integer;
begin
  for c in select * from power_trio_cases order by label loop
    perform set_config('request.jwt.claim.sub',c.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_action_id := 'power-trio-'||c.label;

    select * into s
    from zuno_private.zuno_stack_apply_power_internal(c.room_id,1,v_action_id,c.power);
    eng := s.state->'engine';
    systems := s.state->'systems';
    select count(*) into v_removed
    from jsonb_array_elements(eng->'tiles') t(tile)
    where coalesce((t.tile->>'removed')::boolean,false);

    perform pg_temp.assert_true(s.revision=2,c.label||':revision');
    perform pg_temp.assert_true(s.updated_by=c.user_id,c.label||':updated_by');
    perform pg_temp.assert_true(s.state->>'kind'='power_'||c.power,c.label||':kind');
    perform pg_temp.assert_true((eng->>'score')::integer=c.expected_score,c.label||':score');
    perform pg_temp.assert_true((eng->>'matches')::integer=c.expected_matches,c.label||':matches');
    perform pg_temp.assert_true((eng->>'energy')::integer=c.expected_energy,c.label||':energy');
    perform pg_temp.assert_true((eng->>'combo')::integer=c.expected_combo,c.label||':combo');
    perform pg_temp.assert_true((eng->>'bestCombo')::integer=c.expected_best,c.label||':best_combo');
    perform pg_temp.assert_true((eng->>'lastMatchAt')::bigint>0,c.label||':last_match');
    perform pg_temp.assert_true(eng->'tray'='[]'::jsonb,c.label||':tray');
    perform pg_temp.assert_true(v_removed=c.expected_removed,c.label||':removed');
    perform pg_temp.assert_true(systems->'comboRewards'=c.expected_combo_rewards,c.label||':combo_rewards');
    perform pg_temp.assert_true((s.state#>>array['serverPowers','charges',c.power])::integer=0,c.label||':charge');

    if c.power='troca' then
      perform pg_temp.assert_true((eng#>>'{tiles,0,type}')='A',c.label||':tile_swap');
    elsif c.power='elo' then
      perform pg_temp.assert_true((eng#>>'{tiles,0,removed}')::boolean,c.label||':elo_target_removed');
    elsif c.power='explosion' then
      perform pg_temp.assert_true((eng#>>'{tiles,0,removed}')::boolean and (eng#>>'{tiles,1,removed}')::boolean and (eng#>>'{tiles,2,removed}')::boolean,c.label||':explosion_targets');
    end if;

    select * into e
    from public.zuno_stack_game_events ev
    where ev.room_id=c.room_id and ev.action_id=v_action_id;
    perform pg_temp.assert_true(found,c.label||':event_missing');
    perform pg_temp.assert_true(e.event_type='server_power',c.label||':event_type');
    perform pg_temp.assert_true(e.actor_id=c.user_id,c.label||':event_actor');
    perform pg_temp.assert_true(e.payload->>'power'=c.power,c.label||':event_power');
    perform pg_temp.assert_true((e.payload->>'cost')::integer=c.expected_cost,c.label||':event_cost');
    perform pg_temp.assert_true((e.payload->>'expected_revision')::bigint=1,c.label||':event_expected_revision');
    perform pg_temp.assert_true((e.payload->>'applied_revision')::bigint=2,c.label||':event_applied_revision');
    perform pg_temp.assert_true((select count(*) from public.zuno_stack_game_events ev where ev.room_id=c.room_id and ev.action_id=v_action_id)=1,c.label||':single_event');
  end loop;
end;
$$;

select 'zuno_stack_power_basic_trio_characterization_ok' as marker;
rollback;
