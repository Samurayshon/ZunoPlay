create or replace function public.complete_game_challenge(p_challenge_id uuid,p_score integer)
returns table(challenge_id uuid,beaten boolean,status text)
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v public.game_challenges%rowtype; v_max integer;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v from public.game_challenges where id=p_challenge_id and challenged_id=v_user for update;
  if not found then raise exception 'challenge_not_found' using errcode='P0002'; end if;
  v_max:=case v.game_id when 'desafio' then 1000 when 'reflexo' then 1000 when 'precisao' then 1500 when 'arena' then 2000 else 0 end;
  if p_score<0 or p_score>v_max then raise exception 'invalid_score' using errcode='22023'; end if;
  if v.status not in ('accepted','pending') then return query select v.id,coalesce(v.result_score,0)>=v.target_score,v.status; return; end if;
  update public.game_challenges set status='completed',result_score=p_score,responded_at=coalesce(responded_at,now()),completed_at=now() where id=v.id returning * into v;
  return query select v.id,p_score>=v.target_score,v.status;
end;
$$;
revoke all on function public.complete_game_challenge(uuid,integer) from public;
grant execute on function public.complete_game_challenge(uuid,integer) to authenticated;
