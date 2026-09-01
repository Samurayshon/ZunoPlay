import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read=file=>fs.readFileSync(file,'utf8');
const htmlFiles=fs.readdirSync('.').filter(file=>path.extname(file)==='.html').sort();
const nav=read('nav.js');
const fluid=read('zuno-fluid-ui.css');
const modern=read('zuno-modernization-v1.css');
const room=read('sala.html');
const roomEdge=read('zuno-room-edge-to-edge-v1.css');

test('every route opts into an edge-to-edge mobile viewport',()=>{
  for(const file of htmlFiles){
    const html=read(file);
    assert.match(html,/<meta\b[^>]*name=["']viewport["'][^>]*width=device-width[^>]*viewport-fit=cover/i,`${file} must use the edge-to-edge viewport contract`);
  }
});

test('all canonical shell entrypoints use the current asset family',()=>{
  for(const file of htmlFiles){
    const html=read(file);
    assert.doesNotMatch(html,/nav\.js\?v=(?!351\b)\d+/,`${file} must not boot a stale canonical shell`);
  }
  assert.match(nav,/const V='351'/,'canonical shell version must be current');
  assert.match(nav,/zunoplay-modernization-v1-style/,'canonical shell must load the modernization layer');
  assert.match(nav,/if\(rooms\.includes\(page\)\)/,'Salas assets must be owned by the shared bootstrap');
  assert.doesNotMatch(read('salas.html'),/zuno-rooms-hub-v2\.(?:css|js)\?v=/,'Salas must not keep a second direct layout bootstrap');
  assert.match(read('nav.js'),/js\('zunoplay-room-invite-entry-v1-script','\.\/zuno-room-invite-entry-v1\.js'\)/,'the canonical Salas runtime must retain the room invite entrypoint');
});

test('one safe-area contract bridges browser and Android insets',()=>{
  for(const side of ['top','right','bottom','left']){
    assert.match(fluid,new RegExp(`--zuno-safe-${side}:max\\(env\\(safe-area-inset-${side},0px\\),var\\(--zuno-native-safe-${side}\\)\\)`),`${side} inset must merge browser and native values`);
  }
  assert.match(fluid,/\*,\*::before,\*::after\{box-sizing:border-box\}/,'box sizing must be global');
  assert.match(fluid,/\.zuno-fluid-page \*\{min-width:0\}/,'fluid descendants must be shrinkable');
  assert.match(modern,/overflow-x:clip/,'modern pages must contain horizontal paint overflow');
});

test('contextual and immersive pages expose local navigation',()=>{
  for(const file of ['amigos.html','comunidades.html','notificacoes.html','jogos.html','historico.html']){
    assert.match(read(file),/class=["'][^"']*zuno-context-back/,`${file} must expose a context back action`);
  }
  assert.match(read('avatar.html'),/class="avatar-back"/,'Avatar Studio must expose an immersive exit');
  assert.match(read('conversas.html'),/data-zuno-scroll-root/,'messages must own an explicit scroll root');
  assert.match(read('zuno-messages-stable.js'),/back\.dataset\.zunoInboxBack='1'/,'conversation inbox must create a context back action');
});

test('immersive voice room protects content without a visual spacer',()=>{
  assert.match(room,/zuno-navigation-policy-v1\.js\?v=351/,'voice room must be explicitly classified as immersive');
  assert.match(room,/zuno-room-edge-to-edge-v1\.css\?v=351/,'voice room must load its final safe-area geometry last');
  assert.match(roomEdge,/padding-top:calc\(22px \+ var\(--zuno-safe-top\)\)!important/,'room controls must remain below the status bar');
  assert.match(roomEdge,/padding-bottom:calc\(9px \+ var\(--zuno-safe-bottom\)\)!important/,'room composer must remain above the navigation area');
  assert.match(roomEdge,/background:#02040d!important/,'room and native shell must share the edge-to-edge base color');
});

test('the cache family ships every new shell asset',()=>{
  const sw=read('sw.js');
  const current=read('zuno-current.js');
  assert.match(sw,/CACHE_NAME="zunoplay-v351"/);
  assert.match(current,/const VERSION='351'/);
  for(const asset of ['zuno-fluid-ui.css','zuno-modernization-v1.css','zuno-room-edge-to-edge-v1.css']){
    assert.ok(sw.includes(`"./${asset}"`),`${asset} must be available to the app shell cache`);
  }
});
