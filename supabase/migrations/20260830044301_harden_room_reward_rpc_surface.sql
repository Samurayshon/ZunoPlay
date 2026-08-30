create schema if not exists zuno_private;

create or replace function zuno_private.claim_room_presence_reward_internal(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_joined timestamptz;
  v_reward_key text := 'presence_' || pg_catalog.to_char(current_date,'YYYYMMDD');
  v_coins integer := 5;
begin
  if v_uid is null then raise exception 'auth_required' using errcode='42501'; end if;
  select rm.joined_at into v_joined from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_uid;
  if v_joined is null then raise exception 'not_in_room' using errcode='42501'; end if;
  if pg_catalog.now() < v_joined + interval '5 minutes' then raise exception 'reward_not_ready' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zunoplay:room-daily-reward:'||v_uid::text||':'||current_date::text,0));
  if exists(select 1 from public.room_reward_claims r where r.user_id=v_uid and r.reward_key=v_reward_key)
     or exists(select 1 from public.room_voice_reward_claims v where v.user_id=v_uid and v.reward_date=current_date)
  then raise exception 'reward_already_claimed' using errcode='23505'; end if;
  insert into public.room_reward_claims(room_id,user_id,reward_key,coins) values(p_room_id,v_uid,v_reward_key,v_coins);
  update public.profiles p set coins=coalesce(p.coins,0)+v_coins where p.id=v_uid;
  if not found then raise exception 'profile_missing' using errcode='P0002'; end if;
  return v_coins;
end;$$;

create or replace function zuno_private.claim_voice_room_reward_internal(p_room_id uuid)
returns table(claimed boolean, coins integer, total_coins integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_coins integer:=5; v_total integer:=0; v_joined_at timestamptz; v_uid uuid:=auth.uid();
  v_presence_key text:='presence_'||pg_catalog.to_char(current_date,'YYYYMMDD');
begin
  if v_uid is null then raise exception 'auth_required' using errcode='42501'; end if;
  select rm.joined_at into v_joined_at from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_uid;
  if v_joined_at is null then raise exception 'room_membership_required' using errcode='42501'; end if;
  if pg_catalog.now() < v_joined_at + interval '5 minutes' then raise exception 'voice_reward_not_ready' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('zunoplay:room-daily-reward:'||v_uid::text||':'||current_date::text,0));
  if exists(select 1 from public.room_voice_reward_claims v where v.user_id=v_uid and v.reward_date=current_date)
     or exists(select 1 from public.room_reward_claims r where r.user_id=v_uid and r.reward_key=v_presence_key)
  then
    select coalesce(p.coins,0) into v_total from public.profiles p where p.id=v_uid;
    return query select false,v_coins,coalesce(v_total,0); return;
  end if;
  insert into public.room_voice_reward_claims(room_id,user_id,reward_date,coins) values(p_room_id,v_uid,current_date,v_coins);
  update public.profiles p set coins=coalesce(p.coins,0)+v_coins where p.id=v_uid returning p.coins into v_total;
  if not found then raise exception 'profile_missing' using errcode='P0002'; end if;
  return query select true,v_coins,coalesce(v_total,0);
end;$$;

create or replace function public.claim_room_presence_reward(p_room_id uuid)
returns integer language sql security invoker set search_path='' as $$ select zuno_private.claim_room_presence_reward_internal(p_room_id); $$;

create or replace function public.claim_voice_room_reward(p_room_id uuid)
returns table(claimed boolean, coins integer, total_coins integer)
language sql security invoker set search_path='' as $$ select * from zuno_private.claim_voice_room_reward_internal(p_room_id); $$;

revoke all on function zuno_private.claim_room_presence_reward_internal(uuid) from public,anon;
revoke all on function zuno_private.claim_voice_room_reward_internal(uuid) from public,anon;
grant execute on function zuno_private.claim_room_presence_reward_internal(uuid) to authenticated,service_role;
grant execute on function zuno_private.claim_voice_room_reward_internal(uuid) to authenticated,service_role;
revoke all on function public.claim_room_presence_reward(uuid) from public,anon;
revoke all on function public.claim_voice_room_reward(uuid) from public,anon;
grant execute on function public.claim_room_presence_reward(uuid) to authenticated,service_role;
grant execute on function public.claim_voice_room_reward(uuid) to authenticated,service_role;
