drop policy if exists authority_game_rules_deny_clients on public.authority_game_rules;
create policy authority_game_rules_deny_clients
on public.authority_game_rules
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists authority_match_claims_deny_clients on public.authority_match_claims;
create policy authority_match_claims_deny_clients
on public.authority_match_claims
for all
to anon, authenticated
using (false)
with check (false);

