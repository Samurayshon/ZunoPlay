begin;

alter table public.room_messages add column if not exists client_id uuid;
create unique index if not exists room_messages_client_id_uq on public.room_messages(room_id,user_id,client_id) where client_id is not null;

create table if not exists public.room_bans(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 banned_by uuid not null references auth.users(id) on delete cascade,
 reason text,
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 unique(room_id,user_id)
);
alter table public.room_bans enable row level security;
drop policy if exists room_bans_read on public.room_bans;
create policy room_bans_read on public.room_bans for select using (user_id=auth.uid() or public.is_room_moderator(room_id,auth.uid()));

create table if not exists public.room_reports(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 target_user_id uuid references auth.users(id) on delete set null,
 reason text not null,
 details text,
 created_at timestamptz not null default now()
);
alter table public.room_reports enable row level security;
drop policy if exists room_reports_insert on public.room_reports;
create policy room_reports_insert on public.room_reports for insert with check (reporter_id=auth.uid() and exists(select 1 from public.room_members rm where rm.room_id=room_reports.room_id and rm.user_id=auth.uid()));
drop policy if exists room_reports_read_own on public.room_reports;
create policy room_reports_read_own on public.room_reports for select using (reporter_id=auth.uid());

create table if not exists public.room_reward_claims(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reward_key text not null,
 coins integer not null default 0 check(coins>=0),
 claimed_at timestamptz not null default now(),
 unique(room_id,user_id,reward_key)
);
alter table public.room_reward_claims enable row level security;
drop policy if exists room_reward_claims_read_own on public.room_reward_claims;
create policy room_reward_claims_read_own on public.room_reward_claims for select using(user_id=auth.uid());

create table if not exists public.room_game_sessions(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 game_key text not null,
 created_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','ended','cancelled')),
 created_at timestamptz not null default now(),
 ended_at timestamptz
);
alter table public.room_game_sessions enable row level security;
drop policy if exists room_game_sessions_read_members on public.room_game_sessions;
create policy room_game_sessions_read_members on public.room_game_sessions for select using(exists(select 1 from public.room_members rm where rm.room_id=room_game_sessions.room_id and rm.user_id=auth.uid()));

create or replace function public.move_room_seat(p_room_id uuid,p_seat_index smallint)
returns public.room_members
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v public.room_members; v_room public.rooms;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id and status='active'; if not found then raise exception 'room_not_available'; end if;
 if p_seat_index<0 or p_seat_index>=v_room.max_speakers then raise exception 'invalid_seat'; end if;
 if exists(select 1 from public.room_members where room_id=p_room_id and seat_index=p_seat_index and user_id<>auth.uid()) then raise exception 'seat_taken'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=p_seat_index, role=case when role in ('owner','admin') then role else 'speaker' end, updated_at=now() where room_id=p_room_id and user_id=auth.uid() returning * into v;
 perform set_config('zuno.room_internal','0',true);
 if not found then raise exception 'not_in_room'; end if;
 return v;
end $$;

grant execute on function public.move_room_seat(uuid,smallint) to authenticated;

create or replace function public.ban_room_member(p_room_id uuid,p_user_id uuid,p_reason text default null,p_hours integer default null)
returns boolean
language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
 if p_user_id=auth.uid() then raise exception 'cannot_ban_self'; end if;
 insert into public.room_bans(room_id,user_id,banned_by,reason,expires_at)
 values(p_room_id,p_user_id,auth.uid(),nullif(trim(p_reason),''),case when p_hours is null then null else now()+make_interval(hours=>greatest(1,p_hours)) end)
 on conflict(room_id,user_id) do update set banned_by=excluded.banned_by,reason=excluded.reason,created_at=now(),expires_at=excluded.expires_at;
 delete from public.room_members where room_id=p_room_id and user_id=p_user_id;
 return true;
end $$;
grant execute on function public.ban_room_member(uuid,uuid,text,integer) to authenticated;

create or replace function public.unban_room_member(p_room_id uuid,p_user_id uuid)
returns boolean
language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
 delete from public.room_bans where room_id=p_room_id and user_id=p_user_id;
 return true;
end $$;
grant execute on function public.unban_room_member(uuid,uuid) to authenticated;

create or replace function public.enforce_room_ban_before_insert()
returns trigger language plpgsql security definer set search_path='public','pg_temp' as $$
begin
 if exists(select 1 from public.room_bans b where b.room_id=new.room_id and b.user_id=new.user_id and (b.expires_at is null or b.expires_at>now())) then raise exception 'room_banned' using errcode='42501'; end if;
 delete from public.room_bans b where b.room_id=new.room_id and b.user_id=new.user_id and b.expires_at is not null and b.expires_at<=now();
 return new;
end $$;
drop trigger if exists trg_enforce_room_ban on public.room_members;
create trigger trg_enforce_room_ban before insert on public.room_members for each row execute function public.enforce_room_ban_before_insert();

create or replace function public.claim_room_presence_reward(p_room_id uuid)
returns integer
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v_joined timestamptz; v_reward_key text; v_coins integer:=5;
begin
 select joined_at into v_joined from public.room_members where room_id=p_room_id and user_id=auth.uid();
 if v_joined is null then raise exception 'not_in_room'; end if;
 if now() < v_joined + interval '5 minutes' then raise exception 'reward_not_ready'; end if;
 v_reward_key:='presence_'||to_char(current_date,'YYYYMMDD');
 insert into public.room_reward_claims(room_id,user_id,reward_key,coins) values(p_room_id,auth.uid(),v_reward_key,v_coins);
 update public.profiles set coins=coalesce(coins,0)+v_coins where id=auth.uid();
 return v_coins;
exception when unique_violation then raise exception 'reward_already_claimed';
end $$;
grant execute on function public.claim_room_presence_reward(uuid) to authenticated;

create or replace function public.start_room_minigame(p_room_id uuid,p_game_key text)
returns public.room_game_sessions
language plpgsql security definer set search_path='public','pg_temp' as $$
declare v public.room_game_sessions;
begin
 if not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'not_in_room'; end if;
 if p_game_key not in ('zuno_stack') then raise exception 'invalid_game'; end if;
 insert into public.room_game_sessions(room_id,game_key,created_by) values(p_room_id,p_game_key,auth.uid()) returning * into v;
 return v;
end $$;
grant execute on function public.start_room_minigame(uuid,text) to authenticated;

commit;
