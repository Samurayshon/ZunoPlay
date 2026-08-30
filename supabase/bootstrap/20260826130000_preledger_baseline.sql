-- ZunoPlay pre-ledger bootstrap baseline
--
-- Purpose: provide only the objects proven to predate the canonical production
-- migration ledger, whose first version is 20260826135832.
--
-- IMPORTANT: this file intentionally lives outside supabase/migrations while
-- Phase 0.2.1 validates fresh-database reconstruction. It must not be applied to
-- the existing production project, which already contains these objects.

create table if not exists public.profiles (
  id uuid primary key,
  username text,
  avatar_url text,
  bio text default '',
  level integer default 1,
  coins integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid,
  name text not null default 'Nova sala'
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint room_members_room_user_unique unique (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  constraint unique_friendship unique (user_id, friend_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  related_user_id uuid references auth.users(id) on delete cascade,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  score integer not null default 0,
  questions integer not null default 0,
  correct_answers integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.game_scores enable row level security;

-- Compatibility shims for pre-ledger trigger functions referenced by the first
-- hardening migration. Their historical bodies are not present in Git, so the
-- bootstrap defines only the required signatures. Later canonical migrations
-- replace or remove these functions before application behavior is tested.
create or replace function public.create_friend_accepted_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

create or replace function public.create_friend_request_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

-- These trigger bindings are provably pre-ledger because the canonical ledger
-- replaces the functions but never creates the bindings, while production has
-- them today.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_user_update();

drop trigger if exists trigger_friend_request_notification on public.friend_requests;
create trigger trigger_friend_request_notification
after insert on public.friend_requests
for each row execute function public.create_friend_request_notification();
