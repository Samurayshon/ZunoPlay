(()=>{
  if(window.__ZUNO_GLOBAL_BOTTOM_NAV_V182__)return;
  window.__ZUNO_GLOBAL_BOTTOM_NAV_V182__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const excluded=new Set(['index.html','login.html','cadastro.html','sala.html']);
  if(excluded.has(page))return;

  const route={home:'index.html',social:'amigos.html',main:'salas.html',rooms:'salas.html',profile:'perfil.html'};
  const active=page==='salas.html'?'rooms':
    (['amigos.html','conversas.html','comunidades.html','notificacoes.html'].includes(page)?'social':
    (['perfil.html','avatar.html'].includes(page)?'profile':
    (['jogos.html','historico.html','zuno-core.html','zuno-stack.html'].includes(page)?'home':'')));

  function item(key,label,icon,href){
    const on=active===key?' active':'';
    return `<button class="nav-item${on}" type="button" data-znav-route="${key}" aria-label="${label}" onclick="location.href='${href}'"><b aria-hidden="true">${icon}</b>${label}</button>`;
  }
  function markup(){
    return `<nav class="bottom-nav zglobal-nav-v182" data-zuno-global-nav="1" data-zuno-home-canonical-nav="1" data-zuno-global-bottom-v182="1" aria-label="Navegação principal">${item('home','Home','⌂',route.home)}${item('social','Social','♟',route.social)}<button class="nav-main" type="button" data-znav-route="main" onclick="location.href='${route.main}'" aria-label="Explorar salas">+</button>${item('rooms','Salas','♩',route.rooms)}${item('profile','Perfil','●',route.profile)}</nav>`;
  }

  function removeCompetitors(){
    document.querySelectorAll('body > .bottom-nav,body > .zuno-global-nav,body > .zhome-bottom-nav,body > [data-zuno-global-nav="1"]').forEach(el=>{
      if(el.dataset.zunoGlobalBottomV182==='1')return;
      el.remove();
    });
  }

  function ensure(){
    if(!document.body)return;
    document.body.classList.add('znav182-mounted');
    removeCompetitors();
    let nav=document.querySelector('body > [data-zuno-global-bottom-v182="1"]');
    if(!nav){
      document.body.insertAdjacentHTML('beforeend',markup());
      nav=document.querySelector('body > [data-zuno-global-bottom-v182="1"]');
    }
    if(nav&&nav.parentElement!==document.body)document.body.appendChild(nav);
  }

  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;ensure()});
  }

  function start(){
    ensure();
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:false});
    setTimeout(ensure,80);
    setTimeout(ensure,300);
    setTimeout(ensure,900);
    setTimeout(ensure,1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pageshow',ensure);
  window.addEventListener('focus',schedule);
})();
