-- Trigger-only SECURITY DEFINER functions must not be remotely callable.
REVOKE EXECUTE ON FUNCTION public.create_friend_accepted_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_friend_request_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_message_notification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;
-- This function is not used by the current web client; keep it private until an explicit server-side API is introduced.
REVOKE EXECUTE ON FUNCTION public.mark_message_notifications_read(uuid) FROM PUBLIC, anon, authenticated;

-- Prevent future public/role auto-grants on newly created functions in public.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Tighten the notifications insert policy to authenticated users only.
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Remove duplicate policies without changing effective authorization.
DROP POLICY IF EXISTS "friend_requests_update" ON public.friend_requests;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Use cached auth.uid() evaluation in RLS policies where safe.
DROP POLICY IF EXISTS "Users can accept friend requests" ON public.friend_requests;
CREATE POLICY "Users can accept friend requests"
ON public.friend_requests
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = receiver_id)
WITH CHECK ((SELECT auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "friend_requests_insert" ON public.friend_requests;
CREATE POLICY "friend_requests_insert"
ON public.friend_requests
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = sender_id AND sender_id <> receiver_id);

DROP POLICY IF EXISTS "friend_requests_select" ON public.friend_requests;
CREATE POLICY "friend_requests_select"
ON public.friend_requests
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = sender_id OR (SELECT auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_delete"
ON public.friendships
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id);

DROP POLICY IF EXISTS "friendships_select" ON public.friendships;
CREATE POLICY "friendships_select"
ON public.friendships
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id);

DROP POLICY IF EXISTS "friendships_insert" ON public.friendships;
CREATE POLICY "friendships_insert"
ON public.friendships
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = friend_id
  AND EXISTS (
    SELECT 1 FROM public.friend_requests fr
    WHERE fr.sender_id = friendships.user_id
      AND fr.receiver_id = friendships.friend_id
      AND fr.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuarios podem criar seu perfil" ON public.profiles;
CREATE POLICY "Usuarios podem criar seu perfil"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Usuarios podem editar seu perfil" ON public.profiles;
CREATE POLICY "Usuarios podem editar seu perfil"
ON public.profiles
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Usuarios podem ver perfis" ON public.profiles;
CREATE POLICY "Usuarios podem ver perfis"
ON public.profiles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar sua participação" ON public.room_members;
CREATE POLICY "Usuários podem atualizar sua participação"
ON public.room_members
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem entrar em salas" ON public.room_members;
CREATE POLICY "Usuários podem entrar em salas"
ON public.room_members
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem sair das salas" ON public.room_members;
CREATE POLICY "Usuários podem sair das salas"
ON public.room_members
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem ver membros das salas" ON public.room_members;
CREATE POLICY "Usuários podem ver membros das salas"
ON public.room_members
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Membros podem ver mensagens das salas" ON public.room_messages;
CREATE POLICY "Membros podem ver mensagens das salas"
ON public.room_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.room_members rm
  WHERE rm.room_id = room_messages.room_id
    AND rm.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON public.room_messages;
CREATE POLICY "Usuários podem enviar mensagens"
ON public.room_messages
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Usuários podem criar salas" ON public.rooms;
CREATE POLICY "Usuários podem criar salas"
ON public.rooms
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Usuários podem ver salas" ON public.rooms;
CREATE POLICY "Usuários podem ver salas"
ON public.rooms
FOR SELECT TO authenticated
USING (true);

-- Add indexes supporting the RLS predicates and realtime lookups. IF NOT EXISTS is idempotent.
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender_read_at ON public.messages(receiver_id, sender_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_room_members_room_user ON public.room_members(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id_created_at ON public.room_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores(user_id);
