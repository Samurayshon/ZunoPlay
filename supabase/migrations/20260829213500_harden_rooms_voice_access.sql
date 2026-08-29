-- P1 hardening for ZunoPlay rooms/voice.
-- - private rooms use expiring single-use invite tokens
-- - host departure always ends the room (including stale-session cleanup)
-- - room voice signaling only allows seated, non-blocked speakers to originate offers
-- - room follow relationships are private to the follower

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint room_invites_expiry_after_create check (expires_at > created_at)
);

create index if not exists room_invites_room_active_idx
  on public.room_invites(room_id, expires_at)
  where accepted_at is null and revoked_at is null;

create index if not exists room_invites_invitee_active_idx
  on public.room_invites(invitee_id, expires_at)
  where accepted_at is null and revoked_at is null and invitee_id is not null;

alter table public.room_invites enable row level security;
revoke all on table public.room_invites from public, anon, authenticated;

create or replace function private.zuno_room_member_can_publish_voice(
  p_room_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
      from public.room_members rm
      join public.rooms r on r.id=rm.room_id
     where rm.room_id=p_room_id
       and rm.user_id=p_user_id
       and r.status='active'
       and rm.seat_index is not null
       and rm.seat_index between 0 and 7
       and rm.role in ('owner','admin','speaker')
       and rm.mic_state <> 'blocked'
  );
$function$;

revoke all on function private.zuno_room_member_can_publish_voice(uuid,uuid) from public, anon, authenticated;

create or replace function public.create_room_invite(
  p_room_id uuid,
  p_invitee_id uuid default null,
  p_expires_minutes integer default 60
)
returns table(room_id uuid, invite_token text, expires_at timestamptz)
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

  -- Revoke previous still-active invite for the same targeted user. Generic links
  -- are allowed concurrently but remain single-use and short-lived.
  if p_invitee_id is not null then
    update public.room_invites
       set revoked_at=pg_catalog.now()
     where room_id=p_room_id
       and invitee_id=p_invitee_id
       and accepted_at is null
       and revoked_at is null
       and expires_at>pg_catalog.now();
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expires := pg_catalog.now() + make_interval(mins => p_expires_minutes);

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

revoke all on function public.create_room_invite(uuid,uuid,integer) from public, anon;
grant execute on function public.create_room_invite(uuid,uuid,integer) to authenticated;

-- Replace the old one-argument function with an optional invite token. Existing
-- RPC calls that only send p_room_id remain valid because p_invite_token defaults null.
drop function if exists public.join_room_session(uuid);

create function public.join_room_session(
  p_room_id uuid,
  p_invite_token text default null
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

    select ri.id into v_invite_id
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

revoke all on function public.join_room_session(uuid,text) from public, anon;
grant execute on function public.join_room_session(uuid,text) to authenticated;

create or replace function private.zuno_end_room_after_owner_departure()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ended boolean := false;
begin
  update public.rooms r
     set status='ended',
         ended_at=coalesce(r.ended_at,pg_catalog.now()),
         updated_at=pg_catalog.now(),
         is_discoverable=false
   where r.id=old.room_id
     and r.owner_id=old.user_id
     and r.status='active'
  returning true into v_ended;

  if coalesce(v_ended,false) then
    delete from public.room_members rm
     where rm.room_id=old.room_id;

    update public.room_seat_requests rsr
       set status='expired',
           resolved_at=pg_catalog.now(),
           resolved_by=null
     where rsr.room_id=old.room_id
       and rsr.status='pending';

    update public.room_invites ri
       set revoked_at=coalesce(ri.revoked_at,pg_catalog.now())
     where ri.room_id=old.room_id
       and ri.accepted_at is null
       and ri.revoked_at is null;
  end if;

  return null;
end;
$function$;

revoke all on function private.zuno_end_room_after_owner_departure() from public, anon, authenticated;

drop trigger if exists zuno_end_room_on_owner_departure on public.room_members;
create trigger zuno_end_room_on_owner_departure
after delete on public.room_members
for each row execute function private.zuno_end_room_after_owner_departure();

-- Harden the realtime voice channel. Listeners may answer/ICE so they can receive
-- a speaker's stream, but only an authorized seated speaker can originate offers
-- or claim a speaking state. Payload identity/room must match auth + topic.
create or replace function private.zuno_voice_broadcast_allowed(
  p_topic text,
  p_event text,
  p_payload jsonb,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_room_id uuid;
  v_kind text;
  v_state text;
begin
  if p_user_id is null or p_topic is null or p_event is null then
    return false;
  end if;

  if p_topic !~ '^room:[0-9a-fA-F-]{36}:voice$' then
    return false;
  end if;

  begin
    v_room_id := split_part(p_topic,':',2)::uuid;
  exception when others then
    return false;
  end;

  if not exists (
    select 1
      from public.room_members rm
      join public.rooms r on r.id=rm.room_id
     where rm.room_id=v_room_id
       and rm.user_id=p_user_id
       and r.status='active'
  ) then
    return false;
  end if;

  if p_event='signal' then
    if coalesce(p_payload->>'from','')<>p_user_id::text
       or coalesce(p_payload->>'room_id','')<>v_room_id::text then
      return false;
    end if;
    v_kind := coalesce(p_payload->>'kind','');
    if v_kind='offer' then
      return private.zuno_room_member_can_publish_voice(v_room_id,p_user_id);
    end if;
    return v_kind in ('answer','ice','restart-request','bye');
  end if;

  if p_event='voice-state' then
    if coalesce(p_payload->>'user_id','')<>p_user_id::text
       or coalesce(p_payload->>'room_id','')<>v_room_id::text then
      return false;
    end if;
    v_state := coalesce(p_payload->>'state','online');
    if v_state='speaking' then
      return private.zuno_room_member_can_publish_voice(v_room_id,p_user_id);
    end if;
    return v_state in ('online','listening');
  end if;

  return true;
end;
$function$;

revoke all on function private.zuno_voice_broadcast_allowed(text,text,jsonb,uuid) from public, anon, authenticated;

drop policy if exists zunoplay_send_authorized_voice_broadcasts on realtime.messages;
create policy zunoplay_send_authorized_voice_broadcasts
on realtime.messages
for insert
to authenticated
with check (
  extension='broadcast'
  and private.zuno_voice_broadcast_allowed(
    realtime.topic(),
    event,
    payload,
    (select auth.uid())
  )
);

-- Follow relationships are not globally readable social graph data.
drop policy if exists room_follows_select on public.room_follows;
create policy room_follows_select
on public.room_follows
for select
to authenticated
using (user_id=(select auth.uid()));

-- Close existing active rooms whose owner is already absent. These are invalid
-- under the product rule and otherwise block the owner from creating a new room.
with orphaned as (
  update public.rooms r
     set status='ended',
         ended_at=coalesce(r.ended_at,pg_catalog.now()),
         updated_at=pg_catalog.now(),
         is_discoverable=false
   where r.status='active'
     and not exists (
       select 1 from public.room_members rm
        where rm.room_id=r.id and rm.user_id=r.owner_id
     )
  returning r.id
)
update public.room_seat_requests rsr
   set status='expired',
       resolved_at=pg_catalog.now(),
       resolved_by=null
 where rsr.status='pending'
   and rsr.room_id in (select id from orphaned);
