create or replace function zuno_private.zuno_stack_power_state_guard()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_old_active boolean:=coalesce((old.state#>>'{engine,active}')::boolean,false);
  v_new_active boolean:=coalesce((new.state#>>'{engine,active}')::boolean,false);
  v_kind text:=coalesce(new.state->>'kind','');
  v_seed bigint;
  v_round integer;
  v_selected text[];
  v_charges jsonb;
  v_systems jsonb;
  v_old_systems jsonb;
  v_server jsonb;
begin
  if not v_old_active and v_new_active and v_kind='start' then
    v_seed:=coalesce((new.state#>>'{engine,seed}')::bigint,0);
    v_round:=coalesce((old.state#>>'{serverPowers,round}')::integer,0)+1;
    v_selected:=zuno_private.zuno_stack_server_power_loadout(v_seed,v_round);
    select coalesce(jsonb_object_agg(x,1),'{}'::jsonb) into v_charges from unnest(v_selected) x;
    v_server:=jsonb_build_object('version',1,'round',v_round,'selected',to_jsonb(v_selected),'charges',v_charges,'recharge30Used',false);
    v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb)||jsonb_build_object('seed',v_seed,'round',v_round,'selected',to_jsonb(v_selected),'charges',v_charges,'powerLockUntil',0);
    new.state:=new.state||jsonb_build_object('serverPowers',v_server,'systems',v_systems,'mechanics',v_systems);
    return new;
  end if;

  if v_old_active and v_new_active and current_user not in ('postgres','service_role','supabase_admin') then
    v_server:=old.state->'serverPowers';
    if jsonb_typeof(v_server)='object' then
      v_old_systems:=coalesce(old.state->'systems',old.state->'mechanics','{}'::jsonb);
      v_systems:=coalesce(new.state->'systems',new.state->'mechanics','{}'::jsonb)
        || jsonb_build_object(
          'round',coalesce((v_server->>'round')::integer,0),
          'selected',coalesce(v_server->'selected','[]'::jsonb),
          'charges',coalesce(v_server->'charges','{}'::jsonb),
          'metaDone',coalesce(v_old_systems->'metaDone','[]'::jsonb),
          'comboRewards',coalesce(v_old_systems->'comboRewards','[]'::jsonb),
          'metaSurgeUntil',coalesce(v_old_systems->'metaSurgeUntil','0'::jsonb)
        );
      new.state:=jsonb_set(new.state,'{serverPowers}',v_server,true)||jsonb_build_object('systems',v_systems,'mechanics',v_systems);
    end if;
  end if;
  return new;
end;
$$;
