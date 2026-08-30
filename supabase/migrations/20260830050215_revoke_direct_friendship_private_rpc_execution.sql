revoke all on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) from authenticated;

create or replace function public.block_user(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.block_user(target_user_id) $$;
create or replace function public.unblock_user(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.unblock_user(target_user_id) $$;
create or replace function public.send_friend_request(target_user_id uuid) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.send_friend_request(target_user_id) $$;
create or replace function public.cancel_friend_request(request_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.cancel_friend_request(request_id) $$;
create or replace function public.respond_friend_request(request_id uuid, decision text) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.respond_friend_request(request_id,decision) $$;
create or replace function public.unfriend(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.unfriend(target_user_id) $$;
create or replace function public.pulso_is_blocked(other_user uuid) returns boolean language sql stable security invoker set search_path='' as $$ select zuno_private.pulso_is_blocked(other_user) $$;
create or replace function public.zuno_are_friends(p_a uuid,p_b uuid) returns boolean language sql stable security invoker set search_path='' as $$ select zuno_private.zuno_are_friends(p_a,p_b) $$;

-- Public invoker wrappers need only wrapper execution. The private schema is not exposed through PostgREST;
-- retain function execution through PostgreSQL call chain while preventing API schema exposure.
grant execute on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) to authenticated;
