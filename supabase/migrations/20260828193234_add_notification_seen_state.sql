alter table public.notifications add column if not exists seen_at timestamptz;

comment on column public.notifications.seen_at is 'Timestamp when the notification became visible in the notification center. Used for new-notification badge state.';
