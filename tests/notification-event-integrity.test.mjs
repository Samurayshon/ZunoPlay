import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/20260831062844_harden_notification_event_integrity.sql','utf8');
const client=fs.readFileSync('zuno-notifications.js','utf8');

assert.match(migration,/new\.user_id\s*:=\s*v_uid/,'event user identity must be server normalized');
assert.match(migration,/new\.created_at\s*:=\s*pg_catalog\.clock_timestamp\(\)/,'event timestamp must be server normalized');
assert.match(migration,/jsonb_typeof\(new\.metadata\)[\s\S]*?notification_event_metadata_object_required/,'event metadata must remain an object');
assert.match(migration,/from public\.notifications n[\s\S]*?n\.id = new\.notification_id[\s\S]*?n\.user_id = v_uid/,'linked notification must belong to the authenticated user');
assert.match(migration,/before insert on public\.notification_events/,'protection must execute before RLS evaluates inserted row');
assert.match(client,/notification_events/,'notification client must retain event telemetry integration');
assert.match(client,/metadata\}\)\}catch/,'client telemetry path must continue sending metadata objects');

console.log('notification event integrity guard: ok');
