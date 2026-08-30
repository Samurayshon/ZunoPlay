create unique index if not exists room_members_unique_occupied_seat on public.room_members(room_id, seat_index) where seat_index is not null;

revoke execute on function public.is_room_moderator(uuid, uuid) from anon;
revoke execute on function public.is_room_moderator(uuid, uuid) from authenticated;

grant execute on function public.create_voice_room(text,text,text,text,text) to authenticated;
grant execute on function public.join_room_session(uuid) to authenticated;
grant execute on function public.leave_room_session(uuid) to authenticated;
grant execute on function public.take_room_seat(uuid,smallint) to authenticated;
grant execute on function public.leave_room_seat(uuid) to authenticated;
grant execute on function public.request_room_seat(uuid,smallint) to authenticated;
grant execute on function public.resolve_room_seat_request(uuid,boolean,smallint) to authenticated;
grant execute on function public.set_room_mic(uuid,text) to authenticated;
grant execute on function public.set_room_member_role(uuid,uuid,text) to authenticated;
grant execute on function public.moderate_room_member(uuid,uuid,text,text) to authenticated;
grant execute on function public.end_voice_room(uuid) to authenticated;
grant execute on function public.claim_voice_room_reward(uuid) to authenticated;
