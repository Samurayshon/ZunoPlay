create table if not exists public.game_challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenged_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null check (game_id in ('desafio','reflexo','precisao','arena')),
  target_score integer not null default 0 check (target_score >= 0 and target_score <= 10000),
  result_score integer,
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed','expired')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  completed_at timestamptz,
  constraint game_challenges_distinct_users check (challenger_id <> challenged_id)
);

create index if not exists game_challenges_challenged_idx on public.game_challenges(challenged_id, created_at desc);
create index if not exists game_challenges_challenger_idx on public.game_challenges(challenger_id, created_at desc);
create unique index if not exists game_challenges_one_pending_pair_game on public.game_challenges(challenger_id, challenged_id, game_id) where status='pending';

alter table public.game_challenges enable row level security;

drop policy if exists game_challenges_select_participants on public.game_challenges;
create policy game_challenges_select_participants on public.game_challenges for select to authenticated using (challenger_id = auth.uid() or challenged_id = auth.uid());

create or replace function public.zuno_are_friends(p_a uuid,p_b uuid)
returns boolean
language sql
security definer
set search_path=''
stable
as $$
  select exists(
    select 1 from public.friendships f
    where (f.user_id=p_a and f.friend_id=p_b) or (f.user_id=p_b and f.friend_id=p_a)
  );
$$;
revoke all on function public.zuno_are_friends(uuid,uuid) from public;
grant execute on function public.zuno_are_friends(uuid,uuid) to authenticated;

create or replace function public.send_game_challenge(p_friend_id uuid,p_game_id text,p_target_score integer default 0,p_message text default null)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_friend_id is null or p_friend_id=v_user then raise exception 'invalid_friend' using errcode='22023'; end if;
  if p_game_id not in ('desafio','reflexo','precisao','arena') then raise exception 'invalid_game' using errcode='22023'; end if;
  if p_target_score<0 or p_target_score>10000 then raise exception 'invalid_target' using errcode='22023'; end if;
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

create or replace function public.respond_game_challenge(p_challenge_id uuid,p_accept boolean)
returns table(challenge_id uuid,game_id text,target_score integer,status text)
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid:=auth.uid(); v public.game_challenges%rowtype;
begin
  if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v from public.game_challenges where id=p_challenge_id and challenged_id=v_user for update;
  if not found then raise exception 'challenge_not_found' using errcode='P0002'; end if;
  if v.status <> 'pending' then return query select v.id,v.game_id,v.target_score,v.status; return; end if;
  update public.game_challenges set status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=v.id
  returning * into v;
  return query select v.id,v.game_id,v.target_score,v.status;
end;
$$;
revoke all on function public.respond_game_challenge(uuid,boolean) from public;
grant execute on function public.respond_game_challenge(uuid,boolean) to authenticated;

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
  v_max:=case v.game_id when 'desafio' then 1000 when 'reflexo' then 1000 when 'precisao' then 1000 when 'arena' then 1000 else 0 end;
  if p_score<0 or p_score>v_max then raise exception 'invalid_score' using errcode='22023'; end if;
  if v.status not in ('accepted','pending') then return query select v.id,coalesce(v.result_score,0)>=v.target_score,v.status; return; end if;
  update public.game_challenges set status='completed',result_score=p_score,responded_at=coalesce(responded_at,now()),completed_at=now() where id=v.id returning * into v;
  return query select v.id,p_score>=v.target_score,v.status;
end;
$$;
revoke all on function public.complete_game_challenge(uuid,integer) from public;
grant execute on function public.complete_game_challenge(uuid,integer) to authenticated;

create or replace function public.get_game_leaderboard(p_limit integer default 25)
returns table(rank bigint,user_id uuid,username text,avatar_url text,game_level integer,xp integer,total_games integer,total_wins integer,best_score integer)
language sql
security definer
set search_path=''
stable
as $$
  select row_number() over(order by gp.xp desc,gp.total_wins desc,gp.best_score desc,gp.updated_at asc) as rank,
         p.id,p.username,p.avatar_url,gp.game_level,gp.xp,gp.total_games,gp.total_wins,gp.best_score
  from public.game_progress gp join public.profiles p on p.id=gp.user_id
  order by gp.xp desc,gp.total_wins desc,gp.best_score desc,gp.updated_at asc
  limit greatest(1,least(coalesce(p_limit,25),50));
$$;
revoke all on function public.get_game_leaderboard(integer) from public;
grant execute on function public.get_game_leaderboard(integer) to authenticated;

create or replace function public.get_friend_game_leaderboard(p_limit integer default 25)
returns table(rank bigint,user_id uuid,username text,avatar_url text,game_level integer,xp integer,total_games integer,total_wins integer,best_score integer)
language sql
security definer
set search_path=''
stable
as $$
  with me as (select auth.uid() uid), ids as (
    select uid as id from me
    union
    select case when f.user_id=me.uid then f.friend_id else f.user_id end from public.friendships f,me where f.user_id=me.uid or f.friend_id=me.uid
  ), rows as (
    select p.id,p.username,p.avatar_url,gp.game_level,gp.xp,gp.total_games,gp.total_wins,gp.best_score,gp.updated_at
    from ids join public.profiles p on p.id=ids.id join public.game_progress gp on gp.user_id=p.id
  )
  select row_number() over(order by xp desc,total_wins desc,best_score desc,updated_at asc),id,username,avatar_url,game_level,xp,total_games,total_wins,best_score
  from rows order by xp desc,total_wins desc,best_score desc,updated_at asc
  limit greatest(1,least(coalesce(p_limit,25),50));
$$;
revoke all on function public.get_friend_game_leaderboard(integer) from public;
grant execute on function public.get_friend_game_leaderboard(integer) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.game_challenges;
exception when duplicate_object then null; end $$;
