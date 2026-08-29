drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
on public.notifications
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant delete on table public.notifications to authenticated;
