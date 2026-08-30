create or replace function public.block_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if target_user_id is null or target_user_id = me then raise exception 'invalid_target'; end if;
  if not exists(select 1 from public.profiles where id=target_user_id) then raise exception 'target_not_found'; end if;

  insert into public.user_blocks(blocker_id,blocked_id)
  values(me,target_user_id)
  on conflict (blocker_id,blocked_id) do nothing;

  delete from public.friendships
  where (user_id=me and friend_id=target_user_id)
     or (user_id=target_user_id and friend_id=me);

  delete from public.friend_requests
  where (sender_id=me and receiver_id=target_user_id)
     or (sender_id=target_user_id and receiver_id=me);

  update public.room_invites ri
     set revoked_at=pg_catalog.now()
   where ri.accepted_at is null
     and ri.revoked_at is null
     and ri.expires_at>pg_catalog.now()
     and ((ri.inviter_id=me and ri.invitee_id=target_user_id)
       or (ri.inviter_id=target_user_id and ri.invitee_id=me));

  return true;
end;
$function$;

create or replace function public.create_room_invite(
  p_room_id uuid,
  p_invitee_id uuid default null::uuid,
  p_expires_minutes integer default 60
)
returns table(room_id uuid, invite_token text, expires_at timestamp with time zone)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_room public.rooms;
  v_role text;
  v_token text;
  v_expires timestamptz;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_room
    from public.rooms r
   where r.id=p_room_id
     and r.status='active';
  if not found then
    raise exception 'room_not_available' using errcode='P0002';
  end if;

  select rm.role into v_role
    from public.room_members rm
   where rm.room_id=p_room_id
     and rm.user_id=v_actor;

  if v_room.owner_id<>v_actor and coalesce(v_role,'') not in ('owner','admin') then
    raise exception 'room_moderator_required' using errcode='42501';
  end if;

  if p_expires_minutes is null or p_expires_minutes < 5 or p_expires_minutes > 1440 then
    raise exception 'invalid_invite_expiry' using errcode='22023';
  end if;

  if p_invitee_id=v_actor then
    raise exception 'cannot_invite_self' using errcode='22023';
  end if;

  if p_invitee_id is not null and exists(
    select 1 from public.user_blocks b
     where (b.blocker_id=v_actor and b.blocked_id=p_invitee_id)
        or (b.blocker_id=p_invitee_id and b.blocked_id=v_actor)
  ) then
    raise exception 'interaction_blocked' using errcode='42501';
  end if;

  if p_invitee_id is not null then
    update public.room_invites ri
       set revoked_at=pg_catalog.now()
     where ri.room_id=p_room_id
       and ri.invitee_id=p_invitee_id
       and ri.accepted_at is null
       and ri.revoked_at is null
       and ri.expires_at>pg_catalog.now();
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expires := pg_catalog.now() + pg_catalog.make_interval(mins => p_expires_minutes);

  insert into public.room_invites(room_id,inviter_id,invitee_id,token_hash,expires_at)
  values(
    p_room_id,
    v_actor,
    p_invitee_id,
    encode(extensions.digest(v_token,'sha256'),'hex'),
    v_expires
  );

  return query select p_room_id,v_token,v_expires;
end;
$function$;

create or replace function public.join_room_session(
  p_room_id uuid,
  p_invite_token text default null::text
)
returns public.room_members
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_member public.room_members;
  v_existing_room uuid;
  v_room public.rooms;
  v_count integer;
  v_invite_id uuid;
  v_inviter_id uuid;
  v_owner_seat smallint;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into v_room
    from public.rooms
   where id=p_room_id;

  if not found or v_room.status<>'active' then
    raise exception 'room_not_available' using errcode='P0002';
  end if;

  if exists(
    select 1
      from public.room_bans b
     where b.room_id=p_room_id
       and b.user_id=auth.uid()
       and (b.expires_at is null or b.expires_at>pg_catalog.now())
  ) then
    raise exception 'room_banned' using errcode='42501';
  end if;

  if v_room.visibility='private' and v_room.owner_id<>auth.uid() then
    if nullif(btrim(coalesce(p_invite_token,'')),'') is null then
      raise exception 'room_access_denied' using errcode='42501';
    end if;

    select ri.id,ri.inviter_id into v_invite_id,v_inviter_id
      from public.room_invites ri
     where ri.room_id=p_room_id
       and ri.token_hash=encode(extensions.digest(p_invite_token,'sha256'),'hex')
       and ri.accepted_at is null
       and ri.revoked_at is null
       and ri.expires_at>pg_catalog.now()
       and (ri.invitee_id is null or ri.invitee_id=auth.uid())
     for update
     limit 1;

    if v_invite_id is null then
      raise exception 'room_access_denied' using errcode='42501';
    end if;

    if exists(
      select 1 from public.user_blocks b
       where (b.blocker_id=auth.uid() and b.blocked_id=v_inviter_id)
          or (b.blocker_id=v_inviter_id and b.blocked_id=auth.uid())
    ) then
      raise exception 'room_access_denied' using errcode='42501';
    end if;
  end if;

  if v_room.visibility='friends'
     and v_room.owner_id<>auth.uid()
     and not public.zuno_are_friends(v_room.owner_id, auth.uid()) then
    raise exception 'room_access_denied' using errcode='42501';
  end if;

  perform public.cleanup_stale_room_members(p_room_id);

  delete from public.room_members rm
   where rm.user_id=auth.uid()
     and (rm.last_seen_at is null or rm.last_seen_at < pg_catalog.now()-interval '60 seconds');

  select rm.room_id into v_existing_room
    from public.room_members rm
   where rm.user_id=auth.uid()
   limit 1;

  if v_existing_room is not null then
    if v_existing_room=p_room_id then
      select * into v_member
        from public.room_members rm
       where rm.user_id=auth.uid()
       limit 1;
      return v_member;
    end if;
    raise exception 'leave_current_room_first' using errcode='P0001';
  end if;

  select pg_catalog.count(*) into v_count
    from public.room_members rm
   where rm.room_id=p_room_id;

  if v_count>=v_room.max_audience then
    raise exception 'room_full' using errcode='P0001';
  end if;

  v_owner_seat := null;
  if v_room.owner_id=auth.uid() then
    select gs::smallint into v_owner_seat
      from generate_series(0, least(v_room.max_speakers,8)-1) gs
     where not exists (
       select 1 from public.room_members rm
        where rm.room_id=p_room_id and rm.seat_index=gs
     )
     order by gs
     limit 1;
  end if;

  insert into public.room_members(room_id,user_id,seat_index,role,mic_state)
  values(
    p_room_id,
    auth.uid(),
    v_owner_seat,
    case when v_room.owner_id=auth.uid() then 'owner' else 'audience' end,
    'muted'
  )
  returning * into v_member;

  if v_invite_id is not null then
    update public.room_invites
       set accepted_at=pg_catalog.now(),
           accepted_by=auth.uid()
     where id=v_invite_id
       and accepted_at is null
       and revoked_at is null;
    if not found then
      raise exception 'room_access_denied' using errcode='42501';
    end if;
  end if;

  return v_member;
end;
$function$;

create or replace function public.zuno_notify_room_invite()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_actor text; v_room text;
begin
  if new.invitee_id is null or new.revoked_at is not null then return null; end if;
  if exists(
    select 1 from public.user_blocks b
     where (b.blocker_id=new.inviter_id and b.blocked_id=new.invitee_id)
        or (b.blocker_id=new.invitee_id and b.blocked_id=new.inviter_id)
  ) then
    return null;
  end if;
  select coalesce(nullif(btrim(p.username),''),'Alguém') into v_actor from public.profiles p where p.id=new.inviter_id;
  select coalesce(nullif(btrim(r.name),''),'uma sala') into v_room from public.rooms r where r.id=new.room_id;
  perform private.zuno_emit_notification(new.invitee_id,'room_invite','rooms',v_actor||' convidou você para '||v_room,
    null,new.inviter_id,new.id,'high','salas.html?room='||new.room_id::text,
    'room_invite:'||new.id::text,new.expires_at,jsonb_build_object('room_id',new.room_id,'invite_id',new.id));
  return null;
end;
$function$;
