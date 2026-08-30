create or replace function public.zuno_pulso_share_targets()
returns table(
  user_id uuid,
  username text,
  nickname text,
  avatar_url text,
  level integer,
  conversation_id uuid,
  last_message_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select auth.uid() as id
  ), friends as (
    select distinct
      case when f.user_id = me.id then f.friend_id else f.user_id end as friend_id
    from public.friendships f
    cross join me
    where me.id is not null
      and (f.user_id = me.id or f.friend_id = me.id)
  )
  select
    p.id as user_id,
    p.username,
    p.nickname,
    p.avatar_url,
    coalesce(p.level,1) as level,
    c.id as conversation_id,
    c.last_message_at
  from friends fr
  cross join me
  join public.profiles p on p.id = fr.friend_id
  left join public.conversations c
    on c.type = 'direct'
   and c.direct_key = least(me.id::text,p.id::text)||':'||greatest(me.id::text,p.id::text)
  where not exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = me.id and b.blocked_id = p.id)
       or (b.blocker_id = p.id and b.blocked_id = me.id)
  )
  order by c.last_message_at desc nulls last, coalesce(nullif(p.nickname,''),p.username) asc;
$$;
revoke all on function public.zuno_pulso_share_targets() from public, anon;
grant execute on function public.zuno_pulso_share_targets() to authenticated;
