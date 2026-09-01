import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createSoloSession,startSoloSession,soloPickTile,soloUsePower} from '../src/zuno-stack-v2/solo/solo-session.mjs';
import {projectSoloView} from '../src/zuno-stack-v2/solo/solo-view.mjs';

const plain=value=>JSON.parse(JSON.stringify(value));

test('Shell Policy Guard: Zuno Stack V2 Solo is an explicit immersive feature route and unknown routes fail closed',()=>{
  const source=fs.readFileSync('zuno-navigation-policy-v1.js','utf8');
  const context={window:{},URLSearchParams};
  vm.runInNewContext(source,context,{filename:'zuno-navigation-policy-v1.js'});
  const policy=context.window.ZunoNavigationPolicy;
  assert.ok(policy);
  const route=plain(policy.resolve({page:'zuno-stack-v2-solo.html',authState:'member'}));
  assert.equal(route.known,true);
  assert.equal(route.kind,'IMMERSIVE');
  assert.equal(route.mode,'immersive');
  assert.equal(route.header,'feature');
  assert.equal(route.bottomNav,false);
  assert.equal(route.active,null);
  assert.deepEqual(route.back,{strategy:'feature',target:'jogos.html'});
  const unknown=plain(policy.resolve({page:'zuno-stack-v2-unapproved.html',authState:'member'}));
  assert.equal(unknown.known,false);
  assert.equal(unknown.bottomNav,false);
  assert.equal(unknown.mode,'contextual');
});

test('Fresh Solo Round: a new round is clean, independent and restores official initial state',()=>{
  const seed='fresh-solo-round-gate';
  let previous=startSoloSession(createSoloSession({seed}));
  const first=projectSoloView(previous.state,previous.events).tiles.find(tile=>tile.available);
  assert.ok(first);
  previous=soloPickTile(previous,first.id);
  const mutatedPlayer=previous.state.players[0];
  previous={...previous,state:{...previous.state,players:[{...mutatedPlayer,pulse:{...mutatedPlayer.pulse,value:3}}]}};
  previous=soloUsePower(previous);
  assert.equal(previous.rejection,null);

  const fresh=startSoloSession(createSoloSession({seed}));
  const player=fresh.state.players[0];
  assert.equal(fresh.state.status,'PLAYING');
  assert.equal(fresh.state.mode,'solo');
  assert.equal(fresh.state.rulesetVersion,'solo-complete-r1');
  assert.equal(fresh.state.shared.logicalTurn,0);
  assert.equal(fresh.state.startedAtLogical,0);
  assert.deepEqual(player.tray,[]);
  assert.equal(player.score,0);
  assert.equal(player.combo,0);
  assert.equal(player.pulse.value,0);
  assert.deepEqual(player.resources,{undo:3,hint:3,rescue:1,powerShift:2});
  assert.deepEqual(fresh.history,[]);
  assert.equal(fresh.rejection,null);
  assert.equal(fresh.events.length,1);
  assert.equal(fresh.events[0].type,'SOLO_STARTED');
  assert.notStrictEqual(fresh,previous);
  assert.notStrictEqual(fresh.state,previous.state);
  assert.notDeepEqual(player.tray,previous.state.players[0].tray);
  assert.equal(player.resources.powerShift,2);
  assert.equal(player.pulse.value,0);
});
