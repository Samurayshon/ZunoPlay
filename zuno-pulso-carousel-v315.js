(()=>{
if(window.__ZUNO_PULSO_CAROUSEL_V315__)return;window.__ZUNO_PULSO_CAROUSEL_V315__=true;
const $=(s,r=document)=>r.querySelector(s);
const BLOCK='input,textarea,select,button,a,video,[contenteditable="true"],.zp304-creators,.zp304-metrics';
let locked=false;
function pulseActive(){return $('.zm-tab[data-view="moments"]')?.classList.contains('active')}
function discoverActive(){return $('.zm-tab[data-view="plaza"]')?.classList.contains('active')}
function pulseMode(){return $('[data-pulse-mode].active')?.dataset.pulseMode||'friends'}
function discoverMode(){return $('[data-zp304-mode].active')?.dataset.zp304Mode||'for-you'}
function activatePulse(direction){
 if(!pulseActive())return false;
 const current=pulseMode();
 const next=direction==='left'?(current==='mine'?'friends':null):(current==='friends'?'mine':null);
 if(!next)return false;
 $('[data-pulse-mode="'+next+'"]')?.click();
 try{window.posthog?.capture?.('pulso_internal_swipe',{section:'pulso',from:current,to:next,direction})}catch(_){ }
 return true;
}
function activateDiscover(direction){
 if(!discoverActive())return false;
 const current=discoverMode();
 const next=direction==='left'?(current==='for-you'?'zuno':null):(current==='zuno'?'for-you':null);
 if(!next)return false;
 $('[data-zp304-mode="'+next+'"]')?.click();
 try{window.posthog?.capture?.('pulso_internal_swipe',{section:'descobrir',from:current,to:next,direction})}catch(_){ }
 return true;
}
function animate(surface,direction,activate){
 if(locked||!surface)return;
 locked=true;
 surface.style.removeProperty('transform');surface.style.removeProperty('opacity');
 surface.classList.add('zp-carousel-moving',direction==='left'?'zp-carousel-out-left':'zp-carousel-out-right');
 setTimeout(()=>{
  const changed=activate(direction);
  surface.classList.remove('zp-carousel-out-left','zp-carousel-out-right');
  if(changed){
   surface.classList.add(direction==='left'?'zp-carousel-in-left':'zp-carousel-in-right');
   setTimeout(()=>surface.classList.remove('zp-carousel-in-left','zp-carousel-in-right','zp-carousel-moving'),190);
  }else surface.classList.remove('zp-carousel-moving');
  locked=false;
 },125);
}
function bind(surface,kind){
 if(!surface||surface.dataset.zpCarouselBound==='1')return;
 surface.dataset.zpCarouselBound='1';
 let sx=0,sy=0,dx=0,dy=0,tracking=false,horizontal=false;
 surface.addEventListener('touchstart',e=>{
  if(locked||e.touches.length!==1||e.target.closest(BLOCK))return;
  const active=kind==='pulso'?pulseActive():discoverActive();if(!active)return;
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;dx=0;dy=0;tracking=true;horizontal=false;
 },{passive:true});
 surface.addEventListener('touchmove',e=>{
  if(!tracking||e.touches.length!==1)return;
  dx=e.touches[0].clientX-sx;dy=e.touches[0].clientY-sy;
  if(!horizontal&&Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.12)horizontal=true;
  if(!horizontal)return;
  e.preventDefault();
  const limited=Math.max(-46,Math.min(46,dx*.34));
  surface.style.transform=`translate3d(${limited}px,0,0)`;
  surface.style.opacity=String(Math.max(.72,1-Math.abs(limited)/170));
 },{passive:false});
 const finish=()=>{
  if(!tracking)return;tracking=false;
  surface.style.removeProperty('transform');surface.style.removeProperty('opacity');
  if(!horizontal||Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.18)return;
  const direction=dx<0?'left':'right';
  animate(surface,direction,kind==='pulso'?activatePulse:activateDiscover);
 };
 surface.addEventListener('touchend',finish,{passive:true});
 surface.addEventListener('touchcancel',()=>{tracking=false;surface.style.removeProperty('transform');surface.style.removeProperty('opacity')},{passive:true});
}
function boot(){bind($('#feed'),'pulso');bind($('#zp304Panel'),'descobrir')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
