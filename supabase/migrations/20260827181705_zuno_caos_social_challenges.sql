alter table public.game_challenges drop constraint if exists game_challenges_game_id_check;
alter table public.game_challenges add constraint game_challenges_game_id_check check (game_id = any (array['desafio'::text,'reflexo'::text,'precisao'::text,'arena'::text,'zuno_caos'::text]));

create or replace function public.send_game_challenge(p_friend_id uuid, p_game_id text, p_target_score integer default 0, p_message text default null::text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare v_user uuid:=auth.uid(); v_id uuid; v_max integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_friend_id is null or p_friend_id=v_user then raise exception 'invalid_friend' using errcode='22023'; end if;
  v_max:=case p_game_id when 'desafio' then 1000 when 'reflexo' then 1000 when 'precisao' then 1500 when 'arena' then 2000 when 'zuno_caos' then 3000 else null end;
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
$function$;

create or replace function public.complete_game_challenge(p_challenge_id uuid, p_score integer)
returns table(challenge_id uuid, beaten boolean, status text)
language plpgsql
security definer
set search_path to ''
as $function$
declare v_user uuid:=auth.uid(); v public.game_challenges%rowtype; v_max integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v from public.game_challenges where id=p_challenge_id and challenged_id=v_user for update;
  if not found then raise exception 'challenge_not_found' using errcode='P0002'; end if;
  v_max:=case v.game_id when 'desafio' then 1000 when 'reflexo' then 1000 when 'precisao' then 1500 when 'arena' then 2000 when 'zuno_caos' then 3000 else 0 end;
  if p_score<0 or p_score>v_max then raise exception 'invalid_score' using errcode='22023'; end if;
  if v.status not in ('accepted','pending') then return query select v.id,coalesce(v.result_score,0)>=v.target_score,v.status; return; end if;
  update public.game_challenges set status='completed',result_score=p_score,responded_at=coalesce(responded_at,now()),completed_at=now() where id=v.id returning * into v;
  return query select v.id,p_score>=v.target_score,v.status;
end;
$function$;

revoke all on function public.send_game_challenge(uuid,text,integer,text) from public,anon;
revoke all on function public.complete_game_challenge(uuid,integer) from public,anon;
grant execute on function public.send_game_challenge(uuid,text,integer,text) to authenticated;
grant execute on function public.complete_game_challenge(uuid,integer) to authenticated;
