create or replace function public.touch_room_session(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_touched boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.room_members
  set last_seen_at = pg_catalog.now()
  where room_id = p_room_id
    and user_id = auth.uid();

  v_touched := found;
  return v_touched;
end;
$$;

revoke all on function public.touch_room_session(uuid) from public, anon;
grant execute on function public.touch_room_session(uuid) to authenticated;

revoke update(level) on public.profiles from authenticated;

create or replace function public.submit_desafio_result(
  p_level integer,
  p_correct integer,
  p_score integer,
  p_questions integer default 10
)
returns table(unlocked_level integer, recorded boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_level integer;
  v_final integer;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_level < 1 or p_level > 10 or p_questions <> 10 or p_correct < 0 or p_correct > p_questions or p_score <> p_correct * 100 then
    raise exception 'invalid_game_result' using errcode = '22023';
  end if;

  select greatest(1, least(10, coalesce(level,1)))
    into v_level
  from public.profiles
  where id = v_user
  for update;

  if v_level is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if p_level > v_level then
    raise exception 'level_locked' using errcode = '42501';
  end if;

  insert into public.game_scores(user_id, game, score, questions, correct_answers)
  values (v_user, 'Desafio Zuno · Nível ' || p_level::text, p_score, p_questions, p_correct);

  v_final := v_level;
  if p_correct >= 8 and p_level = v_level and v_level < 10 then
    v_final := v_level + 1;
    update public.profiles
    set level = v_final
    where id = v_user;
  end if;

  return query select v_final, true;
end;
$$;

revoke all on function public.submit_desafio_result(integer,integer,integer,integer) from public, anon;
grant execute on function public.submit_desafio_result(integer,integer,integer,integer) to authenticated;
