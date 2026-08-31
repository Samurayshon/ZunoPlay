\set ON_ERROR_STOP on

-- Ninth-extraction characterization: freeze current Gelo score-cap semantics
-- before reusing the canonical zuno_stack_cap_score(integer) helper.
-- Runs only against disposable local Supabase in CI.

begin;

create or replace function pg_temp.assert_true(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_ok,false) is not true then
    raise exception 'gelo_score_cap_characterization_failed:%', p_message;
  end if;
end;
$$;

create temporary table gelo_cap_cases(
  label text primary key,
  user_id uuid not null,
  room_id uuid not null,
  start_score integer not null,
  expected_score integer not null
) on commit drop;

insert into gelo_cap_cases values
  ('baseline',       '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001',     0,    40),
  ('below_cap',      '75000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', 24950, 24990),
  ('cross_cap',      '75000000-0000-0000-0000-000000000003', '76000000-0000-0000-0000-000000000003', 24970, 25000),
  ('already_capped', '75000000-0000-0000-0000-000000000004', '76000000-0000-0000-0000-000000000004', 25000, 25000);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',label||'@gelo-cap.test','',now(),'{}'::jsonb,jsonb_build_object('username','stack_gelo_cap_'||label),now(),now()
from gelo_cap_cases
on conflict (id) do nothing;

insert into public.rooms(id,owner_id,name)
select room_id,user_id,'Gelo score-cap characterization '||label
from gelo_cap_cases
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in select * from gelo_cap_cases order by label loop
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
          'type','type'||(g%10)::text,
          'x',g,
          'y',0,
          'layer',0,
          'removed',false
        ) order by g)
        from generate_series(0,89) g
      ),
      'tray','[]'::jsonb,
      'relay','[null,null,null]'::jsonb,
      'score',c.start_score,
      'matches',0,
      'energy',2,
      'seed',1,
      'startedAt',1,
      'undoLeft',1,
      'hintsLeft',2,
      'pulseEventCount',0,
      'doubleNext',false,
      'combo',0,
      'bestCombo',0,
      'lastMatchAt',0,
      'relayRev',0,
      'serverUndo',null
    ),
    'serverPowers',jsonb_build_object(
      'selected',jsonb_build_array('gelo'),
      'charges',jsonb_build_object('gelo',1),
      'round',1
    ),
    'serverTimer',jsonb_build_object(
      'deadlineAt',100000,
      'freezeUntil',0,
      'geloExtensions',0
    ),
    'systems',jsonb_build_object(
      'charges',jsonb_build_object('gelo',1),
      'comboRewards','[]'::jsonb,
      'metaDone','[]'::jsonb
    )
  ),c.user_id
from gelo_cap_cases c;

do $$
declare
  c record;
  s public.zuno_stack_match_state;
  e public.zuno_stack_game_events;
  eng jsonb;
  timer jsonb;
  systems jsonb;
  v_action_id text;
begin
  for c in select * from gelo_cap_cases order by label loop
    perform set_config('request.jwt.claim.sub',c.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_action_id := 'gelo-cap-'||c.label;

    select * into s
    from zuno_private.zuno_stack_apply_gelo_internal(c.room_id,1,v_action_id);
    eng := s.state->'engine';
    timer := s.state->'serverTimer';
    systems := s.state->'systems';

    perform pg_temp.assert_true(s.revision=2,c.label||':revision');
    perform pg_temp.assert_true(s.updated_by=c.user_id,c.label||':updated_by');
    perform pg_temp.assert_true(s.state->>'kind'='power_gelo',c.label||':kind');
    perform pg_temp.assert_true((eng->>'score')::integer=c.expected_score,c.label||':score');
    perform pg_temp.assert_true((eng->>'energy')::integer=0,c.label||':energy');
    perform pg_temp.assert_true(jsonb_array_length(eng->'tiles')=90,c.label||':tile_count');
    perform pg_temp.assert_true((select count(*) from jsonb_array_elements(eng->'tiles') t(tile) where coalesce((t.tile->>'removed')::boolean,false))=0,c.label||':removed_tiles');
    perform pg_temp.assert_true((s.state#>>'{serverPowers,charges,gelo}')::integer=0,c.label||':charge');
    perform pg_temp.assert_true((timer->>'deadlineAt')::bigint=105000,c.label||':deadline');
    perform pg_temp.assert_true((timer->>'freezeUntil')::bigint>0,c.label||':freeze');
    perform pg_temp.assert_true((timer->>'geloExtensions')::integer=1,c.label||':extensions');
    perform pg_temp.assert_true(systems->>'phase'='opening',c.label||':phase');
    perform pg_temp.assert_true((systems->>'deadlineAt')::bigint=105000,c.label||':systems_deadline');
    perform pg_temp.assert_true((systems->>'freezeUntil')::bigint=(timer->>'freezeUntil')::bigint,c.label||':systems_freeze');
    perform pg_temp.assert_true(s.state->'mechanics'=systems,c.label||':mechanics_sync');

    select * into e
    from public.zuno_stack_game_events ev
    where ev.room_id=c.room_id and ev.action_id=v_action_id;
    perform pg_temp.assert_true(found,c.label||':event_missing');
    perform pg_temp.assert_true(e.event_type='server_power',c.label||':event_type');
    perform pg_temp.assert_true(e.actor_id=c.user_id,c.label||':event_actor');
    perform pg_temp.assert_true(e.payload->>'power'='gelo',c.label||':event_power');
    perform pg_temp.assert_true((e.payload->>'cost')::integer=2,c.label||':event_cost');
    perform pg_temp.assert_true((e.payload->>'expected_revision')::bigint=1,c.label||':event_expected_revision');
    perform pg_temp.assert_true((e.payload->>'applied_revision')::bigint=2,c.label||':event_applied_revision');
    perform pg_temp.assert_true((e.payload->>'deadlineAt')::bigint=105000,c.label||':event_deadline');
    perform pg_temp.assert_true((e.payload->>'freezeUntil')::bigint=(timer->>'freezeUntil')::bigint,c.label||':event_freeze');
    perform pg_temp.assert_true((select count(*) from public.zuno_stack_game_events ev where ev.room_id=c.room_id and ev.action_id=v_action_id)=1,c.label||':single_event');
  end loop;
end;
$$;

select 'zuno_stack_gelo_score_cap_characterization_ok' as marker;
rollback;
