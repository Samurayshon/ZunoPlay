alter table public.notifications
  add column if not exists category text not null default 'system',
  add column if not exists priority text not null default 'normal',
  add column if not exists action_url text,
  add column if not exists dedupe_key text,
  add column if not exists expires_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);
create index if not exists notifications_user_category_idx on public.notifications(user_id, category, created_at desc);
create unique index if not exists notifications_dedupe_idx on public.notifications(user_id, dedupe_key) where dedupe_key is not null;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  social_enabled boolean not null default true,
  rooms_enabled boolean not null default true,
  games_enabled boolean not null default true,
  rewards_enabled boolean not null default true,
  system_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.notification_preferences to authenticated;

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  event_type text not null,
  channel text not null default 'in_app',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists notification_events_user_idx on public.notification_events(user_id, created_at desc);
alter table public.notification_events enable row level security;
drop policy if exists notification_events_insert_own on public.notification_events;
create policy notification_events_insert_own on public.notification_events for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists notification_events_select_own on public.notification_events;
create policy notification_events_select_own on public.notification_events for select to authenticated using ((select auth.uid()) = user_id);
grant select, insert on public.notification_events to authenticated;
