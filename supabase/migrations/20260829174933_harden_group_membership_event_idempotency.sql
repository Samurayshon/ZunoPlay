-- Ensure group membership system events reflect real membership transitions.
-- Repeated add/remove requests become idempotent and cannot forge duplicate
-- member_added/member_removed history entries.

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
  if v_me is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select cm.role into v_role
  from public.conversation_members cm
  join public.conversations c on c.id=cm.conversation_id
  where cm.conversation_id=p_conversation_id
    and cm.user_id=v_me
    and c.type='group';

  if v_role not in ('owner','admin') then
    raise exception 'group_admin_required' using errcode='42501';
  end if;

  if p_user_id is null or p_user_id=v_me then
    return;
  end if;

  if exists(
    select 1 from public.conversation_members cm
    where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id
  ) then
    return;
  end if;

  if not exists(
    select 1 from public.friendships f
    where (f.user_id=v_me and f.friend_id=p_user_id)
       or (f.user_id=p_user_id and f.friend_id=v_me)
  ) then
    raise exception 'friendship_required' using errcode='42501';
  end if;

  if exists(
    select 1 from public.user_blocks b
    where (b.blocker_id=v_me and b.blocked_id=p_user_id)
       or (b.blocker_id=p_user_id and b.blocked_id=v_me)
  ) then
    raise exception 'messaging_blocked' using errcode='42501';
  end if;

  if (select count(*) from public.conversation_members where conversation_id=p_conversation_id)>=100 then
    raise exception 'group_full' using errcode='22023';
  end if;

  insert into public.conversation_members(conversation_id,user_id,role)
  values(p_conversation_id,p_user_id,'member')
  on conflict do nothing;

  if not found then
    return;
  end if;

  insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
  values(
    p_conversation_id,
    v_me,
    null,
    'system',
    null,
    pg_catalog.jsonb_build_object('event','member_added','user_id',p_user_id)
  );
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
  if v_me is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not exists(
    select 1 from public.conversations c
    where c.id=p_conversation_id and c.type='group'
  ) then
    raise exception 'group_required' using errcode='22023';
  end if;

  select cm.role into v_me_role
  from public.conversation_members cm
  where cm.conversation_id=p_conversation_id and cm.user_id=v_me;

  select cm.role into v_target_role
  from public.conversation_members cm
  where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id;

  if v_target_role is null then
    return;
  end if;

  if p_user_id=v_me then
    if v_target_role='owner' then
      raise exception 'owner_cannot_leave_without_transfer' using errcode='42501';
    end if;
  else
    if v_me_role not in ('owner','admin') then
      raise exception 'group_admin_required' using errcode='42501';
    end if;
    if v_target_role='owner' then
      raise exception 'owner_cannot_be_removed' using errcode='42501';
    end if;
    if v_me_role='admin' and v_target_role='admin' then
      raise exception 'owner_required_for_admin_removal' using errcode='42501';
    end if;
  end if;

  delete from public.conversation_members
  where conversation_id=p_conversation_id and user_id=p_user_id;

  if not found then
    return;
  end if;

  insert into public.messages(conversation_id,sender_id,receiver_id,type,content,metadata)
  values(
    p_conversation_id,
    v_me,
    null,
    'system',
    null,
    pg_catalog.jsonb_build_object('event','member_removed','user_id',p_user_id)
  );
end;
$function$;

