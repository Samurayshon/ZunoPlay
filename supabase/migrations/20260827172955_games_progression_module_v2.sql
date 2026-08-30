create table if not exists public.game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  game_level integer not null default 1 check (game_level between 1 and 100),
  total_games integer not null default 0 check (total_games >= 0),
  total_wins integer not null default 0 check (total_wins >= 0),
  total_correct integer not null default 0 check (total_correct >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  solo_games integer not null default 0 check (solo_games >= 0),
  multiplayer_games integer not null default 0 check (multiplayer_games >= 0),
  multiplayer_wins integer not null default 0 check (multiplayer_wins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.game_match_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  match_id text not null,
  score integer not null check (score between 0 and 2000),
  correct_answers integer not null check (correct_answers between 0 and 10),
  placement integer not null check (placement between 1 and 8),
  player_count integer not null check (player_count between 2 and 8),
  created_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.game_progress enable row level security;
alter table public.game_achievements enable row level security;
alter table public.game_match_results enable row level security;

drop policy if exists game_progress_select_own on public.game_progress;
create policy game_progress_select_own on public.game_progress for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists game_achievements_select_own on public.game_achievements;
create policy game_achievements_select_own on public.game_achievements for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists game_match_results_select_own on public.game_match_results;
create policy game_match_results_select_own on public.game_match_results for select to authenticated using (user_id=(select auth.uid()));

revoke insert,update,delete on public.game_progress from authenticated;
revoke insert,update,delete on public.game_achievements from authenticated;
revoke insert,update,delete on public.game_match_results from authenticated;
grant select on public.game_progress,public.game_achievements,public.game_match_results to authenticated;

create or replace function public.zuno_game_level_for_xp(p_xp integer)
returns integer language sql immutable set search_path='' as $$
select least(100,greatest(1,floor(sqrt(greatest(p_xp,0)::numeric/250))::integer+1));
$$;
revoke all on function public.zuno_game_level_for_xp(integer) from public;

create or replace function public.zuno_award_game_progress(p_user uuid,p_correct integer,p_score integer,p_win boolean,p_multiplayer boolean,p_xp_award integer)
returns table(xp integer,game_level integer,new_achievements text[])
language plpgsql security definer set search_path='' as $$
declare
 v_xp integer; v_level integer; v_games integer; v_wins integer; v_correct integer; v_best integer; v_multi integer; v_multi_wins integer;
 v_new text[]:=array[]::text[]; v_ids text[]; v_id text; v_inserted integer;
begin
 if p_user is null or p_correct<0 or p_correct>10 or p_score<0 or p_xp_award<0 or p_xp_award>1000 then raise exception 'invalid_progress_award' using errcode='22023'; end if;
 insert into public.game_progress(user_id) values(p_user) on conflict(user_id) do nothing;
 update public.game_progress set
  xp=game_progress.xp+p_xp_award,
  total_games=game_progress.total_games+1,
  total_wins=game_progress.total_wins+case when p_win then 1 else 0 end,
  total_correct=game_progress.total_correct+p_correct,
  best_score=greatest(game_progress.best_score,p_score),
  solo_games=game_progress.solo_games+case when p_multiplayer then 0 else 1 end,
  multiplayer_games=game_progress.multiplayer_games+case when p_multiplayer then 1 else 0 end,
  multiplayer_wins=game_progress.multiplayer_wins+case when p_multiplayer and p_win then 1 else 0 end,
  updated_at=now()
 where user_id=p_user
 returning game_progress.xp,game_progress.total_games,game_progress.total_wins,game_progress.total_correct,game_progress.best_score,game_progress.multiplayer_games,game_progress.multiplayer_wins
 into v_xp,v_games,v_wins,v_correct,v_best,v_multi,v_multi_wins;
 v_level:=public.zuno_game_level_for_xp(v_xp);
 update public.game_progress set game_level=v_level where user_id=p_user;
 v_ids:=array[
  case when v_games>=1 then 'first_game' end,
  case when v_wins>=1 then 'first_win' end,
  case when v_correct>=100 then 'knowledge_100' end,
  case when v_games>=25 then 'veteran_25' end,
  case when v_best>=1000 then 'perfect_score' end,
  case when v_multi>=1 then 'multiplayer_debut' end,
  case when v_multi_wins>=1 then 'multiplayer_champion' end,
  case when v_level>=5 then 'game_level_5' end,
  case when v_level>=10 then 'game_level_10' end
 ];
 foreach v_id in array v_ids loop
  if v_id is not null then
   insert into public.game_achievements(user_id,achievement_id) values(p_user,v_id) on conflict do nothing;
   get diagnostics v_inserted=row_count;
   if v_inserted>0 then v_new:=array_append(v_new,v_id); end if;
  end if;
 end loop;
 return query select v_xp,v_level,v_new;
end;$$;
revoke all on function public.zuno_award_game_progress(uuid,integer,integer,boolean,boolean,integer) from public;

drop function if exists public.submit_desafio_result(integer,integer,integer,integer);
create function public.submit_desafio_result(p_level integer,p_correct integer,p_score integer,p_questions integer default 10)
returns table(unlocked_level integer,recorded boolean,game_xp integer,game_level integer,new_achievements text[])
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_level integer; v_progress record; v_xp integer;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_level<1 or p_level>10 or p_questions<>10 or p_correct<0 or p_correct>10 or p_score<>p_correct*100 then raise exception 'invalid_game_result' using errcode='22023'; end if;
 select greatest(1,least(10,coalesce(level,1))) into v_level from public.profiles where id=v_user;
 if v_level is null then raise exception 'profile_not_found' using errcode='P0002'; end if;
 if p_level>v_level then raise exception 'level_locked' using errcode='42501'; end if;
 insert into public.game_scores(user_id,game,score,questions,correct_answers) values(v_user,'Desafio Zuno · Nível '||p_level::text,p_score,10,p_correct);
 if p_correct>=8 and p_level=v_level and v_level<10 then update public.profiles set level=v_level+1 where id=v_user; v_level:=v_level+1; end if;
 v_xp:=40+(p_correct*12)+case when p_correct=10 then 50 else 0 end+(p_level*4);
 select * into v_progress from public.zuno_award_game_progress(v_user,p_correct,p_score,p_correct>=8,false,v_xp);
 return query select v_level,true,v_progress.xp,v_progress.game_level,v_progress.new_achievements;
end;$$;
grant execute on function public.submit_desafio_result(integer,integer,integer,integer) to authenticated;

create or replace function public.submit_partida_zuno_result(p_room_id uuid,p_match_id text,p_score integer,p_correct integer,p_placement integer,p_player_count integer)
returns table(recorded boolean,game_xp integer,game_level integer,new_achievements text[])
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_progress record; v_xp integer; v_rows integer;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_match_id is null or length(p_match_id)<8 or p_score<0 or p_score>2000 or p_correct<0 or p_correct>10 or p_player_count<2 or p_player_count>8 or p_placement<1 or p_placement>p_player_count then raise exception 'invalid_match_result' using errcode='22023'; end if;
 if not exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=v_user) then raise exception 'room_membership_required' using errcode='42501'; end if;
 insert into public.game_match_results(user_id,room_id,match_id,score,correct_answers,placement,player_count)
 values(v_user,p_room_id,p_match_id,p_score,p_correct,p_placement,p_player_count) on conflict(user_id,match_id) do nothing;
 get diagnostics v_rows=row_count;
 if v_rows=0 then
  select gp.xp,gp.game_level,array[]::text[] as new_achievements into v_progress from public.game_progress gp where gp.user_id=v_user;
  return query select false,coalesce(v_progress.xp,0),coalesce(v_progress.game_level,1),coalesce(v_progress.new_achievements,array[]::text[]); return;
 end if;
 insert into public.game_scores(user_id,game,score,questions,correct_answers) values(v_user,'Partida Zuno · Multiplayer',p_score,10,p_correct);
 v_xp:=55+p_correct*10+case when p_placement=1 then 80 when p_placement=2 then 40 when p_placement=3 then 20 else 0 end;
 select * into v_progress from public.zuno_award_game_progress(v_user,p_correct,p_score,p_placement=1,true,v_xp);
 return query select true,v_progress.xp,v_progress.game_level,v_progress.new_achievements;
end;$$;
grant execute on function public.submit_partida_zuno_result(uuid,text,integer,integer,integer,integer) to authenticated;

