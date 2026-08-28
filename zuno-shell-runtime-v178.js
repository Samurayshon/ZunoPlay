(()=>{
  if(window.__ZUNO_SHELL_RUNTIME_V178__)return;
  window.__ZUNO_SHELL_RUNTIME_V178__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function forceTheme(){
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
    meta.setAttribute('content','#03050f');
    document.documentElement.style.backgroundColor='#03050f';
    if(document.body)document.body.style.backgroundColor='#03050f';
  }

  function sanitizeRoomName(el){
    if(!el)return;
    el.textContent=(el.textContent||'').replace(/^[\s🎙️🎤🎧]+/u,'').trim();
  }

  function refineRooms(){
    if(page!=='salas.html')return;
    document.querySelectorAll('.room-top').forEach(top=>{
      const copy=[...top.children].find(el=>el.querySelector?.('.room-name'))||top.firstElementChild;
      const button=top.querySelector('.enter-button');
      if(!copy||!button)return;
      copy.classList.add('room-copy');
      sanitizeRoomName(copy.querySelector('.room-name'));
      let icon=top.querySelector(':scope > .room-voice-icon');
      if(!icon){
        icon=document.createElement('span');
        icon.className='room-voice-icon';
        icon.setAttribute('aria-hidden','true');
        top.insertBefore(icon,copy);
      }
      if(top.firstElementChild!==icon)top.insertBefore(icon,top.firstElementChild);
      if(icon.nextElementSibling!==copy)top.insertBefore(copy,button);
      if(top.lastElementChild!==button)top.appendChild(button);
    });
  }

  function readAvatarConfig(){
    const renderer=window.ZunoAvatarRenderer;
    if(!renderer?.normalize)return null;
    let raw=null;
    try{raw=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null')}catch(_){}
    let cfg=renderer.normalize(raw);
    if(!cfg)return null;
    cfg=JSON.parse(JSON.stringify(cfg));
    cfg.mode='Perfil';
    cfg.selections={...(cfg.selections||{}),Mascote:0,Efeitos:0};
    return renderer.normalize(cfg)||cfg;
  }

  function mountHeaderAvatar(){
    const renderer=window.ZunoAvatarRenderer;
    const cfg=readAvatarConfig();
    if(!renderer?.mount||!cfg)return false;
    let mounted=false;
    document.querySelectorAll('.zuno-global-action.is-profile').forEach(target=>{
      let img=target.querySelector('img[data-zuno-studio-avatar="1"]');
      if(!img){img=document.createElement('img');img.dataset.zunoStudioAvatar='1';img.alt='Avatar ZunoPlay'}
      if(renderer.mount(img,cfg)!==false){
        if(target.children.length!==1||target.firstElementChild!==img)target.replaceChildren(img);
        target.classList.add('has-zuno-avatar');
        mounted=true;
      }
    });
    return mounted;
  }

  let scheduled=false;
  function refresh(){
    forceTheme();
    refineRooms();
    mountHeaderAvatar();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;refresh()});
  }

  const events=['zuno:shell-mounted','zuno-avatar-renderer-ready','zuno:avatar-home-ready','zuno-avatar-saved','pageshow'];
  events.forEach(name=>window.addEventListener(name,()=>{schedule();setTimeout(refresh,250);setTimeout(refresh,900)}));
  window.addEventListener('storage',e=>{if(e.key==='zunoAvatarPreset')schedule()});

  function observe(){
    if(!document.body)return;
    const obs=new MutationObserver(schedule);
    obs.observe(document.body,{childList:true,subtree:true});
  }

  forceTheme();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{refresh();observe();setTimeout(refresh,350);setTimeout(refresh,1200)},{once:true});
  }else{
    refresh();observe();setTimeout(refresh,350);setTimeout(refresh,1200);
  }
})();
