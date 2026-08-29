(()=>{
if(window.__ZUNO_STACK_STREAK_OFFICIAL__)return;window.__ZUNO_STACK_STREAK_OFFICIAL__=true;
const WINDOW_MS=4000;
let count=0,lastAt=0,resetTimer=0;
function host(){let el=document.getElementById('zsoStreakCounter');if(el)return el;const shell=document.querySelector('.shell');if(!shell)return null;el=document.createElement('div');el.id='zsoStreakCounter';el.className='zso-streak-counter';el.innerHTML='<small>COMBO</small><b>1</b><i></i>';shell.appendChild(el);return el}
function hide(){count=0;lastAt=0;clearTimeout(resetTimer);resetTimer=0;const el=document.getElementById('zsoStreakCounter');if(el)el.classList.remove('show')}
function pulse(){const now=Date.now();count=lastAt&&now-lastAt<=WINDOW_MS?count+1:1;lastAt=now;const el=host();if(!el)return;const b=el.querySelector('b'),bar=el.querySelector('i');if(b)b.textContent=String(count);if(bar){bar.style.transition='none';bar.style.width='100%';requestAnimationFrame(()=>{bar.style.transition=`width ${WINDOW_MS}ms linear`;bar.style.width='0%'})}el.classList.remove('pop');void el.offsetWidth;el.classList.add('show','pop');clearTimeout(resetTimer);resetTimer=setTimeout(hide,WINDOW_MS)}
function validTile(target){const tile=target.closest?.('.tile.active:not(.removed)[data-tile]');return tile&&document.body.classList.contains('zstack-playing')?tile:null}
document.addEventListener('pointerdown',e=>{if(validTile(e.target))pulse()},{passive:true,capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
window.addEventListener('pagehide',hide);
})();
