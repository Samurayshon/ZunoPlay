-- Harden the direct Data API UPDATE surface for room_members.
-- Clients may only update their own ephemeral state. Protected room state must
-- flow through the existing server-authorized RPCs.

-- Remove the table-level UPDATE grant that implicitly exposed every column.
revoke update on table public.room_members from authenticated;

-- Preserve only self-controlled ephemeral fields. RLS + trigger below still
-- restrict these writes to the caller's own membership row.
grant update (last_seen_at, hand_raised, connection_state)
  on table public.room_members
  to authenticated;

create or replace function public.zunoplay_protect_room_member_updates()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  -- Server-authorized room RPCs explicitly opt into internal state mutation.
  if current_setting('zuno.room_internal', true) = '1' then
    return new;
  end if;

  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  -- Direct client UPDATE is self-only. Owners/moderators must use the audited
  -- moderation/seat/mic RPCs when changing another member.
  if old.user_id is distinct from v_uid then
    raise exception 'room_member_update_forbidden' using errcode='42501';
  end if;

  -- Defense in depth: even if a wider column grant is accidentally restored,
  -- protected membership state cannot be changed directly by the client.
  if new.id is distinct from old.id
     or new.room_id is distinct from old.room_id
     or new.user_id is distinct from old.user_id
     or new.joined_at is distinct from old.joined_at
     or new.seat_index is distinct from old.seat_index
     or new.role is distinct from old.role
     or new.mic_state is distinct from old.mic_state
     or new.promoted_at is distinct from old.promoted_at
     or new.updated_at is distinct from old.updated_at then
    raise exception 'member_must_use_room_rpc' using errcode='42501';
  end if;

  -- Heartbeat time is server-authoritative. A client can request a touch but
  -- cannot backdate or future-date presence to evade stale-session cleanup.
  if new.last_seen_at is distinct from old.last_seen_at then
    new.last_seen_at := pg_catalog.now();
  end if;

  return new;
end;
$function$;

