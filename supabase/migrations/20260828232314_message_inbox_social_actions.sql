create or replace function public.zuno_set_conversation_state(p_conversation_id uuid, p_action text)
returns void
language plpgsql
security invoker
set search_path=public
as $$
begin
  if p_action='pin' then
    update public.conversation_members set pinned_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='unpin' then
    update public.conversation_members set pinned_at=null where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='archive' then
    update public.conversation_members set archived_at=now() where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='unarchive' then
    update public.conversation_members set archived_at=null where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='mute' then
    update public.conversation_members set muted_until=now()+interval '100 years' where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='unmute' then
    update public.conversation_members set muted_until=null where conversation_id=p_conversation_id and user_id=auth.uid();
  elsif p_action='unread' then
    update public.conversation_members cm set last_read_at=coalesce((select m.created_at-interval '1 microsecond' from public.messages m where m.conversation_id=p_conversation_id and m.sender_id<>auth.uid() order by m.created_at desc,m.id desc limit 1),'epoch'::timestamptz),last_read_message_id=null where cm.conversation_id=p_conversation_id and cm.user_id=auth.uid();
  else
    raise exception 'Ação inválida';
  end if;
  if not found then raise exception 'Conversa não encontrada'; end if;
end$$;
revoke all on function public.zuno_set_conversation_state(uuid,text) from public,anon;
grant execute on function public.zuno_set_conversation_state(uuid,text) to authenticated;
