import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createSoloSession,startSoloSession} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {projectSoloView,diffSoloView} from '../src/zuno-stack-v2/solo/solo-view.mjs';
import {createTrioSession,projectTrioSession} from '../src/zuno-stack-v2/trio/trio-session.mjs';
import {createPvpSession,projectPvpSession} from '../src/zuno-stack-v2/pvp/pvp-session.mjs';
import {createAuthoritativeMatch,reconnectAuthoritativeMatch,reconcileAuthoritativeMatch,snapshotAuthoritativeMatch} from '../src/zuno-stack-v2/server/authoritative-match-engine.mjs';
import {createRankingStore,processVerifiedRankingResult} from '../src/zuno-stack-v2/ranking/ranking-processor.mjs';
import {createPlayerAuthorityStore,processVerifiedPlayerAuthorityResult} from '../src/zuno-stack-v2/player-authority/player-authority-processor.mjs';
import {createAuraPresentation} from '../src/zuno-stack-v2/aura/aura-presentation-adapter.mjs';

const measure=(label,iterations,fn)=>{const started=performance.now();for(let i=0;i<iterations;i++)fn(i);const total=performance.now()-started;return {label,iterations,totalMs:total,perOpMs:total/iterations};};
const verified=i=>({type:'MATCH_RESULT',matchId:`bench-${i}`,mode:'solo',players:['p1'],startedAt:i*1000,finishedAt:i*1000+300000,result:'won',score:1800,performance:[{playerId:'p1',score:1800,combo:6,pulse:6,trayCount:0,remainingTiles:0}],disconnects:[],valid:true,antiFarmFlags:[]});

test('global serialization benchmark remains bounded for representative frozen states',()=>{
 const solo=startSoloSession(createSoloSession({seed:'bench-solo',playerId:'p1'})); const match=createAuthoritativeMatch({matchId:'bench',mode:'solo',players:['p1'],state:solo.state,context:solo.context});
 const trio=createTrioSession({playerIds:['p1','p2','p3'],seed:'bench-trio'}); const pvp=createPvpSession({playerIds:['p1','p2'],seed:'bench-pvp'});
 const samples=[measure('snapshot',1000,()=>JSON.stringify(snapshotAuthoritativeMatch(match))),measure('reconnect',1000,()=>JSON.stringify(reconnectAuthoritativeMatch(match))),measure('desync',1000,()=>JSON.stringify(reconcileAuthoritativeMatch(match,{revision:-1}))),measure('trio-projection',1000,()=>JSON.stringify(projectTrioSession(trio,'p1'))),measure('pvp-projection',1000,()=>JSON.stringify(projectPvpSession(pvp,'p1')))];
 for(const sample of samples){assert.ok(sample.perOpMs<50,`${sample.label} ${sample.perOpMs.toFixed(3)}ms/op`);assert.ok(sample.totalMs<20000,`${sample.label} benchmark runaway`);}
});

test('Solo view/diff benchmark stays comfortably under synchronous budget',()=>{
 const solo=startSoloSession(createSoloSession({seed:'bench-view'})); let previous=projectSoloView(solo.state,[]); const result=measure('solo-view-diff',3000,()=>{const next=projectSoloView(solo.state,[]);diffSoloView(previous,next);previous=next;});
 assert.ok(result.perOpMs<50,`${result.perOpMs.toFixed(3)}ms/op`);
});

test('Ranking and Player Authority deterministic soak are exactly-once with linear explicit history',()=>{
 const season={seasonId:'phase11',formulaVersion:'ranking-r1',startsAt:0,endsAt:999999999}; let ranking=createRankingStore(); let authority=createPlayerAuthorityStore();
 for(let i=0;i<200;i++){const result=verified(i);const r=processVerifiedRankingResult(ranking,{season,result});assert.equal(r.applied,true);ranking=r.store;const a=processVerifiedPlayerAuthorityResult(authority,{result});assert.equal(a.applied,true);authority=a.store;}
 assert.equal(ranking.history.length,200); assert.equal(Object.keys(ranking.processed).length,200); assert.equal(authority.history.length,200); assert.equal(Object.keys(authority.processed).length,200);
 const replay=verified(199); assert.equal(processVerifiedRankingResult(ranking,{season,result:replay}).replayed,true); assert.equal(processVerifiedPlayerAuthorityResult(authority,{result:replay}).replayed,true);
});

test('Match Server receipt policy is explicitly bounded while snapshots remain deterministic',()=>{
 const solo=startSoloSession(createSoloSession({seed:'receipt-bound',playerId:'p1'})); const match=createAuthoritativeMatch({matchId:'bounded',mode:'solo',players:['p1'],state:solo.state,context:solo.context,maxReceipts:128});
 assert.equal(match.maxReceipts,128); assert.equal(match.receipts.length,0); const a=JSON.stringify(snapshotAuthoritativeMatch(match)); const b=JSON.stringify(snapshotAuthoritativeMatch(match)); assert.equal(a,b);
});

test('Aura profile benchmark and accessibility invariants remain cosmetic',()=>{
 const projection={playerId:'p1',authority:350,matches:100,byMode:{solo:10,trio:20,pvp:30},tier:'nexus',level:5,progress:0,progressRequired:0,nextAuthority:null};
 for(const profile of ['standard','reduced-motion','low-end']){const sample=measure(`aura-${profile}`,5000,()=>createAuraPresentation(projection,{profile}));assert.ok(sample.perOpMs<50);const aura=createAuraPresentation(projection,{profile});assert.equal(aura.render.pointerEvents,'none');assert.equal(aura.render.layoutAffecting,false);assert.deepEqual(aura.render.properties,['transform','opacity']);if(profile!=='standard')assert.equal(aura.render.pulse.enabled,false);}
});

test('deterministic latency/churn schedule is data-driven and does not introduce wall-clock authority',()=>{
 const schedule=Array.from({length:300},(_,i)=>({tick:i,actor:['p1','p2','p3'][i%3],latencyTicks:(i*7)%11,disconnect:i%47===0,reconnect:i%47===1})); const replay=JSON.parse(JSON.stringify(schedule)); assert.deepEqual(replay,schedule); assert.equal(schedule.filter(x=>x.disconnect).length,schedule.filter(x=>x.reconnect).length);
});
