alter table public.zuno_stack_match_state add column if not exists host_id uuid null references auth.users(id) on delete set null; alter table public.zuno_stack_match_state add column if not exists host_lease_until timestamptz null;

create or replace function public.zuno_stack_claim_host(p_room_id uuid)
returns public.zuno_stack_match_state
language plpgsql
security invoker
set search_path=public
as $$
declare r public.zuno_stack_match_state;
begin
  update public.zuno_stack_match_state
  set host_id=auth.uid(), host_lease_until=now()+interval '25 seconds', updated_by=auth.uid(), updated_at=now()
  where room_id=p_room_id
    and (host_id is null or host_id=auth.uid() or host_lease_until is null or host_lease_until<now())
  returning * into r;
  if found then return r; end if;
  select * into r from public.zuno_stack_match_state where room_id=p_room_id;
  return r;
end;$$;

grant execute on function public.zuno_stack_claim_host(uuid) to authenticated;

create or replace function public.zuno_stack_release_host(p_room_id uuid)
returns void
language sql
security invoker
set search_path=public
as $$
  update public.zuno_stack_match_state
  set host_id=null, host_lease_until=null, updated_by=auth.uid(), updated_at=now()
  where room_id=p_room_id and host_id=auth.uid();
$$;

grant execute on function public.zuno_stack_release_host(uuid) to authenticated;
