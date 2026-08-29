update public.notifications n
set title = coalesce(nullif(btrim(p.username), ''), 'Alguém') || ' quer adicionar você'
from public.profiles p
where n.type = 'friend_request'
  and n.related_user_id = p.id
  and (n.title is null or n.title like 'Nova solicitação de amizade%');
