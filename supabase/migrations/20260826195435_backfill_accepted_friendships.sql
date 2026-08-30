insert into public.friendships (user_id, friend_id)
select fr.sender_id, fr.receiver_id
from public.friend_requests fr
where fr.status = 'accepted'
  and not exists (
    select 1
    from public.friendships f
    where (f.user_id = fr.sender_id and f.friend_id = fr.receiver_id)
       or (f.user_id = fr.receiver_id and f.friend_id = fr.sender_id)
  );
