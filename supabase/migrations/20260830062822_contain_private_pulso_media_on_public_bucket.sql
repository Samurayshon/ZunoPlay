alter table public.moments_posts
  add constraint moments_posts_private_media_requires_private_delivery_check
  check (visibility <> 'friends' or media_path is null);
