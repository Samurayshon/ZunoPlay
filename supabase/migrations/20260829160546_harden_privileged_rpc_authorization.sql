create or replace function public.zuno_are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and (auth.uid() = p_a or auth.uid() = p_b)
    and exists(
      select 1
      from public.friendships f
      where (f.user_id = p_a and f.friend_id = p_b)
         or (f.user_id = p_b and f.friend_id = p_a)
    );
$function$;

create or replace function public.is_room_moderator(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select
    auth.uid() is not null
    and p_user_id = auth.uid()
    and (
      exists(
        select 1
        from public.rooms r
        where r.id = p_room_id
          and r.owner_id = p_user_id
      )
      or exists(
        select 1
        from public.room_members m
        where m.room_id = p_room_id
          and m.user_id = p_user_id
          and m.role in ('owner','admin')
      )
    );
$function$;

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

  insert into public.room_bans(room_id,user_id,banned_by,reason,expires_at)
  values(
    p_room_id,
    p_user_id,
    v_uid,
    nullif(pg_catalog.btrim(p_reason),''),
    case
      when p_hours is null then null
      else pg_catalog.now() + pg_catalog.make_interval(hours => pg_catalog.greatest(1,p_hours))
    end
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
