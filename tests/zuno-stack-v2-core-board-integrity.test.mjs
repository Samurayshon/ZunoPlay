import test from'node:test';
import assert from'node:assert/strict';
import{createBoardState,createTile,createValidatedBoardState,validateBoardState,generateBoard}from'../src/zuno-stack-v2/core/index.mjs';

test('missing blocker references are rejected',()=>{
  const tile=createTile({id:'base',family:'a',position:{x:0,y:0},layer:0});
  const board=createBoardState({tiles:[tile],layerCount:1,blockersByTile:{base:['ghost']}});
  assert.throws(()=>validateBoardState(board),/unknown tile/);
});

test('tampered blocker map is rejected',()=>{
  const low=createTile({id:'low',family:'a',position:{x:0,y:0},layer:0});
  const high=createTile({id:'high',family:'b',position:{x:0,y:0},layer:1});
  const board=createBoardState({tiles:[low,high],layerCount:2,blockersByTile:{low:[],high:[]}});
  assert.throws(()=>validateBoardState(board),/inconsistent with logical geometry/);
});

test('non-finite position and out-of-range layer are rejected',()=>{
  assert.throws(()=>createTile({id:'bad',family:'a',position:{x:Number.NaN,y:0},layer:0}),/position/);
  const tooHigh=createTile({id:'high',family:'a',position:{x:0,y:0},layer:2});
  assert.throws(()=>createValidatedBoardState({tiles:[tooHigh],layerCount:2}),/layer exceeds/);
});

test('layer count is configurable and not fixed to twelve',()=>{
  const board=generateBoard({layerCounts:[4,3,2,1],columns:2,rows:2,families:['a','b']},7);
  assert.equal(board.layerCount,4);
  assert.equal(board.tiles.length,10);
});
