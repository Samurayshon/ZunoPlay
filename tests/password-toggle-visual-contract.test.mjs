import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const cssSource=fs.readFileSync('zuno-auth-canonical.css','utf8');
const css=cssSource.replace(/\s+/g,'');
const login=fs.readFileSync('login.html','utf8');
const cadastro=fs.readFileSync('cadastro.html','utf8');
const onboarding=fs.readFileSync('zuno-onboarding.js','utf8');

function rule(selector,source=css){
  const start=source.indexOf(`${selector}{`);
  assert.notEqual(start,-1,`missing CSS rule: ${selector}`);
  const declarationsStart=start+selector.length+1;
  const end=source.indexOf('}',declarationsStart);
  assert.notEqual(end,-1,`incomplete CSS rule: ${selector}`);
  return source.slice(declarationsStart,end).replace(/\s+/g,'');
}

test('password toggle container stays unpainted in every interaction state',()=>{
  const base=rule('.za-password-toggle,.zo-password-toggle');
  for(const declaration of [
    'background:transparent',
    'border:0',
    'border-radius:0',
    'outline:0',
    'box-shadow:none',
    'appearance:none',
    '-webkit-appearance:none',
    '-webkit-tap-highlight-color:transparent'
  ]) assert.ok(base.includes(declaration),`toggle base must include ${declaration}`);

  const interaction=rule('.za-password-toggle:hover,.za-password-toggle:focus,.za-password-toggle:focus-visible,.za-password-toggle:active,.zo-password-toggle:hover,.zo-password-toggle:focus,.zo-password-toggle:focus-visible,.zo-password-toggle:active');
  for(const declaration of [
    'background:transparent',
    'border-color:transparent',
    'outline:0',
    'box-shadow:none'
  ]) assert.ok(interaction.includes(declaration),`toggle interaction states must include ${declaration}`);
});

test('visible-password state changes only the eye color',()=>{
  const active=rule('.za-password-toggle.active,.zo-password-toggle.active');
  assert.ok(active.includes('color:#78dfff'),'visible eye must use the approved blue');
  assert.ok(active.includes('background:transparent'),'visible eye must retain a transparent container');
  assert.doesNotMatch(active,/box-shadow|outline|border(?:-color)?|background:(?!transparent)/,'visible state must not paint a contour or container');

  const icon=rule('.za-password-toggle svg,.zo-password-toggle svg',cssSource);
  assert.ok(icon.includes('stroke:currentColor'),'eye stroke must inherit the state color');
});

test('login eye is centered against the password input instead of its label',()=>{
  const wrapper=rule('.za-password-wrap,.zo-password-wrap');
  assert.ok(wrapper.includes('position:relative'),'the password wrapper must establish the positioning context');

  const toggle=rule('.za-password-toggle,.zo-password-toggle');
  assert.ok(toggle.includes('top:50%'),'the eye must target the vertical midpoint of its wrapper');
  assert.ok(toggle.includes('transform:translateY(-50%)'),'the eye must offset itself by half its own height');

  assert.match(
    login,
    /<label class="za-label" for="password">Senha<\/label><div class="za-password-wrap"><input\b[^>]*\bid="password"[^>]*><button\b[^>]*\bclass="za-password-toggle"[^>]*>.*?<\/button><\/div><\/div>/,
    'login input and eye must share a wrapper that excludes the field label'
  );
});

test('login and both registration fields retain accessible toggle state',()=>{
  assert.equal((login.match(/class="za-password-toggle"/g)||[]).length,1,'login must expose one password toggle');
  assert.equal((cadastro.match(/class="zo-password-toggle"/g)||[]).length,2,'registration must expose password and confirmation toggles');

  for(const [page,html] of [['login',login],['registration',cadastro]]){
    assert.match(html,/class="z[ao]-password-toggle"[^>]*type="button"[^>]*aria-label="Mostrar[^>]*aria-pressed="false"/,`${page} toggles must start hidden and announce their state`);
    assert.match(html,/zuno-auth-canonical\.css\?v=5/,`${page} must request the corrected, cache-busted stylesheet`);
  }

  assert.ok(login.includes("passwordToggle.classList.toggle('active',!showing)"),'login must synchronize the blue eye state');
  assert.ok(login.includes("passwordToggle.setAttribute('aria-pressed',String(!showing))"),'login must synchronize aria-pressed');
  assert.ok(onboarding.includes("btn.classList.toggle('active',!showing)"),'registration must synchronize the blue eye state');
  assert.ok(onboarding.includes("btn.setAttribute('aria-pressed',String(!showing))"),'registration must synchronize aria-pressed');
});
