create or replace function public.zunoplay_broadcast_private_message_changes()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_sender uuid:=coalesce(new.sender_id,old.sender_id); v_receiver uuid:=coalesce(new.receiver_id,old.receiver_id); v_conversation uuid:=coalesce(new.conversation_id,old.conversation_id); v_member uuid; begin
  if v_receiver is not null then
    perform realtime.broadcast_changes('user:'||v_sender::text||':messages',tg_op,tg_op,tg_table_name,tg_table_schema,new,old);
    if v_receiver is distinct from v_sender then perform realtime.broadcast_changes('user:'||v_receiver::text||':messages',tg_op,tg_op,tg_table_name,tg_table_schema,new,old); end if;
  elsif v_conversation is not null then
    for v_member in select cm.user_id from public.conversation_members cm where cm.conversation_id=v_conversation loop
      perform realtime.broadcast_changes('user:'||v_member::text||':messages',tg_op,tg_op,tg_table_name,tg_table_schema,new,old);
    end loop;
  end if;
  return null;
end $$;
revoke all on function public.zunoplay_broadcast_private_message_changes() from public,anon,authenticated;
