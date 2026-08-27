(()=>{
  if(window.__ZUNO_HOME_INTERACTIONS_V141__)return;
  window.__ZUNO_HOME_INTERACTIONS_V141__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;

  let navigating=false;
  function routeFrom(el){
    if(!el)return'';
    const href=el.getAttribute?.('href');
    if(href&&href!=='#')return href;
    const inline=el.getAttribute?.('onclick')||'';
    const match=inline.match(/location\.href\s*=\s*['\"]([^'\"]+)['\"]/i);
    if(match)return match[1];
    const title=(el.querySelector?.('h2')?.textContent||'').trim().toLowerCase();
    if(title.includes('conversa'))return'conversas.html';
    if(title.includes('salas'))return'salas.html';
    if(title.includes('comun'))return'comunidades.html';
    if(title.includes('jogos'))return'jogos.html';
    if(title.includes('desafio'))return'desafio.html';
    if(title.includes('hist'))return'historico.html';
    return'';
  }

  function go(href){
    if(!href||navigating)return;
    navigating=true;
    document.documentElement.dataset.zunoNavigating='1';
    requestAnimationFrame(()=>{
      try{location.assign(new URL(href,location.href).href)}
      catch(_){location.href=href}
    });
    setTimeout(()=>{navigating=false;delete document.documentElement.dataset.zunoNavigating},1800);
  }

  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const el=event.target.closest?.('a[href],button[onclick*="location.href"],#homeScreen .menu-card,#bottomNav button');
    if(!el)return;
    if(el.id==='searchButton'||el.id==='searchClose'||el.id==='logoutButton')return;
    const href=routeFrom(el);
    if(!href)return;
    event.preventDefault();
    event.stopPropagation();
    go(href);
  },true);

  window.addEventListener('pageshow',()=>{
    navigating=false;
    delete document.documentElement.dataset.zunoNavigating;
  });
})();
