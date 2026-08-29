(()=>{
  if(window.__ZUNO_ROOM_ACCESS_V1__)return;
  window.__ZUNO_ROOM_ACCESS_V1__=true;
  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');
  if(!roomId)return;
  let leaving=false;
  const waitClient=async()=>{for(let i=0;i<50;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await new Promise(r=>setTimeout(r,100))}throw new Error('Supabase indisponível')};
  async function leaveSafely(dest='salas.html'){
    if(leaving)return;leaving=true;
    try{
      const sb=await waitClient();
      try{await window.ZunoRoomVoice?.stop?.()}catch(_){}
      const {error}=await sb.rpc('leave_room_session',{p_room_id:roomId});
      if(error)throw error;
    }catch(error){
      console.error('Saída segura da sala',error);
      alert('Não foi possível sair da sala: '+(error.message||'erro desconhecido'));
      leaving=false;return;
    }
    sessionStorage.removeItem('zunoplay_room_id');
    sessionStorage.removeItem('zuno_room_bootstrap');
    location.href=dest;
  }
  async function installInviteButton(){
    const sb=await waitClient();
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    const [{data:room},{data:member}]=await Promise.all([
      sb.from('rooms').select('owner_id,visibility,status').eq('id',roomId).maybeSingle(),
      sb.from('room_members').select('role').eq('room_id',roomId).eq('user_id',user.id).maybeSingle()
    ]);
    if(!room||room.status!=='active')return;
    const canInvite=room.owner_id===user.id||['owner','admin'].includes(member?.role||'');
    if(!canInvite)return;
    const leave=document.getElementById('leaveButton');
    if(!leave||document.getElementById('zunoRoomInviteButton'))return;
    const btn=document.createElement('button');
    btn.id='zunoRoomInviteButton';btn.type='button';btn.className='leave';
    btn.style.cssText='border-color:#58408c;background:#17112b;color:#d8c8ff;margin-top:12px';
    btn.textContent=room.visibility==='private'?'Convidar para sala privada':'Criar link de convite';
    btn.onclick=async()=>{
      if(btn.disabled)return;btn.disabled=true;const old=btn.textContent;btn.textContent='Criando convite...';
      try{
        const {data,error}=await sb.rpc('create_room_invite',{p_room_id:roomId,p_invitee_id:null,p_expires_minutes:60});
        if(error)throw error;
        const row=Array.isArray(data)?data[0]:data;
        if(!row?.invite_token)throw new Error('Token de convite não retornou');
        const url=new URL('salas.html',location.href);url.searchParams.set('room',roomId);url.searchParams.set('invite',row.invite_token);
        let copied=false;
        try{await navigator.clipboard.writeText(url.href);copied=true}catch(_){}
        if(!copied){const input=document.createElement('textarea');input.value=url.href;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();copied=document.execCommand('copy');input.remove()}
        alert(copied?'Link de convite copiado. Ele expira em 1 hora e só pode ser usado uma vez.':'Convite criado. Copie o link: '+url.href);
      }catch(error){console.error('Convite de sala',error);alert('Não foi possível criar o convite: '+(error.message||'erro desconhecido'))}
      finally{btn.disabled=false;btn.textContent=old}
    };
    leave.before(btn);
  }
  function patchLeave(){
    window.goBack=()=>leaveSafely();
    const leave=document.getElementById('leaveButton');
    if(leave){leave.onclick=e=>{e?.preventDefault?.();leaveSafely()}}
  }
  function patchMainMic(){
    const btn=document.getElementById('emojiButton');
    if(!btn||btn.dataset.zunoSecureMic==='1')return;
    btn.dataset.zunoSecureMic='1';
    btn.addEventListener('click',async e=>{
      const voice=window.ZunoRoomVoice;if(!voice)return;
      e.preventDefault();e.stopImmediatePropagation();
      const state=voice.getState?.()||{};
      if(!state.active)await voice.start?.();
      else if(state.publishing)await voice.mute?.(!state.muted);
      else await voice.requestMic?.();
      syncMicLabel();
    },true);
  }
  function syncMicLabel(){
    const btn=document.getElementById('emojiButton'),state=window.ZunoRoomVoice?.getState?.();
    if(!btn||!state)return;
    const label=!state.active?'Entrar no áudio':state.publishing?(state.muted?'Desmutar microfone':'Mutar microfone'):(state.can_publish?'Ativar microfone':'Pedir para falar');
    btn.setAttribute('aria-label',label);btn.title=label;
    btn.dataset.voiceState=!state.active?'off':state.publishing?(state.muted?'muted':'active'):'listener';
    btn.classList.toggle('mic-active',!!state.publishing&&!state.muted);
    btn.classList.toggle('mic-muted',!!state.publishing&&!!state.muted);
  }
  function install(){patchLeave();patchMainMic();installInviteButton().catch(e=>console.warn('Convites da sala indisponíveis',e));syncMicLabel()}
  window.addEventListener('zuno:room-app-ready',install);
  window.addEventListener('zuno:voice-capability',syncMicLabel);
  window.addEventListener('zuno:voice-mute',syncMicLabel);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,400),{once:true});else setTimeout(install,400);
  const t=setInterval(()=>{patchMainMic();syncMicLabel()},900);
  window.addEventListener('pagehide',()=>clearInterval(t),{once:true});
})();
