(()=>{
  if(window.__ZUNO_ROOM_BOOTSTRAP_V202__)return;
  window.__ZUNO_ROOM_BOOTSTRAP_V202__=true;
  const $=id=>document.getElementById(id);
  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');
  let recovered=false;
  function status(text,error=false){const el=$('roomStatus');if(el){el.textContent='● '+text;el.style.color=error?'#ff8aa6':'#31dd7b'}}
  function fail(text){status('Falha ao iniciar',true);const title=$('roomTitle');if(title)title.textContent='Não foi possível abrir a sala';const messages=$('messages');if(messages)messages.innerHTML='<div class="error">'+text+'<br><button id="zunoRoomRetry" type="button" style="margin-top:12px;padding:10px 16px;border:0;border-radius:12px;background:#7c3aed;color:#fff;font-weight:800">Tentar novamente</button></div>';setTimeout(()=>{$('zunoRoomRetry')?.addEventListener('click',()=>{const u=new URL(location.href);u.searchParams.set('_room_retry',Date.now());location.replace(u.href)})},0)}
  async function recover(){
    if(recovered||window.__ZUNO_ROOM_BOOT_READY__)return;recovered=true;
    if(!roomId){fail('ID da sala não encontrado. Volte para Salas e entre novamente.');return}
    status('Reconectando...');
    try{
      if(!window.supabase?.createClient)throw new Error('Conexão com o servidor não inicializou.');
      const REF='rliymfbbhqoejgfvsbuu',URL='https://'+REF+'.supabase.co',KEY='sb_publishable_E4go4X7yZ6d-aXnKAT-fWw_Y8uHIJT0';
      const sb=window.ZunoSupabaseClient||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
      window.ZunoSupabaseClient=sb;
      let session=(await Promise.race([sb.auth.getSession(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tempo limite da sessão')),5000))])).data?.session;
      if(!session?.access_token){const refreshed=await Promise.race([sb.auth.refreshSession(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Tempo limite ao renovar sessão')),5000))]);session=refreshed.data?.session}
      if(!session?.access_token){location.replace('login.html?next='+encodeURIComponent('sala.html?room='+roomId));return}
      const h={apikey:KEY,Authorization:'Bearer '+session.access_token};
      const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),6000);
      const [rr,mr]=await Promise.all([
        fetch(URL+'/rest/v1/rooms?select=id,name,owner_id&id=eq.'+encodeURIComponent(roomId),{headers:h,cache:'no-store',signal:ctl.signal}),
        fetch(URL+'/rest/v1/room_members?select=user_id,seat_index,joined_at&room_id=eq.'+encodeURIComponent(roomId)+'&user_id=eq.'+encodeURIComponent(session.user.id),{headers:h,cache:'no-store',signal:ctl.signal})
      ]);clearTimeout(timer);
      if(!rr.ok||!mr.ok)throw new Error('Servidor recusou os dados da sala ('+rr.status+'/'+mr.status+').');
      const rooms=await rr.json(),members=await mr.json();
      if(!rooms?.[0])throw new Error('Esta sala não existe mais.');
      if(!members?.[0]){location.replace('salas.html?room_ended=1');return}
      sessionStorage.setItem('zunoplay_room_id',roomId);
      location.reload();
    }catch(e){console.error('[ZunoRoom recovery]',e);fail(e?.name==='AbortError'?'O servidor da sala não respondeu. Tente novamente.':(e?.message||'Não foi possível reconectar à sala.'))}
  }
  window.addEventListener('zuno:room-app-ready',()=>{window.__ZUNO_ROOM_BOOT_READY__=true;status('Sala ativa')},{once:true});
  window.addEventListener('error',e=>{if(/zuno-room|sala|realtime|presenca|voz/i.test(String(e?.filename||'')+String(e?.message||'')))console.error('[ZunoRoom]',e.error||e.message)});
  setTimeout(()=>{if(!window.__ZUNO_ROOM_BOOT_READY__&&($('roomTitle')?.textContent||'').includes('Carregando'))recover()},6500);
  setTimeout(()=>{if(!window.__ZUNO_ROOM_BOOT_READY__&&($('roomTitle')?.textContent||'').includes('Carregando'))fail('A sala não conseguiu concluir a inicialização. Toque em “Tentar novamente”.')},14000);
})();