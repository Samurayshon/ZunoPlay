alter function public.is_room_moderator(uuid,uuid) set schema zuno_private;

create or replace function public.is_room_moderator(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select zuno_private.is_room_moderator(p_room_id,p_user_id);
$$;

revoke all on function public.is_room_moderator(uuid,uuid) from public, anon;
grant execute on function public.is_room_moderator(uuid,uuid) to authenticated, service_role;
revoke all on function zuno_private.is_room_moderator(uuid,uuid) from public, anon;
grant execute on function zuno_private.is_room_moderator(uuid,uuid) to authenticated, service_role;
