-- Containment for legacy Desafio Zuno scoring.
-- Until gameplay completion is server-verifiable, client roles must not insert scores
-- that can trigger progression through apply_desafio_progress_after_insert.
revoke insert on table public.game_scores from anon, authenticated;
