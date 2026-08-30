-- ZunoPlay Voice Rooms v2: creation, moderation, lifecycle and discovery.

create or replace function public.create_voice_room(
  p_name text,
  p_category text default 'bate_papo',
  p_visibility text default 'public',
  p_mic_access text default 'open',
  p_description text default null
) returns public.rooms
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_room public.rooms; begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 3 or char_length(btrim(p_name)) > 60 then raise exception 'invalid_room_name'; end if;
  if p_category not in ('bate_papo','musica','jogos','amigos','comunidade','evento','outro') then raise exception 'invalid_category'; end if;
  if p_visibility not in ('public','friends','private') then raise exception 'invalid_visibility'; end if;
  if p_mic_access not in ('open','request','invite_only') then raise exception 'invalid_mic_access'; end if;
  insert into public.rooms(owner_id,name,description,category,visibility,mic_access,status,is_discoverable)
  values(auth.uid(),btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),p_category,p_visibility,p_mic_access,'active',p_visibility<>'private')
  returning * into v_room;
  return v_room;
end; $$;

create or replace function public.set_room_member_role(p_room_id uuid,p_target_id uuid,p_role text)
returns public.room_members
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v public.room_members; begin
  if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
  if p_role not in ('audience','speaker','admin') then raise exception 'invalid_role'; end if;
  if exists(select 1 from public.rooms where id=p_room_id and owner_id=p_target_id) then raise exception 'owner_role_locked'; end if;
  perform set_config('zuno.room_internal','1',true);
  update public.room_members
  set role=p_role,
      seat_index=case when p_role='audience' then null else seat_index end,
      mic_state=case when p_role='audience' then 'muted' else mic_state end,
      updated_at=now()
  where room_id=p_room_id and user_id=p_target_id returning * into v;
  perform set_config('zuno.room_internal','0',true);
  if not found then raise exception 'member_not_found'; end if;
  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(p_room_id,auth.uid(),p_target_id,case when p_role='admin' then 'promote_admin' when p_role='audience' then 'remove_speaker' else 'invite_speaker' end,jsonb_build_object('role',p_role));
  return v;
end; $$;

create or replace function public.moderate_room_member(p_room_id uuid,p_target_id uuid,p_action text,p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_target public.room_members; begin
  if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
  if p_target_id=auth.uid() then raise exception 'cannot_moderate_self'; end if;
  if exists(select 1 from public.rooms where id=p_room_id and owner_id=p_target_id) then raise exception 'cannot_moderate_owner'; end if;
  select * into v_target from public.room_members where room_id=p_room_id and user_id=p_target_id;
  if p_action in ('mute','remove_speaker','kick','ban') and not found then raise exception 'member_not_found'; end if;
  if p_action='mute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='blocked',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='remove_speaker' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set seat_index=null,role=case when role='admin' then 'admin' else 'audience' end,mic_state='muted',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='kick' then
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=auth.uid() where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='ban' then
    insert into public.room_bans(room_id,user_id,banned_by,reason) values(p_room_id,p_target_id,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''))
    on conflict(room_id,user_id) do update set banned_by=excluded.banned_by,reason=excluded.reason,expires_at=null,created_at=now();
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=auth.uid() where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='unban' then
    delete from public.room_bans where room_id=p_room_id and user_id=p_target_id;
  else raise exception 'invalid_moderation_action'; end if;
  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(p_room_id,auth.uid(),p_target_id,p_action,jsonb_build_object('reason',p_reason));
  return true;
end; $$;

create or replace function public.end_voice_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$ begin
  if not exists(select 1 from public.rooms where id=p_room_id and owner_id=auth.uid()) then raise exception 'owner_required' using errcode='42501'; end if;
  update public.rooms set status='ended',ended_at=now(),updated_at=now(),is_discoverable=false where id=p_room_id and status<>'ended';
  delete from public.room_members where room_id=p_room_id;
  update public.room_seat_requests set status='expired',resolved_at=now(),resolved_by=auth.uid() where room_id=p_room_id and status='pending';
  insert into public.room_moderation_actions(room_id,actor_id,target_id,action) values(p_room_id,auth.uid(),null,'end_room');
  return true;
end; $$;

create or replace view public.voice_room_discovery
with (security_invoker=true)
as
select
  r.id,r.name,r.description,r.owner_id,r.category,r.visibility,r.status,r.cover_url,r.language_code,r.country_code,
  r.max_speakers,r.max_audience,r.mic_access,r.is_discoverable,r.created_at,r.updated_at,
  p.username as owner_username,p.avatar_url as owner_avatar_url,
  count(m.id)::integer as participant_count,
  count(m.id) filter (where m.seat_index is not null)::integer as speaker_count,
  count(m.id) filter (where m.seat_index is null)::integer as audience_count
from public.rooms r
left join public.profiles p on p.id=r.owner_id
left join public.room_members m on m.room_id=r.id
where r.status='active' and r.is_discoverable=true
group by r.id,p.username,p.avatar_url;

grant select on public.voice_room_discovery to authenticated;

-- SECURITY DEFINER functions default to PUBLIC execute; lock them down to authenticated users only.
revoke execute on function public.create_voice_room(text,text,text,text,text) from public, anon;
revoke execute on function public.set_room_member_role(uuid,uuid,text) from public, anon;
revoke execute on function public.moderate_room_member(uuid,uuid,text,text) from public, anon;
revoke execute on function public.end_voice_room(uuid) from public, anon;
revoke execute on function public.join_room_session(uuid) from public, anon;
revoke execute on function public.request_room_seat(uuid,smallint) from public, anon;
revoke execute on function public.take_room_seat(uuid,smallint) from public, anon;
revoke execute on function public.leave_room_seat(uuid) from public, anon;
revoke execute on function public.set_room_mic(uuid,text) from public, anon;
revoke execute on function public.resolve_room_seat_request(uuid,boolean,smallint) from public, anon;
revoke execute on function public.leave_room_session(uuid) from public, anon;
revoke execute on function public.is_room_moderator(uuid,uuid) from public, anon;

grant execute on function public.create_voice_room(text,text,text,text,text) to authenticated;
grant execute on function public.set_room_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.moderate_room_member(uuid,uuid,text,text) to authenticated;
grant execute on function public.end_voice_room(uuid) to authenticated;

