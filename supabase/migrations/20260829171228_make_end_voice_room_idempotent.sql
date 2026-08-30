create or replace function public.end_voice_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_transitioned boolean := false;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not exists(
    select 1
    from public.rooms r
    where r.id=p_room_id
      and r.owner_id=v_actor
  ) then
    raise exception 'owner_required' using errcode='42501';
  end if;

  update public.rooms
     set status='ended',
         ended_at=now(),
         updated_at=now(),
         is_discoverable=false
   where id=p_room_id
     and owner_id=v_actor
     and status<>'ended'
  returning true into v_transitioned;

  if not coalesce(v_transitioned,false) then
    return true;
  end if;

  delete from public.room_members
   where room_id=p_room_id;

  update public.room_seat_requests
     set status='expired',
         resolved_at=now(),
         resolved_by=v_actor
   where room_id=p_room_id
     and status='pending';

  insert into public.room_moderation_actions(room_id,actor_id,target_id,action)
  values(p_room_id,v_actor,null,'end_room');

  return true;
end;
$function$;

revoke all on function public.end_voice_room(uuid) from public, anon;
grant execute on function public.end_voice_room(uuid) to authenticated;
