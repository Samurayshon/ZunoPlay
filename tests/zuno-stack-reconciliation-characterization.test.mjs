import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const authoritySource = fs.readFileSync(new URL('../zuno-stack-authority-official.js', import.meta.url), 'utf8');
const bridgeSource = fs.readFileSync(new URL('../zuno-stack-tile-bridge-v2.js', import.meta.url), 'utf8');

function makeAuthorityHarness({ initialRevision = 1, remoteRevision = 2, localScore = 10, remoteScore = 20 } = {}) {
  const applied = [];
  const rpcCalls = [];
  const fetches = [];
  let state = { active: true, tiles: Array.from({ length: 90 }, (_, i) => ({ id: `t${i}`, removed: false })), tray: [], score: localScore, matches: 0 };
  let rpcAttempt = 0;
  const remoteEngine = { ...state, score: remoteScore };
  const row = { room_id: '10000000-0000-0000-0000-000000000001', revision: remoteRevision, state: { engine: remoteEngine }, host_id: null, host_lease_until: null };
  const query = { select(){ return this; }, eq(){ return this; }, async maybeSingle(){ fetches.push('fetch'); return { data: row, error: null }; } };
  const sb = {
    auth: { async getSession(){ return { data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }; } },
    from(){ return query; },
    async rpc(name,args){
      rpcCalls.push({ name, args });
      if (name === 'zuno_stack_apply_tile') {
        rpcAttempt++;
        if (rpcAttempt === 1) return { data: null, error: { message: 'revision_conflict' } };
        return { data: { ...row, revision: remoteRevision + 1, state: { engine: { ...remoteEngine, tray: ['qa'], score: remoteScore + 25 } } }, error: null };
      }
      return { data: null, error: null };
    },
    realtime: { async setAuth(){} },
    channel(){ return { on(){ return this; }, subscribe(){ return this; } }; }
  };
  const core = {
    getState(){ return state; },
    applyState(next,meta){ state = structuredClone(next); applied.push({ next: structuredClone(next), meta }); },
    isActive(){ return true; }
  };
  const document = { hidden:false, body:{dataset:{}}, getElementById(){return null;}, querySelector(){return null;}, addEventListener(){}, dispatchEvent(){} };
  const window = { __ZUNO_STACK_AUTHORITY_ROOM_ID__: row.room_id, ZunoSupabaseClient: sb, ZunoStackCore: core };
  const context = { window, document, location:{search:''}, sessionStorage:{getItem(){return null;}}, URLSearchParams, setTimeout(fn){ fn(); return 1; }, clearTimeout(){}, setInterval(){return 1;}, CustomEvent: class { constructor(type,opts){this.type=type;this.detail=opts?.detail;} }, crypto:{ randomUUID(){ return `00000000-0000-4000-8000-${String(rpcCalls.length+1).padStart(12,'0')}`; } }, console };
  vm.runInNewContext(authoritySource, context);
  return { window, applied, rpcCalls, fetches, getState:()=>state, setRevisionForTest:()=>initialRevision };
}

test('authority revision_conflict fetches authoritative row and converges local state before retry', async () => {
  const h = makeAuthorityHarness();
  await new Promise(r => setImmediate(r));
  const auth = h.window.ZunoStackAuthority;
  assert.ok(auth, 'authority API must be exported');
  const first = await auth.applyTile('t85', 'qa-reconcile-action');
  assert.equal(first, false);
  assert.ok(h.fetches.length >= 1, 'revision_conflict must fetch authoritative state');
  assert.equal(h.getState().score, 20, 'local engine must converge to authoritative engine');
  const second = await auth.applyTile('t85', 'qa-reconcile-action');
  assert.equal(second, true);
  const tileCalls = h.rpcCalls.filter(c => c.name === 'zuno_stack_apply_tile');
  assert.equal(tileCalls.length, 2);
  assert.equal(tileCalls[0].args.p_action_id, tileCalls[1].args.p_action_id, 'retry with explicit action id must preserve idempotency key');
  assert.equal(tileCalls[1].args.p_expected_revision, 2, 'retry must use reconciled revision');
  assert.equal(h.getState().score, 45, 'successful retry must apply returned authoritative state');
});

test('bridge retry path is reconcile then one retry and busy guard prevents duplicate concurrent play', () => {
  assert.match(bridgeSource, /if\(!ok\)\{await auth\.reconcile\?\.\('tile_bridge_v2_retry'\);await sleep\(70\);ok=await auth\.applyTile\?\.\(tileId\)\}/);
  assert.match(bridgeSource, /async function play\(tileId\)\{if\(busy\)return false;busy=true;/);
  assert.match(bridgeSource, /finally\{busy=false\}/);
});

test('authority conflict paths reconcile from server and realtime/integrity converge through applyRow', () => {
  assert.match(authoritySource, /if\(m\.includes\('revision_conflict'\)\)await reconcile\('server_tile_revision_conflict'\)/);
  assert.match(authoritySource, /async function reconcile\(reason='conflict'\)\{const row=await fetchServer\(\);if\(row\)await applyRow\(row,reason\)\}/);
  assert.match(authoritySource, /applyRow\(payload\.new,'realtime'\)/);
  assert.match(authoritySource, /await applyRow\(row,'anti_desync'\)/);
  assert.match(authoritySource, /if\(remote\?\.active\)await applyRow\(row,'reconnect'\)/);
});
