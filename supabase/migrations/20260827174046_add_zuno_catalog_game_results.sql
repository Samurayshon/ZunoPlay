create or replace function public.submit_zuno_catalog_game_result(p_game text,p_score integer,p_correct integer)
returns table(recorded boolean,game_xp integer,game_level integer,new_achievements text[])
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid(); v_name text; v_win boolean; v_award integer; v_progress record;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 p_game:=lower(btrim(p_game));
 if p_correct<0 or p_correct>10 or p_score<0 then raise exception 'invalid_game_result' using errcode='22023'; end if;
 case p_game
  when 'reflexo' then
   if p_score>1000 then raise exception 'invalid_game_result' using errcode='22023'; end if;
   v_name:='Reflexo Zuno'; v_win:=p_correct>=7; v_award:=35+(p_correct*7)+(p_score/25);
  when 'precisao' then
   if p_score>1500 then raise exception 'invalid_game_result' using errcode='22023'; end if;
   v_name:='Precisão Zuno'; v_win:=p_correct>=7; v_award:=40+(p_correct*7)+(p_score/35);
  when 'arena' then
   if p_score>2000 then raise exception 'invalid_game_result' using errcode='22023'; end if;
   v_name:='Arena Zuno'; v_win:=p_correct>=6; v_award:=45+(p_correct*8)+(p_score/40);
  else raise exception 'unknown_game' using errcode='22023';
 end case;
 v_award:=least(300,greatest(20,v_award));
 insert into public.game_scores(user_id,game,score,questions,correct_answers) values(v_user,v_name,p_score,10,p_correct);
 select * into v_progress from public.zuno_award_game_progress(v_user,p_correct,p_score,v_win,false,v_award);
 return query select true,v_progress.xp,v_progress.game_level,v_progress.new_achievements;
end;$$;
revoke all on function public.submit_zuno_catalog_game_result(text,integer,integer) from public;
grant execute on function public.submit_zuno_catalog_game_result(text,integer,integer) to authenticated;
