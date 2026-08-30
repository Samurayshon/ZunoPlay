create unique index if not exists friend_requests_unique_pending_pair_idx
on public.friend_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status = 'pending';
