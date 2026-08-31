import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/20260831064315_tighten_room_reaction_grants.sql','utf8');
const room=fs.readFileSync('zuno-room-experience-v2.js','utf8');

assert.match(migration,/revoke\s+all\s+on\s+table\s+public\.room_reactions\s+from\s+anon/i,'anon must not retain room_reactions table grants');
assert.match(migration,/revoke\s+update,\s*delete\s+on\s+table\s+public\.room_reactions\s+from\s+authenticated/i,'authenticated clients must not mutate/delete historical reactions');
assert.match(room,/broadcast\.scope\(['"]room:['"]\+roomId\+['"]:reactions['"]/,'current room reactions must use private Realtime broadcast');
assert.match(room,/event:['"]reaction['"]/,'current room client must retain ephemeral reaction broadcast');

console.log('room reaction grant guard: ok');
