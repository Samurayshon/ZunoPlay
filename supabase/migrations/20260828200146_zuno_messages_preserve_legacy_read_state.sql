update public.conversation_members cm
set last_read_at=x.last_read_at,last_read_message_id=x.last_read_message_id
from (
  select distinct on (m.conversation_id,m.receiver_id)
    m.conversation_id,m.receiver_id as user_id,m.created_at as last_read_at,m.id as last_read_message_id
  from public.messages m
  where m.receiver_id is not null and m.read_at is not null
  order by m.conversation_id,m.receiver_id,m.created_at desc,m.id desc
) x
where cm.conversation_id=x.conversation_id and cm.user_id=x.user_id and cm.last_read_at is null;
