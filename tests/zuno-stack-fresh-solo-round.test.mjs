import fs from 'node:fs';
import assert from 'node:assert/strict';

const games=fs.readFileSync('jogos.html','utf8');
const html=fs.readFileSync('zuno-stack.html','utf8');
const boot=fs.readFileSync('zuno-stack-solo-authority-bootstrap.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260830131500_add_stack_abandon_solo_round.sql','utf8');

assert.match(games,/fromRoom=qp\.get\('from'\)==='sala',queryRoom=qp\.get\('room'\)\|\|'',roomId=queryRoom\|\|\(fromRoom\?sessionStorage\.getItem\('zunoplay_room_id'\)\|\|'':''\)/,'ordinary Games launches must ignore stale solo room session storage');
assert.match(games,/if\(roomId\)\{u\.searchParams\.set\('room',roomId\);if\(fromRoom\)u\.searchParams\.set\('from','sala'\)\}else\{u\.searchParams\.set\('new','1'\)\}/,'catalog launch must mark only non-room games as fresh');
assert.match(html,/zuno-stack-solo-authority-bootstrap\.js\?v=12/,'canonical bootstrap must be loaded');
assert.doesNotMatch(html,/zuno-stack-fresh-round-guard\.js/,'fresh-round patch layer must be removed');
assert.match(boot,/freshIntent=q\.get\('new'\)==='1'/,'bootstrap must own fresh intent');
assert.match(boot,/zuno_stack_abandon_solo_round/,'bootstrap must use dedicated authoritative abandon RPC');
assert.match(boot,/rewriteUrl\(\['new'\]\)/,'fresh intent must be consumed so reload reconnects');
assert.match(boot,/captureStart/,'bootstrap must own the start lifecycle gate');
assert.match(boot,/waitServerActive/,'start must wait for an active authoritative round');
assert.match(boot,/a\.prepareStart\?\.\(\)/,'start must prepare host/server authority before local start');
assert.doesNotMatch(boot,/zuno_stack_commit_state/,'bootstrap must not mutate active engine through generic commit');
assert.match(migration,/r\.owner_id = v_user/,'abandon RPC must require room ownership');
assert.match(migration,/r\.description = '__zuno_stack_solo_authority__'/,'abandon RPC must be restricted to dedicated solo rooms');
assert.match(migration,/r\.visibility = 'private'/,'abandon RPC must require private room');
assert.match(migration,/r\.is_discoverable = false/,'abandon RPC must require non-discoverable room');
assert.match(migration,/security definer/,'private authoritative implementation must execute server-side');
assert.match(migration,/create or replace function public\.zuno_stack_abandon_solo_round[\s\S]*?language sql[\s\S]*?set search_path = ''/,'public wrapper must remain security-invoker SQL');

console.log('zuno-stack fresh solo round canonical lifecycle: ok');
