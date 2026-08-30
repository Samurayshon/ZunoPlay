create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_preview text;
begin
  if new.sender_id = new.receiver_id then
    return new;
  end if;

  select coalesce(nullif(nickname,''), nullif(username,''), 'Alguém')
    into v_sender_name
  from public.profiles
  where id = new.sender_id
  limit 1;

  v_sender_name := coalesce(v_sender_name, 'Alguém');
  v_preview := left(regexp_replace(coalesce(new.content,''), E'[\n\r\t]+', ' ', 'g'), 120);

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
    'message',
    'Nova mensagem de ' || v_sender_name,
    case when length(v_preview) > 0 then v_preview else 'Você recebeu uma nova mensagem.' end,
    new.sender_id,
    new.id,
    'social',
    'high',
    'conversas.html?user=' || new.sender_id::text,
    'message:' || new.id::text,
    jsonb_build_object(
      'sender_id', new.sender_id,
      'message_id', new.id,
      'preview', v_preview
    )
  );

  return new;
end;
$$;
