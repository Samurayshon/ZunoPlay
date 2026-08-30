create or replace function public.zunoplay_protect_message_updates()
returns trigger
language plpgsql
set search_path=''
as $$
begin
 if current_user='authenticated' then
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
   if auth.uid()=old.sender_id then
     if new.read_at is distinct from old.read_at then raise exception 'sender_cannot_mark_read' using errcode='42501'; end if;
     if new.content is distinct from old.content
        and not (old.deleted_at is null and new.deleted_at is not null and new.content is null)
        and old.created_at < now()-interval '15 minutes' then
       raise exception 'message_edit_window_expired' using errcode='42501';
     end if;
     if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then raise exception 'deleted_message_is_final' using errcode='42501'; end if;
   elsif auth.uid()=old.receiver_id then
     if new.content is distinct from old.content or new.edited_at is distinct from old.edited_at or new.deleted_at is distinct from old.deleted_at or new.metadata is distinct from old.metadata then
       raise exception 'receiver_can_only_mark_read' using errcode='42501';
     end if;
   else
     raise exception 'message_update_forbidden' using errcode='42501';
   end if;
 end if;
 return new;
end $$;
