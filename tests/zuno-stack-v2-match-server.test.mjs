import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommand,dispatch} from '../src/zuno-stack-v2/core/index.mjs';
import {createSoloSession,startSoloSession} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {createAuthoritativeMatch,executeAuthoritativeCommand,reconcileAuthoritativeMatch,snapshotAuthoritativeMatch} from '../src/zuno-stack-v2/server/authoritative-match-engine.mjs';

const make=()=>{const solo=startSoloSession(createSoloSession({seed:'phase4'}));return createAuthoritativeMatch({matchId:'m1',mode:'solo',players:['solo-player'],state:solo.state,context:solo.context})};
const env=(over={})=>({matchId:'m1',mode:'solo',actorId:'solo-player',actionId:'a1',expectedRevision:0,command:{type:'PICK_TILE',payload:{tileId:'tile-53'}},...over});
const run=(match,input)=>executeAuthoritativeCommand(match,input,{dispatch,createCommand});

test('authoritative match starts serializable at revision zero',()=>{const m=make();assert.equal(m.revision,0);assert.doesNotThrow(()=>JSON.stringify(m.state));assert.equal(snapshotAuthoritativeMatch(m).revision,0)});
test('valid command is executed by frozen Core and increments revision once',()=>{const m=make();const r=run(m,env());assert.equal(r.receipt.accepted,true);assert.equal(r.match.revision,1);assert.notDeepEqual(r.match.state,m.state)});
test('actor spoof is rejected atomically',()=>{const m=make();const r=run(m,env({actorId:'attacker'}));assert.equal(r.receipt.accepted,false);assert.equal(r.receipt.rejection.code,'ACTOR_NOT_IN_MATCH');assert.deepEqual(r.match,m)});
test('wrong match and mode reject atomically',()=>{const m=make();assert.equal(run(m,env({matchId:'other'})).receipt.rejection.code,'MATCH_ID_MISMATCH');assert.equal(run(m,env({mode:'pvp'})).receipt.rejection.code,'MODE_MISMATCH')});
test('stale and future revisions reject',()=>{const first=run(make(),env()).match;assert.equal(run(first,env({actionId:'a2',expectedRevision:0})).receipt.rejection.code,'STALE_REVISION');assert.equal(run(first,env({actionId:'a3',expectedRevision:2})).receipt.rejection.code,'FUTURE_REVISION')});
test('duplicate actionId is idempotent replay without revision change',()=>{const first=run(make(),env());const replay=run(first.match,env({expectedRevision:1}));assert.equal(replay.receipt.accepted,true);assert.equal(replay.receipt.replayed,true);assert.equal(replay.match.revision,1);assert.deepEqual(replay.match,first.match)});
test('client score/result/reward/xp declarations fail closed',()=>{for(const key of ['score','result','reward','xp']){const m=make();const command={type:'PICK_TILE',payload:{tileId:'tile-53'},[key]:999};const r=run(m,env({command,actionId:`bad-${key}`}));assert.equal(r.receipt.accepted,false);assert.equal(r.match.revision,0)}});
test('terminal match rejects commands atomically',()=>{const m={...make(),status:'FINISHED'};const r=run(m,env());assert.equal(r.receipt.rejection.code,'MATCH_TERMINAL');assert.deepEqual(r.match,m)});
test('reconciliation sends no full state when synced and snapshot on desync',()=>{const m=make();assert.equal(reconcileAuthoritativeMatch(m,{revision:0}).snapshot,null);const d=reconcileAuthoritativeMatch(m,{revision:9});assert.equal(d.snapshot.reason,'desync');assert.deepEqual(d.snapshot.state,m.state)});
test('same state plus same command is deterministic',()=>{const a=run(make(),env());const b=run(make(),env());assert.deepEqual(a,b)});
test('receipt history is bounded',()=>{let m={...make(),maxReceipts:3};for(let i=0;i<5;i++){const tile=m.state.players[0].board.tiles.find(t=>!t.removed&&m.state.players[0].board.blockersByTile[t.id]?.length===0);const r=run(m,env({actionId:`x${i}`,expectedRevision:m.revision,command:{type:'PICK_TILE',payload:{tileId:tile.id}}}));assert.equal(r.receipt.accepted,true);m=r.match}assert.equal(m.receipts.length,3)});
test('long rejection sequence remains atomic and fast',()=>{const m=make();const before=JSON.stringify(m);const start=performance.now();for(let i=0;i<1000;i++){const r=run(m,env({actionId:`bad${i}`,expectedRevision:99}));assert.equal(r.receipt.accepted,false)}assert.equal(JSON.stringify(m),before);assert.ok(performance.now()-start<1000)});
