-- Cover foreign keys used by notifications and room messages
create index if not exists notifications_related_user_id_idx
  on public.notifications (related_user_id);

create index if not exists room_messages_user_id_idx
  on public.room_messages (user_id);

-- Remove only confirmed duplicate indexes, preserving one equivalent index for each key
drop index if exists public.idx_friendships_friend_id;
drop index if exists public.idx_friendships_user_id;
drop index if exists public.idx_game_scores_user_id;

-- Avoid per-row auth.uid() re-evaluation in RLS policies
drop policy if exists messages_select on public.messages;
create policy messages_select
on public.messages
for select
to authenticated
using (((select auth.uid()) = sender_id) or ((select auth.uid()) = receiver_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert
on public.messages
for insert
to authenticated
with check ((select auth.uid()) = sender_id);

drop policy if exists messages_update_read on public.messages;
create policy messages_update_read
on public.messages
for update
to authenticated
using ((select auth.uid()) = receiver_id)
with check ((select auth.uid()) = receiver_id);

drop policy if exists "Users can insert their own game scores" on public.game_scores;
create policy "Users can insert their own game scores"
on public.game_scores
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own game scores" on public.game_scores;
create policy "Users can view their own game scores"
on public.game_scores
for select
to authenticated
using ((select auth.uid()) = user_id);
