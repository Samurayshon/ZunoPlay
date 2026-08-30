create or replace function public.zunoplay_protect_message_updates()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
begin
  if current_user = 'authenticated' then
    if new.id is distinct from old.id
       or new.sender_id is distinct from old.sender_id
       or new.receiver_id is distinct from old.receiver_id
       or new.conversation_id is distinct from old.conversation_id
       or new.created_at is distinct from old.created_at
       or new.type is distinct from old.type
       or new.reply_to_id is distinct from old.reply_to_id
       or new.client_id is distinct from old.client_id then
      raise exception 'message_fields_are_immutable' using errcode='42501';
    end if;

    if auth.uid() = old.sender_id then
      if new.read_at is distinct from old.read_at then
        raise exception 'sender_cannot_mark_read' using errcode='42501';
      end if;
      if new.metadata is distinct from old.metadata then
        raise exception 'message_metadata_is_immutable' using errcode='42501';
      end if;
      if old.deleted_at is not null then
        if new.content is distinct from old.content
           or new.edited_at is distinct from old.edited_at
           or new.deleted_at is distinct from old.deleted_at then
          raise exception 'deleted_message_is_final' using errcode='42501';
        end if;
        return new;
      end if;

      if new.deleted_at is distinct from old.deleted_at then
        if new.deleted_at is null or new.content is not null then
          raise exception 'invalid_message_delete' using errcode='42501';
        end if;
        new.deleted_at := v_now;
        new.edited_at := old.edited_at;
        return new;
      end if;

      if new.content is distinct from old.content then
        if old.created_at < now() - interval '15 minutes' then
          raise exception 'message_edit_window_expired' using errcode='42501';
        end if;
        new.edited_at := v_now;
      elsif new.edited_at is distinct from old.edited_at then
        raise exception 'message_edit_marker_without_content' using errcode='42501';
      end if;

    elsif auth.uid() = old.receiver_id then
      if new.content is distinct from old.content
         or new.edited_at is distinct from old.edited_at
         or new.deleted_at is distinct from old.deleted_at
         or new.metadata is distinct from old.metadata then
        raise exception 'receiver_can_only_mark_read' using errcode='42501';
      end if;
      if old.read_at is null and new.read_at is not null then
        new.read_at := v_now;
      elsif old.read_at is not null then
        new.read_at := old.read_at;
      end if;
    else
      raise exception 'message_update_forbidden' using errcode='42501';
    end if;
  end if;
  return new;
end
$function$;

create or replace function public.zunoplay_protect_message_receipts()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_now timestamptz := clock_timestamp();
begin
  if current_user = 'authenticated' then
    if new.user_id is distinct from auth.uid() then
      raise exception 'receipt_user_mismatch' using errcode='42501';
    end if;

    if tg_op = 'UPDATE' then
      if new.message_id is distinct from old.message_id
         or new.user_id is distinct from old.user_id then
        raise exception 'receipt_identity_is_immutable' using errcode='42501';
      end if;

      if old.delivered_at is null and new.delivered_at is not null then
        new.delivered_at := v_now;
      elsif old.delivered_at is not null then
        new.delivered_at := old.delivered_at;
      end if;

      if old.read_at is null and new.read_at is not null then
        if new.delivered_at is null then
          new.delivered_at := v_now;
        end if;
        new.read_at := v_now;
      elsif old.read_at is not null then
        new.read_at := old.read_at;
      end if;
    else
      if new.read_at is not null then
        new.delivered_at := v_now;
        new.read_at := v_now;
      elsif new.delivered_at is not null then
        new.delivered_at := v_now;
      end if;
    end if;
  end if;
  return new;
end
$function$;

drop trigger if exists zunoplay_protect_message_receipts_trigger on public.message_receipts;
create trigger zunoplay_protect_message_receipts_trigger
before insert or update on public.message_receipts
for each row execute function public.zunoplay_protect_message_receipts();

do $block$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.message_receipts'::regclass
      and conname='message_receipts_timestamp_order_check'
  ) then
    alter table public.message_receipts
      add constraint message_receipts_timestamp_order_check
      check (read_at is null or (delivered_at is not null and read_at >= delivered_at));
  end if;
end
$block$;
