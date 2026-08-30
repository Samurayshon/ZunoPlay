revoke all on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) from authenticated;

-- The public API remains SECURITY INVOKER. zuno_private is not an exposed PostgREST schema;
-- authenticated execution here only permits the public wrapper's PostgreSQL call chain.
grant execute on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) to authenticated;
