-- ZunoPlay Stage 19 — security, stability and regression reconciliation
-- This migration assumes the existing ZunoPlay baseline schema is present.
-- It captures the production hardening applied during the Stage 19 audit.

-- Voice rooms are an 8-seat product invariant.
update public.rooms set max_speakers = 8 where max_speakers <> 8;
alter table public.rooms alter column max_speakers set default 8;
alter table public.rooms drop constraint if exists rooms_max_speakers_check;
alter table public.rooms add constraint rooms_max_speakers_check check (max_speakers = 8);

create index if not exists zuno_stack_match_state_host_id_idx on public.zuno_stack_match_state(host_id);
create index if not exists zuno_stack_game_events_actor_id_idx on public.zuno_stack_game_events(actor_id);

create or replace function public.create_voice_room(
  p_name text,
  p_category text default 'bate_papo',
  p_visibility text default 'public',
  p_mic_access text default 'open',
  p_description text default null
) returns public.rooms
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_room public.rooms;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 3 or char_length(btrim(p_name)) > 60 then raise exception 'invalid_room_name'; end if;
  if p_category not in ('bate_papo','musica','jogos','amigos','comunidade','evento','outro') then raise exception 'invalid_category'; end if;
  if p_visibility not in ('public','friends','private') then raise exception 'invalid_visibility'; end if;
  if p_mic_access not in ('open','request','invite_only') then raise exception 'invalid_mic_access'; end if;
  insert into public.rooms(owner_id,name,description,category,visibility,mic_access,status,is_discoverable,max_speakers)
  values(auth.uid(),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_category,p_visibility,p_mic_access,'active',p_visibility<>'private',8)
  returning * into v_room;
  return v_room;
end;
$function$;

-- Do not allow direct client INSERT to bypass visibility/session rules.
drop policy if exists "Usuários podem entrar em salas" on public.room_members;

create or replace function public.assign_room_member_session()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  v_existing_room uuid;
  v_room public.rooms;
  v_count integer;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'invalid_room_member' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.room_id::text));
  select * into v_room from public.rooms where id=new.room_id;
  if not found or v_room.status<>'active' then raise exception 'room_not_available' using errcode='P0002'; end if;
  if v_room.visibility='private' and v_room.owner_id<>auth.uid() then raise exception 'room_access_denied' using errcode='42501'; end if;
  if v_room.visibility='friends' and v_room.owner_id<>auth.uid() and not public.zuno_are_friends(v_room.owner_id,auth.uid()) then
    raise exception 'room_access_denied' using errcode='42501';
  end if;
  delete from public.room_members rm
   where (rm.room_id=new.room_id or rm.user_id=new.user_id)
     and (rm.last_seen_at is null or rm.last_seen_at<pg_catalog.now()-interval '60 seconds');
  select rm.room_id into v_existing_room from public.room_members rm where rm.user_id=new.user_id limit 1;
  if v_existing_room is not null then
    if v_existing_room=new.room_id then raise exception 'already_in_room' using errcode='23505'; end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;
  select pg_catalog.count(*) into v_count from public.room_members rm where rm.room_id=new.room_id;
  if v_count>=v_room.max_audience then raise exception 'room_full' using errcode='P0001'; end if;
  new.seat_index:=null;
  new.role:=case when v_room.owner_id=auth.uid() then 'owner' else 'audience' end;
  new.mic_state:='muted';
  new.joined_at:=pg_catalog.now();
  new.last_seen_at:=pg_catalog.now();
  return new;
end;
$function$;

create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members language plpgsql security definer set search_path to ''
as $function$
declare
  v_member public.room_members;
  v_existing_room uuid;
  v_room public.rooms;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into v_room from public.rooms where id=p_room_id;
  if not found or v_room.status<>'active' then raise exception 'room_not_available' using errcode='P0002'; end if;
  if v_room.visibility='private' and v_room.owner_id<>auth.uid() then raise exception 'room_access_denied' using errcode='42501'; end if;
  if v_room.visibility='friends' and v_room.owner_id<>auth.uid() and not public.zuno_are_friends(v_room.owner_id,auth.uid()) then
    raise exception 'room_access_denied' using errcode='42501';
  end if;
  if exists(select 1 from public.room_bans b where b.room_id=p_room_id and b.user_id=auth.uid() and (b.expires_at is null or b.expires_at>pg_catalog.now())) then
    raise exception 'room_banned' using errcode='42501';
  end if;
  perform public.cleanup_stale_room_members(p_room_id);
  delete from public.room_members rm where rm.user_id=auth.uid() and (rm.last_seen_at is null or rm.last_seen_at<pg_catalog.now()-interval '60 seconds');
  select rm.room_id into v_existing_room from public.room_members rm where rm.user_id=auth.uid() limit 1;
  if v_existing_room is not null then
    if v_existing_room=p_room_id then select * into v_member from public.room_members rm where rm.user_id=auth.uid() limit 1; return v_member; end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;
  select pg_catalog.count(*) into v_count from public.room_members rm where rm.room_id=p_room_id;
  if v_count>=v_room.max_audience then raise exception 'room_full' using errcode='P0001'; end if;
  insert into public.room_members(room_id,user_id,seat_index,role,mic_state)
  values(p_room_id,auth.uid(),null,case when v_room.owner_id=auth.uid() then 'owner' else 'audience' end,'muted')
  returning * into v_member;
  return v_member;
end;
$function$;

create or replace function private.zuno_can_view_room_members(p_room_id uuid,p_user_id uuid)
returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists(
    select 1 from public.rooms r
    where r.id=p_room_id and (
      r.visibility='public' or r.owner_id=p_user_id
      or exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id)
      or (r.visibility='friends' and exists(
        select 1 from public.friendships f
        where (f.user_id=r.owner_id and f.friend_id=p_user_id) or (f.friend_id=r.owner_id and f.user_id=p_user_id)
      ))
    )
  );
$function$;
grant usage on schema private to authenticated;
grant execute on function private.zuno_can_view_room_members(uuid,uuid) to authenticated;
drop policy if exists "Usuários podem ver membros das salas" on public.room_members;
drop policy if exists room_members_select_authorized on public.room_members;
create policy room_members_select_authorized on public.room_members
for select to authenticated using (private.zuno_can_view_room_members(room_id,(select auth.uid())));

drop policy if exists "Usuários podem ver salas" on public.rooms;
drop policy if exists rooms_select_authorized on public.rooms;
create policy rooms_select_authorized on public.rooms
for select to authenticated using (
  visibility='public'
  or owner_id=(select auth.uid())
  or exists(select 1 from public.room_members rm where rm.room_id=rooms.id and rm.user_id=(select auth.uid()))
  or (visibility='friends' and public.zuno_are_friends(owner_id,(select auth.uid())))
);

create or replace function public.set_room_mic(p_room_id uuid,p_state text)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v public.room_members; v_count integer;
begin
 if p_state not in ('muted','unmuted') then raise exception 'invalid_mic_state'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set mic_state=p_state,updated_at=now()
  where room_id=p_room_id and user_id=auth.uid() and seat_index is not null and mic_state<>'blocked' returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'speaker_required'; end if;
 return v;
end;$function$;

create or replace function public.move_room_seat(p_room_id uuid,p_seat_index smallint)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v public.room_members; v_room public.rooms; v_count integer;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id and status='active'; if not found then raise exception 'room_not_available'; end if;
 if p_seat_index<0 or p_seat_index>=v_room.max_speakers then raise exception 'invalid_seat'; end if;
 if exists(select 1 from public.room_members where room_id=p_room_id and seat_index=p_seat_index and user_id<>auth.uid()) then raise exception 'seat_taken'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=p_seat_index,role=case when role in ('owner','admin') then role else 'speaker' end,updated_at=now()
  where room_id=p_room_id and user_id=auth.uid() returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'not_in_room'; end if;
 return v;
end;$function$;

create or replace function public.leave_room_seat(p_room_id uuid)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v public.room_members; v_count integer;
begin
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=null,role=case when role in ('owner','admin') then role else 'audience' end,mic_state='muted',hand_raised=false,updated_at=now()
  where room_id=p_room_id and user_id=auth.uid() returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'not_in_room'; end if;
 return v;
end;$function$;

create or replace function public.claim_room_presence_reward(p_room_id uuid)
returns integer language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_uid uuid:=auth.uid(); v_joined timestamptz; v_reward_key text; v_coins integer:=5;
begin
 if v_uid is null then raise exception 'auth_required' using errcode='42501'; end if;
 select joined_at into v_joined from public.room_members where room_id=p_room_id and user_id=v_uid;
 if v_joined is null then raise exception 'not_in_room'; end if;
 if now()<v_joined+interval '5 minutes' then raise exception 'reward_not_ready'; end if;
 v_reward_key:='presence_'||to_char(current_date,'YYYYMMDD');
 perform pg_advisory_xact_lock(hashtextextended('zunoplay:presence-reward:'||v_uid::text||':'||v_reward_key,0));
 if exists(select 1 from public.room_reward_claims where user_id=v_uid and reward_key=v_reward_key) then raise exception 'reward_already_claimed'; end if;
 insert into public.room_reward_claims(room_id,user_id,reward_key,coins) values(p_room_id,v_uid,v_reward_key,v_coins);
 update public.profiles set coins=coalesce(coins,0)+v_coins where id=v_uid;
 return v_coins;
end;$function$;

create or replace function public.claim_voice_room_reward(p_room_id uuid)
returns table(claimed boolean,coins integer,total_coins integer)
language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_coins integer:=5; v_total integer:=0; v_joined_at timestamptz; v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'auth_required' using errcode='42501'; end if;
 select joined_at into v_joined_at from public.room_members where room_id=p_room_id and user_id=v_uid;
 if v_joined_at is null then raise exception 'room_membership_required' using errcode='42501'; end if;
 if now()<v_joined_at+interval '5 minutes' then raise exception 'voice_reward_not_ready' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('zunoplay:voice-reward:'||v_uid::text||':'||current_date::text,0));
 if exists(select 1 from public.room_voice_reward_claims where user_id=v_uid and reward_date=current_date) then
   select coalesce(p.coins,0) into v_total from public.profiles p where p.id=v_uid;
   return query select false,v_coins,coalesce(v_total,0); return;
 end if;
 insert into public.room_voice_reward_claims(room_id,user_id,reward_date,coins) values(p_room_id,v_uid,current_date,v_coins);
 update public.profiles set coins=coalesce(profiles.coins,0)+v_coins where id=v_uid returning profiles.coins into v_total;
 return query select true,v_coins,coalesce(v_total,0);
end;$function$;

create or replace function public.apply_desafio_progress()
returns trigger language plpgsql security definer set search_path to ''
as $function$
declare v_level integer; v_current integer;
begin
  if new.game !~ '^Desafio Zuno · Nível ([1-9]|10)$' then return new; end if;
  if auth.uid() is null or new.user_id is distinct from auth.uid() then raise exception 'invalid_game_owner' using errcode='42501'; end if;
  if new.questions<>10 or new.correct_answers<0 or new.correct_answers>10 or new.score<>new.correct_answers*100 then raise exception 'invalid_game_result' using errcode='22023'; end if;
  v_level:=substring(new.game from 'Nível ([0-9]+)$')::integer;
  select greatest(1,least(10,coalesce(level,1))) into v_current from public.profiles where id=new.user_id for update;
  if v_current is null then raise exception 'profile_not_found' using errcode='P0002'; end if;
  if v_level>v_current then raise exception 'level_locked' using errcode='42501'; end if;
  if new.correct_answers>=8 and v_level=v_current and v_current<10 then update public.profiles set level=v_current+1 where id=new.user_id; end if;
  return new;
end;$function$;

create or replace function public.submit_zuno_stack_result(p_score integer,p_matches integer,p_tiles_cleared integer,p_won boolean)
returns table(recorded boolean,game_xp integer,game_level integer,new_achievements text[])
language plpgsql security definer set search_path to ''
as $function$
declare v_user uuid:=auth.uid(); v_award integer; v_progress record;
begin
 if v_user is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_score<0 or p_score>25000 or p_matches<0 or p_matches>30 or p_tiles_cleared<0 or p_tiles_cleared>90 or p_won is null then raise exception 'invalid_game_result' using errcode='22023'; end if;
 if p_matches*3>p_tiles_cleared then raise exception 'invalid_game_result_relation' using errcode='22023'; end if;
 v_award:=45+(p_matches*9)+(p_tiles_cleared*2)+(p_score/90)+case when p_won then 55 else 0 end;
 v_award:=least(420,greatest(25,v_award));
 insert into public.game_scores(user_id,game,score,questions,correct_answers) values(v_user,'Zuno Stack',p_score,90,p_tiles_cleared);
 select * into v_progress from public.zuno_award_game_progress(v_user,0,p_score,p_won,false,v_award);
 return query select true,v_progress.xp,v_progress.game_level,v_progress.new_achievements;
end;$function$;
