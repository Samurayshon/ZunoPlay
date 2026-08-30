create table if not exists public.friendship_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('created','removed')),
  created_at timestamptz not null default now()
);

alter table public.friendship_events enable row level security;

revoke insert, update, delete on public.friendship_events from anon, authenticated;
grant select on public.friendship_events to authenticated;

drop policy if exists friendship_events_select_participants on public.friendship_events;
create policy friendship_events_select_participants
on public.friendship_events
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

create or replace function public.emit_friendship_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.friendship_events(user_id, friend_id, action)
    values (new.user_id, new.friend_id, 'created');
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.friendship_events(user_id, friend_id, action)
    values (old.user_id, old.friend_id, 'removed');
    return old;
  end if;
  return null;
end;
$$;

revoke all on function public.emit_friendship_event() from public, anon, authenticated;

drop trigger if exists trg_emit_friendship_event on public.friendships;
create trigger trg_emit_friendship_event
after insert or delete on public.friendships
for each row execute function public.emit_friendship_event();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friendship_events'
  ) then
    alter publication supabase_realtime add table public.friendship_events;
  end if;
end $$;

create index if not exists friendship_events_user_created_idx on public.friendship_events(user_id, created_at desc);
create index if not exists friendship_events_friend_created_idx on public.friendship_events(friend_id, created_at desc);
