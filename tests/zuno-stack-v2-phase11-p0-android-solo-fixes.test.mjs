import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSoloSession,startSoloSession,soloPickTile,soloUsePower} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {projectSoloView} from '../src/zuno-stack-v2/solo/solo-view.mjs';

const ui=fs.readFileSync(new URL('../zuno-stack-v2-solo-ui.mjs',import.meta.url),'utf8');

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

test('Shift Android failure is characterized as frozen Solo transition wiring blocker',()=>{
  let session=startSoloSession(createSoloSession({seed:'android-validation-rc'}));
  let guard=0;
  while(guard++<200){
    const view=projectSoloView(session.state,session.events);
    if(view.canUseShift)break;
    const next=view.tiles.find(tile=>tile.available);
    assert.ok(next,'expected an available tile before Shift readiness');
    session=soloPickTile(session,next.id);
  }
  assert.equal(projectSoloView(session.state,session.events).canUseShift,true);
  const shifted=soloUsePower(session);
  assert.equal(shifted.rejection?.code,'UNKNOWN_COMMAND');
  assert.equal(shifted.state.players[0].resources.powerShift,session.state.players[0].resources.powerShift);
});
