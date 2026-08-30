alter table public.user_presence
  add column if not exists custom_status text;

alter table public.user_presence
  drop constraint if exists user_presence_custom_status_length_check;

alter table public.user_presence
  add constraint user_presence_custom_status_length_check
  check (custom_status is null or char_length(btrim(custom_status)) between 1 and 40);

-- Avoid per-row auth.uid() re-evaluation in the presence policies.
drop policy if exists presence_select_self_or_friends on public.user_presence;
create policy presence_select_self_or_friends
on public.user_presence
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.friendships f
    where (f.user_id = (select auth.uid()) and f.friend_id = user_presence.user_id)
       or (f.friend_id = (select auth.uid()) and f.user_id = user_presence.user_id)
  )
);

drop policy if exists presence_insert_self on public.user_presence;
create policy presence_insert_self
on public.user_presence
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists presence_update_self on public.user_presence;
create policy presence_update_self
on public.user_presence
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
