(()=>{
  if(window.__ZUNO_PROFILE_SCROLL_RUNTIME_V2__) return;
  window.__ZUNO_PROFILE_SCROLL_RUNTIME_V2__=true;

  const isProfile=()=>((location.pathname.split('/').pop()||'').toLowerCase()==='perfil.html');
  if(!isProfile()) return;

  function forceScrollable(){
    const html=document.documentElement,body=document.body;
    if(!body) return;
    html.dataset.zunoPage='perfil';
    const set=(el,p,v)=>el.style.setProperty(p,v,'important');
    [['height','auto'],['min-height','100%'],['max-height','none'],['overflow-x','hidden'],['overflow-y','auto'],['overscroll-behavior-y','auto'],['touch-action','pan-y']].forEach(([p,v])=>set(html,p,v));
    [['position','static'],['height','auto'],['min-height','100dvh'],['max-height','none'],['overflow-x','hidden'],['overflow-y','auto'],['overscroll-behavior-y','auto'],['touch-action','pan-y']].forEach(([p,v])=>set(body,p,v));
    for(const el of document.querySelectorAll('.profile-v2,#profileV2Root,.profile-shell,.zpu')){
      set(el,'height','auto');set(el,'max-height','none');set(el,'overflow','visible');set(el,'touch-action','pan-y');
    }
    for(const sel of ['.zs-overlay:not(.open)','.zp-concept-edit-modal:not(.open)','.zuno-hub-backdrop:not(.open)','#zunoGlobalSearch:not(.open)']){
      document.querySelectorAll(sel).forEach(el=>{set(el,'display','none');set(el,'pointer-events','none')});
    }
  }

  let startY=0,lastY=0,dragging=false;
  const blockedTarget=t=>!!t?.closest?.('input,textarea,select,[contenteditable="true"],.zs-overlay.open,.zp-concept-edit-modal.open,#zunoGlobalSearch.open,.zuno-canonical-nav');

  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||blockedTarget(e.target)) return;
    forceScrollable();
    startY=lastY=e.touches[0].clientY;
    dragging=true;
  },{capture:true,passive:true});

  document.addEventListener('touchmove',e=>{
    if(!dragging||e.touches.length!==1||blockedTarget(e.target)) return;
    const y=e.touches[0].clientY,dy=lastY-y;
    lastY=y;
    if(Math.abs(y-startY)>3 && Math.abs(dy)>0){
      window.scrollBy(0,dy);
      if(e.cancelable) e.preventDefault();
    }
  },{capture:true,passive:false});

  document.addEventListener('touchend',()=>{dragging=false},{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{dragging=false},{capture:true,passive:true});

  const start=()=>{
    forceScrollable();
    requestAnimationFrame(forceScrollable);
    setTimeout(forceScrollable,250);
    setTimeout(forceScrollable,900);
    const obs=new MutationObserver(()=>forceScrollable());
    obs.observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:['class','style','data-zuno-page']});
    window.addEventListener('pageshow',forceScrollable);
    window.addEventListener('resize',forceScrollable);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();