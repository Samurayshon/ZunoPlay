import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/20260830154207_harden_pulso_impression_integrity.sql','utf8');
const client=fs.readFileSync('zuno-pulso-v3.js','utf8');

assert.match(migration,/revoke all on table public\.moments_impressions from anon/,'anon access must stay revoked');
assert.match(migration,/revoke update, delete on table public\.moments_impressions from authenticated/,'client must not mutate/delete impressions');
assert.match(migration,/moments_impressions_unique_viewer_post_idx[\s\S]*?\(post_id, viewer_id\)/,'one viewer must not inflate the same post repeatedly');
assert.match(migration,/p\.user_id <> \(select auth\.uid\(\)\)/,'authors must not count their own post impression');
assert.match(migration,/new\.viewer_id := auth\.uid\(\)/,'viewer identity must be server normalized');
assert.match(migration,/new\.created_at := pg_catalog\.clock_timestamp\(\)/,'impression time must be server normalized');
assert.match(client,/moments_impressions/,'Pulso client must retain its impression integration');
assert.match(client,/Math\.log1p\(p\.view_count\|\|0\)\*1\.5/,'view_count remains a ranking input and therefore integrity-sensitive');

console.log('pulso impression integrity guard: ok');
