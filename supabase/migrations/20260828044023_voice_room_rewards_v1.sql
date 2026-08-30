create table if not exists public.room_voice_reward_claims (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_date date not null default current_date,
  coins integer not null default 5 check (coins > 0 and coins <= 100),
  created_at timestamptz not null default now(),
  unique(room_id,user_id,reward_date)
);
alter table public.room_voice_reward_claims enable row level security;
drop policy if exists room_voice_reward_claims_select_own on public.room_voice_reward_claims;
create policy room_voice_reward_claims_select_own on public.room_voice_reward_claims for select to authenticated using (user_id=auth.uid());
create or replace function public.claim_voice_room_reward(p_room_id uuid)
returns table(claimed boolean, coins integer, total_coins integer)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_claimed boolean := false; v_coins integer := 5; v_total integer;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode='42501'; end if;
  if not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'room_membership_required' using errcode='42501'; end if;
  insert into public.room_voice_reward_claims(room_id,user_id,coins)
  values(p_room_id,auth.uid(),v_coins)
  on conflict(room_id,user_id,reward_date) do nothing;
  get diagnostics v_claimed = row_count;
  if v_claimed then
    update public.profiles set coins=coalesce(profiles.coins,0)+v_coins where id=auth.uid() returning profiles.coins into v_total;
  else
    select coalesce(p.coins,0) into v_total from public.profiles p where p.id=auth.uid();
  end if;
  return query select v_claimed,v_coins,coalesce(v_total,0);
end;$$;
revoke all on function public.claim_voice_room_reward(uuid) from public,anon;
grant execute on function public.claim_voice_room_reward(uuid) to authenticated;
