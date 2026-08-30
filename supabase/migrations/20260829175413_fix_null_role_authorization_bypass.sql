-- Fix authorization checks where SQL NULL semantics let non-members bypass
-- role comparisons. Missing membership must always mean "not authorized".

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

  return true;
end;
$function$;

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
as $function$
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

  if v_actor<>v_owner and coalesce(v_actor_role,'')<>'admin' then
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
    update public.room_members set mic_state='blocked',updated_at=pg_catalog.now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='unmute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='muted',updated_at=pg_catalog.now() where room_id=p_room_id and user_id=p_target_id and mic_state='blocked';
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='remove_speaker' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set seat_index=null,role=case when role='admin' then 'admin' else 'audience' end,mic_state='muted',updated_at=pg_catalog.now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='kick' then
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=pg_catalog.now(),resolved_by=v_actor where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='ban' then
    insert into public.room_bans(room_id,user_id,banned_by,reason)
    values(p_room_id,p_target_id,v_actor,nullif(pg_catalog.btrim(coalesce(p_reason,'')),''))
    on conflict(room_id,user_id) do update
    set banned_by=excluded.banned_by,reason=excluded.reason,expires_at=null,created_at=pg_catalog.now();
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=pg_catalog.now(),resolved_by=v_actor where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='unban' then
    delete from public.room_bans where room_id=p_room_id and user_id=p_target_id;
  else
    raise exception 'invalid_moderation_action';
  end if;

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(p_room_id,v_actor,p_target_id,p_action,pg_catalog.jsonb_build_object('reason',p_reason));
  return true;
end;
$function$;

create or replace function public.set_room_member_role(
  p_room_id uuid,
  p_target_id uuid,
  p_role text
)
returns public.room_members
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
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

  select r.owner_id into v_owner from public.rooms r where r.id=p_room_id;
  if v_owner is null then
    raise exception 'room_not_found' using errcode='P0002';
  end if;

  select rm.role into v_actor_role
  from public.room_members rm
  where rm.room_id=p_room_id and rm.user_id=v_actor;

  if v_actor<>v_owner and coalesce(v_actor_role,'')<>'admin' then
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
      updated_at=pg_catalog.now()
  where room_id=p_room_id and user_id=p_target_id
  returning * into v;
  get diagnostics v_count=row_count;
  perform set_config('zuno.room_internal','0',true);

  if v_count=0 then
    raise exception 'member_not_found';
  end if;

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(
    p_room_id,v_actor,p_target_id,
    case when p_role='admin' then 'promote_admin' when p_role='audience' then 'remove_speaker' else 'invite_speaker' end,
    pg_catalog.jsonb_build_object('role',p_role)
  );
  return v;
end;
$function$;

create or replace function public.zuno_group_add_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_role text;
begin
  if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;

  select cm.role into v_role
  from public.conversation_members cm
  join public.conversations c on c.id=cm.conversation_id
  where cm.conversation_id=p_conversation_id and cm.user_id=v_me and c.type='group';

  if coalesce(v_role,'') not in ('owner','admin') then
    raise exception 'group_admin_required' using errcode='42501';
  end if;

  if p_user_id is null or p_user_id=v_me then return; end if;

  if exists(select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id) then
    return;
  end if;

  if not exists(select 1 from public.friendships f where (f.user_id=v_me and f.friend_id=p_user_id) or (f.user_id=p_user_id and f.friend_id=v_me)) then
    raise exception 'friendship_required' using errcode='42501';
  end if;
  if exists(select 1 from public.user_blocks b where (b.blocker_id=v_me and b.blocked_id=p_user_id) or (b.blocker_id=p_user_id and b.blocked_id=v_me)) then
    raise exception 'messaging_blocked' using errcode='42501';
  end if;
  if (select count(*) from public.conversation_members where conversation_id=p_conversation_id)>=100 then
    raise exception 'group_full' using errcode='22023';
  end if;

  insert into public.conversation_members(conversation_id,user_id,role)
  values(p_conversation_id,p_user_id,'member') on conflict do nothing;
  if not found then return; end if;

  insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
  values(p_conversation_id,v_me,null,'system',null,pg_catalog.jsonb_build_object('event','member_added','user_id',p_user_id));
end;
$function$;

create or replace function public.zuno_group_remove_member(
  p_conversation_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_me_role text;
  v_target_role text;
begin
  if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;

  if not exists(select 1 from public.conversations c where c.id=p_conversation_id and c.type='group') then
    raise exception 'group_required' using errcode='22023';
  end if;

  select cm.role into v_me_role from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=v_me;
  select cm.role into v_target_role from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id;

  if p_user_id=v_me then
    if v_target_role is null then return; end if;
    if v_target_role='owner' then raise exception 'owner_cannot_leave_without_transfer' using errcode='42501'; end if;
  else
    if coalesce(v_me_role,'') not in ('owner','admin') then
      raise exception 'group_admin_required' using errcode='42501';
    end if;
    if v_target_role is null then return; end if;
    if v_target_role='owner' then raise exception 'owner_cannot_be_removed' using errcode='42501'; end if;
    if v_me_role='admin' and v_target_role='admin' then raise exception 'owner_required_for_admin_removal' using errcode='42501'; end if;
  end if;

  delete from public.conversation_members where conversation_id=p_conversation_id and user_id=p_user_id;
  if not found then return; end if;

  insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
  values(p_conversation_id,v_me,null,'system',null,pg_catalog.jsonb_build_object('event','member_removed','user_id',p_user_id));
end;
$function$;

create or replace function public.zuno_group_set_role(
  p_conversation_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_me uuid := auth.uid();
  v_me_role text;
  v_target_role text;
begin
  if v_me is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_role not in ('admin','member') then raise exception 'invalid_role' using errcode='22023'; end if;

  select cm.role into v_me_role
  from public.conversation_members cm
  join public.conversations c on c.id=cm.conversation_id
  where cm.conversation_id=p_conversation_id and cm.user_id=v_me and c.type='group';

  if coalesce(v_me_role,'')<>'owner' then
    raise exception 'group_owner_required' using errcode='42501';
  end if;
  if p_user_id=v_me then raise exception 'owner_role_is_fixed' using errcode='42501'; end if;

  select cm.role into v_target_role
  from public.conversation_members cm
  where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id;
  if v_target_role is null then raise exception 'member_not_found' using errcode='P0002'; end if;
  if v_target_role='owner' then raise exception 'owner_role_is_fixed' using errcode='42501'; end if;

  update public.conversation_members set role=p_role
  where conversation_id=p_conversation_id and user_id=p_user_id;
end;
$function$;

