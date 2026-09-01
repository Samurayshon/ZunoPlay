import test from'node:test';
import assert from'node:assert/strict';
import{generateBoard,getAvailableTileIds,canPickTile}from'../src/zuno-stack-v2/core/index.mjs';

const largeConfig={layerCounts:[64,64,64,64,64,64],columns:8,rows:8,families:['a','b','c','d','e','f']};

test('repeated large-board generation stays within a generous CI ceiling',()=>{
  const start=process.hrtime.bigint();let bytes=0;
  for(let i=0;i<40;i+=1){const board=generateBoard(largeConfig,i);assert.equal(board.tiles.length,384);bytes+=Buffer.byteLength(JSON.stringify(board));}
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  assert.ok(bytes>0);assert.ok(elapsedMs<5000,`board generation benchmark exceeded ceiling: ${elapsedMs.toFixed(1)}ms`);
});

test('availability checks do not require rebuilding board state',()=>{
  const board=generateBoard(largeConfig,'availability-benchmark');
  const before=JSON.stringify(board);const ids=board.tiles.map(tile=>tile.id);const start=process.hrtime.bigint();let available=0;
  for(let round=0;round<50;round+=1)for(const id of ids)if(canPickTile(board,id))available+=1;
  const elapsedMs=Number(process.hrtime.bigint()-start)/1e6;
  assert.ok(available>0);assert.equal(JSON.stringify(board),before,'availability queries must not grow or mutate board state');assert.ok(elapsedMs<5000,`availability benchmark exceeded ceiling: ${elapsedMs.toFixed(1)}ms`);
});

test('repeated generation has stable serialized state size for same seed',()=>{
  const sizes=[];for(let i=0;i<20;i+=1)sizes.push(Buffer.byteLength(JSON.stringify(generateBoard(largeConfig,'stable-seed'))));
  assert.equal(new Set(sizes).size,1,'same seed/config must not accumulate hidden state between generations');
  assert.ok(getAvailableTileIds(generateBoard(largeConfig,'stable-seed')).length>0);
});
