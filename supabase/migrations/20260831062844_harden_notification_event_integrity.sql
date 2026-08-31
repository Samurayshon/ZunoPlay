create or replace function public.zunoplay_protect_notification_event_insert()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_uid uuid;
begin
  if current_user = 'authenticated' then
    v_uid := auth.uid();
    if v_uid is null then
      raise exception 'authentication_required' using errcode='42501';
    end if;

    new.user_id := v_uid;
    new.created_at := pg_catalog.clock_timestamp();

    if pg_catalog.jsonb_typeof(new.metadata) is distinct from 'object' then
      raise exception 'notification_event_metadata_object_required' using errcode='22023';
    end if;

    if new.notification_id is not null and not exists (
      select 1
      from public.notifications n
      where n.id = new.notification_id
        and n.user_id = v_uid
    ) then
      raise exception 'notification_event_target_forbidden' using errcode='42501';
    end if;
  end if;
  return new;
end
$function$;

drop trigger if exists zunoplay_protect_notification_event_insert_trigger on public.notification_events;
create trigger zunoplay_protect_notification_event_insert_trigger
before insert on public.notification_events
for each row execute function public.zunoplay_protect_notification_event_insert();
