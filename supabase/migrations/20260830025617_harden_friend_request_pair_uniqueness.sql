create unique index if not exists friend_requests_one_pending_pair_idx
on public.friend_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status = 'pending';
