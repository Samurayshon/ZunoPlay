(()=>{
  if(window.__ZUNO_SHELL_RUNTIME_V180__)return;
  window.__ZUNO_SHELL_RUNTIME_V180__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();

  function forceTheme(){
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
    meta.setAttribute('content','#02040d');
    document.documentElement.style.backgroundColor='#02040d';
    if(document.body)document.body.style.backgroundColor='#02040d';
  }

  function avatarConfig(){
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
    const renderer=window.ZunoAvatarRenderer,cfg=avatarConfig();
    if(!renderer?.mount||!cfg)return false;
    let ok=false;
    document.querySelectorAll('[data-zuno-header-profile="1"],.zhome-profile').forEach(target=>{
      let img=target.querySelector('img[data-zuno-studio-avatar="1"]');
      const fresh=!img;
      if(fresh){img=document.createElement('img');img.dataset.zunoStudioAvatar='1';img.alt='Avatar ZunoPlay'}
      try{
        if(renderer.mount(img,cfg)!==false){
          if(fresh||target.children.length!==1||target.firstElementChild!==img)target.replaceChildren(img);
          target.classList.add('has-zuno-avatar');
          ok=true;
        }
      }catch(_){}
    });
    return ok;
  }

  function sanitizeRoomName(el){
    if(!el)return;
    const clean=(el.textContent||'').replace(/^[\s🎙️🎤🎧]+/u,'').trim();
    if(el.textContent!==clean)el.textContent=clean;
  }
  function refineRooms(){
    if(page!=='salas.html')return;
    document.querySelectorAll('.room-top').forEach(top=>{
      const button=top.querySelector('.enter-button');
      const copy=[...top.children].find(el=>el.querySelector?.('.room-name'))||top.querySelector('.room-name')?.parentElement;
      if(!button||!copy)return;
      top.classList.add('z180-room-top');
      copy.classList.add('z180-room-copy');
      sanitizeRoomName(copy.querySelector('.room-name'));

      top.querySelectorAll(':scope > .room-voice-icon').forEach(el=>el.remove());
      const icons=[...top.querySelectorAll(':scope > .z180-room-voice')];
      let icon=icons[0];icons.slice(1).forEach(el=>el.remove());
      if(!icon){icon=document.createElement('span');icon.className='z180-room-voice';icon.setAttribute('aria-hidden','true')}
      if(icon.nextElementSibling!==copy)top.insertBefore(icon,copy);
      if(copy.nextElementSibling!==button)top.insertBefore(copy,button);
      if(top.lastElementChild!==button)top.appendChild(button);
    });
  }

  let pending=false;
  function refresh(){forceTheme();refineRooms();mountHeaderAvatar()}
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh()})}

  ['zuno:shell-mounted','zuno-avatar-renderer-ready','zuno:avatar-home-ready','zuno-avatar-saved','pageshow'].forEach(name=>window.addEventListener(name,()=>{schedule();setTimeout(refresh,180);setTimeout(refresh,650)}));
  window.addEventListener('storage',e=>{if(e.key==='zunoAvatarPreset')schedule()});

  function observe(){
    if(!document.body)return;
    const obs=new MutationObserver(schedule);obs.observe(document.body,{childList:true,subtree:true});
  }

  forceTheme();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{refresh();observe();setTimeout(refresh,250);setTimeout(refresh,900)},{once:true});
  else{refresh();observe();setTimeout(refresh,250);setTimeout(refresh,900)}
})();
