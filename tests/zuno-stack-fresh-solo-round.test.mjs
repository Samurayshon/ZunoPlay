import fs from 'node:fs';
import assert from 'node:assert/strict';

const games=fs.readFileSync('jogos.html','utf8');
const html=fs.readFileSync('zuno-stack.html','utf8');
const guard=fs.readFileSync('zuno-stack-fresh-round-guard.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260830130714_add_stack_abandon_solo_round.sql','utf8');
const restartMigration=fs.readFileSync('supabase/migrations/20260830152333_allow_stack_new_round_after_inactive_state.sql','utf8');

assert.match(games,/fromRoom=qp\.get\('from'\)==='sala',queryRoom=qp\.get\('room'\)\|\|'',roomId=queryRoom\|\|\(fromRoom\?sessionStorage\.getItem\('zunoplay_room_id'\)\|\|'':''\)/,'ordinary Games launches must ignore stale solo room session storage');
assert.match(games,/if\(roomId\)\{u\.searchParams\.set\('room',roomId\);if\(fromRoom\)u\.searchParams\.set\('from','sala'\)\}else\{u\.searchParams\.set\('new','1'\)\}/,'catalog launch must mark only non-room games as fresh');
assert.ok(html.indexOf('zuno-stack-fresh-round-guard.js?v=1')>0,'fresh round guard must be loaded');
assert.ok(html.indexOf('zuno-stack-fresh-round-guard.js?v=1')<html.indexOf('zuno-stack-solo-authority-bootstrap.js?v=11'),'fresh guard must start before authority bootstrap completes');
assert.match(guard,/q\.get\('new'\)!=='1'/,'guard must be opt-in');
assert.match(guard,/zuno_stack_abandon_solo_round/,'guard must use the dedicated authoritative abandon RPC');
assert.match(guard,/u\.searchParams\.delete\('new'\)/,'fresh intent must be consumed so reload resumes the new round');
assert.match(guard,/stopImmediatePropagation\(\)/,'start must stay blocked while the stale round is being retired');
assert.doesNotMatch(guard,/zuno_stack_commit_state/,'client guard must not mutate an active round through generic commit');
assert.match(migration,/r\.owner_id = v_user/,'abandon RPC must require room ownership');
assert.match(migration,/r\.description = '__zuno_stack_solo_authority__'/,'abandon RPC must be restricted to dedicated solo authority rooms');
assert.match(migration,/r\.visibility = 'private'/,'abandon RPC must require private room');
assert.match(migration,/r\.is_discoverable = false/,'abandon RPC must require non-discoverable room');
assert.match(migration,/security definer/,'private authoritative implementation must execute server-side');
assert.match(migration,/create or replace function public\.zuno_stack_abandon_solo_round[\s\S]*?language sql[\s\S]*?set search_path = ''/,'public wrapper must remain security-invoker SQL');
assert.match(restartMigration,/public\.zuno_stack_commit_state\(uuid,bigint,jsonb\)/,'fresh restart migration must target the canonical state commit RPC');
assert.match(restartMigration,/if v_prev_active and jsonb_typeof\(v_prev_engine->''tiles''\) = ''array''/,'same-round tile identity guards must only compare against an active predecessor');
assert.match(restartMigration,/stack_illegal_tile_restore/,'migration must document the reproduced inactive-to-fresh failure');

console.log('zuno-stack fresh solo round guard: ok');
