drop policy if exists moments_comment_likes_read on public.moments_comment_likes;
drop policy if exists moments_comment_likes_insert_own on public.moments_comment_likes;

create policy moments_comment_likes_read
on public.moments_comment_likes
for select
to authenticated
using (
  exists (
    select 1
    from public.moments_comments c
    join public.moments_posts p on p.id = c.post_id
    where c.id = moments_comment_likes.comment_id
      and not public.pulso_is_blocked(p.user_id)
      and (
        p.visibility = 'public'
        or p.user_id = (select auth.uid())
        or (
          p.visibility = 'friends'
          and exists (
            select 1
            from public.friendships f
            where (f.user_id = (select auth.uid()) and f.friend_id = p.user_id)
               or (f.friend_id = (select auth.uid()) and f.user_id = p.user_id)
          )
        )
      )
  )
);

create policy moments_comment_likes_insert_own
on public.moments_comment_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.moments_comments c
    join public.moments_posts p on p.id = c.post_id
    where c.id = moments_comment_likes.comment_id
      and not public.pulso_is_blocked(p.user_id)
      and (
        p.visibility = 'public'
        or p.user_id = (select auth.uid())
        or (
          p.visibility = 'friends'
          and exists (
            select 1
            from public.friendships f
            where (f.user_id = (select auth.uid()) and f.friend_id = p.user_id)
               or (f.friend_id = (select auth.uid()) and f.user_id = p.user_id)
          )
        )
      )
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='moments_comment_likes'
  ) then
    alter publication supabase_realtime add table public.moments_comment_likes;
  end if;
end $$;
