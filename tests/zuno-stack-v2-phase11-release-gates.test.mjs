import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createSoloSession,startSoloSession,soloHint,soloPickTile,soloUndo} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {projectSoloView,diffSoloView} from '../src/zuno-stack-v2/solo/solo-view.mjs';
import {TRAY_CAPACITY,getAvailableTileIds} from '../src/zuno-stack-v2/core/index.mjs';
import {createTrioSession} from '../src/zuno-stack-v2/trio/trio-session.mjs';
import {RELAY_CAPACITY,TRIO_RULESET_VERSION} from '../src/zuno-stack-v2/trio/trio-rules.mjs';
import {createPvpSession} from '../src/zuno-stack-v2/pvp/pvp-session.mjs';
import {PVP_COUNTDOWN_TICKS,PVP_INTERFERENCE,PVP_RULESET_VERSION} from '../src/zuno-stack-v2/pvp/pvp-rules.mjs';
import {createAuthoritativeMatch,createRewardsBridgePayload,reconnectAuthoritativeMatch,reconcileAuthoritativeMatch,snapshotAuthoritativeMatch} from '../src/zuno-stack-v2/server/authoritative-match-engine.mjs';
import {createRankingStore,processVerifiedRankingResult} from '../src/zuno-stack-v2/ranking/ranking-processor.mjs';
import {createPlayerAuthorityStore,processVerifiedPlayerAuthorityResult} from '../src/zuno-stack-v2/player-authority/player-authority-processor.mjs';
import {projectPublicPlayerAuthority} from '../src/zuno-stack-v2/player-authority/player-authority-progression.mjs';
import {createAuraPresentation} from '../src/zuno-stack-v2/aura/aura-presentation-adapter.mjs';

const p95=values=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*.95)-1)];
const verified=(overrides={})=>({type:'MATCH_RESULT',matchId:'phase11-match',mode:'solo',players:['p1'],startedAt:0,finishedAt:300000,result:'won',score:1800,performance:[{playerId:'p1',score:1800,combo:6,pulse:6,trayCount:0,remainingTiles:0}],disconnects:[],valid:true,antiFarmFlags:[],...overrides});

test('Phase 11 Solo release surface exposes deterministic risk and unavailable-action semantics',()=>{
 let session=startSoloSession(createSoloSession({seed:'phase11-solo'}));
 const initial=projectSoloView(session.state,session.events);
 assert.equal(initial.trayCapacity,TRAY_CAPACITY); assert.equal(TRAY_CAPACITY,7);
 assert.equal(typeof initial.canUndo,'boolean'); assert.equal(typeof initial.canHint,'boolean'); assert.equal(typeof initial.canRescue,'boolean'); assert.equal(typeof initial.canUseShift,'boolean');
 const hint=soloHint(session); assert.equal(hint.rejection,null); assert.ok(hint.events.some(e=>e.type==='SOLO_HINTED'));
 const tileId=getAvailableTileIds(session.state.players[0].board)[0]; const picked=soloPickTile(session,tileId); assert.equal(picked.rejection,null);
 const view=projectSoloView(picked.state,picked.events); const delta=diffSoloView(initial,view); assert.equal(delta.full,false); assert.equal(delta.tray,true);
 const undone=soloUndo(picked); assert.equal(undone.rejection,null); assert.ok(undone.events.some(e=>e.type==='SOLO_UNDONE'));
 assert.ok(['CREATED','PLAYING','WON','LOST'].includes(initial.status));
});

test('Phase 11 Trio release gate freezes exactly-three, Relay and shared collaboration surface',()=>{
 const trio=createTrioSession({playerIds:['p1','p2','p3'],seed:'phase11-trio'});
 assert.equal(trio.state.players.length,3); assert.equal(trio.state.rulesetVersion,TRIO_RULESET_VERSION); assert.equal(RELAY_CAPACITY,3);
 assert.equal(trio.state.shared.relay.length,3); assert.equal(trio.state.shared.pulse.max,30);
 assert.throws(()=>createTrioSession({playerIds:['p1','p2'],seed:'bad'}));
 assert.ok(Object.prototype.hasOwnProperty.call(trio.state.shared,'logicalTurn'));
});

test('Phase 11 PvP release gate freezes 1x1 lifecycle and bounded Pressure interference',()=>{
 const pvp=createPvpSession({playerIds:['p1','p2'],seed:'phase11-pvp'});
 assert.equal(pvp.state.players.length,2); assert.equal(pvp.state.rulesetVersion,PVP_RULESET_VERSION); assert.equal(PVP_COUNTDOWN_TICKS,3);
 assert.equal(PVP_INTERFERENCE.pressure.maxPendingPerTarget,2); assert.equal(PVP_INTERFERENCE.pressure.cooldownRevisions,2); assert.equal(PVP_INTERFERENCE.pressure.durationCommands,1);
 assert.throws(()=>createPvpSession({playerIds:['p1'],seed:'bad'}));
});

test('Verified result -> Ranking -> Player Authority -> Aura remains exactly-once and cosmetic',()=>{
 const result=verified(); const season={seasonId:'s11',formulaVersion:'ranking-r1',startsAt:0,endsAt:999999999};
 let ranking=createRankingStore(); const firstRank=processVerifiedRankingResult(ranking,{season,result}); assert.equal(firstRank.applied,true); ranking=firstRank.store;
 const rankReplay=processVerifiedRankingResult(ranking,{season,result}); assert.equal(rankReplay.replayed,true);
 const rankCollision=processVerifiedRankingResult(ranking,{season,result:{...result,score:1801}}); assert.equal(rankCollision.rejection.code,'RANKING_RESULT_COLLISION');
 let authority=createPlayerAuthorityStore(); const firstAuthority=processVerifiedPlayerAuthorityResult(authority,{result}); assert.equal(firstAuthority.applied,true); authority=firstAuthority.store;
 const authorityReplay=processVerifiedPlayerAuthorityResult(authority,{result}); assert.equal(authorityReplay.replayed,true);
 const authorityCollision=processVerifiedPlayerAuthorityResult(authority,{result:{...result,score:1801}}); assert.equal(authorityCollision.rejection.code,'PLAYER_AUTHORITY_RESULT_COLLISION');
 const publicAuthority=projectPublicPlayerAuthority(authority.players.p1); const aura=createAuraPresentation(publicAuthority,{profile:'reduced-motion'});
 assert.equal(aura.render.pointerEvents,'none'); assert.equal(aura.render.pulse.enabled,false); assert.equal(aura.competitiveEffects,false); assert.equal(aura.authorityMutation,false); assert.equal(aura.rankingMutation,false); assert.equal(aura.xpEnabled,false); assert.equal(aura.rewardsEnabled,false);
});

test('anti-farm flags fail closed before Ranking and Player Authority mutation',()=>{
 const result=verified({antiFarmFlags:['AUTHORITY_TOO_SHORT']}); const season={seasonId:'s11',formulaVersion:'ranking-r1',startsAt:0,endsAt:999999999};
 const ranking=processVerifiedRankingResult(createRankingStore(),{season,result,blockingAntiFarmFlags:['AUTHORITY_TOO_SHORT']}); assert.equal(ranking.applied,false);
 const authority=processVerifiedPlayerAuthorityResult(createPlayerAuthorityStore(),{result,blockingAntiFarmFlags:['AUTHORITY_TOO_SHORT']}); assert.equal(authority.applied,false);
});

test('server snapshots/reconnect/desync stay serializable and rewards remain fail-closed',()=>{
 const session=startSoloSession(createSoloSession({seed:'phase11-server',playerId:'p1'}));
 const match=createAuthoritativeMatch({matchId:'m1',mode:'solo',players:['p1'],state:session.state,context:session.context,startedAt:0});
 const snapshot=snapshotAuthoritativeMatch(match); const reconnect=reconnectAuthoritativeMatch(match); const desync=reconcileAuthoritativeMatch(match,{revision:-1});
 assert.doesNotThrow(()=>JSON.stringify(snapshot)); assert.doesNotThrow(()=>JSON.stringify(reconnect)); assert.equal(desync.inSync,false); assert.ok(desync.snapshot);
 assert.throws(()=>createRewardsBridgePayload(match),/VERIFIED_RESULT_REQUIRED/);
 const rewarded=createRewardsBridgePayload({...match,result:verified()}); assert.equal(rewarded.rewardsEnabled,false); assert.equal(rewarded.xpEnabled,false);
});

test('CI proxy budgets keep synchronous Solo projection/diff below local-action ceiling',()=>{
 const session=startSoloSession(createSoloSession({seed:'phase11-perf'})); const samples=[]; let prior=projectSoloView(session.state,[]);
 for(let i=0;i<500;i++){const t=performance.now(); const next=projectSoloView(session.state,[]); diffSoloView(prior,next); samples.push(performance.now()-t); prior=next;}
 assert.ok(p95(samples)<50,`CI proxy p95 ${p95(samples).toFixed(3)}ms exceeded 50ms`); assert.ok(Math.max(...samples)<200,'synchronous proxy freeze >=200ms');
});

test('Android device proof remains an explicit external release gate',()=>{
 const gate={status:'DEVICE_VALIDATION_REQUIRED',profiles:['entry-android','mid-tier-android'],budgets:{touchP95Ms:100,localActionP95Ms:50,maxMainThreadFreezeMs:200},checks:['memory','frame-pacing','reconnect','low-end-aura','reduced-motion']};
 assert.equal(gate.status,'DEVICE_VALIDATION_REQUIRED'); assert.equal(gate.budgets.touchP95Ms,100); assert.ok(gate.checks.includes('frame-pacing'));
});
