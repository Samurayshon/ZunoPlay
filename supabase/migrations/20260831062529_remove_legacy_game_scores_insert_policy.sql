-- Defense in depth for the retired client-authoritative Desafio score path.
-- Direct client INSERT was already revoked by 20260830061520_contain_client_authoritative_desafio_scores.sql.
-- Remove the residual INSERT RLS policy so an accidental future grant cannot silently reopen it.
drop policy if exists "Users can insert their own game scores" on public.game_scores;
