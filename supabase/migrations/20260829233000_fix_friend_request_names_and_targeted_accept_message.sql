create or replace function public.create_friend_request_notification()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sender_name text;
begin
  if new.status = 'pending' then
    select coalesce(nullif(btrim(p.username), ''), 'Alguém')
      into v_sender_name
      from public.profiles p
     where p.id = new.sender_id;

    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_user_id,
      related_id,
      category,
      priority,
      action_url,
      dedupe_key,
      metadata
    ) values (
      new.receiver_id,
      'friend_request',
      coalesce(v_sender_name, 'Alguém') || ' quer adicionar você',
      'Você recebeu uma solicitação de amizade de ' || coalesce(v_sender_name, 'Alguém') || '.',
      new.sender_id,
      new.id,
      'friend_request',
      'normal',
      'amigos.html',
      'friend_request:' || new.id::text,
      jsonb_build_object(
        'friend_request_id', new.id,
        'sender_id', new.sender_id,
        'sender_username', coalesce(v_sender_name, 'Alguém')
      )
    )
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
end;
$function$;

drop policy if exists messages_select on public.messages;
create policy messages_select
on public.messages
for select
to authenticated
using (
  (select private.zuno_is_conversation_member(messages.conversation_id, (select auth.uid())))
  and (
    not (
      messages.type = 'system'
      and messages.metadata->>'event' = 'friend_request_accepted'
    )
    or messages.receiver_id = (select auth.uid())
  )
);
