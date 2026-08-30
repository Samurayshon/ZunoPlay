revoke update on table public.notifications from authenticated;
grant update (read_at, seen_at) on table public.notifications to authenticated;
