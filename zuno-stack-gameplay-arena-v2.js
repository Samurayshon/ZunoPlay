(()=>{
if(window.__ZUNO_STACK_ARENA_V2__)return;window.__ZUNO_STACK_ARENA_V2__=true;
const $=s=>document.querySelector(s);
let scheduled=false;
function markLegacyObjective(){
  if(!document.body.classList.contains('zstack-playing'))return;
  const nodes=[...document.querySelectorAll('section,div,article')].filter(el=>{
    if(el.closest('.shell'))return false;
    const t=(el.textContent||'').replace(/\s+/g,' ').trim();
    return /OBJETIVO DA EQUIPE/i.test(t)&&/peças em equipe/i.test(t);
  });
  if(!nodes.length)return;
  nodes.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length);
  const target=nodes[0];
  if(target&&target!==document.body&&target.id!=='zunoStackApp')target.classList.add('zstack-legacy-objective');
}
function tuneBoard(){
  const board=$('#board');if(!board)return;
  board.querySelectorAll('.tile').forEach((tile,i)=>{
    if(tile.dataset.arenaV2==='1')return;
    tile.dataset.arenaV2='1';
    const layer=Number(tile.style.getPropertyValue('--layer')||0);
    const seed=(i*17+layer*11)%9;
    const dx=[-3,2,0,3,-2,1,-1,2,-2][seed];
    const dy=[1,-2,2,0,-1,2,-2,1,0][seed];
    tile.style.setProperty('--arena-dx',dx+'px');
    tile.style.setProperty('--arena-dy',dy+'px');
  });
}
function sync(){scheduled=false;markLegacyObjective();tuneBoard()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync)}
function boot(){
  schedule();
  const board=$('#board');if(board)new MutationObserver(schedule).observe(board,{childList:true});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
  document.getElementById('start')?.addEventListener('click',()=>{setTimeout(schedule,60);setTimeout(schedule,260)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();