create or replace function public.join_room_session(p_room_id uuid)
returns public.room_members
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_member public.room_members;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  perform 1 from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  delete from public.room_members
  where room_id = p_room_id
    and user_id = auth.uid();

  insert into public.room_members(room_id, user_id)
  values (p_room_id, auth.uid())
  returning * into v_member;

  return v_member;
end;
$$;

revoke all on function public.join_room_session(uuid) from public, anon;
grant execute on function public.join_room_session(uuid) to authenticated;
