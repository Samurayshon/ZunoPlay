(()=>{
  if(window.__ZUNO_NAV_STAGE3__)return;
  window.__ZUNO_NAV_STAGE3__=true;

  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const skip=['login.html','cadastro.html','sala.html'];
  const route={home:'index.html',social:'amigos.html',main:'salas.html',rooms:'salas.html',profile:'perfil.html'};
  const active=page==='index.html'?'home':(['amigos.html','conversas.html','comunidades.html','notificacoes.html'].includes(page)?'social':page==='salas.html'?'rooms':page==='perfil.html'?'profile':'');

  function logoMarkup(){return `<a href="index.html" class="brand zuno-official-logo zuno-home-shell-brand" aria-label="ZunoPlay"><svg class="zuno-official-logo-mark" viewBox="0 0 76 68" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="zlg-shell" x1="8" y1="4" x2="68" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#4fd6ff"/><stop offset=".28" stop-color="#7b4dff"/><stop offset=".64" stop-color="#b62cff"/><stop offset="1" stop-color="#f23ed0"/></linearGradient></defs><rect x="6" y="5" width="64" height="58" rx="15" fill="url(#zlg-shell)" opacity=".98" transform="rotate(-6 38 34)"/><path d="M22 20h38L37 35h18L27 52H15l25-18H22z" fill="#fff"/></svg><span class="zuno-official-logo-word">Zuno<b>Play</b></span></a>`}
  function bellMarkup(){return `<svg class="z33-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>`}
  function headerMarkup(){return `<header class="topbar zuno-global-header zuno-home-shell-header" data-zuno-global-header="1"><div class="zuno-home-shell-logo">${logoMarkup()}</div><div class="top-actions zuno-home-shell-actions"><button id="searchButton" class="icon-button zuno-global-action" type="button" data-z-search aria-label="Buscar pessoas e salas"><span class="search-icon"></span></button><button class="icon-button zuno-global-action zuno-shell-notifications" type="button" onclick="location.href='notificacoes.html'" aria-label="Notificações">${bellMarkup()}<span class="notification-badge"></span></button><button id="profileButton" class="icon-button mini-profile zuno-global-action is-profile" type="button" onclick="location.href='perfil.html'" aria-label="Perfil"></button></div></header>`}
  function navButton(key,label,icon,href){const on=active===key?' active':'';return `<button class="nav-item${on}" type="button" onclick="location.href='${href}'"><b>${icon}</b>${label}</button>`}
  function navMarkup(){return `<nav class="bottom-nav zuno-global-nav zuno-home-shell-nav" data-zuno-global-nav="1" aria-label="Navegação principal">${navButton('home','Home','⌂',route.home)}${navButton('social','Social','♟',route.social)}<button class="nav-main" type="button" onclick="location.href='${route.main}'" aria-label="Explorar salas">+</button>${navButton('rooms','Salas','♩',route.rooms)}${navButton('profile','Perfil','●',route.profile)}</nav>`}

  function pageClass(){if(document.body)document.body.classList.add('zuno-page-'+page.replace('.html',''))}
  function hideLegacyHeaders(){
    document.querySelectorAll('.header,.chat-header,.top,.topbar,.head').forEach(h=>{
      if(h.matches('[data-zuno-global-header]')||h.closest('[data-zuno-global-header]'))return;
      h.dataset.zunoLegacyHeader='1';h.style.setProperty('display','none','important');
    });
  }
  function cleanPageHeadings(){
    document.querySelectorAll('h1').forEach(el=>{
      if(el.dataset.zunoHeadingClean==='1')return;
      const text=(el.textContent||'').trim().replace(/^[\s💬🌐🎙️🎤🎧🔔🎮🕹️🏆📜📣👤👥🔎🔍⚡🧩]+/u,'').trim();
      if(text)el.textContent=text;el.dataset.zunoHeadingClean='1';el.classList.add('zuno-official-page-heading');
    });
  }
  function cleanRoomsUi(){
    if(page!=='salas.html')return;
    const title=document.querySelector('.page .title');
    if(title&&!title.classList.contains('zuno-room-page-title')){title.textContent=(title.textContent||'Salas').replace(/^[\s🎙️🎤🎧]+/u,'').trim()||'Salas';title.classList.add('zuno-room-page-title')}
    document.querySelectorAll('.room-name').forEach(el=>{if(el.classList.contains('zuno-room-name'))return;el.textContent=(el.textContent||'').replace(/^[\s🎙️🎤🎧]+/u,'').trim();el.classList.add('zuno-room-name')});
  }
  function removeDuplicateNavs(){
    const global=[...document.querySelectorAll('body > [data-zuno-global-nav="1"]')];global.slice(1).forEach(n=>n.remove());
    document.querySelectorAll('body > .bottom-nav:not([data-zuno-global-nav="1"]),body > .zuno-global-nav:not([data-zuno-global-nav="1"])').forEach(n=>n.remove());
  }
  function decorateDynamic(){pageClass();hideLegacyHeaders();cleanPageHeadings();cleanRoomsUi();removeDuplicateNavs()}
  function mountHeader(){
    if(skip.includes(page)||page==='index.html')return;
    if(!document.querySelector('body > [data-zuno-global-header="1"]'))document.body.insertAdjacentHTML('afterbegin',headerMarkup());
    hideLegacyHeaders();document.body.classList.add('zuno-global-header-mounted','zuno-home-shell-mounted');
  }
  function mountBottom(){
    if(skip.includes(page)||page==='index.html')return;
    if(!document.querySelector('body > [data-zuno-global-nav="1"]')){
      document.querySelectorAll('body > .bottom-nav,body > .zuno-global-nav').forEach(n=>n.remove());
      document.body.insertAdjacentHTML('beforeend',navMarkup());
    }
    document.body.classList.add('zuno-global-nav-mounted','zuno-home-shell-mounted');
  }
  function ensureSearch(){
    if(document.querySelector('.zuno-search-layer'))return;
    const el=document.createElement('div');el.className='zuno-search-layer';
    el.innerHTML=`<section class="zuno-search-card" role="dialog" aria-modal="true" aria-label="Busca do ZunoPlay"><div class="zuno-search-head"><input class="zuno-search-input" type="search" maxlength="40" autocomplete="off" placeholder="Buscar pessoas ou salas..."><button class="zuno-search-close" type="button" aria-label="Fechar">×</button></div><div class="zuno-search-results"><div class="zuno-search-empty">Digite pelo menos 2 caracteres para buscar.</div></div></section>`;
    document.body.appendChild(el);
    const input=el.querySelector('.zuno-search-input'),results=el.querySelector('.zuno-search-results');let timer=0,seq=0;
    const esc=s=>{const d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML};
    async function run(q){
      const my=++seq;if(q.length<2){results.innerHTML='<div class="zuno-search-empty">Digite pelo menos 2 caracteres para buscar.</div>';return}
      results.innerHTML='<div class="zuno-search-empty">Buscando...</div>';
      try{
        const sb=window.ZunoSupabaseClient;if(!sb)throw new Error('cliente indisponível');
        const[p,r]=await Promise.all([sb.from('profiles').select('id,username,level').ilike('username',`%${q}%`).limit(8),sb.from('rooms').select('id,name').ilike('name',`%${q}%`).limit(8)]);if(my!==seq)return;
        let html='';const people=p.data||[],rooms=r.data||[];
        if(people.length)html+='<div class="zuno-search-label">Pessoas</div>'+people.map(x=>`<button class="zuno-search-result" data-go="perfil.html?user=${encodeURIComponent(x.id)}"><span class="zuno-search-avatar">${esc((x.username||'Z').slice(0,1).toUpperCase())}</span><span class="zuno-search-copy"><span class="zuno-search-title">${esc(x.username||'ZunoPlayer')}</span><span class="zuno-search-sub">Nível ${Number(x.level||0)}</span></span></button>`).join('');
        if(rooms.length)html+='<div class="zuno-search-label">Salas</div>'+rooms.map(x=>`<button class="zuno-search-result" data-go="sala.html?room=${encodeURIComponent(x.id)}"><span class="zuno-search-avatar">♩</span><span class="zuno-search-copy"><span class="zuno-search-title">${esc(x.name||'Sala Zuno')}</span><span class="zuno-search-sub">Entrar na sala</span></span></button>`).join('');
        results.innerHTML=html||'<div class="zuno-search-empty">Nenhum resultado encontrado.</div>';
      }catch(e){results.innerHTML='<div class="zuno-search-empty">Não foi possível buscar agora.</div>'}
    }
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>run(input.value.trim()),260)});
    results.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)location.assign(b.dataset.go)});
    el.querySelector('.zuno-search-close').onclick=()=>el.classList.remove('open');el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open')});
  }

  let bound=false,observer=null,scheduled=false;
  function observeDynamicShell(){if(observer||!document.body)return;observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorateDynamic()})});observer.observe(document.body,{childList:true,subtree:true})}
  function bind(){
    if(bound||!document.body)return;bound=true;pageClass();mountHeader();mountBottom();ensureSearch();decorateDynamic();observeDynamicShell();
    document.querySelectorAll('[data-z-search]').forEach(b=>{if(b.dataset.bound)return;b.dataset.bound='1';b.onclick=()=>{const l=document.querySelector('.zuno-search-layer');if(!l)return;l.classList.add('open');setTimeout(()=>l.querySelector('.zuno-search-input')?.focus(),50)}});
    window.dispatchEvent(new CustomEvent('zuno:shell-mounted',{detail:{page,source:'home-canonical'}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('pageshow',()=>{if(!bound)bind();else decorateDynamic()});
})();
