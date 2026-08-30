create policy "no_client_access_xp_rules" on public.xp_rules
for select to anon, authenticated
using (false);
