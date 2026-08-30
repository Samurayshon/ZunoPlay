-- Tighten SECURITY DEFINER execution grants without changing authenticated product flows.
REVOKE EXECUTE ON FUNCTION public.ban_room_member(uuid,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ban_room_member(uuid,uuid,text,integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_room_presence_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_room_presence_reward(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.move_room_seat(uuid,smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_room_seat(uuid,smallint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.pulso_is_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pulso_is_blocked(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.start_room_minigame(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_room_minigame(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.unban_room_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unban_room_member(uuid,uuid) TO authenticated;

-- Trigger-only SECURITY DEFINER functions must never be directly callable by clients.
REVOKE EXECUTE ON FUNCTION public.enforce_room_ban_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pulso_emit_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pulso_increment_post_views() FROM PUBLIC, anon, authenticated;

-- Cover newly introduced foreign keys.
CREATE INDEX IF NOT EXISTS idx_moments_comment_likes_user_id ON public.moments_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_comments_parent_comment_id ON public.moments_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_moments_comments_user_id ON public.moments_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_impressions_viewer_id ON public.moments_impressions(viewer_id);
CREATE INDEX IF NOT EXISTS idx_moments_likes_user_id ON public.moments_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_reports_post_id ON public.moments_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_moments_reports_reported_user_id ON public.moments_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_room_game_sessions_created_by ON public.room_game_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_room_game_sessions_room_id ON public.room_game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_room_reports_reporter_id ON public.room_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_room_reports_room_id ON public.room_reports(room_id);
CREATE INDEX IF NOT EXISTS idx_room_reports_target_user_id ON public.room_reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_room_reward_claims_user_id ON public.room_reward_claims(user_id);

-- Remove exact duplicate seat index; the remaining index enforces the same invariant.
DROP INDEX IF EXISTS public.room_members_unique_occupied_seat;

-- Remove duplicated SELECT policy; room_bans_select already contains the same user/moderator rule with init-plan caching.
DROP POLICY IF EXISTS room_bans_read ON public.room_bans;

-- Preserve policy semantics while caching auth.uid() once per statement.
ALTER POLICY moments_comment_likes_delete_own ON public.moments_comment_likes USING (user_id = (SELECT auth.uid()));
ALTER POLICY moments_comment_likes_insert_own ON public.moments_comment_likes WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY moments_comments_delete ON public.moments_comments USING (user_id = (SELECT auth.uid()));
ALTER POLICY moments_comments_insert ON public.moments_comments WITH CHECK ((user_id = (SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.moments_posts p WHERE p.id = moments_comments.post_id));
ALTER POLICY moments_follows_delete_own ON public.moments_follows USING (follower_id = (SELECT auth.uid()));
ALTER POLICY moments_follows_insert_own ON public.moments_follows WITH CHECK ((follower_id = (SELECT auth.uid())) AND NOT public.pulso_is_blocked(following_id));
ALTER POLICY moments_impressions_insert_own ON public.moments_impressions WITH CHECK (viewer_id = (SELECT auth.uid()));
ALTER POLICY moments_impressions_read_own ON public.moments_impressions USING (viewer_id = (SELECT auth.uid()));
ALTER POLICY moments_likes_delete ON public.moments_likes USING (user_id = (SELECT auth.uid()));
ALTER POLICY moments_likes_insert ON public.moments_likes WITH CHECK ((user_id = (SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.moments_posts p WHERE p.id = moments_likes.post_id));
ALTER POLICY moments_posts_delete ON public.moments_posts USING (user_id = (SELECT auth.uid()));
ALTER POLICY moments_posts_insert ON public.moments_posts WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY moments_posts_update ON public.moments_posts USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY moments_posts_read ON public.moments_posts USING (
  NOT public.pulso_is_blocked(user_id)
  AND (
    visibility = 'public'
    OR user_id = (SELECT auth.uid())
    OR (
      visibility = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (f.user_id = (SELECT auth.uid()) AND f.friend_id = moments_posts.user_id)
           OR (f.friend_id = (SELECT auth.uid()) AND f.user_id = moments_posts.user_id)
      )
    )
  )
);
ALTER POLICY moments_reports_insert_own ON public.moments_reports WITH CHECK (reporter_id = (SELECT auth.uid()));
ALTER POLICY moments_reports_read_own ON public.moments_reports USING (reporter_id = (SELECT auth.uid()));
ALTER POLICY room_game_sessions_read_members ON public.room_game_sessions USING (EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_game_sessions.room_id AND rm.user_id = (SELECT auth.uid())));
ALTER POLICY room_reports_insert ON public.room_reports WITH CHECK ((reporter_id = (SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.room_members rm WHERE rm.room_id = room_reports.room_id AND rm.user_id = (SELECT auth.uid())));
ALTER POLICY room_reports_read_own ON public.room_reports USING (reporter_id = (SELECT auth.uid()));
ALTER POLICY room_reward_claims_read_own ON public.room_reward_claims USING (user_id = (SELECT auth.uid()));
