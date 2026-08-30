import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('zuno-stack.html','utf8');
const boot=fs.readFileSync('zuno-stack-solo-authority-bootstrap.js','utf8');
const perf=fs.readFileSync('zuno-stack-performance-official.js','utf8');
const auth=fs.readFileSync('zuno-stack-authority-official.js','utf8');
const actions=fs.readFileSync('zuno-stack-actions-authority.js','utf8');
const dead=[
 'zuno-stack-fresh-round-guard.js','zuno-stack-tile-bridge-v2.js','zuno-stack-server-engine-guard.js',
 'zuno-stack-relay-authority.js','zuno-stack-pulse-authority.js','zuno-stack-hint-authority.js',
 'zuno-stack-power-authority.js','zuno-stack-lobby-closeout.js','zuno-stack-lobby-v2.js'
];
for(const file of dead)assert.equal(fs.existsSync(file),false,`obsolete runtime file still exists: ${file}`);
for(const file of dead){assert.doesNotMatch(html,new RegExp(file.replaceAll('.','\\.')),`HTML still references ${file}`);assert.doesNotMatch(perf,new RegExp(file.replaceAll('.','\\.')),`loader still references ${file}`)}
assert.match(perf,/loadJs\('zuno-stack-authority-official\.js\?v=12','zsoAuthority'\)/);
assert.match(perf,/loadJs\('zuno-stack-actions-authority\.js\?v=1','zsoActionsAuthority'\)/);
assert.equal((perf.match(/zsoActionsAuthority/g)||[]).length,1,'actions authority must be loaded once');
assert.match(boot,/retirePreviousSoloRound/);
assert.match(boot,/zuno_stack_abandon_solo_round/);
assert.match(boot,/captureStart/);
assert.match(boot,/a\.prepareStart\?\.\(\)/);
assert.match(boot,/waitServerActive/);
assert.match(boot,/setBoardLocked\(true\)/);
assert.doesNotMatch(boot,/setTimeout\([^)]*3600/,'bootstrap must not contain forced start unlock timeout');
assert.match(auth,/function serverActionCapture/,'main authority must own tile capture');
assert.match(auth,/applyTile\(tile\.getAttribute\('data-tile'\)\)/,'tile capture must route to server applyTile');
assert.match(actions,/document\.addEventListener\('click',capture,true\)/,'sensitive non-tile actions need one canonical capture listener');
assert.equal((actions.match(/document\.addEventListener\('click',capture,true\)/g)||[]).length,1,'canonical actions file must install one click capture listener');
for(const rpc of ['zuno_stack_relay_send','zuno_stack_relay_take','zuno_stack_pulse_shift','zuno_stack_hint','zuno_stack_power','zuno_stack_gelo','zuno_stack_desfazer'])assert.match(actions,new RegExp(rpc),`missing canonical RPC ${rpc}`);
for(const api of ['ZunoStackRelayAuthority','ZunoStackPulseAuthority','ZunoStackHintAuthority','ZunoStackPowerAuthority'])assert.match(actions,new RegExp(api),`compatibility API missing: ${api}`);
assert.match(actions,/server_action_required_/,'unknown active client mutations must reconcile instead of committing');
console.log('Zuno Stack canonical runtime consolidation OK');
