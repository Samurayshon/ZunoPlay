(()=>{
if(window.__ZUNO_STACK_LAYOUT_V2__)return;window.__ZUNO_STACK_LAYOUT_V2__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const POWERS={
 explosion:{label:'EXPLOSÃO',icon:'✦',tier:5,a:'#ff4d91',b:'#65163e',line:'#ff65ad'},
 elo:{label:'ELO',icon:'⛓',tier:5,a:'#ffd553',b:'#6b4a08',line:'#ffe17c'},
 fase:{label:'FASE',icon:'◈',tier:4,a:'#b969ff',b:'#45137a',line:'#d497ff'},
 vortice:{label:'VÓRTICE',icon:'◉',tier:4,a:'#5f8dff',b:'#172f75',line:'#77a2ff'},
 gelo:{label:'GELO',icon:'❄',tier:4,a:'#42dfff',b:'#0c557a',line:'#70e8ff'},
 fluxo:{label:'FLUXO',icon:'↻',tier:3,a:'#a653ff',b:'#3d116c',line:'#c46dff'},
 troca:{label:'TROCA',icon:'⇄',tier:3,a:'#ff9655',b:'#6c2d0b',line:'#ffb27e'},
 ima:{label:'ÍMÃ',icon:'∩',tier:3,a:'#ff5f79',b:'#671526',line:'#ff8295'},
 desfazer:{label:'DESFAZER',icon:'↶',tier:2,a:'#72d59a',b:'#175033',line:'#8ce9ae'}
};
let playing=false,round=0,selected=[],charges={},mounted=false;
function msg(t){const e=document.createElement('div');e.className='zso-power-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),950)}
function trayLabels(){const c={};$$('#tray .slot.filled .tiny').forEach(e=>{const k=e.textContent.trim();if(k)c[k]=(c[k]||0)+1});return c}
function activeTiles(){return $$('.tile.active:not(.removed):not(:disabled)[data-tile]')}
function choose(){const apex=['explosion','elo'];const mid=['fase','vortice','gelo'];const utility=['fluxo','troca','ima','desfazer'];const pick=[];if(Math.random()<.58)pick.push(apex[Math.floor(Math.random()*apex.length)]);const pool=[...mid,...utility].sort(()=>Math.random()-.5);for(const p of pool){if(pick.length>=3)break;if(!pick.includes(p))pick.push(p)}selected=pick.sort(()=>Math.random()-.5);charges=Object.fromEntries(selected.map(x=>[x,1]));round++;sessionStorage.setItem('zuno_stack_power_draw',JSON.stringify({round,selected}))}
function ensureRhythmInGoal(){const rhythm=$('#zsrRhythm'),goal=$('.zso-goal');if(!rhythm||!goal||rhythm.parentElement===goal)return;const copy=goal.querySelector('div');if(copy&&!copy.classList.contains('zso-goal-copy'))copy.classList.add('zso-goal-copy');goal.appendChild(rhythm)}
function enrichPlayers(){const m=parseInt($('#matches')?.textContent||'0',10)||0;$$('.zso-player').forEach((p,i)=>{let s=p.querySelector('.zso-player-state');if(!s){s=document.createElement('small');s.className='zso-player-state';p.appendChild(s)}const name=p.querySelector('b')?.textContent.trim()||'';s.textContent=i===0?`${m} trios · você`:name==='Convidar'?'vaga livre':'em equipe'})}
function enrichOrder(){const box=$('.zso-order');if(!box)return;let r=box.querySelector('.zso-order-reward');if(!r){r=document.createElement('div');r.className='zso-order-reward';r.innerHTML='<span>RECOMPENSA</span><b>+ PULSE</b>';box.appendChild(r)}}
function legacyButton(type){const map={explosion:'blast',gelo:'freeze',fluxo:'pulse'};return map[type]?$(`[data-zso-power="${map[type]}"]`):null}
function useLegacy(type){const b=legacyButton(type);if(!b||b.disabled)return false;b.click();return true}
function bestMatchingTile(min=1){const counts=trayLabels();const options=Object.entries(counts).filter(([,n])=>n>=min).sort((a,b)=>b[1]-a[1]);for(const [label] of options){const t=activeTiles().find(x=>(x.getAttribute('aria-label')||'').trim()===label);if(t)return t}return null}
function useCustom(type){if(type==='desfazer'){const b=$('#undo');if(!b||b.disabled)return false;b.click();return true}
if(type==='elo'){const t=bestMatchingTile(2);if(!t)return false;t.click();return true}
if(type==='ima'){const t=bestMatchingTile(1);if(!t)return false;t.click();return true}
if(type==='troca'){const undo=$('#undo');if(!undo||undo.disabled)return false;undo.click();setTimeout(()=>{const t=bestMatchingTile(1)||activeTiles()[0];t?.click()},110);return true}
if(type==='vortice'){const room=7-$$('#tray .slot.filled').length;if(room<2)return false;const tiles=activeTiles();if(tiles.length<2)return false;tiles[0].click();setTimeout(()=>{const next=bestMatchingTile(1)||activeTiles()[0];next?.click()},100);return true}
if(type==='fase'){const blocked=$$('.tile:not(.active):not(.removed)[data-tile]')[0];if(!blocked)return false;const x=getComputedStyle(blocked).getPropertyValue('--x'),y=getComputedStyle(blocked).getPropertyValue('--y');const blocker=activeTiles().find(t=>getComputedStyle(t).getPropertyValue('--x')===x&&getComputedStyle(t).getPropertyValue('--y')===y);if(!blocker)return false;blocker.click();setTimeout(()=>{const target=$(`[data-tile="${blocked.dataset.tile}"]`);if(target?.classList.contains('active'))target.click()},120);return true}
return false}
function fire(type,btn){if(!charges[type])return;if(type==='fluxo'&&!legacyButton('fluxo')?.disabled===false){}const ok=['explosion','gelo','fluxo'].includes(type)?useLegacy(type):useCustom(type);if(!ok){msg(type==='elo'?'ELO precisa de duas peças iguais na bandeja':type==='ima'?'ÍMÃ precisa de uma peça compatível':type==='desfazer'||type==='troca'?'Nenhuma jogada disponível para corrigir':'Poder sem alvo válido agora');return}charges[type]=0;btn.classList.remove('zso-power-fired');void btn.offsetWidth;btn.classList.add('zso-power-fired');msg(`${POWERS[type].label} ATIVADO`);renderPowers()}
function renderPowers(){const wrap=$('.zso-powers');if(!wrap)return;if(!mounted){$$('.zso-powers>[data-zso-power]').forEach(b=>b.classList.add('zso-legacy-power'));mounted=true}let host=wrap.querySelector('.zso-tactical-host');if(!host){host=document.createElement('div');host.className='zso-tactical-host';host.style.display='contents';wrap.appendChild(host)}host.innerHTML=selected.map(type=>{const p=POWERS[type],n=charges[type]||0;return `<button class="zso-tactical-power" data-zso-tactical="${type}" ${n?'':'disabled'} style="--zp-a:${p.a};--zp-b:${p.b};--zp-line:${p.line}"><span>${p.icon}</span><b>${p.label}</b><i>${n}</i></button>`}).join('');host.querySelectorAll('[data-zso-tactical]').forEach(b=>b.onclick=()=>fire(b.dataset.zsoTactical,b))}
function sync(){const on=document.body.classList.contains('zstack-playing');if(on&&!playing){playing=true;mounted=false;choose()}else if(!on&&playing){playing=false;selected=[];mounted=false}if(!on)return;ensureRhythmInGoal();enrichPlayers();enrichOrder();if(selected.length&&!$('.zso-tactical-power'))renderPowers()}
function boot(){setInterval(sync,500);addEventListener('resize',()=>setTimeout(ensureRhythmInGoal,80),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});sync()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
