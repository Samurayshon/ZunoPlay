create or replace function public.pulso_is_blocked(other_user uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.user_blocks b
    where (b.blocker_id=auth.uid() and b.blocked_id=other_user)
       or (b.blocker_id=other_user and b.blocked_id=auth.uid())
  );
$$;

drop policy if exists moments_posts_read on public.moments_posts;
create policy moments_posts_read on public.moments_posts for select to authenticated using (
  not public.pulso_is_blocked(user_id) and (
    visibility='public' or user_id=auth.uid() or (
      visibility='friends' and exists(
        select 1 from public.friendships f
        where (f.user_id=auth.uid() and f.friend_id=moments_posts.user_id)
           or (f.friend_id=auth.uid() and f.user_id=moments_posts.user_id)
      )
    )
  )
);

drop policy if exists moments_follows_insert_own on public.moments_follows;
create policy moments_follows_insert_own on public.moments_follows for insert to authenticated with check (
  follower_id=auth.uid() and not public.pulso_is_blocked(following_id)
);
