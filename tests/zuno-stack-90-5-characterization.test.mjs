import fs from 'node:fs';
import assert from 'node:assert/strict';

// Characterization guard for the CURRENT authoritative 90-tile / 5-layer Stack.
// This test intentionally reads production sources instead of reimplementing the engine.
// It freezes contracts before the canonical-engine refactor; it does not declare runtime DB behavior validated.

const core=fs.readFileSync('zuno-stack.js','utf8');
const tile=fs.readFileSync('supabase/migrations/20260829171857_server_authoritative_zuno_stack_tile.sql','utf8');
const relay=fs.readFileSync('supabase/migrations/20260829173758_server_authoritative_zuno_stack_relay.sql','utf8');
const pulse=fs.readFileSync('supabase/migrations/20260830031937_server_authoritative_zuno_stack_pulse_shift_r2.sql','utf8');
const hint=fs.readFileSync('supabase/migrations/20260830033601_server_authoritative_zuno_stack_hint.sql','utf8');
const events=fs.readFileSync('supabase/migrations/20260829133154_zuno_stack_game_events.sql','utf8');

// SQL formatting is not gameplay behavior. Normalize whitespace around operators so
// the guard freezes semantics without failing on harmless formatting differences.
const compactSql = (source) => source.replace(/\s+/g,' ').replace(/\s*([+\-%<>=])\s*/g,'$1');
const tileCompact=compactSql(tile);
const relayCompact=compactSql(relay);

// 90/5 + tray/relay shape.
assert.match(core,/TOTAL_TILES=90,LAYER_COUNTS=\[36,24,15,10,5\]/,'client baseline must remain 90 tiles / 5 layers');
assert.match(core,/TRAY_LIMIT=7/,'client tray limit must remain 7');
assert.match(tileCompact,/jsonb_array_length\(v_tiles\)<>90/,'tile RPC must require 90 tiles');
assert.match(tileCompact,/jsonb_array_length\(v_relay\)<>3/,'tile RPC must require 3 relay slots');
assert.match(tileCompact,/jsonb_array_length\(v_tray\)>=7/,'tile RPC must reject picks when tray is already full');

// Availability is authoritative: same x/y + a non-removed higher layer blocks the tile.
assert.match(tile,/not coalesce\(\(e\.tile->>'removed'\)::boolean,false\)[\s\S]*?\(e\.tile->>'x'\)::integer=v_x[\s\S]*?\(e\.tile->>'y'\)::integer=v_y[\s\S]*?\(e\.tile->>'layer'\)::integer>v_layer[\s\S]*?stack_tile_blocked/,'tile availability predicate changed');
assert.match(hint,/not exists\([\s\S]*?high\.tile->>'x'[\s\S]*?high\.tile->>'y'[\s\S]*?high\.tile->>'layer'[\s\S]*?>\(e\.tile->>'layer'\)::integer/,'hint must use the same higher-layer availability concept');

// Tile scoring, trio extraction, combo, energy and automatic Pulse cycle.
assert.match(tileCompact,/v_score:=least\(25000,v_score\+25\)/,'normal tile pick must add 25 points');
assert.match(tile,/order by e\.ord desc limit 3/,'trio must remove the three most-recent matching tray occurrences');
assert.match(tileCompact,/v_now_ms-v_last_match<=4000/,'combo window must remain 4000ms inclusive');
assert.match(tileCompact,/v_matches:=v_matches\+1/,'a resolved trio must increment matches exactly through the authoritative path');
assert.match(tileCompact,/v_energy:=least\(5,v_energy\+1\)/,'standard trio energy gain/cap changed');
assert.match(tileCompact,/if v_matches%5=0 then/,'automatic Pulse cycle must trigger each fifth match');
assert.match(tile,/case when v_double then 620 else 310 end/,'standard trio base/double scoring changed');
assert.match(tileCompact,/\(\(v_combo-1\)\*55\)/,'combo score increment changed');
assert.match(tile,/least\(25000/,'score cap must remain 25000');

// Current completion policy in the tile path: no board tiles => win; tray >=7 without match => finish.
assert.match(tileCompact,/if v_tiles_left=0 then v_active:=false; v_kind:='win'; elsif jsonb_array_length\(v_tray\)>=7 and not v_has_match then v_active:=false; v_kind:='finish'/,'tile completion policy changed');

// Revision, row locking and action-id idempotency are transactional/server concerns.
assert.match(tile,/where room_id=p_room_id\s+for update/,'tile state mutation must retain row locking');
assert.match(tile,/if v_row\.revision <> p_expected_revision then raise exception 'revision_conflict'/,'tile optimistic concurrency guard changed');
assert.match(tile,/where e\.room_id=p_room_id and e\.action_id=p_action_id/,'tile action-id replay lookup changed');
assert.match(tile,/stack_action_id_conflict/,'tile conflicting action-id payload must be rejected');
assert.match(events,/(unique\s*\(\s*room_id\s*,\s*action_id\s*\)|unique[^\n]*room_id[^\n]*action_id|create unique index[^;]*room_id[^;]*action_id)/i,'game events must enforce room/action id uniqueness');

// Relay remains server-authoritative and participates in standard match progression.
assert.match(relay,/for update/,'relay mutation must retain row locking');
assert.match(relay,/revision_conflict/,'relay must retain revision conflict protection');
assert.match(relay,/stack_action_id_conflict/,'relay must retain action-id conflict protection');
assert.match(relayCompact,/v_now_ms-v_last_match<=4000/,'relay-take combo window must remain aligned at 4000ms');
assert.match(relayCompact,/v_matches:=v_matches\+1/,'relay-take trio must increment matches');
assert.match(relayCompact,/v_energy:=least\(5,v_energy\+1\)/,'relay-take trio energy gain/cap changed');
assert.match(relayCompact,/if v_matches%5=0 then/,'relay-take automatic Pulse cycle changed');

// Manual Pulse Shift is a separate authoritative action and must preserve its current contract.
assert.match(pulse,/if v_energy<>5 then raise exception 'stack_pulse_not_ready'/,'manual Pulse must require energy=5');
assert.match(pulse,/v_critical:=jsonb_array_length\(v_tray\)>=6/,'Pulse critical threshold changed');
assert.match(pulse,/v_remove_count:=case when v_critical then 3 else 2 end/,'Pulse removal count changed');
assert.match(pulse,/v_gain:=case when v_critical then 260 else 160 end/,'Pulse scoring changed');
assert.match(pulse,/'tray',v_tray,'energy',0,'score',least\(25000,v_score\+v_gain\),'combo',0,'lastMatchAt',0/,'Pulse reset/result contract changed');

// Hint is authoritative, consumes one hint, and advances revision without mutating board/tray/score.
assert.match(hint,/if v_hints <= 0 then raise exception 'stack_hint_unavailable'/,'hint availability guard changed');
assert.match(hint,/v_hints := v_hints-1/,'hint must consume exactly one hint');
assert.match(hint,/v_new_revision := v_row\.revision\+1/,'hint must advance authoritative revision');
assert.match(hint,/jsonb_set\(v_engine,'\{hintsLeft\}',to_jsonb\(v_hints\),false\)/,'hint mutation must stay scoped to hintsLeft');

console.log('Zuno Stack 90/5 authoritative characterization contracts: ok');
