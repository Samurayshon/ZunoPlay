(()=>{
if(window.__ZUNO_STACK_COMBO_CHAIN__)return;window.__ZUNO_STACK_COMBO_CHAIN__=true;
const WINDOW_MS=4000;
let chain=0,lastMoveAt=0,resetTimer=0,lastTile='',playing=false;
const $=s=>document.querySelector(s);
function ensure(){let e=$('#zsoChainCounter');if(e)return e;const board=$('#board');if(!board)return null;e=document.createElement('div');e.id='zsoChainCounter';e.className='zso-chain-counter';e.setAttribute('aria-live','polite');e.innerHTML='<b>0</b><span>SEQUÊNCIA</span><i></i>';board.appendChild(e);return e}
function hide(){chain=0;lastMoveAt=0;lastTile='';clearTimeout(resetTimer);resetTimer=0;const e=$('#zsoChainCounter');if(e){e.classList.remove('show');e.querySelector('b').textContent='0';e.querySelector('i').style.width='0%'}}
function armReset(){clearTimeout(resetTimer);const started=Date.now();resetTimer=setTimeout(()=>{if(Date.now()-lastMoveAt>=WINDOW_MS-40)hide()},WINDOW_MS+40);const e=$('#zsoChainCounter');if(e){e.dataset.timerStart=String(started);e.querySelector('i').style.transition='none';e.querySelector('i').style.width='100%';requestAnimationFrame(()=>{e.querySelector('i').style.transition=`width ${WINDOW_MS}ms linear`;e.querySelector('i').style.width='0%'})}}
function register(tile){if(!playing||!tile)return;const id=tile.dataset.tile||'';setTimeout(()=>{if(!document.body.classList.contains('zstack-playing'))return;const removed=tile.classList.contains('removed')||!document.body.contains(tile);if(!removed||!id||id===lastTile)return;const now=Date.now();chain=lastMoveAt&&now-lastMoveAt<=WINDOW_MS?chain+1:1;lastMoveAt=now;lastTile=id;const e=ensure();if(!e)return;e.querySelector('b').textContent=String(chain);e.classList.toggle('show',chain>=2);armReset()},70)}
function syncPlaying(){const on=document.body.classList.contains('zstack-playing');if(on&&!playing){playing=true;hide();ensure()}else if(!on&&playing){playing=false;hide()}}
function boot(){ensure();syncPlaying();document.addEventListener('click',ev=>{const tile=ev.target.closest?.('.tile.active:not(.removed)[data-tile]');if(tile)register(tile)},true);setInterval(syncPlaying,600);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();else syncPlaying()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
