import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css=fs.readFileSync('zuno-global-navigation-v1.css','utf8');
const compact=css.replace(/\s+/g,'');
const supportedWidths=[320,360,390,430];
const scrollRootSelector='body:has(.zuno-canonical-nav)>:where(main,.app,.container,.shell,[data-zuno-scroll-root])';

test('the mobile shell covers every supported release width',()=>{
  const limit=Number(compact.match(/@media\(max-width:(\d+)px\)/)?.[1]);
  assert.equal(limit,620,'the canonical mobile shell breakpoint must remain explicit');
  for(const width of supportedWidths){
    assert.ok(width<=limit,`${width}px must use the canonical mobile scroll contract`);
  }
});

test('the canonical shell exposes one complete direct-root scrolling contract',()=>{
  const start=compact.indexOf(`${scrollRootSelector}{`);
  assert.notEqual(start,-1,'direct main elements, legacy shell classes and explicit roots must be scrollable');
  const end=compact.indexOf('}',start);
  assert.notEqual(end,-1,'the scroll-root declaration block must be complete');
  const block=compact.slice(start,end+1);
  for(const declaration of [
    'height:100dvh!important',
    'min-height:0!important',
    'max-height:100dvh!important',
    'overflow-x:hidden!important',
    'overflow-y:auto!important',
    'overscroll-behavior-y:contain!important',
    'padding-bottom:var(--znav-reserved-space)!important'
  ]) assert.ok(block.includes(declaration),`mobile scroll roots must include ${declaration}`);
  assert.ok(compact.includes(`${scrollRootSelector}::-webkit-scrollbar{display:none}`),'the scrollbar treatment must target the same roots');
});

test('the document lock remains paired with a reachable page scroll root',()=>{
  const lock='html.zuno-fluid-page:has(.zuno-canonical-nav),html.zuno-fluid-page:has(.zuno-canonical-nav)body';
  const start=compact.indexOf(`${lock}{`);
  assert.notEqual(start,-1,'the mobile document lock must remain scoped to the canonical navigation');
  const block=compact.slice(start,compact.indexOf('}',start)+1);
  assert.ok(block.includes('overflow:hidden!important'),'the fixed document shell must keep overflow locked');
  assert.ok(compact.includes(`${scrollRootSelector}{`),'a locked document must always have an eligible scrolling root');
});

test('all P1 pages expose an eligible direct mobile root',()=>{
  const directMainPages=['avatar.html','meu-xp.html','notificacoes.html','perfil.html','pulso.html'];
  for(const file of directMainPages){
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/<meta\b[^>]*name=["']viewport["'][^>]*>/i,`${file} must declare a mobile viewport`);
    assert.match(html,/<body\b[^>]*>\s*<main\b/i,`${file} must expose its page main directly under body`);
  }

  const conversations=fs.readFileSync('conversas.html','utf8');
  assert.match(conversations,/<body\b[^>]*>\s*<div\b[^>]*id=["']zunoMessagesApp["'][^>]*data-zuno-scroll-root(?:=["'][^"']*["'])?[^>]*>/i,'conversas.html must explicitly mark its non-main page root');
});
