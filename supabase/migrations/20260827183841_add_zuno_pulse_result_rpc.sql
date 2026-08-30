create or replace function public.submit_zuno_pulse_result(
  p_score integer,
  p_aura integer,
  p_completed integer,
  p_placement integer
)
returns table(recorded boolean, game_xp integer, game_level integer, new_achievements text[])
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_win boolean;
  v_award integer;
  v_progress record;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_score < 0 or p_score > 12000
     or p_aura < 0 or p_aura > 100
     or p_completed < 0 or p_completed > 6
     or p_placement < 1 or p_placement > 8 then
    raise exception 'invalid_game_result' using errcode='22023';
  end if;

  v_win := p_placement = 1;
  v_award := 60 + (p_completed * 15) + (p_score / 80) + (p_aura / 4)
    + case when p_placement = 1 then 60 when p_placement <= 3 then 30 else 0 end;
  v_award := least(350, greatest(30, v_award));

  insert into public.game_scores(user_id, game, score, questions, correct_answers)
  values(v_user, 'Zuno Pulse', p_score, 6, p_completed);

  select * into v_progress
  from public.zuno_award_game_progress(v_user, p_completed, p_score, v_win, false, v_award);

  return query
  select true, v_progress.xp, v_progress.game_level, v_progress.new_achievements;
end;
$function$;

revoke all on function public.submit_zuno_pulse_result(integer, integer, integer, integer) from public;
revoke all on function public.submit_zuno_pulse_result(integer, integer, integer, integer) from anon;
grant execute on function public.submit_zuno_pulse_result(integer, integer, integer, integer) to authenticated;
