create schema if not exists zuno_private;

alter function public.block_user(uuid) set schema zuno_private;
alter function public.unblock_user(uuid) set schema zuno_private;
alter function public.send_friend_request(uuid) set schema zuno_private;
alter function public.cancel_friend_request(uuid) set schema zuno_private;
alter function public.respond_friend_request(uuid,text) set schema zuno_private;
alter function public.unfriend(uuid) set schema zuno_private;
alter function public.pulso_is_blocked(uuid) set schema zuno_private;
alter function public.zuno_are_friends(uuid,uuid) set schema zuno_private;

create function public.block_user(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.block_user(target_user_id) $$;
create function public.unblock_user(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.unblock_user(target_user_id) $$;
create function public.send_friend_request(target_user_id uuid) returns uuid language sql security invoker set search_path='' as $$ select zuno_private.send_friend_request(target_user_id) $$;
create function public.cancel_friend_request(request_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.cancel_friend_request(request_id) $$;
create function public.respond_friend_request(request_id uuid, decision text) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.respond_friend_request(request_id,decision) $$;
create function public.unfriend(target_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.unfriend(target_user_id) $$;
create function public.pulso_is_blocked(other_user uuid) returns boolean language sql stable security invoker set search_path='' as $$ select zuno_private.pulso_is_blocked(other_user) $$;
create function public.zuno_are_friends(p_a uuid,p_b uuid) returns boolean language sql stable security invoker set search_path='' as $$ select zuno_private.zuno_are_friends(p_a,p_b) $$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.send_friend_request(uuid), public.cancel_friend_request(uuid), public.respond_friend_request(uuid,text), public.unfriend(uuid), public.pulso_is_blocked(uuid), public.zuno_are_friends(uuid,uuid) from public, anon;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.send_friend_request(uuid), public.cancel_friend_request(uuid), public.respond_friend_request(uuid,text), public.unfriend(uuid), public.pulso_is_blocked(uuid), public.zuno_are_friends(uuid,uuid) to authenticated, service_role;
revoke all on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) from public, anon, authenticated;
grant execute on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) to service_role;

grant usage on schema zuno_private to authenticated;
grant execute on function zuno_private.block_user(uuid), zuno_private.unblock_user(uuid), zuno_private.send_friend_request(uuid), zuno_private.cancel_friend_request(uuid), zuno_private.respond_friend_request(uuid,text), zuno_private.unfriend(uuid), zuno_private.pulso_is_blocked(uuid), zuno_private.zuno_are_friends(uuid,uuid) to authenticated;
