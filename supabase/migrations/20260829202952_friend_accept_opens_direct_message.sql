create or replace function public.zuno_create_friendship_on_accept()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_direct_key text;
  v_conversation_id uuid;
  v_acceptor_name text;
  v_message_id uuid;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.friendships (user_id, friend_id)
    values (new.sender_id, new.receiver_id)
    on conflict do nothing;

    v_direct_key := least(new.sender_id::text, new.receiver_id::text)
                    || ':' ||
                    greatest(new.sender_id::text, new.receiver_id::text);

    insert into public.conversations(type, direct_key, created_by)
    values ('direct', v_direct_key, new.receiver_id)
    on conflict (direct_key) do nothing;

    select c.id
      into v_conversation_id
      from public.conversations c
     where c.direct_key = v_direct_key;

    insert into public.conversation_members(conversation_id, user_id, role)
    values
      (v_conversation_id, new.sender_id, 'member'),
      (v_conversation_id, new.receiver_id, 'member')
    on conflict do nothing;

    update public.conversation_members
       set archived_at = null
     where conversation_id = v_conversation_id
       and user_id in (new.sender_id, new.receiver_id);

    select coalesce(nullif(btrim(p.username), ''), 'Seu novo amigo')
      into v_acceptor_name
      from public.profiles p
     where p.id = new.receiver_id;

    insert into public.messages(
      sender_id,
      receiver_id,
      conversation_id,
      type,
      content,
      metadata
    )
    select
      new.receiver_id,
      new.sender_id,
      v_conversation_id,
      'system',
      coalesce(v_acceptor_name, 'Seu novo amigo') || ' aceitou sua solicitação de amizade. Vocês já podem conversar.',
      jsonb_build_object(
        'event', 'friend_request_accepted',
        'friend_request_id', new.id,
        'accepted_by', new.receiver_id
      )
    where not exists (
      select 1
        from public.messages m
       where m.conversation_id = v_conversation_id
         and m.type = 'system'
         and m.metadata->>'event' = 'friend_request_accepted'
         and m.metadata->>'friend_request_id' = new.id::text
    )
    returning id into v_message_id;

    if v_message_id is null then
      select m.id
        into v_message_id
        from public.messages m
       where m.conversation_id = v_conversation_id
         and m.type = 'system'
         and m.metadata->>'event' = 'friend_request_accepted'
         and m.metadata->>'friend_request_id' = new.id::text
       order by m.created_at desc
       limit 1;
    end if;

    update public.conversation_members
       set last_read_message_id = null,
           last_read_at = case
             when user_id = new.sender_id then 'epoch'::timestamptz
             else last_read_at
           end
     where conversation_id = v_conversation_id
       and user_id in (new.sender_id, new.receiver_id);
  end if;

  return new;
end;
$function$;

revoke execute on function public.zuno_create_friendship_on_accept() from public, anon, authenticated;
