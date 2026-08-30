create or replace function public.purge_room_messages_on_member_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.room_messages
  where room_id = old.room_id
    and user_id = old.user_id;
  return old;
end;
$$;

revoke all on function public.purge_room_messages_on_member_leave() from public, anon, authenticated;

drop trigger if exists purge_room_messages_after_member_leave on public.room_members;
create trigger purge_room_messages_after_member_leave
after delete on public.room_members
for each row execute function public.purge_room_messages_on_member_leave();

-- Limpa resíduos de sessões antigas já existentes.
delete from public.room_messages m
where not exists (
  select 1
  from public.room_members rm
  where rm.room_id = m.room_id
    and rm.user_id = m.user_id
    and m.created_at >= rm.joined_at
);
