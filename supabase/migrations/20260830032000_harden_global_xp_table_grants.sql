revoke all privileges on table public.xp_transactions from anon, authenticated;
revoke all privileges on table public.user_xp_progression from anon, authenticated;
revoke all privileges on table public.xp_rules from anon, authenticated;

grant select on table public.xp_transactions to authenticated;
grant select on table public.user_xp_progression to authenticated;

alter table public.xp_transactions enable row level security;
alter table public.user_xp_progression enable row level security;
alter table public.xp_rules enable row level security;
