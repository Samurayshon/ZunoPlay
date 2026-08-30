-- Containment for Pulso privacy while the `moments` Storage bucket remains public.
-- Friends-only posts must not reference media delivered through a public URL.
alter table public.moments_posts
  add constraint moments_posts_private_media_requires_private_delivery_check
  check (visibility <> 'friends' or media_path is null);
