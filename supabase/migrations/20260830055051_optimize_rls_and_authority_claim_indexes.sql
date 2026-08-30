create index if not exists authority_match_claims_authority_transaction_id_idx on public.authority_match_claims(authority_transaction_id);
create index if not exists authority_match_claims_game_id_idx on public.authority_match_claims(game_id);
create index if not exists authority_match_claims_opponent_id_idx on public.authority_match_claims(opponent_id);

alter policy friend_request_events_select_participants on public.friend_request_events
  using (((select auth.uid()) = sender_id) or ((select auth.uid()) = receiver_id));

alter policy friendship_events_select_participants on public.friendship_events
  using (((select auth.uid()) = user_id) or ((select auth.uid()) = friend_id));

drop index if exists public.friend_requests_unique_pending_pair_idx;
drop index if exists public.notifications_user_category_idx;
