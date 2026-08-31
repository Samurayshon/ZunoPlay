\set ON_ERROR_STOP on

-- Characterize current PostgreSQL behavior before reusing the canonical score-cap helper
-- inside Pulse Shift. This test intentionally exercises the public RPC against isolated
-- fixtures and freezes both score boundaries and unrelated state/event effects.

begin;

create or replace function pg_temp.assert_true(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_ok,false) is not true then
    raise exception 'pulse_shift_score_cap_characterization_failed:%', p_message;
  end if;
end;
$$;

create temporary table pulse_cases(
  label text primary key,
  user_id uuid not null,
  room_id uuid not null,
  start_score integer not null,
  tray jsonb not null,
  expected_score integer not null,
  expected_removed integer not null
) on commit drop;

insert into pulse_cases values
  ('normal_below', '71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 24000, '["a","b","c","d"]', 24160, 2),
  ('critical_below','71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 24000, '["a","b","c","d","e","f"]', 24260, 3),
  ('normal_cross', '71000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000003', 24900, '["a","b","c","d"]', 25000, 2),
  ('critical_cross','71000000-0000-0000-0000-000000000004', '72000000-0000-0000-0000-000000000004', 24800, '["a","b","c","d","e","f"]', 25000, 3),
  ('already_capped','71000000-0000-0000-0000-000000000005', '72000000-0000-0000-0000-000000000005', 25000, '["a","b","c","d"]', 25000, 2);

-- Minimal auth/room membership fixtures. room_members enforces the same authenticated
-- membership path used by the validated Stack fixtures, so set the JWT subject per case
-- before inserting membership instead of weakening production rules/triggers.
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
select user_id,'authenticated','authenticated',label||'@pulse.test','',now(),now(),now()
from pulse_cases
on conflict (id) do nothing;

insert into public.rooms(id,owner_id,name)
select room_id,user_id,'Pulse Shift characterization '||label from pulse_cases
on conflict (id) do nothing;

do $$
declare c record;
begin
  for c in select * from pulse_cases order by label loop
    perform set_config('request.jwt.claim.sub', c.user_id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    insert into public.room_members(room_id,user_id)
    values(c.room_id,c.user_id)
    on conflict do nothing;
  end loop;
end;
$$;

-- Build an active 90-tile engine; Pulse Shift only mutates tray and related scalar fields.
insert into public.zuno_stack_match_state(room_id,revision,state,updated_by)
select c.room_id, 1,
  jsonb_build_object(
    'kind','fixture',
    'engine',jsonb_build_object(
      'active',true,
      'tiles',(
        select jsonb_agg(jsonb_build_object('id','t'||g,'type','type'||(g%10),'x',g,'y',0,'layer',0,'removed',false) order by g)
        from generate_series(0,89) g
      ),
      'tray',c.tray,
      'relay','[null,null,null]'::jsonb,
      'score',c.start_score,
      'matches',7,
      'energy',5,
      'pulseEventCount',2,
      'doubleNext',true,
      'combo',4,
      'bestCombo',6,
      'lastMatchAt',123456789,
      'relayRev',987654321,
      'serverUndo',jsonb_build_object('sentinel','must-clear')
    )
  ), c.user_id
from pulse_cases c;

-- Execute each case under its own authenticated JWT subject.
do $$
declare c record; v_result public.zuno_stack_match_state; v_engine jsonb; v_event public.zuno_stack_game_events; v_action text; v_before_len integer;
begin
  for c in select * from pulse_cases order by label loop
    perform set_config('request.jwt.claim.sub', c.user_id::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    v_action := 'pulse-cap-'||c.label;
    v_before_len := jsonb_array_length(c.tray);

    select * into v_result from public.zuno_stack_pulse_shift(c.room_id,1,v_action);
    v_engine := v_result.state->'engine';

    perform pg_temp.assert_true(v_result.revision=2, c.label||':revision');
    perform pg_temp.assert_true((v_engine->>'score')::integer=c.expected_score, c.label||':score');
    perform pg_temp.assert_true(jsonb_array_length(v_engine->'tray')=v_before_len-c.expected_removed, c.label||':removed_count');
    perform pg_temp.assert_true((v_engine->>'energy')::integer=0, c.label||':energy');
    perform pg_temp.assert_true((v_engine->>'combo')::integer=0, c.label||':combo');
    perform pg_temp.assert_true((v_engine->>'lastMatchAt')::bigint=0, c.label||':lastMatchAt');
    perform pg_temp.assert_true(v_engine->'serverUndo'='null'::jsonb, c.label||':serverUndo');
    perform pg_temp.assert_true((v_engine->>'matches')::integer=7, c.label||':matches_unchanged');
    perform pg_temp.assert_true((v_engine->>'pulseEventCount')::integer=2, c.label||':pulse_count_unchanged');
    perform pg_temp.assert_true((v_engine->>'doubleNext')::boolean=true, c.label||':doubleNext_unchanged');
    perform pg_temp.assert_true((v_engine->>'bestCombo')::integer=6, c.label||':bestCombo_unchanged');
    perform pg_temp.assert_true((v_engine->>'relayRev')::bigint=987654321, c.label||':relayRev_unchanged');
    perform pg_temp.assert_true(v_result.state->>'kind'='server_pulse_shift', c.label||':kind');

    select * into v_event from public.zuno_stack_game_events e where e.room_id=c.room_id and e.action_id=v_action;
    perform pg_temp.assert_true(found, c.label||':event_missing');
    perform pg_temp.assert_true(v_event.event_type='server_pulse_shift', c.label||':event_type');
    perform pg_temp.assert_true(v_event.actor_id=c.user_id, c.label||':event_actor');
    perform pg_temp.assert_true((v_event.payload->>'expected_revision')::bigint=1, c.label||':event_expected_revision');
    perform pg_temp.assert_true((v_event.payload->>'applied_revision')::bigint=2, c.label||':event_applied_revision');
    perform pg_temp.assert_true((v_event.payload->>'critical')::boolean=(jsonb_array_length(c.tray)>=6), c.label||':event_critical');
    perform pg_temp.assert_true((v_event.payload->>'remove_count')::integer=c.expected_removed, c.label||':event_remove_count');
    perform pg_temp.assert_true((v_event.payload->>'removed_count')::integer=c.expected_removed, c.label||':event_removed_count');
    perform pg_temp.assert_true((v_event.payload->>'score_gain')::integer=(case when jsonb_array_length(c.tray)>=6 then 260 else 160 end), c.label||':event_score_gain');
    perform pg_temp.assert_true((select count(*) from public.zuno_stack_game_events e where e.room_id=c.room_id and e.action_id=v_action)=1, c.label||':single_event');
  end loop;
end;
$$;

select 'zuno_stack_pulse_shift_score_cap_characterization_ok' as marker;
rollback;
