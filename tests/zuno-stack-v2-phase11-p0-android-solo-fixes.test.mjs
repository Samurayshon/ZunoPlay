import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSoloSession,startSoloSession,soloPickTile,soloUsePower} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {projectSoloView} from '../src/zuno-stack-v2/solo/solo-view.mjs';

const ui=fs.readFileSync(new URL('../zuno-stack-v2-solo-ui.mjs',import.meta.url),'utf8');

function shiftReadySession(){
  let session=startSoloSession(createSoloSession({seed:'android-validation-rc'}));
  const view=projectSoloView(session.state,session.events);
  const next=view.tiles.find(tile=>tile.available);
  assert.ok(next,'expected an available tile for Shift setup');
  session=soloPickTile(session,next.id);
  const player=session.state.players[0];
  session={...session,state:{...session.state,players:[{...player,pulse:{...player.pulse,value:3}}]}};
  return session;
}

test('Android Solo UI renders initial Pulse as numeric zero when projection value is absent',()=>{
  const session=startSoloSession(createSoloSession({seed:'android-validation-rc'}));
  const view=projectSoloView(session.state,session.events);
  assert.equal(view.pulse,undefined);
  assert.match(ui,/v\.pulse\?\?0/);
});

test('Android Solo UI maps official uppercase terminal statuses and disables terminal actions',()=>{
  assert.match(ui,/v\.status==='WON'/);
  assert.match(ui,/v\.status==='LOST'/);
  assert.match(ui,/Vitória — tabuleiro limpo\./);
  assert.match(ui,/Derrota — bandeja cheia\./);
  assert.match(ui,/terminal\|\|!enabled/);
  assert.match(ui,/b\.disabled=terminal\|\|!t\.available/);
});

test('official Solo status becomes WON when the deterministic board is cleared',()=>{
  let session=startSoloSession(createSoloSession({seed:'android-validation-rc'}));
  let guard=0;
  while(session.state.status==='PLAYING'&&guard++<200){
    const view=projectSoloView(session.state,session.events);
    const next=view.tiles.find(tile=>tile.available);
    assert.ok(next,'expected an available tile while playing');
    session=soloPickTile(session,next.id);
  }
  assert.equal(session.state.status,'WON');
  assert.equal(projectSoloView(session.state,session.events).status,'WON');
});

test('Shift dispatches through official USE_POWER wiring instead of UNKNOWN_COMMAND',()=>{
  const session=shiftReadySession();
  assert.equal(projectSoloView(session.state,session.events).canUseShift,true);
  const shifted=soloUsePower(session);
  assert.equal(shifted.rejection,null);
  assert.ok(shifted.events.some(event=>event.type==='POWER_USED'));
  assert.ok(shifted.events.some(event=>event.type==='SOLO_POWER_SHIFTED'));
});

test('Shift consumes official cost and one charge and restores only newest tray tile',()=>{
  const session=shiftReadySession();
  const before=session.state.players[0];
  const restoredTileId=before.tray[before.tray.length-1];
  const shifted=soloUsePower(session);
  const after=shifted.state.players[0];
  assert.equal(before.pulse.value,3);
  assert.equal(after.pulse.value,0);
  assert.equal(after.resources.powerShift,before.resources.powerShift-1);
  assert.deepEqual(after.tray,before.tray.slice(0,-1));
  assert.equal(after.board.tiles.find(tile=>tile.id===restoredTileId)?.removed,false);
  for(const tile of before.board.tiles.filter(tile=>tile.id!==restoredTileId)){
    assert.equal(after.board.tiles.find(candidate=>candidate.id===tile.id)?.removed,tile.removed);
  }
});

test('invalid Shift cost is rejected atomically without consuming charge or changing state',()=>{
  const ready=shiftReadySession();
  const player=ready.state.players[0];
  const session={...ready,state:{...ready.state,players:[{...player,pulse:{...player.pulse,value:2}}]}};
  const before=structuredClone(session.state);
  const shifted=soloUsePower(session);
  assert.equal(shifted.rejection?.code,'INSUFFICIENT_POWER_COST');
  assert.deepEqual(shifted.state,before);
  assert.equal(shifted.state.players[0].resources.powerShift,player.resources.powerShift);
});
