drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert to authenticated with check ((auth.uid() = user_id) or (auth.uid() = friend_id));
create policy "friendships_delete" on public.friendships for delete to authenticated using ((auth.uid() = user_id) or (auth.uid() = friend_id));
alter table public.friendships replica identity full;
alter table public.friend_requests replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null;
end $$;
