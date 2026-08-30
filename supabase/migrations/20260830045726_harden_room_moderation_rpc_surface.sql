alter function public.ban_room_member(uuid,uuid,text,integer) set schema zuno_private;
alter function public.unban_room_member(uuid,uuid) set schema zuno_private;
alter function public.moderate_room_member(uuid,uuid,text,text) set schema zuno_private;
alter function public.set_room_member_role(uuid,uuid,text) set schema zuno_private;
alter function public.end_voice_room(uuid) set schema zuno_private;
alter function public.start_room_minigame(uuid,text) set schema zuno_private;

create or replace function public.ban_room_member(p_room_id uuid,p_user_id uuid,p_reason text default null,p_hours integer default null) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.ban_room_member(p_room_id,p_user_id,p_reason,p_hours); $$;
create or replace function public.unban_room_member(p_room_id uuid,p_user_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.unban_room_member(p_room_id,p_user_id); $$;
create or replace function public.moderate_room_member(p_room_id uuid,p_target_id uuid,p_action text,p_reason text default null) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.moderate_room_member(p_room_id,p_target_id,p_action,p_reason); $$;
create or replace function public.set_room_member_role(p_room_id uuid,p_target_id uuid,p_role text) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.set_room_member_role(p_room_id,p_target_id,p_role); $$;
create or replace function public.end_voice_room(p_room_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.end_voice_room(p_room_id); $$;
create or replace function public.start_room_minigame(p_room_id uuid,p_game_key text) returns public.room_game_sessions language sql security invoker set search_path='' as $$ select zuno_private.start_room_minigame(p_room_id,p_game_key); $$;

revoke all on function public.ban_room_member(uuid,uuid,text,integer), public.unban_room_member(uuid,uuid), public.moderate_room_member(uuid,uuid,text,text), public.set_room_member_role(uuid,uuid,text), public.end_voice_room(uuid), public.start_room_minigame(uuid,text) from public,anon;
grant execute on function public.ban_room_member(uuid,uuid,text,integer), public.unban_room_member(uuid,uuid), public.moderate_room_member(uuid,uuid,text,text), public.set_room_member_role(uuid,uuid,text), public.end_voice_room(uuid), public.start_room_minigame(uuid,text) to authenticated,service_role;
revoke all on function zuno_private.ban_room_member(uuid,uuid,text,integer), zuno_private.unban_room_member(uuid,uuid), zuno_private.moderate_room_member(uuid,uuid,text,text), zuno_private.set_room_member_role(uuid,uuid,text), zuno_private.end_voice_room(uuid), zuno_private.start_room_minigame(uuid,text) from public,anon;
grant execute on function zuno_private.ban_room_member(uuid,uuid,text,integer), zuno_private.unban_room_member(uuid,uuid), zuno_private.moderate_room_member(uuid,uuid,text,text), zuno_private.set_room_member_role(uuid,uuid,text), zuno_private.end_voice_room(uuid), zuno_private.start_room_minigame(uuid,text) to authenticated,service_role;
