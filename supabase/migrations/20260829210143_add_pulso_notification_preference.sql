alter table public.notification_preferences
add column if not exists pulso_enabled boolean not null default true;
