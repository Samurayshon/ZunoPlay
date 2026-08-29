-- Defense-in-depth: no code path may create a room membership after a room
-- has transitioned away from active. This closes cleanup/host-departure races
-- and protects direct INSERT paths as well as RPCs.

create or replace function private.zuno_reject_membership_in_inactive_room()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not exists (
    select 1
      from public.rooms r
     where r.id=new.room_id
       and r.status='active'
  ) then
    raise exception 'room_not_available' using errcode='P0002';
  end if;
  return new;
end;
$function$;

revoke all on function private.zuno_reject_membership_in_inactive_room() from public, anon, authenticated;

drop trigger if exists zuno_reject_membership_in_inactive_room on public.room_members;
create trigger zuno_reject_membership_in_inactive_room
before insert on public.room_members
for each row execute function private.zuno_reject_membership_in_inactive_room();
