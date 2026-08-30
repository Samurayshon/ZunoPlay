-- Fix PL/pgSQL output-parameter ambiguity in create_room_invite.
-- RETURNS TABLE exposes room_id/expires_at as variables, so room_invites columns
-- must be qualified inside the targeted-invite revocation query.

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

