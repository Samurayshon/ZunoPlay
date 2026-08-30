alter policy app_preferences_insert_own on public.app_preferences with check ((select auth.uid()) = user_id);
alter policy app_preferences_select_own on public.app_preferences using ((select auth.uid()) = user_id);
alter policy app_preferences_update_own on public.app_preferences using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy room_follows_insert on public.room_follows with check (user_id = (select auth.uid()));
alter policy room_follows_delete on public.room_follows using (user_id = (select auth.uid()));

alter policy room_moderation_actions_select on public.room_moderation_actions using (is_room_moderator(room_id, (select auth.uid())));

alter policy room_reactions_insert on public.room_reactions with check ((user_id = (select auth.uid())) and exists (select 1 from public.room_members m where m.room_id = room_reactions.room_id and m.user_id = (select auth.uid())));
alter policy room_reactions_select on public.room_reactions using (exists (select 1 from public.room_members m where m.room_id = room_reactions.room_id and m.user_id = (select auth.uid())));

alter policy room_seat_requests_insert on public.room_seat_requests with check ((user_id = (select auth.uid())) and exists (select 1 from public.room_members m where m.room_id = room_seat_requests.room_id and m.user_id = (select auth.uid())));
alter policy room_seat_requests_select on public.room_seat_requests using ((user_id = (select auth.uid())) or is_room_moderator(room_id, (select auth.uid())));

alter policy room_voice_reward_claims_select_own on public.room_voice_reward_claims using (user_id = (select auth.uid()));
alter policy rooms_update_owner on public.rooms using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

alter policy support_reports_insert_own on public.support_reports with check ((select auth.uid()) = user_id);
alter policy support_reports_select_own on public.support_reports using ((select auth.uid()) = user_id);

alter policy user_blocks_delete_own on public.user_blocks using ((select auth.uid()) = blocker_id);
alter policy user_blocks_insert_own on public.user_blocks with check ((select auth.uid()) = blocker_id);
alter policy user_blocks_select_own on public.user_blocks using ((select auth.uid()) = blocker_id);

alter policy room_bans_select on public.room_bans using ((user_id = (select auth.uid())) or is_room_moderator(room_id, (select auth.uid())));
drop policy room_bans_moderator_all on public.room_bans;
create policy room_bans_moderator_insert on public.room_bans for insert to authenticated with check (is_room_moderator(room_id, (select auth.uid())));
create policy room_bans_moderator_update on public.room_bans for update to authenticated using (is_room_moderator(room_id, (select auth.uid()))) with check (is_room_moderator(room_id, (select auth.uid())));
create policy room_bans_moderator_delete on public.room_bans for delete to authenticated using (is_room_moderator(room_id, (select auth.uid())));
