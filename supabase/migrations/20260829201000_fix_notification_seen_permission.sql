-- ZunoPlay production QA fix: notification seen/read state permissions.
-- Keep notification content immutable to clients while allowing the owner to
-- update the two client-managed state columns used by zuno-notifications.js.

revoke update on table public.notifications from authenticated;
grant update (read_at, seen_at) on table public.notifications to authenticated;
