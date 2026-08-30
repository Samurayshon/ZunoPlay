create or replace function public.send_game_challenge(p_friend_id uuid,p_game_id text,p_target_score integer default 0,p_message text default null)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_max integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_friend_id is null or p_friend_id=v_user then raise exception 'invalid_friend' using errcode='22023'; end if;
  v_max:=case p_game_id when 'desafio' then 1000 when 'reflexo' then 1000 when 'precisao' then 1500 when 'arena' then 2000 else null end;
  if v_max is null then raise exception 'invalid_game' using errcode='22023'; end if;
  if p_target_score<0 or p_target_score>v_max then raise exception 'invalid_target' using errcode='22023'; end if;
  if not public.zuno_are_friends(v_user,p_friend_id) then raise exception 'friendship_required' using errcode='42501'; end if;
  insert into public.game_challenges(challenger_id,challenged_id,game_id,target_score,message)
  values(v_user,p_friend_id,p_game_id,p_target_score,left(nullif(btrim(p_message),''),160))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.game_challenges where challenger_id=v_user and challenged_id=p_friend_id and game_id=p_game_id and status='pending' order by created_at desc limit 1;
  return v_id;
end;
$$;
revoke all on function public.send_game_challenge(uuid,text,integer,text) from public;
grant execute on function public.send_game_challenge(uuid,text,integer,text) to authenticated;
