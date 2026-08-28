(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_FIXES_V170__)return;
  window.__ZUNO_AVATAR_STUDIO_FIXES_V170__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s),clone=v=>v?JSON.parse(JSON.stringify(v)):v;
  let refreshTimer=0,observer=null;

  function getState(){
    try{if(typeof state!=='undefined')return clone(state)}catch(_){}
    return clone(window.ZunoAvatarRenderer?.defaults||null);
  }
  function forceEditorBodyMode(){
    try{
      if(typeof state==='undefined')return;
      let changed=false;
      if(state.mode!=='Corpo inteiro'){state.mode='Corpo inteiro';changed=true}
      if(Number(state.zoom)!==1){state.zoom=1;changed=true}
      if(changed&&typeof renderAll==='function')renderAll();
      q('#hero')?.classList.remove('profile','room');
      q('#modes [data-mode="Corpo inteiro"]')?.classList.add('on');
      q('#modes [data-mode="Perfil"]')?.classList.remove('on');
      q('#modes [data-mode="Sala de voz"]')?.classList.remove('on');
    }catch(_){}
  }
  function cleanConfig(base,mode){
    const c=clone(base);if(!c)return null;c.mode=mode;c.zoom=1;c.rotation=0;
    c.selections={...(c.selections||{}),Mascote:0,Efeitos:0};
    return c;
  }
  function mountSurfacePreviews(){
    const r=window.ZunoAvatarRenderer,base=getState();if(!r||!base)return;
    const profile=cleanConfig(base,'Perfil'),mini=cleanConfig(base,'Perfil'),body=cleanConfig(base,'Corpo inteiro');
    try{const el=q('#studioPreviewProfile');if(el)r.mount(el,profile)}catch(_){}
    try{const el=q('#studioPreviewMini');if(el)r.mount(el,mini)}catch(_){}
    try{const el=q('#studioPreviewBack');if(el)r.mount(el,body)}catch(_){}
    try{const el=q('.zuno-global-action.is-profile img');if(el)r.mount(el,profile)}catch(_){}
    const title=q('.studio-preview-card.back strong');if(title)title.textContent='Corpo inteiro';
    const back=q('#studioPreviewBack');if(back){back.alt='Prévia de corpo inteiro';back.style.transform='none'}
  }
  function installStyle(){
    if(q('#zuno-avatar-studio-fixes-v170-style'))return;
    const s=document.createElement('style');s.id='zuno-avatar-studio-fixes-v170-style';s.textContent=`
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero .pulse{z-index:1!important;pointer-events:none!important;opacity:.24!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero .stage{z-index:5!important;top:58px!important;width:218px!important;height:410px!important;--scale:1!important;transform-origin:50% 78%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero.profile .stage,
      html[data-zuno-interface="current"] body.zuno-official-avatar #hero.room .stage{top:58px!important;--scale:1!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #avatarPreview{object-fit:contain!important;object-position:50% 50%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.mini .studio-preview-frame{overflow:hidden!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.mini #studioPreviewMini{transform:scale(1.42) translateY(5%)!important;transform-origin:50% 20%!important;object-fit:contain!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #studioPreviewProfile{object-fit:contain!important;object-position:50% 8%!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar .studio-preview-card.back img{transform:none!important;opacity:1!important;object-fit:contain!important}
      html[data-zuno-interface="current"] body.zuno-official-avatar #options .thumb img{width:100%!important;height:100%!important;object-fit:contain!important}
    `;document.head.appendChild(s);
  }
  function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{forceEditorBodyMode();mountSurfacePreviews()},90)}
  function boot(){
    installStyle();
    const hero=q('#hero');if(!hero)return void setTimeout(boot,80);
    forceEditorBodyMode();mountSurfacePreviews();
    if(!observer){
      observer=new MutationObserver(refresh);
      observer.observe(hero,{attributes:true,childList:true,subtree:true,attributeFilter:['class','src','data-zuno-model']});
      const options=q('#options');if(options)observer.observe(options,{childList:true,subtree:true});
    }
    window.addEventListener('zuno-avatar-renderer-ready',refresh);
    window.addEventListener('zuno-avatar-saved',refresh);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
