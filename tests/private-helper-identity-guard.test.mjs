import fs from 'node:fs';
import assert from 'node:assert/strict';
const migration=fs.readFileSync('supabase/migrations/20260831132750_fix_private_helper_caller_identity_guard.sql','utf8');
for(const fn of ['zuno_is_conversation_member','zuno_is_room_owner','zuno_can_view_room_members']) assert.match(migration,new RegExp(`function private\\.${fn}`,'i'));
assert.equal([...migration.matchAll(/v_uid\s+is\s+not\s+null\s+and\s+p_user_id\s+is\s+distinct\s+from\s+v_uid/gi)].length,3);
assert.doesNotMatch(migration,/current_user\s*=\s*'authenticated'/i);
console.log('private helper identity guard: ok');
