-- ZunoPlay Voice Rooms v2 core

alter table public.rooms
  add column if not exists description text,
  add column if not exists category text not null default 'bate_papo',
  add column if not exists visibility text not null default 'public',
  add column if not exists status text not null default 'active',
  add column if not exists cover_url text,
  add column if not exists language_code text not null default 'pt-BR',
  add column if not exists country_code text not null default 'BR',
  add column if not exists max_speakers smallint not null default 8,
  add column if not exists max_audience integer not null default 100,
  add column if not exists mic_access text not null default 'open',
  add column if not exists is_discoverable boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz;

do $$ begin alter table public.rooms add constraint rooms_category_check check (category in ('bate_papo','musica','jogos','amigos','comunidade','evento','outro')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.rooms add constraint rooms_visibility_check check (visibility in ('public','friends','private')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.rooms add constraint rooms_status_check check (status in ('active','paused','ended')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.rooms add constraint rooms_mic_access_check check (mic_access in ('open','request','invite_only')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.rooms add constraint rooms_max_speakers_check check (max_speakers between 1 and 8); exception when duplicate_object then null; end $$;
do $$ begin alter table public.rooms add constraint rooms_max_audience_check check (max_audience between 8 and 500); exception when duplicate_object then null; end $$;

alter table public.room_members
  alter column seat_index drop not null,
  add column if not exists role text not null default 'audience',
  add column if not exists mic_state text not null default 'muted',
  add column if not exists hand_raised boolean not null default false,
  add column if not exists connection_state text not null default 'online',
  add column if not exists promoted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin alter table public.room_members add constraint room_members_role_check check (role in ('audience','speaker','admin','owner')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.room_members add constraint room_members_mic_state_check check (mic_state in ('muted','unmuted','blocked')); exception when duplicate_object then null; end $$;
do $$ begin alter table public.room_members add constraint room_members_connection_state_check check (connection_state in ('online','reconnecting','away')); exception when duplicate_object then null; end $$;

-- Protect membership integrity. Internal room RPCs mark their updates with a transaction-local flag.
create or replace function public.zunoplay_protect_room_member_updates()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean := false;
begin
  if current_setting('zuno.room_internal', true) = '1' then return new; end if;
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select exists(select 1 from public.rooms r where r.id=old.room_id and r.owner_id=v_uid) into v_is_owner;
  if v_is_owner and old.user_id<>v_uid then
    if new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id or new.joined_at is distinct from old.joined_at or new.last_seen_at is distinct from old.last_seen_at then
      raise exception 'owner_can_only_change_seat' using errcode='42501';
    end if;
    return new;
  end if;
  if old.user_id=v_uid then
    if new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id or new.joined_at is distinct from old.joined_at or new.seat_index is distinct from old.seat_index or new.role is distinct from old.role or new.mic_state is distinct from old.mic_state then
      raise exception 'member_must_use_room_rpc' using errcode='42501';
    end if;
    return new;
  end if;
  raise exception 'room_member_update_forbidden' using errcode='42501';
end;
$$;

-- Legacy seated members become speakers/owner.
select set_config('zuno.room_internal','1',true);
update public.room_members rm
set role=case when r.owner_id=rm.user_id then 'owner' else 'speaker' end
from public.rooms r
where r.id=rm.room_id and rm.role='audience' and rm.seat_index is not null;
select set_config('zuno.room_internal','0',true);

create unique index if not exists room_members_unique_seat on public.room_members(room_id,seat_index) where seat_index is not null;
create index if not exists room_members_room_role_idx on public.room_members(room_id,role);
create index if not exists room_members_room_last_seen_idx on public.room_members(room_id,last_seen_at desc);
create index if not exists rooms_discovery_idx on public.rooms(status,is_discoverable,category,created_at desc);

create table if not exists public.room_seat_requests (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','expired')),
 requested_seat smallint check(requested_seat between 0 and 7), created_at timestamptz not null default now(), resolved_at timestamptz,
 resolved_by uuid references auth.users(id) on delete set null
);
create unique index if not exists room_seat_requests_one_pending on public.room_seat_requests(room_id,user_id) where status='pending';

create table if not exists public.room_bans (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, banned_by uuid not null references auth.users(id) on delete cascade,
 reason text, expires_at timestamptz, created_at timestamptz not null default now(), unique(room_id,user_id)
);

create table if not exists public.room_moderation_actions (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade, target_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('promote_admin','demote_admin','invite_speaker','approve_speaker','remove_speaker','mute','unmute','kick','ban','unban','end_room')),
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists room_moderation_actions_room_idx on public.room_moderation_actions(room_id,created_at desc);

create table if not exists public.room_follows (
 room_id uuid not null references public.rooms(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(room_id,user_id)
);

create table if not exists public.room_reactions (
 id bigint generated by default as identity primary key, room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, reaction text not null check(char_length(reaction) between 1 and 16),
 created_at timestamptz not null default now()
);
create index if not exists room_reactions_room_idx on public.room_reactions(room_id,created_at desc);

alter table public.room_seat_requests enable row level security;
alter table public.room_bans enable row level security;
alter table public.room_moderation_actions enable row level security;
alter table public.room_follows enable row level security;
alter table public.room_reactions enable row level security;

create or replace function public.is_room_moderator(p_room_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=p_user_id)
 or exists(select 1 from public.room_members m where m.room_id=p_room_id and m.user_id=p_user_id and m.role in ('owner','admin'));
$$;

create or replace function public.join_room_session(p_room_id uuid) returns public.room_members language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.room_members; v_existing_room uuid; v_room public.rooms; v_count integer;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id;
 if not found or v_room.status<>'active' then raise exception 'room_not_available' using errcode='P0002'; end if;
 if exists(select 1 from public.room_bans b where b.room_id=p_room_id and b.user_id=auth.uid() and (b.expires_at is null or b.expires_at>now())) then raise exception 'room_banned' using errcode='42501'; end if;
 select room_id into v_existing_room from public.room_members where user_id=auth.uid() limit 1;
 if v_existing_room is not null then
   if v_existing_room=p_room_id then select * into v_member from public.room_members where user_id=auth.uid(); return v_member; end if;
   raise exception 'leave_current_room_first' using errcode='P0001';
 end if;
 select count(*) into v_count from public.room_members where room_id=p_room_id;
 if v_count>=v_room.max_audience then raise exception 'room_full' using errcode='P0001'; end if;
 insert into public.room_members(room_id,user_id,seat_index,role,mic_state)
 values(p_room_id,auth.uid(),null,case when v_room.owner_id=auth.uid() then 'owner' else 'audience' end,'muted') returning * into v_member;
 return v_member;
end; $$;

create or replace function public.take_room_seat(p_room_id uuid,p_seat_index smallint default null) returns public.room_members language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.room_members; v_room public.rooms; v_seat smallint;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id and status='active'; if not found then raise exception 'room_not_available'; end if;
 select * into v_member from public.room_members where room_id=p_room_id and user_id=auth.uid() for update; if not found then raise exception 'not_in_room'; end if;
 if v_member.seat_index is not null then return v_member; end if;
 if v_room.mic_access<>'open' and not public.is_room_moderator(p_room_id,auth.uid()) and not exists(select 1 from public.room_seat_requests q where q.room_id=p_room_id and q.user_id=auth.uid() and q.status='approved') then raise exception 'speaker_approval_required' using errcode='42501'; end if;
 if p_seat_index is null then select s into v_seat from generate_series(0,v_room.max_speakers-1) s where not exists(select 1 from public.room_members m where m.room_id=p_room_id and m.seat_index=s) order by s limit 1; else v_seat:=p_seat_index; end if;
 if v_seat is null or v_seat<0 or v_seat>=v_room.max_speakers then raise exception 'no_seat_available'; end if;
 if exists(select 1 from public.room_members where room_id=p_room_id and seat_index=v_seat) then raise exception 'seat_taken'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=v_seat,role=case when role in ('owner','admin') then role else 'speaker' end,mic_state='muted',promoted_at=now(),updated_at=now() where id=v_member.id returning * into v_member;
 perform set_config('zuno.room_internal','0',true);
 return v_member;
end; $$;

create or replace function public.request_room_seat(p_room_id uuid,p_requested_seat smallint default null) returns public.room_seat_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare v_req public.room_seat_requests; v_room public.rooms;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id and status='active'; if not found then raise exception 'room_not_available'; end if;
 if not exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid()) then raise exception 'not_in_room'; end if;
 if exists(select 1 from public.room_members where room_id=p_room_id and user_id=auth.uid() and seat_index is not null) then raise exception 'already_speaker'; end if;
 if p_requested_seat is not null and (p_requested_seat<0 or p_requested_seat>=v_room.max_speakers) then raise exception 'invalid_seat'; end if;
 if v_room.mic_access='open' then perform public.take_room_seat(p_room_id,p_requested_seat); return null; end if;
 insert into public.room_seat_requests(room_id,user_id,requested_seat) values(p_room_id,auth.uid(),p_requested_seat)
 on conflict (room_id,user_id) where status='pending' do update set requested_seat=excluded.requested_seat,created_at=now()
 returning * into v_req; return v_req;
end; $$;

create or replace function public.leave_room_seat(p_room_id uuid) returns public.room_members language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.room_members; begin
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=null,role=case when role in ('owner','admin') then role else 'audience' end,mic_state='muted',hand_raised=false,updated_at=now() where room_id=p_room_id and user_id=auth.uid() returning * into v;
 perform set_config('zuno.room_internal','0',true);
 if not found then raise exception 'not_in_room'; end if; return v;
end; $$;

create or replace function public.set_room_mic(p_room_id uuid,p_state text) returns public.room_members language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.room_members; begin
 if p_state not in ('muted','unmuted') then raise exception 'invalid_mic_state'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set mic_state=p_state,updated_at=now() where room_id=p_room_id and user_id=auth.uid() and seat_index is not null and mic_state<>'blocked' returning * into v;
 perform set_config('zuno.room_internal','0',true);
 if not found then raise exception 'speaker_required'; end if; return v;
end; $$;

create or replace function public.resolve_room_seat_request(p_request_id uuid,p_approve boolean,p_seat_index smallint default null) returns public.room_seat_requests language plpgsql security definer set search_path=public,pg_temp as $$
declare q public.room_seat_requests; v_room public.rooms; v_seat smallint;
begin
 select * into q from public.room_seat_requests where id=p_request_id for update; if not found or q.status<>'pending' then raise exception 'request_not_pending'; end if;
 if not public.is_room_moderator(q.room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
 if not p_approve then update public.room_seat_requests set status='rejected',resolved_at=now(),resolved_by=auth.uid() where id=q.id returning * into q; return q; end if;
 select * into v_room from public.rooms where id=q.room_id; v_seat:=coalesce(p_seat_index,q.requested_seat);
 if v_seat is null then select s into v_seat from generate_series(0,v_room.max_speakers-1) s where not exists(select 1 from public.room_members m where m.room_id=q.room_id and m.seat_index=s) order by s limit 1; end if;
 if v_seat is null or exists(select 1 from public.room_members where room_id=q.room_id and seat_index=v_seat) then raise exception 'no_seat_available'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=v_seat,role=case when role in ('owner','admin') then role else 'speaker' end,mic_state='muted',promoted_at=now(),updated_at=now() where room_id=q.room_id and user_id=q.user_id;
 perform set_config('zuno.room_internal','0',true);
 if not found then raise exception 'member_left_room'; end if;
 update public.room_seat_requests set status='approved',resolved_at=now(),resolved_by=auth.uid() where id=q.id returning * into q; return q;
end; $$;

create or replace function public.leave_room_session(p_room_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_deleted boolean; begin
 delete from public.room_members where room_id=p_room_id and user_id=auth.uid(); v_deleted:=found;
 delete from public.room_seat_requests where room_id=p_room_id and user_id=auth.uid() and status='pending';
 return v_deleted;
end; $$;

-- RLS
 drop policy if exists room_seat_requests_select on public.room_seat_requests;
 create policy room_seat_requests_select on public.room_seat_requests for select to authenticated using(user_id=auth.uid() or public.is_room_moderator(room_id,auth.uid()));
 drop policy if exists room_seat_requests_insert on public.room_seat_requests;
 create policy room_seat_requests_insert on public.room_seat_requests for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.room_members m where m.room_id=room_seat_requests.room_id and m.user_id=auth.uid()));
 drop policy if exists room_bans_select on public.room_bans;
 create policy room_bans_select on public.room_bans for select to authenticated using(user_id=auth.uid() or public.is_room_moderator(room_id,auth.uid()));
 drop policy if exists room_bans_moderator_all on public.room_bans;
 create policy room_bans_moderator_all on public.room_bans for all to authenticated using(public.is_room_moderator(room_id,auth.uid())) with check(public.is_room_moderator(room_id,auth.uid()));
 drop policy if exists room_moderation_actions_select on public.room_moderation_actions;
 create policy room_moderation_actions_select on public.room_moderation_actions for select to authenticated using(public.is_room_moderator(room_id,auth.uid()));
 drop policy if exists room_follows_select on public.room_follows;
 create policy room_follows_select on public.room_follows for select to authenticated using(true);
 drop policy if exists room_follows_insert on public.room_follows;
 create policy room_follows_insert on public.room_follows for insert to authenticated with check(user_id=auth.uid());
 drop policy if exists room_follows_delete on public.room_follows;
 create policy room_follows_delete on public.room_follows for delete to authenticated using(user_id=auth.uid());
 drop policy if exists room_reactions_select on public.room_reactions;
 create policy room_reactions_select on public.room_reactions for select to authenticated using(exists(select 1 from public.room_members m where m.room_id=room_reactions.room_id and m.user_id=auth.uid()));
 drop policy if exists room_reactions_insert on public.room_reactions;
 create policy room_reactions_insert on public.room_reactions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.room_members m where m.room_id=room_reactions.room_id and m.user_id=auth.uid()));
 drop policy if exists rooms_update_owner on public.rooms;
 create policy rooms_update_owner on public.rooms for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());

grant select,insert,update,delete on public.room_seat_requests to authenticated;
grant select,insert,update,delete on public.room_bans to authenticated;
grant select on public.room_moderation_actions to authenticated;
grant select,insert,delete on public.room_follows to authenticated;
grant select,insert on public.room_reactions to authenticated;
grant execute on function public.is_room_moderator(uuid,uuid) to authenticated;
grant execute on function public.join_room_session(uuid) to authenticated;
grant execute on function public.request_room_seat(uuid,smallint) to authenticated;
grant execute on function public.take_room_seat(uuid,smallint) to authenticated;
grant execute on function public.leave_room_seat(uuid) to authenticated;
grant execute on function public.set_room_mic(uuid,text) to authenticated;
grant execute on function public.resolve_room_seat_request(uuid,boolean,smallint) to authenticated;
grant execute on function public.leave_room_session(uuid) to authenticated;
