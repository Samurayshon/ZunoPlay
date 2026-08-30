create index if not exists zuno_stack_match_state_updated_by_idx
  on public.zuno_stack_match_state(updated_by);

alter policy zuno_stack_state_select_members
on public.zuno_stack_match_state
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = zuno_stack_match_state.room_id
      and rm.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.rooms r
    where r.id = zuno_stack_match_state.room_id
      and r.owner_id = (select auth.uid())
  )
);

alter policy zuno_stack_state_insert_members
on public.zuno_stack_match_state
with check (
  updated_by = (select auth.uid())
  and (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = zuno_stack_match_state.room_id
        and rm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.rooms r
      where r.id = zuno_stack_match_state.room_id
        and r.owner_id = (select auth.uid())
    )
  )
);

alter policy zuno_stack_state_update_members
on public.zuno_stack_match_state
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = zuno_stack_match_state.room_id
      and rm.user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.rooms r
    where r.id = zuno_stack_match_state.room_id
      and r.owner_id = (select auth.uid())
  )
)
with check (updated_by = (select auth.uid()));
