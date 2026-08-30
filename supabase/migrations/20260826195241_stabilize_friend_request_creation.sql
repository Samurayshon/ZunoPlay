drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and sender_id <> receiver_id
  and status = 'pending'
);
