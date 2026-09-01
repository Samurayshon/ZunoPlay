import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommand,dispatch,getAvailableTileIds} from '../src/zuno-stack-v2/core/index.mjs';
import {createSoloSession,startSoloSession} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {createAuthoritativeMatch,executeAuthoritativeCommand,reconcileAuthoritativeMatch,snapshotAuthoritativeMatch} from '../src/zuno-stack-v2/server/authoritative-match-engine.mjs';

const make=()=>{const solo=startSoloSession(createSoloSession({seed:'phase4'}));return createAuthoritativeMatch({matchId:'m1',mode:'solo',players:['solo-player'],state:solo.state,context:solo.context})};
const availableTile=match=>getAvailableTileIds(match.state.players[0].board)[0];
const env=(match,over={})=>({matchId:'m1',mode:'solo',actorId:'solo-player',actionId:'a1',expectedRevision:match.revision,command:{type:'PICK_TILE',payload:{tileId:availableTile(match)}},...over});
const run=(match,input)=>executeAuthoritativeCommand(match,input,{dispatch,createCommand});

test('authoritative match starts serializable at revision zero',()=>{const m=make();assert.equal(m.revision,0);assert.doesNotThrow(()=>JSON.stringify(m.state));assert.equal(snapshotAuthoritativeMatch(m).revision,0)});
test('valid command is executed by frozen Core and increments revision once',()=>{const m=make();const r=run(m,env(m));assert.equal(r.receipt.accepted,true);assert.equal(r.match.revision,1);assert.notDeepEqual(r.match.state,m.state)});
test('actor spoof is rejected atomically',()=>{const m=make();const r=run(m,env(m,{actorId:'attacker'}));assert.equal(r.receipt.accepted,false);assert.equal(r.receipt.rejection.code,'ACTOR_NOT_IN_MATCH');assert.deepEqual(r.match,m)});
test('wrong match and mode reject atomically',()=>{const m=make();assert.equal(run(m,env(m,{matchId:'other'})).receipt.rejection.code,'MATCH_ID_MISMATCH');assert.equal(run(m,env(m,{mode:'pvp'})).receipt.rejection.code,'MODE_MISMATCH')});
test('stale and future revisions reject',()=>{const initial=make();const first=run(initial,env(initial)).match;assert.equal(run(first,env(first,{actionId:'a2',expectedRevision:0})).receipt.rejection.code,'STALE_REVISION');assert.equal(run(first,env(first,{actionId:'a3',expectedRevision:2})).receipt.rejection.code,'FUTURE_REVISION')});
test('duplicate actionId is idempotent replay without revision change',()=>{const m=make();const input=env(m);const first=run(m,input);const replay=run(first.match,input);assert.equal(replay.receipt.accepted,true);assert.equal(replay.receipt.replayed,true);assert.equal(replay.match.revision,1);assert.deepEqual(replay.match,first.match)});
test('client score/result/reward/xp declarations fail closed',()=>{for(const key of ['score','result','reward','xp']){const m=make();const command={type:'PICK_TILE',payload:{tileId:availableTile(m)},[key]:999};const r=run(m,env(m,{command,actionId:`bad-${key}`}));assert.equal(r.receipt.accepted,false);assert.equal(r.match.revision,0)}});
test('terminal match rejects commands atomically',()=>{const m={...make(),status:'FINISHED'};const r=run(m,env(m));assert.equal(r.receipt.rejection.code,'MATCH_TERMINAL');assert.deepEqual(r.match,m)});
test('reconciliation sends no full state when synced and snapshot on desync',()=>{const m=make();assert.equal(reconcileAuthoritativeMatch(m,{revision:0}).snapshot,null);const d=reconcileAuthoritativeMatch(m,{revision:9});assert.equal(d.snapshot.reason,'desync');assert.deepEqual(d.snapshot.state,m.state)});
test('same state plus same command is deterministic',()=>{const a0=make(),b0=make();const a=run(a0,env(a0)),b=run(b0,env(b0));assert.equal(JSON.stringify({state:a.match.state,revision:a.match.revision,receipt:a.receipt}),JSON.stringify({state:b.match.state,revision:b.match.revision,receipt:b.receipt}))});
test('receipt history is bounded',()=>{let m={...make(),maxReceipts:3};for(let i=0;i<5;i++){const r=run(m,env(m,{actionId:`x${i}`}));assert.equal(r.receipt.accepted,true);m=r.match}assert.equal(m.receipts.length,3)});
test('long rejection sequence remains atomic and fast',()=>{const m=make();const before=JSON.stringify(m);const start=performance.now();for(let i=0;i<1000;i++){const r=run(m,env(m,{actionId:`bad${i}`,expectedRevision:99}));assert.equal(r.receipt.accepted,false)}assert.equal(JSON.stringify(m),before);assert.ok(performance.now()-start<1000)});
