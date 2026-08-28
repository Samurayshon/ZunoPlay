(()=>{
  if(window.__ZUNO_ROOM_BOOTSTRAP_V201__)return;
  window.__ZUNO_ROOM_BOOTSTRAP_V201__=true;
  const started=Date.now();
  const $=id=>document.getElementById(id);
  function status(text,error=false){
    const el=$('roomStatus');
    if(el){el.textContent='● '+text;el.style.color=error?'#ff8aa6':'#31dd7b'}
  }
  function fail(text){
    status('Falha ao iniciar',true);
    const title=$('roomTitle');if(title)title.textContent='Não foi possível abrir a sala';
    const messages=$('messages');if(messages)messages.innerHTML='<div class="error">'+text+'<br><button id="zunoRoomRetry" type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:12px;background:#7c3aed;color:#fff;font-weight:800">Tentar novamente</button></div>';
    setTimeout(()=>{$('zunoRoomRetry')?.addEventListener('click',()=>location.reload())},0);
  }
  window.addEventListener('zuno:room-app-ready',()=>{window.__ZUNO_ROOM_BOOT_READY__=true;status('Sala ativa')},{once:true});
  window.addEventListener('error',e=>{if(/zuno-room|sala|realtime|presenca|voz/i.test(String(e?.filename||'')+String(e?.message||'')))console.error('[ZunoRoom bootstrap]',e.error||e.message) });
  setTimeout(()=>{
    if(window.__ZUNO_ROOM_BOOT_READY__)return;
    if(window.__ZUNO_ROOM_APP_V201__||window.__ZUNO_ROOM_APP_V199__){
      if(Date.now()-started>10000)fail('A inicialização demorou demais. Verifique sua conexão e tente novamente.');
      return;
    }
    const s=document.createElement('script');
    s.src='zuno-room-app.js?v=201-recovery-'+Date.now();
    s.async=false;
    s.onload=()=>status('Retomando sala...');
    s.onerror=()=>fail('O arquivo principal da sala não pôde ser carregado.');
    document.head.appendChild(s);
  },2500);
  setTimeout(()=>{if(!window.__ZUNO_ROOM_BOOT_READY__&&($('roomTitle')?.textContent||'').includes('Carregando'))fail('A sala não respondeu dentro do tempo esperado. Toque em “Tentar novamente”.')},12000);
})();