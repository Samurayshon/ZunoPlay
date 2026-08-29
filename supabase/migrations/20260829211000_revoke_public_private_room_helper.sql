-- Etapa 19 / ZUN-11
-- Defense in depth: private SECURITY DEFINER helpers must not inherit PUBLIC execute.

revoke execute on function private.zuno_can_view_room_members(uuid,uuid) from public;
revoke execute on function private.zuno_can_view_room_members(uuid,uuid) from anon;
grant execute on function private.zuno_can_view_room_members(uuid,uuid) to authenticated;
