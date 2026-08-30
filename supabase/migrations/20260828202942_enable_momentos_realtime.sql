do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='moments_posts') then alter publication supabase_realtime add table public.moments_posts; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='moments_comments') then alter publication supabase_realtime add table public.moments_comments; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='moments_likes') then alter publication supabase_realtime add table public.moments_likes; end if;
end $$;
