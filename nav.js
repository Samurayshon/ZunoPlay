(()=>{
  if(window.__ZUNOPLAY_GLOBAL_BOOT_V184__)return;
  window.__ZUNOPLAY_GLOBAL_BOOT_V184__=true;

  /*
   * ZunoPlay UI — Etapa 1/8
   * A Home (index.html) e a fonte visual oficial e permanece intacta.
   * Paginas secundarias recebem apenas UMA fundacao visual global.
   * CSS/shells legados nao sao mais empilhados sobre elas.
   */
  const V='184';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const isHome=page==='index.html';
  const publicPages=new Set(['login.html','cadastro.html']);
  const socialPages=['amigos.html','conversas.html','comunidades.html','perfil.html','notificacoes.html'];
  const gamePages=['jogos.html','historico.html','zuno-core.html','zuno-stack.html'];
  const roomGamePages=['zuno-core.html','zuno-stack.html'];
  const ver=file=>file+(file.includes('?')?'&':'?')+'v='+V;

  function loadStyle(id,file){
    if(document.getElementById(id))return;
    const link=document.createElement('link');
    link.id=id;link.rel='stylesheet';link.href=new URL(ver(file),location.href).href;
    document.head.appendChild(link);
  }
  function loadScript(id,file,onload){
    const existing=document.getElementById(id);
    if(existing){onload?.();return}
    const s=document.createElement('script');
    s.id=id;s.src=new URL(ver(file),location.href).href;s.defer=true;
    if(onload)s.onload=onload;
    s.onerror=()=>console.error('ZunoPlay: falha ao carregar '+file);
    document.head.appendChild(s);
  }

  /* Home aprovada: nao injetar nenhum shell secundario. */
  if(!isHome && !publicPages.has(page)){
    loadStyle('zunoplay-global-shell-v184-style','./zuno-global-shell-v184.css');
    loadScript('zunoplay-global-shell-v184-script','./zuno-global-shell-v184.js');
  }

  /* Estilos de conteudo continuam locais; o chrome global vem somente do shell oficial. */
  if(socialPages.includes(page)){
    loadStyle('zunoplay-social-style','./zuno-social.css');
    loadScript('zunoplay-social-script','./zuno-social.js');
  }
  if(gamePages.includes(page)){
    loadStyle('zunoplay-game-progression-style','./zuno-game-progression.css');
    loadScript('zunoplay-game-progression','./zuno-game-progression.js');
  }

  /* Sala imersiva mantem sua experiencia propria nesta etapa. */
  if(page==='sala.html'){
    loadStyle('zunoplay-room-stage5','./zuno-room-experience.css');
    loadStyle('zunoplay-room-fit','./zuno-room-fit.css');
    loadStyle('zunoplay-room-extras','./zuno-room-extras.css');
    loadScript('zunoplay-room-experience-stage5','./zuno-room-experience.js');
    loadScript('zunoplay-room-voice','./voz-sala.js');
    loadScript('zunoplay-room-session-guard','./room-session-guard.js');
  }else if(roomGamePages.includes(page)){
    loadScript('zunoplay-room-game-return','./zuno-room-game-return.js');
  }

  loadScript('zunoplay-realtime-global','./realtime-global.js');
  loadScript('zunoplay-avatar-renderer','./avatar-renderer.js',()=>loadScript('zunoplay-avatar-home-sync','./avatar-home-sync.js'));
})();
