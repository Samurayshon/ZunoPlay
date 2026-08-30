with agg as (
  select user_id,
         count(*)::integer as total_games,
         count(*) filter (where correct_answers >= 8)::integer as total_wins,
         coalesce(sum(correct_answers),0)::integer as total_correct,
         coalesce(max(score),0)::integer as best_score,
         count(*) filter (where game ilike '%multiplayer%')::integer as multiplayer_games,
         count(*) filter (where game not ilike '%multiplayer%')::integer as solo_games,
         coalesce(sum(40 + greatest(0,least(10,correct_answers))*10),0)::integer as xp
  from public.game_scores
  group by user_id
)
insert into public.game_progress(user_id,xp,game_level,total_games,total_wins,total_correct,best_score,solo_games,multiplayer_games,multiplayer_wins,updated_at)
select a.user_id,a.xp,public.zuno_game_level_for_xp(a.xp),a.total_games,a.total_wins,a.total_correct,a.best_score,a.solo_games,a.multiplayer_games,0,now()
from agg a
where not exists(select 1 from public.game_progress gp where gp.user_id=a.user_id);

insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'first_game' from public.game_progress gp where gp.total_games>=1 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'first_win' from public.game_progress gp where gp.total_wins>=1 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'knowledge_100' from public.game_progress gp where gp.total_correct>=100 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'veteran_25' from public.game_progress gp where gp.total_games>=25 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'perfect_score' from public.game_progress gp where gp.best_score>=1000 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'multiplayer_debut' from public.game_progress gp where gp.multiplayer_games>=1 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'game_level_5' from public.game_progress gp where gp.game_level>=5 on conflict do nothing;
insert into public.game_achievements(user_id,achievement_id)
select gp.user_id,'game_level_10' from public.game_progress gp where gp.game_level>=10 on conflict do nothing;
