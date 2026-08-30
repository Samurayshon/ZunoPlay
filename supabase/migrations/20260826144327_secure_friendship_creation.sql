drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
for insert to authenticated
with check (
  auth.uid() = friend_id
  and exists (
    select 1 from public.friend_requests fr
    where fr.sender_id = friendships.user_id
      and fr.receiver_id = friendships.friend_id
      and fr.status = 'accepted'
  )
);
