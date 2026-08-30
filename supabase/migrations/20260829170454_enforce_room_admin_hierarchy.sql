-- Enforce owner-only management of admin privileges in voice rooms.

create or replace function public.set_room_member_role(
  p_room_id uuid,
  p_target_id uuid,
  p_role text
)
returns public.room_members
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_actor_role text;
  v_target_role text;
  v public.room_members;
  v_count integer;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select r.owner_id into v_owner
  from public.rooms r
  where r.id=p_room_id;

  if v_owner is null then
    raise exception 'room_not_found' using errcode='P0002';
  end if;

  select rm.role into v_actor_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=v_actor;

  if v_actor<>v_owner and v_actor_role<>'admin' then
    raise exception 'moderator_required' using errcode='42501';
  end if;

  if p_role not in ('audience','speaker','admin') then
    raise exception 'invalid_role';
  end if;

  if p_target_id=v_owner then
    raise exception 'owner_role_locked' using errcode='42501';
  end if;

  select rm.role into v_target_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=p_target_id;

  if v_target_role is null then
    raise exception 'member_not_found';
  end if;

  if v_actor<>v_owner and (v_target_role='admin' or p_role='admin') then
    raise exception 'owner_required_for_admin_management' using errcode='42501';
  end if;

  perform set_config('zuno.room_internal','1',true);
  update public.room_members
  set role=p_role,
      seat_index=case when p_role='audience' then null else seat_index end,
      mic_state=case when p_role='audience' then 'muted' else mic_state end,
      updated_at=now()
  where room_id=p_room_id and user_id=p_target_id
  returning * into v;
  get diagnostics v_count=row_count;
  perform set_config('zuno.room_internal','0',true);

  if v_count=0 then
    raise exception 'member_not_found';
  end if;

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(
    p_room_id,
    v_actor,
    p_target_id,
    case when p_role='admin' then 'promote_admin' when p_role='audience' then 'remove_speaker' else 'invite_speaker' end,
    pg_catalog.jsonb_build_object('role',p_role)
  );

  return v;
end;
$$;

create or replace function public.moderate_room_member(
  p_room_id uuid,
  p_target_id uuid,
  p_action text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_actor_role text;
  v_target public.room_members;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select r.owner_id into v_owner from public.rooms r where r.id=p_room_id;
  if v_owner is null then
    raise exception 'room_not_found' using errcode='P0002';
  end if;

  select rm.role into v_actor_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=v_actor;

  if v_actor<>v_owner and v_actor_role<>'admin' then
    raise exception 'moderator_required' using errcode='42501';
  end if;

  if p_target_id=v_actor then
    raise exception 'cannot_moderate_self';
  end if;
  if p_target_id=v_owner then
    raise exception 'cannot_moderate_owner' using errcode='42501';
  end if;

  select * into v_target
  from public.room_members
  where room_id=p_room_id and user_id=p_target_id;

  if p_action in ('mute','unmute','remove_speaker','kick','ban') and not found then
    raise exception 'member_not_found';
  end if;

  if v_actor<>v_owner and v_target.role='admin' and p_action in ('mute','unmute','remove_speaker','kick','ban') then
    raise exception 'owner_required_for_admin_moderation' using errcode='42501';
  end if;

  if p_action='mute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='blocked',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='unmute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='muted',updated_at=now() where room_id=p_room_id and user_id=p_target_id and mic_state='blocked';
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='remove_speaker' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set seat_index=null,role=case when role='admin' then 'admin' else 'audience' end,mic_state='muted',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='kick' then
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=v_actor where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='ban' then
    insert into public.room_bans(room_id,user_id,banned_by,reason)
    values(p_room_id,p_target_id,v_actor,nullif(btrim(coalesce(p_reason,'')),''))
    on conflict(room_id,user_id) do update
    set banned_by=excluded.banned_by,reason=excluded.reason,expires_at=null,created_at=now();
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=v_actor where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='unban' then
    delete from public.room_bans where room_id=p_room_id and user_id=p_target_id;
  else
    raise exception 'invalid_moderation_action';
  end if;

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(p_room_id,v_actor,p_target_id,p_action,pg_catalog.jsonb_build_object('reason',p_reason));
  return true;
end;
$$;

create or replace function public.ban_room_member(
  p_room_id uuid,
  p_user_id uuid,
  p_reason text default null,
  p_hours integer default null
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_actor_role text;
  v_target_role text;
  v_hours integer;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select r.owner_id into v_owner from public.rooms r where r.id=p_room_id;
  if v_owner is null then
    raise exception 'room_not_found' using errcode='P0002';
  end if;

  select rm.role into v_actor_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=v_uid;

  if v_uid<>v_owner and v_actor_role<>'admin' then
    raise exception 'forbidden' using errcode='42501';
  end if;

  if p_user_id=v_uid then
    raise exception 'cannot_ban_self';
  end if;

  if p_user_id=v_owner then
    raise exception 'cannot_ban_owner' using errcode='42501';
  end if;

  select rm.role into v_target_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=p_user_id;

  if v_uid<>v_owner and v_target_role='admin' then
    raise exception 'owner_required_for_admin_moderation' using errcode='42501';
  end if;

  v_hours := case when p_hours is null then null when p_hours < 1 then 1 else p_hours end;

  insert into public.room_bans(room_id,user_id,banned_by,reason,expires_at)
  values(
    p_room_id,
    p_user_id,
    v_uid,
    nullif(pg_catalog.btrim(p_reason),''),
    case when v_hours is null then null else pg_catalog.now() + pg_catalog.make_interval(hours => v_hours) end
  )
  on conflict(room_id,user_id) do update
  set banned_by=excluded.banned_by,
      reason=excluded.reason,
      created_at=pg_catalog.now(),
      expires_at=excluded.expires_at;

  delete from public.room_members
  where room_id=p_room_id and user_id=p_user_id;

  return true;
end;
$$;
