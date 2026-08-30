(()=>{
  if(window.__ZUNO_PROFILE_SCROLL_RUNTIME_V3__) return;
  window.__ZUNO_PROFILE_SCROLL_RUNTIME_V3__=true;

  const isProfile=()=>((location.pathname.split('/').pop()||'').toLowerCase()==='perfil.html');
  if(!isProfile()) return;

  function forceScrollable(){
    const html=document.documentElement,body=document.body;
    if(!body) return;
    html.dataset.zunoPage='perfil';
    const set=(el,p,v)=>{ if(el.style.getPropertyValue(p)!==v || el.style.getPropertyPriority(p)!=='important') el.style.setProperty(p,v,'important'); };
    [['height','auto'],['min-height','100%'],['max-height','none'],['overflow-x','hidden'],['overflow-y','auto'],['overscroll-behavior-y','auto'],['touch-action','pan-y']].forEach(([p,v])=>set(html,p,v));
    [['position','static'],['height','auto'],['min-height','100dvh'],['max-height','none'],['overflow-x','hidden'],['overflow-y','auto'],['overscroll-behavior-y','auto'],['touch-action','pan-y']].forEach(([p,v])=>set(body,p,v));
    for(const el of document.querySelectorAll('.profile-v2,#profileV2Root,.profile-shell,.zpu')){
      set(el,'height','auto');set(el,'max-height','none');set(el,'overflow','visible');set(el,'touch-action','pan-y');
    }
    for(const sel of ['.zs-overlay:not(.open)','.zp-concept-edit-modal:not(.open)','.zuno-hub-backdrop:not(.open)','#zunoGlobalSearch:not(.open)']){
      document.querySelectorAll(sel).forEach(el=>{set(el,'display','none');set(el,'pointer-events','none')});
    }
  }

  const start=()=>{
    forceScrollable();
    requestAnimationFrame(forceScrollable);
    setTimeout(forceScrollable,250);
    setTimeout(forceScrollable,900);
    window.addEventListener('pageshow',forceScrollable,{passive:true});
    window.addEventListener('resize',forceScrollable,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(forceScrollable,80),{passive:true});
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();