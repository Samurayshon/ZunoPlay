create or replace function private.zuno_can_view_room_members(p_room_id uuid,p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists(
    select 1 from public.rooms r
    where r.id=p_room_id
      and (
        r.visibility='public'
        or r.owner_id=p_user_id
        or exists(select 1 from public.room_members rm where rm.room_id=p_room_id and rm.user_id=p_user_id)
        or (r.visibility='friends' and exists(
          select 1 from public.friendships f
          where (f.user_id=r.owner_id and f.friend_id=p_user_id)
             or (f.friend_id=r.owner_id and f.user_id=p_user_id)
        ))
      )
  );
$function$;
grant usage on schema private to authenticated;
grant execute on function private.zuno_can_view_room_members(uuid,uuid) to authenticated;
drop policy if exists "Usuários podem ver membros das salas" on public.room_members;
create policy room_members_select_authorized on public.room_members for select to authenticated using (private.zuno_can_view_room_members(room_id,(select auth.uid())));
