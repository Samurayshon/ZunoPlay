create or replace function private.zuno_is_conversation_member(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if current_user = 'authenticated' and p_user_id is distinct from auth.uid() then return false; end if;
  return exists(select 1 from public.conversation_members cm where cm.conversation_id=p_conversation_id and cm.user_id=p_user_id);
end
$function$;

create or replace function private.zuno_is_room_owner(p_room_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if current_user = 'authenticated' and p_user_id is distinct from auth.uid() then return false; end if;
  return exists(select 1 from public.rooms r where r.id=p_room_id and r.owner_id=p_user_id);
end
$function$;

create or replace function private.zuno_can_view_room_members(p_room_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if current_user = 'authenticated' and p_user_id is distinct from auth.uid() then return false; end if;
  return exists(
    select 1 from public.rooms r
    where r.id=p_room_id and (
      r.visibility='public' or r.owner_id=p_user_id
      or exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id)
      or (r.visibility='friends' and exists(select 1 from public.friendships f where (f.user_id=r.owner_id and f.friend_id=p_user_id) or (f.friend_id=r.owner_id and f.user_id=p_user_id)))
    )
  );
end
$function$;
