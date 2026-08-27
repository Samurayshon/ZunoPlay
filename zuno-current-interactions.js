(()=>{
  if(window.__ZUNO_CURRENT_INTERACTIONS__)return;
  window.__ZUNO_CURRENT_INTERACTIONS__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;

  // A Home já possui links e onclick explícitos. Não interceptamos cliques aqui:
  // o navegador/PWA deve executar a navegação nativa sem preventDefault,
  // stopPropagation ou bloqueio global de pointer-events.
  const clearNavigationState=()=>{
    delete document.documentElement.dataset.zunoNavigating;
  };

  clearNavigationState();
  window.addEventListener('pageshow',clearNavigationState);
  window.addEventListener('focus',clearNavigationState);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)clearNavigationState();
  });
})();
