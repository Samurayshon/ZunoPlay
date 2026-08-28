(()=>{
if(window.__ZUNO_STACK_GAMEPLAY_POLISH_V2__)return;window.__ZUNO_STACK_GAMEPLAY_POLISH_V2__=true;
const $=s=>document.querySelector(s);
function cleanGlyph(v){return String(v||'✦').trim().replace(/^['"]|['"]$/g,'')||'✦'}
function decorate(root=document){root.querySelectorAll?.('.zsp-art:not([data-glyph-ready])').forEach(el=>{el.dataset.glyphReady='1';let glyph='✦';try{glyph=cleanGlyph(getComputedStyle(el).getPropertyValue('--piece-icon'))}catch(_){}const s=document.createElement('span');s.className='zsp-glyph';s.textContent=glyph;el.appendChild(s)})}
function syncRelay(){const relay=$('.relay');if(!relay)return;const live=!!relay.querySelector('.relay-slot.filled');relay.classList.toggle('zrelay-live',live)}
function syncTray(){const tray=$('#tray');if(!tray)return;const n=tray.querySelectorAll('.slot.filled').length;tray.dataset.fill=String(n);document.body.dataset.zstackTray=n>=6?'critical':n>=5?'risk':'normal'}
function boot(){decorate();syncRelay();syncTray();const board=$('#board'),tray=$('#tray'),relay=$('#relaySlots');[board,tray,relay].filter(Boolean).forEach(el=>new MutationObserver(m=>{decorate(el);syncRelay();syncTray()}).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}));document.addEventListener('visibilitychange',()=>{if(!document.hidden){decorate();syncRelay();syncTray()}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();