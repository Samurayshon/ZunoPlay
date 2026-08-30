drop policy if exists moments_reports_insert_own on public.moments_reports;
create policy moments_reports_insert_own
on public.moments_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and reported_user_id <> (select auth.uid())
  and exists (
    select 1
    from public.moments_posts p
    where p.id = moments_reports.post_id
      and p.user_id = moments_reports.reported_user_id
      and p.user_id <> (select auth.uid())
  )
);
