create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online','offline')),
  page text,
  last_seen_at timestamptz not null default now()
);

alter table public.user_presence enable row level security;

grant select, insert, update on public.user_presence to authenticated;

create policy "presence_select_self_or_friends"
on public.user_presence
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_id = user_presence.user_id)
       or (f.friend_id = auth.uid() and f.user_id = user_presence.user_id)
  )
);

create policy "presence_insert_self"
on public.user_presence
for insert
to authenticated
with check (user_id = auth.uid());

create policy "presence_update_self"
on public.user_presence
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_presence'
  ) then
    alter publication supabase_realtime add table public.user_presence;
  end if;
end $$;
