create or replace function public.set_room_mic(p_room_id uuid,p_state text)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v public.room_members; v_count integer;
begin
 if p_state not in ('muted','unmuted') then raise exception 'invalid_mic_state'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set mic_state=p_state,updated_at=now() where room_id=p_room_id and user_id=auth.uid() and seat_index is not null and mic_state<>'blocked' returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'speaker_required'; end if;
 return v;
end;$function$;

create or replace function public.move_room_seat(p_room_id uuid,p_seat_index smallint)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v public.room_members; v_room public.rooms; v_count integer;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into v_room from public.rooms where id=p_room_id and status='active'; if not found then raise exception 'room_not_available'; end if;
 if p_seat_index<0 or p_seat_index>=v_room.max_speakers then raise exception 'invalid_seat'; end if;
 if exists(select 1 from public.room_members where room_id=p_room_id and seat_index=p_seat_index and user_id<>auth.uid()) then raise exception 'seat_taken'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=p_seat_index,role=case when role in ('owner','admin') then role else 'speaker' end,updated_at=now() where room_id=p_room_id and user_id=auth.uid() returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'not_in_room'; end if;
 return v;
end;$function$;

create or replace function public.leave_room_seat(p_room_id uuid)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v public.room_members; v_count integer;
begin
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=null,role=case when role in ('owner','admin') then role else 'audience' end,mic_state='muted',hand_raised=false,updated_at=now() where room_id=p_room_id and user_id=auth.uid() returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'not_in_room'; end if;
 return v;
end;$function$;

create or replace function public.set_room_member_role(p_room_id uuid,p_target_id uuid,p_role text)
returns public.room_members language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare v public.room_members; v_count integer;
begin
 if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
 if p_role not in ('audience','speaker','admin') then raise exception 'invalid_role'; end if;
 if exists(select 1 from public.rooms where id=p_room_id and owner_id=p_target_id) then raise exception 'owner_role_locked'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set role=p_role,seat_index=case when p_role='audience' then null else seat_index end,mic_state=case when p_role='audience' then 'muted' else mic_state end,updated_at=now() where room_id=p_room_id and user_id=p_target_id returning * into v;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'member_not_found'; end if;
 insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata) values(p_room_id,auth.uid(),p_target_id,case when p_role='admin' then 'promote_admin' when p_role='audience' then 'remove_speaker' else 'invite_speaker' end,jsonb_build_object('role',p_role));
 return v;
end;$function$;

create or replace function public.resolve_room_seat_request(p_request_id uuid,p_approve boolean,p_seat_index smallint default null)
returns public.room_seat_requests language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare q public.room_seat_requests; v_room public.rooms; v_seat smallint; v_count integer;
begin
 select * into q from public.room_seat_requests where id=p_request_id for update; if not found or q.status<>'pending' then raise exception 'request_not_pending'; end if;
 if not public.is_room_moderator(q.room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
 if not p_approve then update public.room_seat_requests set status='rejected',resolved_at=now(),resolved_by=auth.uid() where id=q.id returning * into q; return q; end if;
 select * into v_room from public.rooms where id=q.room_id; v_seat:=coalesce(p_seat_index,q.requested_seat);
 if v_seat is null then select s into v_seat from generate_series(0,v_room.max_speakers-1) s where not exists(select 1 from public.room_members m where m.room_id=q.room_id and m.seat_index=s) order by s limit 1; end if;
 if v_seat is null or v_seat<0 or v_seat>=v_room.max_speakers or exists(select 1 from public.room_members where room_id=q.room_id and seat_index=v_seat) then raise exception 'no_seat_available'; end if;
 perform set_config('zuno.room_internal','1',true);
 update public.room_members set seat_index=v_seat,role=case when role in ('owner','admin') then role else 'speaker' end,mic_state='muted',promoted_at=now(),updated_at=now() where room_id=q.room_id and user_id=q.user_id;
 get diagnostics v_count=row_count;
 perform set_config('zuno.room_internal','0',true);
 if v_count=0 then raise exception 'member_left_room'; end if;
 update public.room_seat_requests set status='approved',resolved_at=now(),resolved_by=auth.uid() where id=q.id returning * into q;
 return q;
end;$function$;
