-- Fix regression introduced by privileged RPC hardening: GREATEST is not
-- schema-qualified in PostgreSQL. Keep the owner protection and restore the
-- legitimate moderator ban path.

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
  v_hours integer;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not public.is_room_moderator(p_room_id, v_uid) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  if p_user_id = v_uid then
    raise exception 'cannot_ban_self';
  end if;

  if exists(
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.owner_id = p_user_id
  ) then
    raise exception 'cannot_ban_owner' using errcode='42501';
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
  set banned_by = excluded.banned_by,
      reason = excluded.reason,
      created_at = pg_catalog.now(),
      expires_at = excluded.expires_at;

  delete from public.room_members
  where room_id = p_room_id
    and user_id = p_user_id;

  return true;
end;
$function$;
