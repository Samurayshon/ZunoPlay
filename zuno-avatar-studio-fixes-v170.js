(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_FIXES_V170__)return;
  window.__ZUNO_AVATAR_STUDIO_FIXES_V170__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s),clone=v=>v?JSON.parse(JSON.stringify(v)):v;
  let refreshTimer=0,observer=null,fixing=false;

  function getState(){
    try{if(typeof state!=='undefined')return clone(state)}catch(_){}
    return clone(window.ZunoAvatarRenderer?.defaults||null);
  }
  function forceEditorBodyMode(){
    if(fixing)return;
    try{
      if(typeof state==='undefined')return;
      if(state.mode!=='Corpo inteiro'){
        fixing=true;
        state.mode='Corpo inteiro';
        if(typeof applyPreview==='function')applyPreview();
      }
      q('#hero')?.classList.remove('profile','room');
      q('#modes [data-mode="Corpo inteiro"]')?.classList.add('on');
      q('#modes [data-mode="Perfil"]')?.classList.remove('on');
      q('#modes [data-mode="Sala de voz"]')?.classList.remove('on');
    }catch(_){}finally{fixing=false}
  }
  function cleanConfig(base,mode,{surface=false}={}){
    const c=clone(base);if(!c)return null;c.mode=mode;c.zoom=surface?1:(Number(base.zoom)||1);c.rotation=surface?0:(Number(base.rotation)||0);
    if(surface)c.selections={...(c.selections||{}),Mascote:0,Efeitos:0};
    return c;
  }
  function mountSurfacePreviews(){
    const r=window.ZunoAvatarRenderer,base=getState();if(!r||!base)return;
    const main=cleanConfig(base,'Corpo inteiro');
    const profile=cleanConfig(base,'Perfil',{surface:true});
    const mini=cleanConfig(base,'Perfil',{surface:true});
    const body=cleanConfig(base,'Corpo inteiro',{surface:true});
    try{const el=q('#avatarPreview');if(el)r.mount(el,main)}catch(_){}
    try{const el=q('#studioPreviewProfile');if(el)r.mount(el,profile)}catch(_){}
    try{const el=q('#studioPreviewMini');if(el)r.mount(el,mini)}catch(_){}
    try{const el=q('#studioPreviewBack');if(el)r.mount(el,body)}catch(_){}
    try{const el=q('.zuno-global-action.is-profile img');if(el)r.mount(el,profile)}catch(_){}
    const title=q('.studio-preview-card.back strong');if(title)title.textContent='Corpo inteiro';
    const rear=q('#studioPreviewBack');if(rear){rear.alt='Prévia de corpo inteiro';rear.style.transform='none'}
  }
  function installStyle(){
    if(q('#zuno-avatar-studio-fixes-v170-style'))return;
    const s=document.createElement('style');s.id='zuno-avatar-studio-fixes-v170-style';s.textContent=`
      html[data-zuno-interface="current"] body.zuno-official-avatar .zuno-global-header{display:flex!important;position:sticky!important;top:0!important;z-index:120!important;opacity:1!important;visibility:visible!important;transform:none!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .app{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero .pulse{z-index:1!important;pointer-events:none!important;opacity:.20!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero .stage,
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero.profile .stage,
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero.room .stage{z-index:5!important;top:48px!important;width:min(72%,238px)!important;height:445px!important;transform-origin:50% 78%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #avatarPreview{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:50% 50%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #stage img[data-zuno-unified-preview="1"]{display:none!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.mini .studio-preview-frame{overflow:hidden!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.mini #studioPreviewMini{transform:scale(1.45) translateY(7%)!important;transform-origin:50% 18%!important;object-fit:contain!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #studioPreviewProfile{width:100%!important;height:100%!important;object-fit:cover!important;object-position:50% 12%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.back img{transform:none!important;opacity:1!important;object-fit:contain!important;object-position:50% 50%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #options .thumb img{width:100%!important;height:100%!important;object-fit:contain!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-officials{margin-bottom:34px!important}
      @media(max-width:520px){
        html[data-zuno-interface="current"] body.zuno-official-avatar #hero .stage,
        html[data-zuno-interface="current"] body.zuno-official-avatar #hero.profile .stage,
        html[data-zuno-interface="current"] body.zuno-official-avatar #hero.room .stage{top:48px!important;width:min(76%,200px)!important;height:400px!important}
        html[data-zuno-interface="current"] body.zuno-official-avatar .studio-officials{margin-bottom:44px!important}
      }
    `;document.head.appendChild(s);
  }
  function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{forceEditorBodyMode();mountSurfacePreviews()},70)}
  function boot(){
    installStyle();
    try{history.scrollRestoration='manual'}catch(_){}
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
    const hero=q('#hero');if(!hero)return void setTimeout(boot,80);
    forceEditorBodyMode();mountSurfacePreviews();
    if(!observer){
      observer=new MutationObserver(refresh);
      observer.observe(hero,{attributes:true,childList:true,subtree:true,attributeFilter:['class','data-zuno-model']});
      const options=q('#options');if(options)observer.observe(options,{childList:true,subtree:true});
      const preview=q('#avatarPreview');if(preview)observer.observe(preview,{attributes:true,attributeFilter:['src','style','data-zuno-model']});
    }
    window.addEventListener('zuno-avatar-renderer-ready',refresh);
    window.addEventListener('zuno-avatar-saved',refresh);
    [150,450,900,1600,2600].forEach(ms=>setTimeout(refresh,ms));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
