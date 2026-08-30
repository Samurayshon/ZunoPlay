create or replace function public.claim_voice_room_reward(p_room_id uuid)
returns table(claimed boolean, coins integer, total_coins integer)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_coins integer := 5;
  v_total integer := 0;
  v_joined_at timestamptz;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode='42501';
  end if;

  select joined_at into v_joined_at
  from public.room_members
  where room_id = p_room_id and user_id = v_uid;

  if v_joined_at is null then
    raise exception 'room_membership_required' using errcode='42501';
  end if;

  if now() < v_joined_at + interval '5 minutes' then
    raise exception 'voice_reward_not_ready' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('zunoplay:voice-reward:' || v_uid::text || ':' || current_date::text, 0));

  if exists (
    select 1
    from public.room_voice_reward_claims
    where user_id = v_uid and reward_date = current_date
  ) then
    select coalesce(p.coins, 0) into v_total from public.profiles p where p.id = v_uid;
    return query select false, v_coins, coalesce(v_total, 0);
    return;
  end if;

  insert into public.room_voice_reward_claims(room_id,user_id,reward_date,coins)
  values(p_room_id,v_uid,current_date,v_coins);

  update public.profiles
  set coins = coalesce(profiles.coins,0) + v_coins
  where id = v_uid
  returning profiles.coins into v_total;

  return query select true, v_coins, coalesce(v_total,0);
end;
$function$;

create or replace function public.claim_room_presence_reward(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_joined timestamptz;
  v_reward_key text;
  v_coins integer := 5;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode='42501';
  end if;

  select joined_at into v_joined
  from public.room_members
  where room_id = p_room_id and user_id = v_uid;

  if v_joined is null then
    raise exception 'not_in_room';
  end if;

  if now() < v_joined + interval '5 minutes' then
    raise exception 'reward_not_ready';
  end if;

  v_reward_key := 'presence_' || to_char(current_date,'YYYYMMDD');

  perform pg_advisory_xact_lock(hashtextextended('zunoplay:presence-reward:' || v_uid::text || ':' || v_reward_key, 0));

  if exists (
    select 1
    from public.room_reward_claims
    where user_id = v_uid and reward_key = v_reward_key
  ) then
    raise exception 'reward_already_claimed';
  end if;

  insert into public.room_reward_claims(room_id,user_id,reward_key,coins)
  values(p_room_id,v_uid,v_reward_key,v_coins);

  update public.profiles
  set coins = coalesce(coins,0) + v_coins
  where id = v_uid;

  return v_coins;
end;
$function$;

create or replace function public.submit_zuno_stack_result(p_score integer, p_matches integer, p_tiles_cleared integer, p_won boolean)
returns table(recorded boolean, game_xp integer, game_level integer, new_achievements text[])
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_award integer;
  v_progress record;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if p_score < 0 or p_score > 25000
     or p_matches < 0 or p_matches > 30
     or p_tiles_cleared < 0 or p_tiles_cleared > 90
     or p_won is null then
    raise exception 'invalid_game_result' using errcode='22023';
  end if;

  if p_matches * 3 > p_tiles_cleared then
    raise exception 'invalid_game_result_relation' using errcode='22023';
  end if;

  v_award := 45 + (p_matches * 9) + (p_tiles_cleared * 2) + (p_score / 90)
    + case when p_won then 55 else 0 end;
  v_award := least(420, greatest(25, v_award));

  insert into public.game_scores(user_id, game, score, questions, correct_answers)
  values(v_user, 'Zuno Stack', p_score, 90, p_tiles_cleared);

  -- total_correct belongs to the quiz-style progression model (0..10).
  -- Zuno Stack tracks its own clears/matches in game_scores, so it must not
  -- feed up to 90 cleared tiles into that field.
  select * into v_progress
  from public.zuno_award_game_progress(v_user, 0, p_score, p_won, false, v_award);

  return query
  select true, v_progress.xp, v_progress.game_level, v_progress.new_achievements;
end;
$function$;
