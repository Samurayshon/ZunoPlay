update public.notifications n
set title = coalesce(nullif(btrim(p.username), ''), 'Alguém') || ' quer adicionar você'
from public.friend_requests fr
join public.profiles p on p.id = fr.sender_id
where n.type = 'friend_request'
  and n.related_id = fr.id
  and (n.title is null or n.title like 'Nova solicitação de amizade%');
