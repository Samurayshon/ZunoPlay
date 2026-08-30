create or replace function public.zuno_post_likers(p_post_id uuid)
returns table(user_id uuid, username text, nickname text, avatar_url text, level integer, liked_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select ml.user_id,
         p.username,
         p.nickname,
         p.avatar_url,
         coalesce(p.level, 1)::integer,
         ml.created_at as liked_at
  from public.moments_likes ml
  left join public.profiles p on p.id = ml.user_id
  where ml.post_id = p_post_id
  order by ml.created_at desc;
$$;

grant execute on function public.zuno_post_likers(uuid) to authenticated;
revoke execute on function public.zuno_post_likers(uuid) from anon;
