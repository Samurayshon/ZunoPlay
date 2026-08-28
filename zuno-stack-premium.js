(()=>{
if(window.__ZUNO_STACK_PREMIUM__)return;window.__ZUNO_STACK_PREMIUM__=true;
const boot=()=>{
 const board=document.getElementById('board'),shell=document.querySelector('.shell');if(!board||!shell)return;
 document.documentElement.classList.add('zsp-premium-ready');
 board.addEventListener('pointerdown',e=>{const tile=e.target.closest('.tile.active');if(!tile)return;tile.classList.remove('zsp-impact');void tile.offsetWidth;tile.classList.add('zsp-impact');if(navigator.vibrate)navigator.vibrate(8)},{passive:true});
 document.getElementById('pulse')?.addEventListener('click',()=>{shell.classList.remove('zsp-pulse');void shell.offsetWidth;shell.classList.add('zsp-pulse');if(navigator.vibrate)navigator.vibrate([12,28,12])},{passive:true});
 ['undo','hint'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>{if(navigator.vibrate)navigator.vibrate(6)},{passive:true}));
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();