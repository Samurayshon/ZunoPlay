import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const roomId='99a7f21b-0f22-4aec-a97e-33465946b022';
const tiles=Array.from({length:90},(_,i)=>({id:`t${i}`,type:`p${i%10}`,x:i%6,y:Math.floor(i/6)%6,layer:0,removed:i===2}));
const engine={active:true,tiles,tray:['p2'],score:25,matches:0};
let capture=null,applyCalls=0,reconcileCalls=0;
const authority={
  getState(){return {revision:3,roomId}},
  async reconcile(){reconcileCalls++;return true},
  async commit(){throw new Error('start commit must not run for an already-active server round')},
  async applyTile(id){assert.equal(id,'t1');applyCalls++;return true}
};
const sb={from(name){assert.equal(name,'zuno_stack_match_state');return {
  select(){return this},eq(k,v){assert.equal(k,'room_id');assert.equal(v,roomId);return this},
  async maybeSingle(){return {data:{revision:3,state:{engine}},error:null}}
}}};
const core={isActive(){return true},getState(){return engine}};
class ElementMock{closest(sel){return sel==='[data-tile]'?this:null}getAttribute(name){return name==='data-tile'?'t1':null}}
const document={addEventListener(type,fn){if(type==='pointerdown')capture=fn}};
const window={ZunoStackAuthority:authority,ZunoSupabaseClient:sb,ZunoStackCore:core,__ZUNO_STACK_AUTHORITY_ROOM_ID__:roomId};
const context={window,document,Element:ElementMock,setTimeout,clearTimeout,Promise,console};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('zuno-stack-tile-bridge-v2.js','utf8'),context);
assert.equal(typeof capture,'function','pointer bridge not installed');
const event={target:new ElementMock(),preventDefault(){},stopImmediatePropagation(){}};
capture(event);
await new Promise(r=>setTimeout(r,50));
assert.equal(applyCalls,1,'tile bridge blocked a valid move after the tray was already non-empty');
assert.ok(reconcileCalls>=1,'active server round was not reconciled before tile application');
console.log('Zuno Stack tile bridge post-first-move path OK');
