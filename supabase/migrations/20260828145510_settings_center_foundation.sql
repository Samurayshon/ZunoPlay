create table if not exists public.app_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_preferences enable row level security;
drop policy if exists app_preferences_select_own on public.app_preferences;
create policy app_preferences_select_own on public.app_preferences for select to authenticated using (auth.uid() = user_id);
drop policy if exists app_preferences_insert_own on public.app_preferences;
create policy app_preferences_insert_own on public.app_preferences for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists app_preferences_update_own on public.app_preferences;
create policy app_preferences_update_own on public.app_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks for select to authenticated using (auth.uid() = blocker_id);
drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks for delete to authenticated using (auth.uid() = blocker_id);

create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  subject text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.support_reports enable row level security;
drop policy if exists support_reports_select_own on public.support_reports;
create policy support_reports_select_own on public.support_reports for select to authenticated using (auth.uid() = user_id);
drop policy if exists support_reports_insert_own on public.support_reports;
create policy support_reports_insert_own on public.support_reports for insert to authenticated with check (auth.uid() = user_id);

create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker_id, created_at desc);
create index if not exists support_reports_user_idx on public.support_reports(user_id, created_at desc);
