-- The current room experience uses private Realtime broadcast for ephemeral reactions.
-- Keep the table's authenticated INSERT/SELECT contract for compatibility, but remove
-- grants that have no effective RLS path and unnecessarily widen the client surface.
revoke all on table public.room_reactions from anon;
revoke update, delete on table public.room_reactions from authenticated;
