-- Remove legacy notification producers that are no longer part of the product
DROP FUNCTION IF EXISTS public.create_message_notification() CASCADE;
DROP FUNCTION IF EXISTS public.create_friend_accepted_notification() CASCADE;

-- Decouple message read state from notifications.
DROP FUNCTION IF EXISTS public.mark_message_notifications_read(uuid);
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.messages
  SET read_at = COALESCE(read_at, now())
  WHERE receiver_id = auth.uid()
    AND sender_id = p_sender_id
    AND read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- Current notification preferences only.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS friend_requests_enabled boolean NOT NULL DEFAULT true;

UPDATE public.notification_preferences
SET friend_requests_enabled = COALESCE(social_enabled, true)
WHERE friend_requests_enabled IS DISTINCT FROM COALESCE(social_enabled, true);

ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS social_enabled,
  DROP COLUMN IF EXISTS rooms_enabled,
  DROP COLUMN IF EXISTS games_enabled;

-- Replace legacy defaults with current scope only.
CREATE OR REPLACE FUNCTION public.zuno_notification_defaults()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF new.type = 'friend_request' THEN
    new.category := 'friend_request';
    IF new.action_url IS NULL OR new.action_url = '' THEN
      new.action_url := 'amigos.html';
    END IF;
  ELSIF new.type IN ('achievement','reward','coins','avatar') OR new.category = 'rewards' THEN
    new.category := 'rewards';
    IF new.action_url IS NULL OR new.action_url = '' THEN
      new.action_url := CASE new.type
        WHEN 'avatar' THEN 'avatar.html'
        ELSE 'historico.html'
      END;
    END IF;
  ELSIF new.type = 'system' OR new.category = 'system' THEN
    new.category := 'system';
    IF new.action_url IS NULL OR new.action_url = '' OR new.action_url IN ('index.html','./index.html','/','./') THEN
      new.action_url := 'notificacoes.html';
    END IF;
  END IF;

  IF new.dedupe_key IS NULL AND new.related_id IS NOT NULL THEN
    new.dedupe_key := new.type || ':' || new.related_id::text;
  END IF;
  RETURN new;
END;
$$;

-- Scope guard: only the current three notification groups survive insertion.
CREATE OR REPLACE FUNCTION public.zuno_notification_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF new.type = 'friend_request' THEN RETURN new; END IF;
  IF new.type IN ('achievement','reward','coins','avatar') OR new.category = 'rewards' THEN RETURN new; END IF;
  IF new.type = 'system' OR new.category = 'system' THEN RETURN new; END IF;
  RETURN NULL;
END;
$$;

-- Remove any legacy rows defensively.
DELETE FROM public.notifications
WHERE NOT (
  type = 'friend_request'
  OR type IN ('achievement','reward','coins','avatar')
  OR category = 'rewards'
  OR type = 'system'
  OR category = 'system'
);
