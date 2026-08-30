import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('zuno-my-xp-v1.js', 'utf8');
const dom = new JSDOM('<!doctype html><html><body><main class="zmx-shell"><div id="zmxRoot" aria-busy="true"></div></main></body></html>', {
  url: 'https://qa.local/meu-xp.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const { window } = dom;
const userId = '11111111-1111-4111-8111-111111111111';
window.localStorage.setItem('sb-rliymfbbhqoejgfvsbuu-auth-token', JSON.stringify({access_token:'qa-token',user:{id:userId}}));
window.fetch = async (url) => {
  const u = String(url);
  if (u.includes('user_xp_progression')) {
    assert.ok(u.includes(`user_id=eq.${userId}`), 'progress query must be scoped to current user');
    return new Response(JSON.stringify([{total_xp:110,level:2,updated_at:'2026-08-30T03:00:00Z'}]), {status:200});
  }
  if (u.includes('xp_transactions')) {
    assert.ok(u.includes(`user_id=eq.${userId}`), 'history query must be scoped to current user');
    return new Response(JSON.stringify([
      {id:2,amount:10,source:'game_win_bonus',source_event_id:'qa-win',created_at:'2026-08-30T03:01:00Z'},
      {id:1,amount:20,source:'game_completed',source_event_id:'qa-match',created_at:'2026-08-30T03:00:00Z'}
    ]), {status:200});
  }
  throw new Error(`unexpected request: ${u}`);
};
window.Response = globalThis.Response;
window.eval(source);
await new Promise(r => setTimeout(r, 30));
const text = window.document.getElementById('zmxRoot').textContent.replace(/\s+/g,' ').trim();
assert.match(text, /Meu XP/);
assert.match(text, /Nível 2/);
assert.match(text, /110 XP total/);
assert.match(text, /10 \/ 150 XP/);
assert.match(text, /140 XP para o nível 3/);
assert.match(text, /Vitória/);
assert.match(text, /\+10 XP/);
assert.match(text, /Partida concluída/);
assert.match(text, /\+20 XP/);
assert.match(text, /Primeira vitória do dia/);
assert.match(text, /Nível 100/);
assert.doesNotMatch(text, /Aura/i);
assert.equal(window.document.getElementById('zmxRoot').hasAttribute('aria-busy'), false);
console.log('PASS Meu XP UI: progresso, histórico, fontes, marcos, escopo próprio e separação de Aura');
