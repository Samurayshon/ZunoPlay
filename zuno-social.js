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
  function decorate(root=document){
    addClass();
    root.querySelectorAll?.('.status').forEach(el=>{
      if(el.textContent.trim().startsWith('●'))el.textContent=el.textContent.replace(/^●\s*/,'');
    });
    root.querySelectorAll?.('.row,.conversation,.community').forEach(el=>el.classList.add('zuno-social-item'));
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
      });
    });
    observer.observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();