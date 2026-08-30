create or replace function public.moderate_room_member(p_room_id uuid, p_target_id uuid, p_action text, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare v_target public.room_members;
begin
  if not public.is_room_moderator(p_room_id,auth.uid()) then raise exception 'moderator_required' using errcode='42501'; end if;
  if p_target_id=auth.uid() then raise exception 'cannot_moderate_self'; end if;
  if exists(select 1 from public.rooms where id=p_room_id and owner_id=p_target_id) then raise exception 'cannot_moderate_owner'; end if;
  select * into v_target from public.room_members where room_id=p_room_id and user_id=p_target_id;
  if p_action in ('mute','unmute','remove_speaker','kick','ban') and not found then raise exception 'member_not_found'; end if;
  if p_action='mute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='blocked',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='unmute' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set mic_state='muted',updated_at=now() where room_id=p_room_id and user_id=p_target_id and mic_state='blocked';
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='remove_speaker' then
    perform set_config('zuno.room_internal','1',true);
    update public.room_members set seat_index=null,role=case when role='admin' then 'admin' else 'audience' end,mic_state='muted',updated_at=now() where room_id=p_room_id and user_id=p_target_id;
    perform set_config('zuno.room_internal','0',true);
  elsif p_action='kick' then
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=auth.uid() where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='ban' then
    insert into public.room_bans(room_id,user_id,banned_by,reason) values(p_room_id,p_target_id,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''))
    on conflict(room_id,user_id) do update set banned_by=excluded.banned_by,reason=excluded.reason,expires_at=null,created_at=now();
    delete from public.room_members where room_id=p_room_id and user_id=p_target_id;
    update public.room_seat_requests set status='cancelled',resolved_at=now(),resolved_by=auth.uid() where room_id=p_room_id and user_id=p_target_id and status='pending';
  elsif p_action='unban' then
    delete from public.room_bans where room_id=p_room_id and user_id=p_target_id;
  else raise exception 'invalid_moderation_action'; end if;
  insert into public.room_moderation_actions(room_id,actor_id,target_id,action,metadata)
  values(p_room_id,auth.uid(),p_target_id,p_action,jsonb_build_object('reason',p_reason));
  return true;
end; $function$;
revoke all on function public.moderate_room_member(uuid,uuid,text,text) from public, anon;
grant execute on function public.moderate_room_member(uuid,uuid,text,text) to authenticated;
