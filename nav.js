(()=>{
  if(window.__ZUNOPLAY_GLOBAL_BOOT_V193__)return;
  window.__ZUNOPLAY_GLOBAL_BOOT_V193__=true;

  /* ZunoPlay — Fase 4: consolidação funcional + Sala de Voz oficial global. */
  const V='193';
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const isHome=page==='index.html';
  const publicPages=new Set(['login.html','cadastro.html']);
  const socialPages=['amigos.html','conversas.html','comunidades.html','perfil.html','notificacoes.html'];
  const profileAvatarPages=['perfil.html','avatar.html'];
  const roomsPages=['salas.html','sala.html'];
  const gamePages=['jogos.html','historico.html','zuno-core.html','zuno-stack.html'];
  const roomGamePages=['zuno-core.html','zuno-stack.html'];
  const ver=file=>file+(file.includes('?')?'&':'?')+'v='+V;
  function loadStyle(id,file){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=new URL(ver(file),location.href).href;document.head.appendChild(link)}
  function loadScript(id,file,onload){const existing=document.getElementById(id);if(existing){onload?.();return}const s=document.createElement('script');s.id=id;s.src=new URL(ver(file),location.href).href;s.defer=true;if(onload)s.onload=onload;s.onerror=()=>console.error('ZunoPlay: falha ao carregar '+file);document.head.appendChild(s)}

  if(!isHome&&!publicPages.has(page)){loadStyle('zunoplay-global-chrome-style','./zuno-global-chrome.css');loadScript('zunoplay-global-chrome-script','./zuno-global-chrome.js')}
  if(socialPages.includes(page)){loadStyle('zunoplay-social-style','./zuno-social.css');loadScript('zunoplay-social-script','./zuno-social.js')}
  if(gamePages.includes(page)){loadStyle('zunoplay-game-progression-style','./zuno-game-progression.css');loadScript('zunoplay-game-progression','./zuno-game-progression.js')}
  if(!isHome&&!publicPages.has(page)&&page!=='sala.html')loadStyle('zunoplay-ui-components','./zuno-ui-components.css');
  if(profileAvatarPages.includes(page)){loadStyle('zunoplay-profile-avatar-stage5-style','./zuno-profile-avatar-stage5.css');loadScript('zunoplay-profile-avatar-stage5-script','./zuno-profile-avatar-stage5.js')}
  if(page==='sala.html'){
    loadStyle('zunoplay-room-stage5','./zuno-room-experience.css');loadStyle('zunoplay-room-fit','./zuno-room-fit.css');loadStyle('zunoplay-room-extras','./zuno-room-extras.css');
    loadScript('zunoplay-room-experience-stage5','./zuno-room-experience.js');loadScript('zunoplay-room-voice','./voz-sala.js');loadScript('zunoplay-room-session-guard','./room-session-guard.js');
  }else if(roomGamePages.includes(page))loadScript('zunoplay-room-game-return','./zuno-room-game-return.js');
  if(roomsPages.includes(page)){loadStyle('zunoplay-rooms-stage6-style','./zuno-rooms-stage6.css');loadScript('zunoplay-rooms-stage6-script','./zuno-rooms-stage6.js')}
  if(gamePages.includes(page)){loadStyle('zunoplay-games-stage7-style','./zuno-games-stage7.css');loadScript('zunoplay-games-stage7-script','./zuno-games-stage7.js')}
  if(!publicPages.has(page)){loadStyle('zunoplay-final-audit-style','./zuno-final-audit.css');loadScript('zunoplay-final-audit-script','./zuno-final-audit.js')}

  loadScript('zunoplay-realtime-global','./realtime-global.js');
  loadScript('zunoplay-avatar-renderer','./avatar-renderer.js',()=>loadScript('zunoplay-avatar-home-sync','./avatar-home-sync.js'));
  if(!publicPages.has(page))loadScript('zunoplay-integration-phase4','./zuno-integration-phase4.js');

  /* Layout oficial global das salas de voz: sempre carregado por último em sala.html. */
  if(page==='sala.html'){
    loadStyle('zunoplay-voice-room-official-style','./zuno-voice-room-official.css');
    loadScript('zunoplay-voice-room-official-script','./zuno-voice-room-official.js');
  }
})();