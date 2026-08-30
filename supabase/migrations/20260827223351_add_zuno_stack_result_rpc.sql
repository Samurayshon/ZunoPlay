create or replace function public.submit_zuno_stack_result(
  p_score integer,
  p_matches integer,
  p_tiles_cleared integer,
  p_won boolean
)
returns table(recorded boolean, game_xp integer, game_level integer, new_achievements text[])
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := auth.uid();
  v_award integer;
  v_progress record;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if p_score < 0 or p_score > 15000
     or p_matches < 0 or p_matches > 30
     or p_tiles_cleared < 0 or p_tiles_cleared > 54
     or p_won is null then
    raise exception 'invalid_game_result' using errcode='22023';
  end if;

  if p_won and p_tiles_cleared < 9 then
    raise exception 'invalid_game_result' using errcode='22023';
  end if;

  v_award := 45 + (p_matches * 9) + (p_tiles_cleared * 2) + (p_score / 90)
    + case when p_won then 55 else 0 end;
  v_award := least(340, greatest(25, v_award));

  insert into public.game_scores(user_id, game, score, questions, correct_answers)
  values(v_user, 'Zuno Stack', p_score, 54, p_tiles_cleared);

  select * into v_progress
  from public.zuno_award_game_progress(v_user, p_tiles_cleared, p_score, p_won, false, v_award);

  return query
  select true, v_progress.xp, v_progress.game_level, v_progress.new_achievements;
end;
$$;

revoke all on function public.submit_zuno_stack_result(integer,integer,integer,boolean) from public;
revoke all on function public.submit_zuno_stack_result(integer,integer,integer,boolean) from anon;
grant execute on function public.submit_zuno_stack_result(integer,integer,integer,boolean) to authenticated;
