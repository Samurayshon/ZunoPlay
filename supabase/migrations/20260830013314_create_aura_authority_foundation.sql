create table if not exists public.aura_tiers (
  tier smallint primary key,
  name text not null unique,
  min_authority bigint not null unique check (min_authority >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.player_authority (
  user_id uuid primary key references auth.users(id) on delete cascade,
  authority bigint not null default 0 check (authority >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.authority_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text,
  match_id text,
  source_type text not null,
  source_id text,
  amount bigint not null check (amount <> 0),
  reason text not null,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint authority_transactions_idempotency_unique unique (user_id, idempotency_key)
);

create index if not exists idx_authority_transactions_user_created_at
  on public.authority_transactions (user_id, created_at desc);
create index if not exists idx_authority_transactions_game_id
  on public.authority_transactions (game_id) where game_id is not null;
create index if not exists idx_authority_transactions_match_id
  on public.authority_transactions (match_id) where match_id is not null;

alter table public.aura_tiers enable row level security;
alter table public.player_authority enable row level security;
alter table public.authority_transactions enable row level security;

insert into public.aura_tiers (tier, name, min_authority) values
  (1, 'Iniciante', 0),
  (2, 'Explorador', 100),
  (3, 'Reconhecido', 250),
  (4, 'Veterano', 500),
  (5, 'Especialista', 1000),
  (6, 'Elite', 2000),
  (7, 'Mestre', 5000),
  (8, 'Ascendente', 10000),
  (9, 'Guardião', 20000),
  (10, 'Lendário', 50000),
  (11, 'Soberano', 100000),
  (12, 'Imperador', 200000),
  (13, 'Supremo', 500000),
  (14, 'Imortal', 1000000),
  (15, 'Eterno', 2000000)
on conflict (tier) do update
set name = excluded.name,
    min_authority = excluded.min_authority;

insert into public.player_authority (user_id, authority)
select id, 0 from auth.users
on conflict (user_id) do nothing;
