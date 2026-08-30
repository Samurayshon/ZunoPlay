-- Profiles are provisioned by the auth trigger only.
drop policy if exists "Usuarios podem criar seu perfil" on public.profiles;

-- Current game client does not persist game_scores. Prevent forged scores until a server-validated scoring flow exists.
drop policy if exists "Users can insert their own game scores" on public.game_scores;
revoke insert on table public.game_scores from authenticated;
