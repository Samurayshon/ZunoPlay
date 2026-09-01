import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBoard,validateBoardState,canPickTile,listAvailableTileIds,createBoardState,createTile} from '../src/zuno-stack-v2/core/index.mjs';

const config={width:3,height:2,layers:2,families:['a','b','c','d']};

test('same seed and config produce identical boards',()=>{
  assert.deepEqual(generateBoard({seed:'alpha',config}),generateBoard({seed:'alpha',config}));
});

test('different seeds can produce different family layouts',()=>{
  const a=generateBoard({seed:'alpha',config}).tiles.map(tile=>tile.family);
  const b=generateBoard({seed:'beta',config}).tiles.map(tile=>tile.family);
  assert.notDeepEqual(a,b);
});

test('higher logical layer blocks same x/y and nonexistent tile is unavailable',()=>{
  const board=generateBoard({seed:1,config:{width:1,height:1,layers:2,families:['a']}});
  assert.equal(canPickTile(board,'t0'),false);
  assert.equal(canPickTile(board,'t1'),true);
  assert.equal(canPickTile(board,'missing'),false);
  assert.deepEqual(listAvailableTileIds(board),['t1']);
});

test('removed upper tile releases lower tile',()=>{
  const board=generateBoard({seed:1,config:{width:1,height:1,layers:2,families:['a']}});
  board.tiles[1].removed=true;
  assert.equal(canPickTile(board,'t0'),true);
});

test('invalid duplicate ids and positions are rejected',()=>{
  const tile=createTile({id:'same',family:'a',position:{x:0,y:0},layer:0});
  const duplicateId=createTile({id:'same',family:'b',position:{x:1,y:0},layer:0});
  assert.throws(()=>validateBoardState(createBoardState({tiles:[tile,duplicateId],meta:{width:2,height:1,layers:1}})),/duplicate tile id/);
  const duplicatePosition=createTile({id:'other',family:'b',position:{x:0,y:0},layer:0});
  assert.throws(()=>validateBoardState(createBoardState({tiles:[tile,duplicatePosition],meta:{width:2,height:1,layers:1}})),/duplicate logical board position/);
});

test('invalid coordinates and layers are rejected',()=>{
  assert.throws(()=>generateBoard({seed:1,config:{width:1,height:1,layers:1,families:['a'],positions:[{x:1,y:0,layer:0}]}}),/x is invalid/);
  assert.throws(()=>generateBoard({seed:1,config:{width:1,height:1,layers:1,families:['a'],positions:[{x:0,y:0,layer:1}]}}),/layer is invalid/);
});

test('board supports validators without adding mode rules',()=>{
  const board=generateBoard({seed:2,config:{width:2,height:1,layers:1,families:['a']},validators:[candidate=>candidate.tiles.length===2]});
  assert.equal(board.tiles.length,2);
  assert.throws(()=>generateBoard({seed:2,config:{width:2,height:1,layers:1,families:['a']},validators:[()=>false]}),/rejected by validator/);
});

test('board remains JSON serializable',()=>{
  const board=generateBoard({seed:'json',config});
  assert.deepEqual(JSON.parse(JSON.stringify(board)),board);
});

test('large board generation and availability stay bounded enough for core gate',()=>{
  const start=process.hrtime.bigint();
  let total=0;
  for(let i=0;i<40;i+=1){
    const board=generateBoard({seed:i,config:{width:8,height:8,layers:6,families:['a','b','c','d','e','f']}});
    total+=listAvailableTileIds(board).length;
    assert.equal(board.tiles.length,384);
  }
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  assert.ok(total>0);
  assert.ok(elapsedMs<3000,`board benchmark exceeded generous CI ceiling: ${elapsedMs.toFixed(1)}ms`);
});
