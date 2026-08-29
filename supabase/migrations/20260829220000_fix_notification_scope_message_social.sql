-- ZunoPlay notifications: keep the scope guard aligned with the notification
-- types produced by the application. Previously, message and Pulso/social
-- notifications were silently cancelled by returning NULL from the BEFORE
-- INSERT trigger.

create or replace function public.zuno_notification_scope_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.type = 'friend_request' then return new; end if;
  if new.type = 'message' or new.category = 'message' then return new; end if;
  if new.type in ('achievement','reward','coins','avatar') or new.category = 'rewards' then return new; end if;
  if new.type in ('pulso_like','pulso_comment','pulso_reply','pulso_follow') or new.category = 'social' then return new; end if;
  if new.type = 'system' or new.category = 'system' then return new; end if;
  return null;
end;
$function$;
