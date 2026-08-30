-- ZunoPlay Aura/Authority - Etapa 2: least-privilege access

-- Remove implicit/default privileges from client roles.
revoke all privileges on table public.aura_tiers from anon, authenticated;
revoke all privileges on table public.player_authority from anon, authenticated;
revoke all privileges on table public.authority_transactions from anon, authenticated;

-- Public-safe catalog: names and thresholds are product data, not user data.
grant select on table public.aura_tiers to anon, authenticated;

-- Signed-in users may read only their own progress and ledger.
grant select on table public.player_authority to authenticated;
grant select on table public.authority_transactions to authenticated;

-- Replace any future/conflicting policies with the intended V1 access model.
drop policy if exists aura_tiers_public_read on public.aura_tiers;
drop policy if exists player_authority_read_own on public.player_authority;
drop policy if exists authority_transactions_read_own on public.authority_transactions;

create policy aura_tiers_public_read
on public.aura_tiers
for select
to anon, authenticated
using (true);

create policy player_authority_read_own
on public.player_authority
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy authority_transactions_read_own
on public.authority_transactions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Defense in depth: ensure RLS remains enabled.
alter table public.aura_tiers enable row level security;
alter table public.player_authority enable row level security;
alter table public.authority_transactions enable row level security;
