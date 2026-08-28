(()=>{
  if(window.__ZUNO_PROFILE_AVATAR_STAGE5__)return;window.__ZUNO_PROFILE_AVATAR_STAGE5__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!['perfil.html','avatar.html'].includes(page))return;

  function mount(){
    if(!document.body)return;
    if(page==='perfil.html'){
      document.body.classList.add('zuno-profile-stage5');
      const app=document.querySelector('.app,#app');if(app)app.classList.add('zuno-profile-stage5-shell');
      const content=document.getElementById('content');
      const card=content?.querySelector('.card');
      if(card&&!card.classList.contains('loading'))card.classList.add('zuno-profile-card-final');
    }else{
      document.body.classList.add('zuno-avatar-stage5');
      const app=document.querySelector('.avatar-simple-app');if(app)app.classList.add('zuno-avatar-stage5-shell');
    }
  }

  function observe(){
    mount();
    const root=page==='perfil.html'?(document.getElementById('content')||document.body):document.body;
    const obs=new MutationObserver(()=>requestAnimationFrame(mount));
    obs.observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  ['pageshow','zuno-avatar-renderer-ready','zuno-avatar-saved'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(mount,0)));
})();
