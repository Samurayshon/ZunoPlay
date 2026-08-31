import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source=fs.readFileSync('zuno-navigation-policy-v1.js','utf8');
const context={window:{},URLSearchParams};
vm.runInNewContext(source,context,{filename:'zuno-navigation-policy-v1.js'});
const policy=context.window.ZunoNavigationPolicy;
const plain=value=>JSON.parse(JSON.stringify(value));

assert.ok(policy,'navigation policy must be exposed');
assert.deepEqual([...policy.knownPages].sort(),fs.readdirSync('.').filter(file=>path.extname(file)==='.html').sort(),'every root HTML page must have an explicit navigation classification');

const cases=[
  ['index.html','',undefined,'member','global','global',true,'home'],
  ['index.html','',undefined,'guest','public','brand',false,null],
  ['salas.html','',undefined,'member','global','global',true,'rooms'],
  ['pulso.html','',undefined,'member','global','global',true,'pulse'],
  ['amigos.html','',undefined,'member','global','global',true,'central'],
  ['comunidades.html','',undefined,'member','global','global',true,'central'],
  ['notificacoes.html','',undefined,'member','global','global',true,'central'],
  ['jogos.html','',undefined,'member','global','global',true,'central'],
  ['conversas.html','',undefined,'member','global','global',true,'central'],
  ['conversas.html','?conversation=abc',undefined,'member','contextual','contextual',false,null],
  ['conversas.html','?user=abc',undefined,'member','contextual','contextual',false,null],
  ['perfil.html','',undefined,'member','global','global',true,'profile'],
  ['perfil.html','?user=abc',undefined,'member','contextual','contextual',false,null],
  ['perfil.html','', 'settings','member','contextual','contextual',false,null],
  ['avatar.html','',undefined,'member','contextual','contextual',false,null],
  ['meu-xp.html','',undefined,'member','contextual','contextual',false,null],
  ['historico.html','',undefined,'member','contextual','contextual',false,null],
  ['sala.html','?room=abc',undefined,'member','immersive','feature',false,null],
  ['zuno-stack.html','',undefined,'member','immersive','feature',false,null],
  ['entrada.html','',undefined,'guest','public','brand',false,null],
  ['login.html','',undefined,'guest','public','brand',false,null],
  ['cadastro.html','',undefined,'guest','public','brand',false,null],
  ['termos.html','',undefined,'guest','public','legal',false,null],
  ['privacidade.html','',undefined,'guest','public','legal',false,null]
];

for(const [page,search,view,authState,mode,header,bottomNav,active] of cases){
  const actual=policy.resolve({page,search,view,authState});
  assert.equal(actual.known,true,`${page} (${view||search||'default'}) must be known`);
  assert.equal(actual.mode,mode,`${page} mode`);
  assert.equal(actual.header,header,`${page} header`);
  assert.equal(actual.bottomNav,bottomNav,`${page} bottom navigation`);
  assert.equal(actual.active,active,`${page} active destination`);
  assert.equal(actual.bottomNav,actual.mode==='global',`${page} may only mount the bottom navigation in global mode`);
}

assert.deepEqual(plain(policy.resolve({page:'conversas.html',search:'?conversation=abc'}).back),{strategy:'fixed',target:'conversas.html'});
assert.deepEqual(plain(policy.resolve({page:'perfil.html',search:'?user=abc'}).back),{strategy:'origin-with-fallback',fallback:'amigos.html'});
assert.equal(policy.resolve({page:'perfil.html',search:'?user=abc',currentUserId:'abc'}).view,'own','the current user profile must remain global even with a user parameter');
assert.deepEqual(plain(policy.resolve({page:'historico.html'}).back),{strategy:'fixed',target:'jogos.html'});
assert.deepEqual(plain(policy.resolve({page:'zuno-stack.html',search:'?from=sala&room=sala-1'}).back),{strategy:'feature',target:'sala.html?room=sala-1'});
assert.equal(policy.resolve({page:'nova-tela.html'}).known,false,'unknown pages must be reported');
assert.equal(policy.resolve({page:'nova-tela.html'}).bottomNav,false,'unknown pages must fail closed without global navigation');

const root={dataset:{zunoAuthState:'member'}};
const browserContext={
  window:{dispatchEvent(){}},document:{documentElement:root},
  location:{pathname:'/ZunoPlay/conversas.html',search:'?conversation=abc'},
  URLSearchParams,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}}
};
vm.runInNewContext(source,browserContext,{filename:'zuno-navigation-policy-v1.js'});
assert.equal(root.dataset.zunoNavigationMode,'contextual','the browser annotation must expose the resolved mode');
assert.equal(root.dataset.zunoNavigationHeader,'contextual','the browser annotation must expose the resolved header');
assert.equal(root.dataset.zunoNavigationView,'thread','the browser annotation must expose the resolved view');
assert.equal('zunoNavigationActive' in root.dataset,false,'contextual screens must not expose a global active destination');
