(()=>{
if(window.__ZUNO_STACK_GAMEPLAY_POLISH_V2__)return;window.__ZUNO_STACK_GAMEPLAY_POLISH_V2__=true;
const $=s=>document.querySelector(s);
const GLYPHS={
  bolt:'ϟ',vortex:'↻',flux:'∞',comet:'☄',crystal:'◆',prism:'△',clover:'◈',ghost:'⇄',rune:'✧',moon:'◒',nova:'✦',orb:'◉',core:'◆',echo:'◈'
};
function norm(v){return String(v||'').trim().toLowerCase()}
function familyName(el){
  const tile=el.closest('.tile');
  if(tile){const a=norm(tile.getAttribute('aria-label'));if(a)return a}
  const shell=el.closest('.piece-shell,.zsp-relay-piece,.slot');
  if(shell){const t=norm(shell.querySelector('.tiny,small,.label')?.textContent);if(t)return t}
  return '';
}
function cssGlyph(el){
  try{
    const raw=getComputedStyle(el).getPropertyValue('--piece-icon').trim().replace(/^['"]|['"]$/g,'');
    if(raw&&raw!=='✦')return raw;
  }catch(_){}
  return '';
}
function resolveGlyph(el){
  const name=familyName(el);
  for(const [k,g] of Object.entries(GLYPHS))if(name.includes(k))return g;
  return cssGlyph(el)||'✦';
}
function decorate(root=document){
  root.querySelectorAll?.('.zsp-art').forEach(el=>{
    let s=el.querySelector(':scope > .zsp-glyph');
    if(!s){s=document.createElement('span');s.className='zsp-glyph';el.appendChild(s)}
    const g=resolveGlyph(el);if(s.textContent!==g)s.textContent=g;
    el.dataset.glyphReady='1';
  })
}
function syncRelay(){
  const relay=$('.relay');if(!relay)return;
  const live=!!relay.querySelector('.relay-slot.filled');
  relay.classList.toggle('zrelay-live',live);
  relay.classList.toggle('zrelay-empty',!live);
}
function syncTray(){
  const tray=$('#tray');if(!tray)return;
  const n=tray.querySelectorAll('.slot.filled').length;
  tray.dataset.fill=String(n);
  document.body.dataset.zstackTray=n>=6?'critical':n>=5?'risk':'normal';
}
function boot(){
  decorate();syncRelay();syncTray();
  const roots=[$('#board'),$('#tray'),$('#relaySlots')].filter(Boolean);
  roots.forEach(el=>new MutationObserver(()=>{decorate(el);syncRelay();syncTray()}).observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-label','style']}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){decorate();syncRelay();syncTray()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();