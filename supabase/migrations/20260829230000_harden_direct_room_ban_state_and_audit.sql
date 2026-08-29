-- Keep direct ban/unban RPCs consistent with the audited moderation path.
-- A ban must invalidate pending seat requests and both real ban/unban
-- transitions must leave an audit trail.

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
as $function$
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

  if v_uid<>v_owner and coalesce(v_actor_role,'')<>'admin' then
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
    case when v_hours is null then null else pg_catalog.now()+pg_catalog.make_interval(hours=>v_hours) end
  )
  on conflict(room_id,user_id) do update
  set banned_by=excluded.banned_by,
      reason=excluded.reason,
      created_at=pg_catalog.now(),
      expires_at=excluded.expires_at;

  delete from public.room_members
  where room_id=p_room_id and user_id=p_user_id;

  update public.room_seat_requests
     set status='cancelled',
         resolved_at=pg_catalog.now(),
         resolved_by=v_uid
   where room_id=p_room_id
     and user_id=p_user_id
     and status='pending';

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(
    p_room_id,
    v_uid,
    p_user_id,
    'ban',
    pg_catalog.jsonb_build_object('reason',p_reason,'hours',v_hours)
  );

  return true;
end;
$function$;

create or replace function public.unban_room_member(
  p_room_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_count integer;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not public.is_room_moderator(p_room_id,v_actor) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  delete from public.room_bans
  where room_id=p_room_id and user_id=p_user_id;
  get diagnostics v_count=row_count;

  if v_count>0 then
    insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
    values(p_room_id,v_actor,p_user_id,'unban','{}'::jsonb);
  end if;

  return true;
end;
$function$;
