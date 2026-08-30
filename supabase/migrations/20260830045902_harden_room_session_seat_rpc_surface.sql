alter function public.create_room_invite(uuid,uuid,integer) set schema zuno_private;
alter function public.create_voice_room(text,text,text,text,text) set schema zuno_private;
alter function public.join_room_session(uuid,text) set schema zuno_private;
alter function public.leave_room_seat(uuid) set schema zuno_private;
alter function public.leave_room_session(uuid) set schema zuno_private;
alter function public.move_room_seat(uuid,smallint) set schema zuno_private;
alter function public.request_room_seat(uuid,smallint) set schema zuno_private;
alter function public.resolve_room_seat_request(uuid,boolean,smallint) set schema zuno_private;
alter function public.set_room_mic(uuid,text) set schema zuno_private;
alter function public.take_room_seat(uuid,smallint) set schema zuno_private;

create function public.create_room_invite(p_room_id uuid,p_invitee_id uuid default null,p_expires_minutes integer default 60) returns table(room_id uuid,invite_token text,expires_at timestamptz) language sql security invoker set search_path='' as $$ select * from zuno_private.create_room_invite(p_room_id,p_invitee_id,p_expires_minutes); $$;
create function public.create_voice_room(p_name text,p_category text default 'bate_papo',p_visibility text default 'public',p_mic_access text default 'open',p_description text default null) returns public.rooms language sql security invoker set search_path='' as $$ select zuno_private.create_voice_room(p_name,p_category,p_visibility,p_mic_access,p_description); $$;
create function public.join_room_session(p_room_id uuid,p_invite_token text default null) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.join_room_session(p_room_id,p_invite_token); $$;
create function public.leave_room_seat(p_room_id uuid) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.leave_room_seat(p_room_id); $$;
create function public.leave_room_session(p_room_id uuid) returns boolean language sql security invoker set search_path='' as $$ select zuno_private.leave_room_session(p_room_id); $$;
create function public.move_room_seat(p_room_id uuid,p_seat_index smallint) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.move_room_seat(p_room_id,p_seat_index); $$;
create function public.request_room_seat(p_room_id uuid,p_requested_seat smallint default null) returns public.room_seat_requests language sql security invoker set search_path='' as $$ select zuno_private.request_room_seat(p_room_id,p_requested_seat); $$;
create function public.resolve_room_seat_request(p_request_id uuid,p_approve boolean,p_seat_index smallint default null) returns public.room_seat_requests language sql security invoker set search_path='' as $$ select zuno_private.resolve_room_seat_request(p_request_id,p_approve,p_seat_index); $$;
create function public.set_room_mic(p_room_id uuid,p_state text) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.set_room_mic(p_room_id,p_state); $$;
create function public.take_room_seat(p_room_id uuid,p_seat_index smallint default null) returns public.room_members language sql security invoker set search_path='' as $$ select zuno_private.take_room_seat(p_room_id,p_seat_index); $$;

do $$ declare f regprocedure; begin foreach f in array array['public.create_room_invite(uuid,uuid,integer)'::regprocedure,'public.create_voice_room(text,text,text,text,text)'::regprocedure,'public.join_room_session(uuid,text)'::regprocedure,'public.leave_room_seat(uuid)'::regprocedure,'public.leave_room_session(uuid)'::regprocedure,'public.move_room_seat(uuid,smallint)'::regprocedure,'public.request_room_seat(uuid,smallint)'::regprocedure,'public.resolve_room_seat_request(uuid,boolean,smallint)'::regprocedure,'public.set_room_mic(uuid,text)'::regprocedure,'public.take_room_seat(uuid,smallint)'::regprocedure] loop execute format('revoke all on function %s from public, anon',f); execute format('grant execute on function %s to authenticated, service_role',f); end loop; end $$;
