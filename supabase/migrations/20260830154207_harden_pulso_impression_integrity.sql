revoke all on table public.moments_impressions from anon;
revoke update, delete on table public.moments_impressions from authenticated;

drop policy if exists moments_impressions_insert_own on public.moments_impressions;
create policy moments_impressions_insert_own
on public.moments_impressions
for insert
to authenticated
with check (
  viewer_id = (select auth.uid())
  and exists (
    select 1
    from public.moments_posts p
    where p.id = moments_impressions.post_id
      and p.user_id <> (select auth.uid())
  )
);

create unique index if not exists moments_impressions_unique_viewer_post_idx
on public.moments_impressions(post_id, viewer_id);

create or replace function public.zunoplay_normalize_moment_impression()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if current_user = 'authenticated' then
    new.viewer_id := auth.uid();
    new.created_at := pg_catalog.clock_timestamp();
  end if;
  return new;
end
$function$;

drop trigger if exists zunoplay_normalize_moment_impression_trigger on public.moments_impressions;
create trigger zunoplay_normalize_moment_impression_trigger
before insert on public.moments_impressions
for each row execute function public.zunoplay_normalize_moment_impression();
