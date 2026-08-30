import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync('zuno-stack.js','utf8');
const helperLine=src.split('\n').find(line=>line.startsWith('function sameBoardIdentity'));
assert.ok(helperLine,'sameBoardIdentity helper must exist');
const ctx={};
vm.createContext(ctx);
vm.runInContext(`${helperLine};globalThis.sameBoardIdentity=sameBoardIdentity`,ctx);
const sameBoardIdentity=ctx.sameBoardIdentity;

const base=[
  {id:'t0',type:'bolt',x:0,y:0,layer:0,removed:false},
  {id:'t1',type:'gem',x:1,y:0,layer:1,removed:false}
];
const removedOnly=base.map((t,i)=>({...t,removed:i===0}));
const typeChanged=base.map((t,i)=>i===0?{...t,type:'star'}:{...t});
const positionChanged=base.map((t,i)=>i===1?{...t,x:2}:{...t});

assert.equal(sameBoardIdentity(base,removedOnly),true,'removed-state changes must preserve the existing board DOM');
assert.equal(sameBoardIdentity(base,typeChanged),false,'piece identity changes must remount visuals');
assert.equal(sameBoardIdentity(base,positionChanged),false,'layout changes must remount visuals');
assert.match(src,/previousTiles=tiles/,'applyState must retain the prior board identity');
assert.match(src,/preserveBoard=sameBoardIdentity\(previousTiles,nextTiles\)/,'applyState must decide whether the board DOM can be preserved');
assert.match(src,/if\(b&&!preserveBoard\)\{b\.dataset\.zunoMounted='0';b\.replaceChildren\(\)\}/,'board destruction must be conditional on an actual layout or identity change');
assert.doesNotMatch(src,/active=!!s\.active;riskAnnounced=false;const b=\$\('board'\);if\(b\)\{b\.dataset\.zunoMounted='0';b\.replaceChildren\(\)\}/,'authoritative state updates must not unconditionally rebuild all 90 pieces');

console.log('zuno-stack board stability: ok');
