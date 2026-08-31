import fs from 'node:fs';
import assert from 'node:assert/strict';

const revoke=fs.readFileSync('supabase/migrations/20260830061520_contain_client_authoritative_desafio_scores.sql','utf8');
const policy=fs.readFileSync('supabase/migrations/20260831062529_remove_legacy_game_scores_insert_policy.sql','utf8');
const games=fs.readFileSync('jogos.html','utf8');

assert.match(revoke,/revoke\s+insert\s+on\s+table\s+public\.game_scores\s+from\s+anon,\s*authenticated/i,'client INSERT on game_scores must remain revoked');
assert.match(policy,/drop\s+policy\s+if\s+exists\s+"Users can insert their own game scores"\s+on\s+public\.game_scores/i,'legacy client INSERT policy must stay removed');
assert.match(games,/Zuno Stack/,'current games catalog must retain Zuno Stack');
assert.doesNotMatch(games,/Jogar Desafio Zuno|onclick=.*desafio/i,'retired Desafio client-authoritative launch must not return to the current catalog');

console.log('desafio score containment guard: ok');
