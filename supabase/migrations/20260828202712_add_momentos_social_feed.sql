create table if not exists public.moments_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 2000),
  media_path text,
  media_type text check (media_type is null or media_type in ('image','video')),
  hashtags text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','friends')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(content)) > 0 or media_path is not null)
);

create table if not exists public.moments_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.moments_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 600),
  created_at timestamptz not null default now()
);

create table if not exists public.moments_likes (
  post_id uuid not null references public.moments_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

create index if not exists moments_posts_created_idx on public.moments_posts(created_at desc);
create index if not exists moments_posts_user_idx on public.moments_posts(user_id,created_at desc);
create index if not exists moments_posts_hashtags_idx on public.moments_posts using gin(hashtags);
create index if not exists moments_comments_post_idx on public.moments_comments(post_id,created_at);

alter table public.moments_posts enable row level security;
alter table public.moments_comments enable row level security;
alter table public.moments_likes enable row level security;

drop policy if exists "moments_posts_read" on public.moments_posts;
create policy "moments_posts_read" on public.moments_posts for select to authenticated using (visibility = 'public' or user_id = auth.uid() or (visibility = 'friends' and exists (select 1 from public.friendships f where (f.user_id = auth.uid() and f.friend_id = moments_posts.user_id) or (f.friend_id = auth.uid() and f.user_id = moments_posts.user_id))));
drop policy if exists "moments_posts_insert" on public.moments_posts;
create policy "moments_posts_insert" on public.moments_posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "moments_posts_update" on public.moments_posts;
create policy "moments_posts_update" on public.moments_posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "moments_posts_delete" on public.moments_posts;
create policy "moments_posts_delete" on public.moments_posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "moments_comments_read" on public.moments_comments;
create policy "moments_comments_read" on public.moments_comments for select to authenticated using (exists (select 1 from public.moments_posts p where p.id = moments_comments.post_id));
drop policy if exists "moments_comments_insert" on public.moments_comments;
create policy "moments_comments_insert" on public.moments_comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.moments_posts p where p.id = moments_comments.post_id));
drop policy if exists "moments_comments_delete" on public.moments_comments;
create policy "moments_comments_delete" on public.moments_comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "moments_likes_read" on public.moments_likes;
create policy "moments_likes_read" on public.moments_likes for select to authenticated using (exists (select 1 from public.moments_posts p where p.id = moments_likes.post_id));
drop policy if exists "moments_likes_insert" on public.moments_likes;
create policy "moments_likes_insert" on public.moments_likes for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.moments_posts p where p.id = moments_likes.post_id));
drop policy if exists "moments_likes_delete" on public.moments_likes;
create policy "moments_likes_delete" on public.moments_likes for delete to authenticated using (user_id = auth.uid());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('moments','moments',true,15728640,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "moments_media_insert" on storage.objects;
create policy "moments_media_insert" on storage.objects for insert to authenticated with check (bucket_id='moments' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "moments_media_update" on storage.objects;
create policy "moments_media_update" on storage.objects for update to authenticated using (bucket_id='moments' and owner_id = auth.uid()::text) with check (bucket_id='moments' and owner_id = auth.uid()::text);
drop policy if exists "moments_media_delete" on storage.objects;
create policy "moments_media_delete" on storage.objects for delete to authenticated using (bucket_id='moments' and owner_id = auth.uid()::text);
