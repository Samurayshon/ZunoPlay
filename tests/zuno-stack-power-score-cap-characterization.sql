\set ON_ERROR_STOP on

-- Ninth-extraction pre-characterization: freeze the current Board Power score-cap
-- surface and a representative real power execution before canonicalization.
-- Runs only against disposable local Supabase in CI.

begin;

create or replace function pg_temp.assert_true(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_ok,false) is not true then
    raise exception 'power_score_cap_characterization_failed:%', p_message;
  end if;
end;
$$;

-- Structural contract: the current engine owns exactly twelve inline score caps
-- and has not yet been rewired to the canonical score helper.
do $$
declare
  v_def text;
begin
  select regexp_replace(pg_get_functiondef(
    'zuno_private.zuno_stack_apply_power_internal(uuid,bigint,text,text)'::regprocedure
  ), '\s+', '', 'g') into v_def;

  perform pg_temp.assert_true(v_def is not null, 'function_missing');
  perform pg_temp.assert_true(regexp_count(v_def,'v_score:=least\(25000,')=12,'inline_cap_count');
  perform pg_temp.assert_true(regexp_count(v_def,'zuno_private\.zuno_stack_cap_score\(')=0,'helper_precondition');

  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+40);' in v_def)>0,'fluxo_gain');
  perform pg_temp.assert_true(regexp_count(v_def,'v_score:=least\(25000,v_score\+310\);')=2,'trio_310_gain_count');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+55);' in v_def)>0,'troca_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+450);' in v_def)>0,'explosion_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+casep_powerwhen''elo''then80when''fase''then70else60end);' in v_def)>0,'elo_fase_ima_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+greatest(1,v_type_count)*35);' in v_def)>0,'vortice_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+25);' in v_def)>0,'development_phase_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+60);' in v_def)>0,'final_phase_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+v_combo*25*v_mult);' in v_def)>0,'combo_reward_gain');
  perform pg_temp.assert_true(position('v_score:=least(25000,v_score+300);' in v_def)>0,'meta_reward_gain');
end;
$$;

create temporary table power_cap_cases(
  label text primary key,
  user_id uuid not null,
  room_id uuid not null,
  start_score integer not null,
  expected_score integer not null
) on commit drop;

insert into power_cap_cases values
  ('baseline',       '75000000-0000-0000-0000-000000000001', '76000000-0000-0000-0000-000000000001',     0,    40),
  ('below_cap',      '75000000-0000-0000-0000-000000000002', '76000000-0000-0000-0000-000000000002', 24950, 24990),
  ('cross_cap',      '75000000-0000-0000-0000-000000000003', '76000000-0000-0000-0000-000000000003', 24970, 25000),
  ('already_capped', '75000000-0000-0000-0000-000000000004', '76000000-0000-0000-0000-000000000004', 25000, 25000);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',label||'@power-cap.test','',now(),'{}'::jsonb,jsonb_build_object('username','stack_power_cap_'||label),now(),now()
from power_cap_cases
on conflict (id) do nothing;

insert into public.rooms(id,owner_id,name)
select room_id,user_id,'Power score-cap characterization '||label
from power_cap_cases
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in select * from power_cap_cases order by label loop
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
          'id','t'||g::text,'type','type'||(g%10)::text,'x',g,'y',0,'layer',0,'removed',false
        ) order by g)
        from generate_series(0,89) g
      ),
      'tray','[]'::jsonb,
      'relay','[null,null,null]'::jsonb,
      'score',c.start_score,
      'matches',0,
      'energy',1,
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
      'selected',jsonb_build_array('fluxo'),
      'charges',jsonb_build_object('fluxo',1),
      'round',1
    ),
    'systems',jsonb_build_object(
      'charges',jsonb_build_object('fluxo',1),
      'comboRewards','[]'::jsonb,
      'metaDone','[]'::jsonb
    )
  ),c.user_id
from power_cap_cases c;

do $$
declare
  c record;
  s public.zuno_stack_match_state;
  e public.zuno_stack_game_events;
  eng jsonb;
  v_action_id text;
begin
  for c in select * from power_cap_cases order by label loop
    perform set_config('request.jwt.claim.sub',c.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_action_id := 'power-cap-'||c.label;

    select * into s
    from zuno_private.zuno_stack_apply_power_internal(c.room_id,1,v_action_id,'fluxo');
    eng := s.state->'engine';

    perform pg_temp.assert_true(s.revision=2,c.label||':revision');
    perform pg_temp.assert_true(s.updated_by=c.user_id,c.label||':updated_by');
    perform pg_temp.assert_true(s.state->>'kind'='power_fluxo',c.label||':kind');
    perform pg_temp.assert_true((eng->>'score')::integer=c.expected_score,c.label||':score');
    perform pg_temp.assert_true((eng->>'energy')::integer=0,c.label||':energy');
    perform pg_temp.assert_true(jsonb_array_length(eng->'tiles')=90,c.label||':tile_count');
    perform pg_temp.assert_true((select count(*) from jsonb_array_elements(eng->'tiles') t(tile) where coalesce((t.tile->>'removed')::boolean,false))=0,c.label||':removed_tiles');
    perform pg_temp.assert_true(eng->'tray'='[]'::jsonb,c.label||':tray');
    perform pg_temp.assert_true((s.state#>>'{serverPowers,charges,fluxo}')::integer=0,c.label||':charge');

    select * into e from public.zuno_stack_game_events ev where ev.room_id=c.room_id and ev.action_id=v_action_id;
    perform pg_temp.assert_true(found,c.label||':event_missing');
    perform pg_temp.assert_true(e.event_type='server_power',c.label||':event_type');
    perform pg_temp.assert_true(e.actor_id=c.user_id,c.label||':event_actor');
    perform pg_temp.assert_true(e.payload->>'power'='fluxo',c.label||':event_power');
    perform pg_temp.assert_true((e.payload->>'cost')::integer=1,c.label||':event_cost');
    perform pg_temp.assert_true((e.payload->>'expected_revision')::bigint=1,c.label||':event_expected_revision');
    perform pg_temp.assert_true((e.payload->>'applied_revision')::bigint=2,c.label||':event_applied_revision');
    perform pg_temp.assert_true((select count(*) from public.zuno_stack_game_events ev where ev.room_id=c.room_id and ev.action_id=v_action_id)=1,c.label||':single_event');
  end loop;
end;
$$;

select 'zuno_stack_power_score_cap_pre_characterization_ok' as marker;
rollback;
