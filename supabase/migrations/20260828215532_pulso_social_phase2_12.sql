alter table public.moments_posts add column if not exists source_type text not null default 'user';
alter table public.moments_posts add column if not exists source_id uuid;
alter table public.moments_posts add column if not exists location_label text;
alter table public.moments_posts add column if not exists view_count integer not null default 0;
alter table public.moments_comments add column if not exists parent_comment_id uuid references public.moments_comments(id) on delete cascade;

create table if not exists public.moments_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.moments_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.moments_posts(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id)
);

create table if not exists public.moments_comment_likes (
  comment_id uuid not null references public.moments_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.moments_impressions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.moments_posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  surface text not null check (surface in ('friends','general','profile','share')),
  created_at timestamptz not null default now()
);

create index if not exists moments_follows_following_idx on public.moments_follows(following_id, created_at desc);
create index if not exists moments_reports_status_idx on public.moments_reports(status, created_at desc);
create index if not exists moments_comment_likes_comment_idx on public.moments_comment_likes(comment_id);
create index if not exists moments_impressions_post_idx on public.moments_impressions(post_id, created_at desc);
create index if not exists moments_posts_source_idx on public.moments_posts(source_type, created_at desc);

alter table public.moments_follows enable row level security;
alter table public.moments_reports enable row level security;
alter table public.moments_comment_likes enable row level security;
alter table public.moments_impressions enable row level security;

create policy "moments_follows_read" on public.moments_follows for select to authenticated using (true);
create policy "moments_follows_insert_own" on public.moments_follows for insert to authenticated with check (follower_id = auth.uid());
create policy "moments_follows_delete_own" on public.moments_follows for delete to authenticated using (follower_id = auth.uid());

create policy "moments_reports_insert_own" on public.moments_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "moments_reports_read_own" on public.moments_reports for select to authenticated using (reporter_id = auth.uid());

create policy "moments_comment_likes_read" on public.moments_comment_likes for select to authenticated using (true);
create policy "moments_comment_likes_insert_own" on public.moments_comment_likes for insert to authenticated with check (user_id = auth.uid());
create policy "moments_comment_likes_delete_own" on public.moments_comment_likes for delete to authenticated using (user_id = auth.uid());

create policy "moments_impressions_insert_own" on public.moments_impressions for insert to authenticated with check (viewer_id = auth.uid());
create policy "moments_impressions_read_own" on public.moments_impressions for select to authenticated using (viewer_id = auth.uid());

create or replace function public.pulso_emit_notification() returns trigger
language plpgsql security definer set search_path=public as $$
declare target_user uuid; actor uuid; kind text; msg text; rel uuid;
begin
  if tg_table_name='moments_likes' then
    select user_id into target_user from public.moments_posts where id=new.post_id;
    actor:=new.user_id; kind:='pulso_like'; msg:='curtiu sua publicação no Pulso'; rel:=new.post_id;
  elsif tg_table_name='moments_comments' then
    select user_id into target_user from public.moments_posts where id=new.post_id;
    actor:=new.user_id; kind:='pulso_comment'; msg:='comentou na sua publicação do Pulso'; rel:=new.post_id;
  elsif tg_table_name='moments_follows' then
    target_user:=new.following_id; actor:=new.follower_id; kind:='pulso_follow'; msg:='começou a seguir você no Pulso'; rel:=null;
  end if;
  if target_user is not null and actor is not null and target_user<>actor then
    insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,metadata)
    values(target_user,kind,'Pulso',msg,actor,rel,'social','normal',case when rel is null then 'perfil.html?id='||actor else 'momentos.html?post='||rel end,kind||':'||actor||':'||coalesce(rel::text,target_user::text),jsonb_build_object('surface','pulso'));
  end if;
  return new;
end;$$;

drop trigger if exists trg_pulso_like_notification on public.moments_likes;
create trigger trg_pulso_like_notification after insert on public.moments_likes for each row execute function public.pulso_emit_notification();
drop trigger if exists trg_pulso_comment_notification on public.moments_comments;
create trigger trg_pulso_comment_notification after insert on public.moments_comments for each row execute function public.pulso_emit_notification();
drop trigger if exists trg_pulso_follow_notification on public.moments_follows;
create trigger trg_pulso_follow_notification after insert on public.moments_follows for each row execute function public.pulso_emit_notification();
