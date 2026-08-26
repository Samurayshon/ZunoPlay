(()=>{
  if(window.__ZUNO_ROOM_VOICE__)return;
  window.__ZUNO_ROOM_VOICE__=true;

  const params=new URLSearchParams(location.search);
  const roomId=params.get('room')||params.get('room_id')||params.get('id')||sessionStorage.getItem('zunoplay_room_id');
  if(!roomId)return;

  const ICE_SERVERS=[
    {urls:'stun:stun.l.google.com:19302'},
    {urls:'stun:stun1.l.google.com:19302'}
  ];

  let core=null;
  let sb=null;
  let user=null;
  let channel=null;
  let localStream=null;
  let audioContext=null;
  let analyser=null;
  let vadTimer=null;
  let silenceSince=0;
  let voiceActive=false;
  let muted=false;
  let subscribed=false;
  let desiredPresence='online';
  const peers=new Map();
  const remoteAudio=new Map();

  const ui={root:null,join:null,mute:null,status:null,count:null};

  function roomTopic(){return 'room:'+roomId+':voice'}
  function peerIds(){return [...peers.keys()]}
  function isSecureMediaContext(){return window.isSecureContext&&!!navigator.mediaDevices?.getUserMedia}

  function waitForCore(){
    if(window.ZunoRealtime)return Promise.resolve(window.ZunoRealtime);
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=()=>{
        if(settled)return;
        if(window.ZunoRealtime){settled=true;resolve(window.ZunoRealtime)}
      };
      window.addEventListener('zuno:realtime-installed',finish,{once:true});
      setTimeout(()=>{
        if(settled)return;
        settled=true;
        window.ZunoRealtime?resolve(window.ZunoRealtime):reject(new Error('Realtime global indisponível'));
      },5000);
    });
  }

  function mount(){
    if(ui.root||!document.body)return;
    const style=document.createElement('style');
    style.textContent='.zuno-voice{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:13px 14px;margin:12px 0 2px;border:1px solid #303145;border-radius:16px;background:#10111c}.zuno-voice button{border:0;border-radius:11px;padding:11px 13px;color:#fff;font-weight:700;cursor:pointer}.zuno-voice .voice-join{background:linear-gradient(135deg,#8b5cf6,#6366f1)}.zuno-voice .voice-mute{background:#24253a;border:1px solid #3b3c55}.zuno-voice button:disabled{opacity:.55;cursor:default}.zuno-voice .voice-status{flex:1;min-width:160px;font-size:11px;color:#a7a7b5;line-height:1.4}.zuno-voice .voice-count{font-size:10px;color:#4ade80}.zuno-voice.is-active{border-color:rgba(34,197,94,.45)}';
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.className='zuno-voice';
    root.id='zunoVoiceControls';
    root.innerHTML='<button type="button" class="voice-join">🎙️ Ativar voz</button><button type="button" class="voice-mute" disabled>🔇 Mutar</button><div class="voice-status">Voz desligada</div><div class="voice-count">0 na voz</div>';

    const target=document.querySelector('.hero')||document.querySelector('.content')||document.body;
    if(target.classList?.contains('hero'))target.insertAdjacentElement('afterend',root);else target.prepend(root);

    ui.root=root;
    ui.join=root.querySelector('.voice-join');
    ui.mute=root.querySelector('.voice-mute');
    ui.status=root.querySelector('.voice-status');
    ui.count=root.querySelector('.voice-count');
    ui.join.addEventListener('click',()=>voiceActive?stopVoice():startVoice());
    ui.mute.addEventListener('click',toggleMute);
  }

  function setStatus(text,ok=true){
    mount();
    if(!ui.status)return;
    ui.status.textContent=text;
    ui.status.style.color=ok?'#a7a7b5':'#ff9b9b';
  }

  function updateCount(){
    mount();
    if(!ui.count)return;
    const connected=[...peers.values()].filter(p=>p.pc.connectionState==='connected').length;
    ui.count.textContent=(voiceActive?1:0)+connected+' na voz';
  }

  function updateControls(){
    mount();
    if(!ui.root)return;
    ui.root.classList.toggle('is-active',voiceActive);
    ui.join.textContent=voiceActive?'⏹️ Sair da voz':'🎙️ Ativar voz';
    ui.mute.disabled=!voiceActive;
    ui.mute.textContent=muted?'🎙️ Desmutar':'🔇 Mutar';
    updateCount();
  }

  async function setRoomPresence(state){
    if(desiredPresence===state)return;
    desiredPresence=state;
    try{await window.zunoSetRoomPresence?.(state)}catch(error){console.warn('Presence de voz',error)}
  }

  async function setInitialListening(){
    desiredPresence='online';
    await setRoomPresence('listening');
  }

  function stopVad(){
    if(vadTimer){clearInterval(vadTimer);vadTimer=null}
    analyser=null;
    silenceSince=0;
    if(audioContext){audioContext.close().catch(()=>{});audioContext=null}
  }

  function startVad(){
    stopVad();
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC||!localStream)return;
    audioContext=new AC();
    const source=audioContext.createMediaStreamSource(localStream);
    analyser=audioContext.createAnalyser();
    analyser.fftSize=512;
    analyser.smoothingTimeConstant=.35;
    source.connect(analyser);
    const data=new Uint8Array(analyser.fftSize);
    vadTimer=setInterval(()=>{
      if(!voiceActive||muted||!analyser){
        silenceSince=0;
        setRoomPresence('listening');
        return;
      }
      analyser.getByteTimeDomainData(data);
      let sum=0;
      for(let i=0;i<data.length;i++){
        const v=(data[i]-128)/128;
        sum+=v*v;
      }
      const rms=Math.sqrt(sum/data.length);
      if(rms>.035){
        silenceSince=0;
        setRoomPresence('speaking');
      }else{
        if(!silenceSince)silenceSince=Date.now();
        if(Date.now()-silenceSince>650)setRoomPresence('listening');
      }
    },140);
  }

  async function unlockAudio(){
    try{if(audioContext?.state==='suspended')await audioContext.resume()}catch(_){}
    for(const audio of remoteAudio.values())audio.play().catch(()=>{});
  }

  function createRemoteAudio(peerId,stream){
    let audio=remoteAudio.get(peerId);
    if(!audio){
      audio=document.createElement('audio');
      audio.autoplay=true;
      audio.playsInline=true;
      audio.dataset.peerId=peerId;
      audio.style.display='none';
      document.body.appendChild(audio);
      remoteAudio.set(peerId,audio);
    }
    if(audio.srcObject!==stream)audio.srcObject=stream;
    audio.play().catch(()=>setStatus('Áudio remoto bloqueado pelo navegador. Toque em Desmutar/Ativar voz para liberar.',false));
  }

  function removeRemoteAudio(peerId){
    const audio=remoteAudio.get(peerId);
    if(audio){
      try{audio.pause();audio.srcObject=null}catch(_){}
      audio.remove();
      remoteAudio.delete(peerId);
    }
  }

  async function sendSignal(to,kind,data){
    if(!channel||!subscribed||!user)return;
    const result=await channel.send({type:'broadcast',event:'signal',payload:{from:user.id,to,kind,data,room_id:roomId,at:Date.now()}});
    if(result!=='ok'&&result!=='OK')console.warn('Sinal WebRTC não confirmado',result);
  }

  function closePeer(peerId){
    const rec=peers.get(peerId);
    if(rec){
      rec.closed=true;
      try{rec.pc.onicecandidate=null;rec.pc.ontrack=null;rec.pc.close()}catch(_){}
      peers.delete(peerId);
    }
    removeRemoteAudio(peerId);
    updateCount();
  }

  function shouldInitiate(peerId){return String(user.id).localeCompare(String(peerId))<0}

  function ensurePeer(peerId){
    let rec=peers.get(peerId);
    if(rec&&!rec.closed)return rec;
    const pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    rec={pc,pendingIce:[],makingOffer:false,offerSent:false,closed:false,restartTimer:null};
    peers.set(peerId,rec);

    for(const track of localStream?.getTracks?.()||[])pc.addTrack(track,localStream);

    pc.onicecandidate=event=>{
      if(event.candidate)sendSignal(peerId,'ice',event.candidate.toJSON?event.candidate.toJSON():event.candidate).catch(console.error);
    };
    pc.ontrack=event=>{
      let stream=event.streams?.[0];
      if(!stream){
        stream=new MediaStream();
        stream.addTrack(event.track);
      }
      createRemoteAudio(peerId,stream);
      updateCount();
    };
    pc.onconnectionstatechange=()=>{
      updateCount();
      const state=pc.connectionState;
      if(state==='connected')setStatus(muted?'Na voz · microfone mutado':'Na voz · áudio conectado');
      if(state==='failed'){
        setStatus('Reconectando áudio…',false);
        if(rec.restartTimer)clearTimeout(rec.restartTimer);
        rec.restartTimer=setTimeout(()=>{
          if(!voiceActive||rec.closed)return;
          if(shouldInitiate(peerId))makeOffer(peerId,true).catch(console.error);
        },1200);
      }
      if(state==='closed')closePeer(peerId);
    };
    pc.oniceconnectionstatechange=()=>{
      if(pc.iceConnectionState==='failed'&&typeof pc.restartIce==='function'){
        try{pc.restartIce()}catch(_){}
      }
    };
    return rec;
  }

  async function flushIce(rec){
    if(!rec.pc.remoteDescription)return;
    while(rec.pendingIce.length){
      const candidate=rec.pendingIce.shift();
      try{await rec.pc.addIceCandidate(candidate)}catch(error){console.warn('ICE pendente',error)}
    }
  }

  async function makeOffer(peerId,iceRestart=false){
    if(!voiceActive||!subscribed||peerId===user.id)return;
    const rec=ensurePeer(peerId);
    if(rec.makingOffer)return;
    if(!iceRestart&&rec.offerSent&&rec.pc.signalingState!=='closed')return;
    try{
      rec.makingOffer=true;
      const offer=await rec.pc.createOffer(iceRestart?{iceRestart:true}:undefined);
      await rec.pc.setLocalDescription(offer);
      rec.offerSent=true;
      await sendSignal(peerId,'offer',rec.pc.localDescription);
    }finally{rec.makingOffer=false}
  }

  async function handleSignal(payload){
    if(!voiceActive||!payload||payload.room_id!==roomId||payload.from===user?.id||payload.to!==user?.id)return;
    const peerId=payload.from;
    const rec=ensurePeer(peerId);
    try{
      if(payload.kind==='offer'){
        if(rec.pc.signalingState!=='stable'){
          console.warn('Oferta ignorada em estado',rec.pc.signalingState);
          return;
        }
        await rec.pc.setRemoteDescription(payload.data);
        await flushIce(rec);
        const answer=await rec.pc.createAnswer();
        await rec.pc.setLocalDescription(answer);
        await sendSignal(peerId,'answer',rec.pc.localDescription);
      }else if(payload.kind==='answer'){
        if(rec.pc.signalingState!=='have-local-offer')return;
        await rec.pc.setRemoteDescription(payload.data);
        await flushIce(rec);
      }else if(payload.kind==='ice'&&payload.data){
        const candidate=new RTCIceCandidate(payload.data);
        if(rec.pc.remoteDescription)await rec.pc.addIceCandidate(candidate);else rec.pendingIce.push(candidate);
      }else if(payload.kind==='bye')closePeer(peerId);
    }catch(error){
      console.error('Sinalização WebRTC',payload.kind,error);
      setStatus('Falha ao negociar áudio com um participante.',false);
    }
  }

  function voicePresenceState(){return channel?.presenceState?.()||{}}

  function syncVoicePeers(){
    if(!voiceActive||!user)return;
    const ids=Object.keys(voicePresenceState()).filter(id=>id!==user.id);
    for(const id of ids){
      ensurePeer(id);
      if(shouldInitiate(id))makeOffer(id).catch(console.error);
    }
    for(const id of peerIds())if(!ids.includes(id))closePeer(id);
    updateCount();
  }

  async function openChannel(){
    await sb.realtime.setAuth();
    channel=sb.channel(roomTopic(),{config:{private:true,presence:{key:user.id},broadcast:{self:false,ack:true}}});
    channel
      .on('broadcast',{event:'signal'},message=>handleSignal(message?.payload).catch(console.error))
      .on('presence',{event:'sync'},syncVoicePeers)
      .on('presence',{event:'join'},syncVoicePeers)
      .on('presence',{event:'leave'},({key})=>{if(key&&key!==user.id)closePeer(key);syncVoicePeers()});

    await new Promise((resolve,reject)=>{
      let done=false;
      const timeout=setTimeout(()=>{if(!done){done=true;reject(new Error('Tempo esgotado ao conectar a voz'))}},8000);
      channel.subscribe(async status=>{
        if(done)return;
        if(status==='SUBSCRIBED'){
          try{
            subscribed=true;
            await channel.track({user_id:user.id,room_id:roomId,voice:true,muted,at:new Date().toISOString()});
            done=true;clearTimeout(timeout);resolve();
          }catch(error){done=true;clearTimeout(timeout);reject(error)}
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
          done=true;clearTimeout(timeout);reject(new Error('Canal de voz indisponível: '+status));
        }
      });
    });
  }

  async function startVoice(){
    mount();
    if(voiceActive)return;
    if(!isSecureMediaContext()){
      setStatus('O navegador não liberou acesso ao microfone neste contexto.',false);
      return;
    }
    ui.join.disabled=true;
    setStatus('Solicitando acesso ao microfone…');
    try{
      core=await waitForCore();
      await core.start();
      sb=core.client;
      user=core.getUser();
      if(!user)throw new Error('Sessão não encontrada');

      localStream=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
        video:false
      });
      muted=false;
      voiceActive=true;
      startVad();
      if(audioContext?.state==='suspended')await audioContext.resume().catch(()=>{});
      await openChannel();
      await setInitialListening();
      updateControls();
      setStatus('Na voz · aguardando participantes');
      syncVoicePeers();
      window.dispatchEvent(new CustomEvent('zuno:voice-started',{detail:{room_id:roomId,user_id:user.id}}));
    }catch(error){
      console.error('Zuno voz',error);
      setStatus(error?.name==='NotAllowedError'?'Microfone negado. Libere a permissão do navegador e tente novamente.':'Não foi possível ativar a voz: '+(error.message||'erro desconhecido'),false);
      await stopVoice(true);
    }finally{
      if(ui.join)ui.join.disabled=false;
      updateControls();
    }
  }

  async function toggleMute(){
    if(!voiceActive||!localStream)return;
    muted=!muted;
    for(const track of localStream.getAudioTracks())track.enabled=!muted;
    try{await channel?.track({user_id:user.id,room_id:roomId,voice:true,muted,at:new Date().toISOString()})}catch(_){}
    await setRoomPresence('listening');
    await unlockAudio();
    updateControls();
    setStatus(muted?'Na voz · microfone mutado':'Na voz · microfone ativo');
    window.dispatchEvent(new CustomEvent('zuno:voice-mute',{detail:{muted}}));
  }

  async function stopVoice(internal=false){
    const wasActive=voiceActive;
    voiceActive=false;
    stopVad();
    if(wasActive&&!internal&&subscribed){
      await Promise.allSettled(peerIds().map(id=>sendSignal(id,'bye',null)));
    }
    subscribed=false;
    for(const id of peerIds())closePeer(id);
    if(channel){
      try{await channel.untrack?.()}catch(_){}
      try{await sb?.removeChannel(channel)}catch(_){}
      channel=null;
    }
    if(localStream){
      for(const track of localStream.getTracks())track.stop();
      localStream=null;
    }
    muted=false;
    desiredPresence='listening';
    if(!internal)await setRoomPresence('online');else{try{const p=window.zunoSetRoomPresence?.('online');p?.catch?.(()=>{})}catch(_){}}
    updateControls();
    if(!internal)setStatus('Voz desligada');
    if(wasActive)window.dispatchEvent(new CustomEvent('zuno:voice-stopped',{detail:{room_id:roomId}}));
  }

  window.ZunoRoomVoice={
    start:startVoice,
    stop:()=>stopVoice(false),
    mute:async value=>{if(!voiceActive)return false;if(Boolean(value)!==muted)await toggleMute();return true},
    getState:()=>({active:voiceActive,muted,peers:peerIds(),room_id:roomId})
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  window.addEventListener('pagehide',()=>{stopVoice(true).catch(()=>{})});
})();