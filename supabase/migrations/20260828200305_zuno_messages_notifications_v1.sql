alter table public.notification_preferences add column if not exists messages_enabled boolean not null default true;

create or replace function public.zunoplay_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_sender_name text; v_conv_type text; v_member uuid; begin
  if new.type='system' then return null; end if;
  select coalesce(p.username,'ZunoPlay') into v_sender_name from public.profiles p where p.id=new.sender_id;
  select c.type into v_conv_type from public.conversations c where c.id=new.conversation_id;
  if v_conv_type='direct' and new.receiver_id is not null then
    insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,metadata)
    values(new.receiver_id,'message',v_sender_name,case when new.type='text' then left(coalesce(new.content,''),140) else case new.type when 'image' then '📷 Enviou uma foto' when 'video' then '🎬 Enviou um vídeo' when 'audio' then '🎙 Enviou um áudio' when 'file' then '📎 Enviou um arquivo' when 'gif' then 'Enviou um GIF' else 'Nova mensagem' end end,new.sender_id,new.id,'message','normal','conversas.html?conversation='||new.conversation_id::text,'message:'||new.id::text,jsonb_build_object('conversation_id',new.conversation_id,'message_id',new.id,'message_type',new.type));
  elsif v_conv_type='group' then
    for v_member in select cm.user_id from public.conversation_members cm where cm.conversation_id=new.conversation_id and cm.user_id<>new.sender_id loop
      insert into public.notifications(user_id,type,title,message,related_user_id,related_id,category,priority,action_url,dedupe_key,metadata)
      values(v_member,'message',v_sender_name,case when new.type='text' then left(coalesce(new.content,''),140) else 'Nova mensagem no grupo' end,new.sender_id,new.id,'message','normal','conversas.html?conversation='||new.conversation_id::text,'message:'||new.id::text||':'||v_member::text,jsonb_build_object('conversation_id',new.conversation_id,'message_id',new.id,'message_type',new.type));
    end loop;
  end if;
  return null;
end $$;
revoke all on function public.zunoplay_notify_new_message() from public,anon,authenticated;
drop trigger if exists zunoplay_message_notification on public.messages;
create trigger zunoplay_message_notification after insert on public.messages for each row execute function public.zunoplay_notify_new_message();
create index if not exists idx_notifications_message_user on public.notifications(user_id,created_at desc) where category='message';
