drop trigger if exists trigger_new_message_notification on public.messages;
drop trigger if exists trigger_friend_accepted_notification on public.friend_requests;

create or replace function public.zuno_notification_scope_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'friend_request' then
    return new;
  end if;

  if new.category = 'rewards' or new.type in ('achievement','reward','coins','avatar') then
    return new;
  end if;

  if new.category = 'system' or new.type = 'system' then
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists zuno_notification_scope_guard_trigger on public.notifications;
create trigger zuno_notification_scope_guard_trigger
before insert on public.notifications
for each row execute function public.zuno_notification_scope_guard();
