\set ON_ERROR_STOP on

-- Ninth extraction pre-characterization: Fluxo score-cap application only.
-- Freeze the public RPC behavior before replacing the isolated Fluxo score cap
-- with the canonical zuno_stack_cap_score helper.
begin;

create or replace function pg_temp.assert_true(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_ok,false) is not true then
    raise exception 'fluxo_score_cap_characterization_failed:%', p_message;
  end if;
end;
$$;

create temporary table fluxo_cases(
  label text primary key,
  user_id uuid not null,
  room_id uuid not null,
  start_score integer not null,
  expected_score integer not null
) on commit drop;

insert into fluxo_cases values
  ('below_cap',   '73000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-000000000001', 24000, 24040),
  ('cross_cap',   '73000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000002', 24980, 25000),
  ('already_cap', '73000000-0000-0000-0000-000000000003', '74000000-0000-0000-0000-000000000003', 25000, 25000);

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
select user_id,'authenticated','authenticated',label||'@fluxo.test','',now(),now(),now()
from fluxo_cases
on conflict (id) do nothing;

insert into public.rooms(id,owner_id,name)
select room_id,user_id,'Fluxo score-cap characterization '||label
from fluxo_cases
on conflict (id) do nothing;

insert into public.zuno_stack_match_state(room_id,revision,state,updated_by)
select c.room_id,1,
  jsonb_build_object(
    'kind','fixture',
    'engine',jsonb_build_object(
      'active',true,
      'tiles',(
        select jsonb_agg(
          jsonb_build_object(
            'id','t'||g,
            'type','type'||(g%9),
            'x',g,
            'y',0,
            'layer',0,
            'removed',false
          ) order by g
        )
        from generate_series(0,89) g
      ),
      'tray','["trayA","trayB"]'::jsonb,
      'score',c.start_score,
      'matches',7,
      'energy',5,
      'combo',2,
      'bestCombo',4,
      'lastMatchAt',123456789,
      'serverUndo',jsonb_build_object('sentinel','must-clear')
    ),
    'serverPowers',jsonb_build_object(
      'version',1,
      'round',1,
      'selected','["fluxo"]'::jsonb,
      'charges',jsonb_build_object('fluxo',1)
    ),
    'systems',jsonb_build_object(
      'comboRewards','[]'::jsonb,
      'metaDone','[]'::jsonb,
      'charges',jsonb_build_object('fluxo',1)
    )
  ),c.user_id
from fluxo_cases c;

do $$
declare
  c record;
  v_result public.zuno_stack_match_state;
  v_engine jsonb;
  v_event public.zuno_stack_game_events;
  v_action text;
  v_type_total_before jsonb;
  v_type_total_after jsonb;
begin
  for c in select * from fluxo_cases order by label loop
    perform set_config('request.jwt.claim.sub',c.user_id::text,true);
    perform set_config('request.jwt.claim.role','authenticated',true);
    v_action:='fluxo-cap-'||c.label;

    select jsonb_object_agg(typ,n order by typ) into v_type_total_before
    from (
      select tile->>'type' typ,count(*) n
      from jsonb_array_elements((select state#>'{engine,tiles}' from public.zuno_stack_match_state where room_id=c.room_id)) e(tile)
      group by tile->>'type'
    ) s;

    select * into v_result from public.zuno_stack_power(c.room_id,1,v_action,'fluxo');
    v_engine:=v_result.state->'engine';

    select jsonb_object_agg(typ,n order by typ) into v_type_total_after
    from (
      select tile->>'type' typ,count(*) n
      from jsonb_array_elements(v_engine->'tiles') e(tile)
      group by tile->>'type'
    ) s;

    perform pg_temp.assert_true(v_result.revision=2,c.label||':revision');
    perform pg_temp.assert_true((v_engine->>'score')::integer=c.expected_score,c.label||':score');
    perform pg_temp.assert_true((v_engine->>'energy')::integer=4,c.label||':energy_cost');
    perform pg_temp.assert_true((v_engine->>'matches')::integer=7,c.label||':matches_unchanged');
    perform pg_temp.assert_true((v_engine->>'combo')::integer=2,c.label||':combo_unchanged');
    perform pg_temp.assert_true((v_engine->>'bestCombo')::integer=4,c.label||':best_combo_unchanged');
    perform pg_temp.assert_true((v_engine->>'lastMatchAt')::bigint=123456789,c.label||':last_match_unchanged');
    perform pg_temp.assert_true(v_engine->'tray'='["trayA","trayB"]'::jsonb,c.label||':tray_unchanged');
    perform pg_temp.assert_true((select count(*) from jsonb_array_elements(v_engine->'tiles') e(tile) where coalesce((tile->>'removed')::boolean,false))=0,c.label||':removed_unchanged');
    perform pg_temp.assert_true(v_type_total_after=v_type_total_before,c.label||':tile_type_multiset');
    perform pg_temp.assert_true(v_engine->'serverUndo'='null'::jsonb,c.label||':server_undo_cleared');
    perform pg_temp.assert_true((v_result.state#>>'{serverPowers,charges,fluxo}')::integer=0,c.label||':charge_consumed');
    perform pg_temp.assert_true(v_result.state->>'kind'='power_fluxo',c.label||':kind');

    select * into v_event
    from public.zuno_stack_game_events e
    where e.room_id=c.room_id and e.action_id=v_action;
    perform pg_temp.assert_true(found,c.label||':event_missing');
    perform pg_temp.assert_true(v_event.event_type='server_power',c.label||':event_type');
    perform pg_temp.assert_true(v_event.actor_id=c.user_id,c.label||':event_actor');
    perform pg_temp.assert_true(v_event.payload->>'power'='fluxo',c.label||':event_power');
    perform pg_temp.assert_true((v_event.payload->>'expected_revision')::bigint=1,c.label||':event_expected_revision');
    perform pg_temp.assert_true((v_event.payload->>'applied_revision')::bigint=2,c.label||':event_applied_revision');
    perform pg_temp.assert_true((v_event.payload->>'cost')::integer=1,c.label||':event_cost');
    perform pg_temp.assert_true((select count(*) from public.zuno_stack_game_events e where e.room_id=c.room_id and e.action_id=v_action)=1,c.label||':single_event');
  end loop;
end;
$$;

select 'zuno_stack_fluxo_score_cap_characterization_ok' as marker;
rollback;
