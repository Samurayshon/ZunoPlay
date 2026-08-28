(()=>{
  if(window.__ZUNO_SOCIAL_STAGE4__)return;
  window.__ZUNO_SOCIAL_STAGE4__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  const pages=['amigos.html','conversas.html','comunidades.html','perfil.html','notificacoes.html'];
  if(!pages.includes(page))return;

  function addClass(){
    if(!document.body)return;
    document.body.classList.add('zuno-social-page','zuno-social-'+page.replace('.html',''));
    const app=document.querySelector('.app,#app');
    if(app)app.classList.add('zuno-social-shell');
    const card=document.querySelector('.card');
    if(page==='perfil.html'&&card)card.classList.add('profile-social-card');
    const firstContent=document.querySelector('.card,.page,#content');
    if(firstContent&&!document.querySelector('.social-stage4-mark')){
      const badge=document.createElement('div');
      badge.className='social-stage4-mark';
      badge.innerHTML='<i></i><span>Conectado ao universo social Zuno</span>';
      firstContent.prepend(badge);
    }
  }

  function cleanSectionTitle(el){
    if(!el||el.dataset.zunoTitleClean==='1')return;
    const raw=(el.textContent||'').trim();
    const text=raw.replace(/^[\s🔎🔍🔔👥👤]+/u,'').trim();
    el.textContent=text;
    el.dataset.zunoTitleClean='1';
    const lower=text.toLowerCase();
    if(lower.includes('resultado'))el.classList.add('zuno-icon-results');
    else if(lower.includes('solicita'))el.classList.add('zuno-icon-requests');
    else if(lower.includes('amigos'))el.classList.add('zuno-icon-friends');
  }

  function profileAvatarConfig(){
    const renderer=window.ZunoAvatarRenderer;
    if(!renderer)return null;
    let raw=null;
    try{raw=JSON.parse(localStorage.getItem('zunoAvatarPreset')||'null')}catch(_){}
    const base=renderer.normalize?.(raw)||renderer.defaults||null;
    if(!base)return null;
    const cfg=JSON.parse(JSON.stringify(base));
    cfg.mode='Perfil';
    cfg.selections={...(cfg.selections||{}),Mascote:0,Efeitos:0};
    return renderer.normalize?.(cfg)||cfg;
  }

  function mountProfileAvatar(){
    if(page!=='perfil.html')return;
    const card=document.querySelector('.profile-social-card');
    const name=card?.querySelector('.name');
    if(!card||!name||card.classList.contains('loading'))return;
    let wrap=card.querySelector('.zuno-profile-avatar-official');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='zuno-profile-avatar-official';
      const img=document.createElement('img');
      img.alt='Avatar ZunoPlay';
      img.dataset.zunoProfileAvatar='1';
      wrap.appendChild(img);
      name.before(wrap);
    }
    const img=wrap.querySelector('img');
    const cfg=profileAvatarConfig();
    if(cfg&&window.ZunoAvatarRenderer?.mount)window.ZunoAvatarRenderer.mount(img,cfg);
  }

  function decorate(root=document){
    addClass();
    root.querySelectorAll?.('.status').forEach(el=>{
      if(el.textContent.trim().startsWith('●'))el.textContent=el.textContent.replace(/^●\s*/,'');
    });
    root.querySelectorAll?.('.row,.conversation,.community').forEach(el=>el.classList.add('zuno-social-item'));
    root.querySelectorAll?.('.section-title').forEach(cleanSectionTitle);
    if(page==='perfil.html'){
      document.querySelectorAll('.card').forEach((card,i)=>{if(i===0)card.classList.add('profile-social-card')});
      mountProfileAvatar();
    }
  }

  function mount(){
    decorate();
    const root=document.querySelector('.app,#app,main')||document.body;
    if(!root)return;
    let scheduled=false;
    const observer=new MutationObserver(records=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        records.forEach(record=>record.addedNodes.forEach(node=>{
          if(node.nodeType===1)decorate(node);
        }));
        decorate(root);
      });
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  window.addEventListener('zuno-avatar-renderer-ready',()=>setTimeout(()=>decorate(),0));
  window.addEventListener('zuno:avatar-home-ready',()=>setTimeout(()=>decorate(),0));
  window.addEventListener('zuno-avatar-saved',()=>setTimeout(()=>decorate(),0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
