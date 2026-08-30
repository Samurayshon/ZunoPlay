create or replace function public.claim_voice_room_reward(p_room_id uuid)
returns table(claimed boolean, coins integer, total_coins integer)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_coins integer := 5;
  v_total integer := 0;
  v_joined_at timestamptz;
  v_uid uuid := auth.uid();
  v_presence_key text := 'presence_' || pg_catalog.to_char(current_date,'YYYYMMDD');
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode='42501';
  end if;

  select rm.joined_at into v_joined_at
  from public.room_members rm
  where rm.room_id = p_room_id and rm.user_id = v_uid;

  if v_joined_at is null then
    raise exception 'room_membership_required' using errcode='42501';
  end if;

  if pg_catalog.now() < v_joined_at + interval '5 minutes' then
    raise exception 'voice_reward_not_ready' using errcode='42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zunoplay:room-daily-reward:' || v_uid::text || ':' || current_date::text, 0)
  );

  if exists (
    select 1 from public.room_voice_reward_claims v
    where v.user_id = v_uid and v.reward_date = current_date
  ) or exists (
    select 1 from public.room_reward_claims r
    where r.user_id = v_uid and r.reward_key = v_presence_key
  ) then
    select coalesce(p.coins, 0) into v_total from public.profiles p where p.id = v_uid;
    return query select false, v_coins, coalesce(v_total, 0);
    return;
  end if;

  insert into public.room_voice_reward_claims(room_id,user_id,reward_date,coins)
  values(p_room_id,v_uid,current_date,v_coins);

  update public.profiles p
  set coins = coalesce(p.coins,0) + v_coins
  where p.id = v_uid
  returning p.coins into v_total;

  return query select true, v_coins, coalesce(v_total,0);
end;
$function$;

create or replace function public.claim_room_presence_reward(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_joined timestamptz;
  v_reward_key text := 'presence_' || pg_catalog.to_char(current_date,'YYYYMMDD');
  v_coins integer := 5;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode='42501';
  end if;

  select rm.joined_at into v_joined
  from public.room_members rm
  where rm.room_id = p_room_id and rm.user_id = v_uid;

  if v_joined is null then
    raise exception 'not_in_room';
  end if;

  if pg_catalog.now() < v_joined + interval '5 minutes' then
    raise exception 'reward_not_ready';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zunoplay:room-daily-reward:' || v_uid::text || ':' || current_date::text, 0)
  );

  if exists (
    select 1 from public.room_reward_claims r
    where r.user_id = v_uid and r.reward_key = v_reward_key
  ) or exists (
    select 1 from public.room_voice_reward_claims v
    where v.user_id = v_uid and v.reward_date = current_date
  ) then
    raise exception 'reward_already_claimed';
  end if;

  insert into public.room_reward_claims(room_id,user_id,reward_key,coins)
  values(p_room_id,v_uid,v_reward_key,v_coins);

  update public.profiles p
  set coins = coalesce(p.coins,0) + v_coins
  where p.id = v_uid;

  return v_coins;
end;
$function$;

create or replace function public.zuno_group_remove_member(p_conversation_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_me_role text;
  v_target_role text;
begin
  if v_me is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not exists(
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.type = 'group'
  ) then
    raise exception 'group_required' using errcode='22023';
  end if;

  select cm.role into v_me_role
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id = v_me;

  select cm.role into v_target_role
  from public.conversation_members cm
  where cm.conversation_id = p_conversation_id and cm.user_id = p_user_id;

  if p_user_id = v_me then
    if v_target_role = 'owner' then
      raise exception 'owner_cannot_leave_without_transfer' using errcode='42501';
    end if;
  else
    if v_me_role not in ('owner','admin') then
      raise exception 'group_admin_required' using errcode='42501';
    end if;
    if v_target_role = 'owner' then
      raise exception 'owner_cannot_be_removed' using errcode='42501';
    end if;
    if v_me_role = 'admin' and v_target_role = 'admin' then
      raise exception 'owner_required_for_admin_removal' using errcode='42501';
    end if;
  end if;

  delete from public.conversation_members
  where conversation_id = p_conversation_id and user_id = p_user_id;

  insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
  values(p_conversation_id,v_me,null,'system',null,pg_catalog.jsonb_build_object('event','member_removed','user_id',p_user_id));
end;
$function$;
