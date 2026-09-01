import assert from'node:assert/strict';
import{acceptedTransition,createBoardState,createCommand,createDomainEvent,createGameState,createModeRules,createPlayerState,createPrng,createRulesContext,dispatch}from'../src/zuno-stack-v2/core/index.mjs';

const sampleState=createGameState({mode:'test',seed:'stack-v2-seed',players:[createPlayerState({playerId:'p1',board:createBoardState()})]});

assert.doesNotThrow(()=>JSON.stringify(sampleState),'GameState must be JSON serializable');
assert.equal(globalThis.document,undefined,'core tests must run without browser DOM');

const a=createPrng('same-seed');
const b=createPrng('same-seed');
const seqA=Array.from({length:16},()=>a.nextUint32());
const seqB=Array.from({length:16},()=>b.nextUint32());
assert.deepEqual(seqA,seqB,'same seed must produce identical deterministic sequence');

const invalidSnapshot=JSON.stringify(sampleState);
const unknown=dispatch(sampleState,createCommand({type:'NOT_REGISTERED',actorId:'p1'}),createRulesContext({rules:createModeRules({modeId:'test',playerSlots:1})}));
assert.equal(unknown.accepted,false);
assert.equal(unknown.rejection.code,'UNKNOWN_COMMAND');
assert.strictEqual(unknown.state,sampleState,'rejected command must preserve original state reference');
assert.equal(JSON.stringify(sampleState),invalidSnapshot,'rejected command must not mutate state');

const rules=createModeRules({modeId:'test',playerSlots:1,transitions:{TEST_TRANSITION:(state,command)=>acceptedTransition({...state,status:'probe-complete'},[createDomainEvent('PROBE_COMPLETED',{actorId:command.actorId})])}});
const accepted=dispatch(sampleState,createCommand({type:'TEST_TRANSITION',actorId:'p1'}),createRulesContext({rules,logicalNow:100}));
assert.equal(accepted.accepted,true);
assert.equal(accepted.state.status,'probe-complete');
assert.equal(sampleState.status,'created','accepted handler must be able to return a new state without mutating input');
assert.deepEqual(accepted.events,[{type:'PROBE_COMPLETED',payload:{actorId:'p1'}}]);

assert.deepEqual(createPrng(42).shuffle([1,2,3,4,5]),createPrng(42).shuffle([1,2,3,4,5]),'deterministic shuffle must be reproducible');

console.log('zuno stack v2 core block 1: ok');
