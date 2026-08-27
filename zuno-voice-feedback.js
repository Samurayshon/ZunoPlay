(()=>{
  if(window.__ZUNO_VOICE_FEEDBACK__)return;
  window.__ZUNO_VOICE_FEEDBACK__=true;
  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||q.get('room_id')||q.get('id')||sessionStorage.getItem('zunoplay_room_id');
  if(!roomId)return;
  let pulseChannel=null,currentUser=null,pulseRequestTimer=null;
  const qs=(s,r=document)=>r?.querySelector?.(s),qsa=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
  function seatFor(id){return id?qs('.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"]'):null}
  function decorateSeat(seat){
    if(!seat||seat.dataset.zunoVoiceFeedback==='1')return;
    seat.dataset.zunoVoiceFeedback='1';
    const wrap=qs('.avatar-wrap',seat);if(!wrap)return;
    const meter=document.createElement('div');meter.className='zuno-voice-meter';meter.setAttribute('aria-hidden','true');meter.innerHTML='<i></i><i></i><i></i><i></i>';
    const chip=document.createElement('div');chip.className='zuno-voice-chip';chip.setAttribute('aria-hidden','true');
    wrap.appendChild(meter);wrap.appendChild(chip);
  }
  function decorateAll(){qsa('.avatar-slot[data-user-id]').forEach(decorateSeat)}
  function updateRoomSpeaking(){
    const speaking=qsa('.avatar-slot.is-speaking').length;
    document.body.classList.toggle('zuno-room-speaking',speaking>0);
    document.body.classList.toggle('zuno-room-multi-speaking',speaking>1);
    document.body.dataset.zunoSpeakers=String(speaking);
  }
  function applyVoice(detail){
    const id=detail?.user_id;if(!id)return;
    const seat=seatFor(id);if(!seat)return;
    decorateSeat(seat);
    const state=detail?.state||'online',muted=Boolean(detail?.muted);
    seat.dataset.voiceState=state;
    seat.classList.toggle('is-speaking',state==='speaking'&&!muted);
    seat.classList.toggle('is-listening',state==='listening');
    seat.classList.toggle('is-muted',muted);
    const chip=qs('.zuno-voice-chip',seat),mic=qs('.mic-dot',seat);
    if(chip){
      chip.textContent=muted?'Mudo':state==='speaking'?'Falando':state==='listening'?'Na voz':'';
      chip.classList.toggle('show',muted||state==='speaking');
      chip.classList.toggle('speaking',state==='speaking'&&!muted);
      chip.classList.toggle('muted',muted);
    }
    if(mic)mic.textContent=muted?'🔇':state==='speaking'?'◉':'🎙';
    updateRoomSpeaking();
  }
  function applyPresenceSnapshot(snapshot){
    if(!snapshot||typeof snapshot!=='object')return;
    Object.entries(snapshot).forEach(([id,list])=>{
      if(!Array.isArray(list)||!list.length)return;
      const p=[...list].reverse().find(x=>x?.status)||list[list.length-1];
      const state=p?.status;
      if(state==='speaking'||state==='listening')applyVoice({user_id:id,state,muted:false});
    });
  }
  async function waitRealtime(){
    if(window.ZunoRealtime)return window.ZunoRealtime;
    return new Promise(resolve=>{const done=()=>resolve(window.ZunoRealtime||null);window.addEventListener('zuno:realtime-installed',done,{once:true});setTimeout(done,5000)});
  }
  function localPulseMode(){return localStorage.getItem('zuno_pulse_mode')||'classic'}
  function applyPulse(payload){
    if(!payload?.user_id)return;
    const seat=seatFor(payload.user_id);if(!seat)return;
    seat.dataset.pulseMode=payload.mode||'off';
    seat.classList.toggle('pulse-enabled',payload.mode&&payload.mode!=='off');
  }
  async function sendPulseState(){
    if(!pulseChannel||!currentUser?.id)return;
    try{await pulseChannel.send({type:'broadcast',event:'pulse-state',payload:{room_id:roomId,user_id:currentUser.id,mode:localPulseMode(),at:Date.now()}})}catch(_){}
  }
  async function requestPulseStates(){
    if(!pulseChannel||!currentUser?.id)return;
    try{await pulseChannel.send({type:'broadcast',event:'pulse-request',payload:{room_id:roomId,user_id:currentUser.id,at:Date.now()}})}catch(_){}
  }
  async function setupPulseSync(){
    try{
      const core=await waitRealtime();if(!core)return;await core.start?.();
      currentUser=core.getUser?.()||null;
      pulseChannel=core.broadcast.scope('room:'+roomId+':reactions',{private:true});
      pulseChannel.on('pulse-state',p=>{const d=p?.payload||p;if(d?.room_id===roomId)applyPulse(d)});
      pulseChannel.on('pulse-request',p=>{const d=p?.payload||p;if(d?.room_id===roomId&&d?.user_id!==currentUser?.id)sendPulseState()});
      await pulseChannel.subscribe();
      await sendPulseState();
      pulseRequestTimer=setTimeout(requestPulseStates,350);
    }catch(e){console.warn('Zuno voice feedback: Pulse sync indisponível',e)}
  }
  function init(){
    decorateAll();
    const stage=qs('#roomStage');if(stage)new MutationObserver(()=>requestAnimationFrame(decorateAll)).observe(stage,{childList:true,subtree:true});
    setupPulseSync();
  }
  window.addEventListener('zuno:voice-presence',e=>applyVoice(e.detail));
  window.addEventListener('zuno:room-presence-sync',e=>{decorateAll();applyPresenceSnapshot(e.detail)});
  window.addEventListener('zuno:room-presence-join',()=>{setTimeout(()=>{sendPulseState();requestPulseStates()},250)});
  window.addEventListener('zuno:voice-stopped',e=>{if(e.detail?.user_id)applyVoice({user_id:e.detail.user_id,state:'online',muted:false})});
  window.addEventListener('pagehide',()=>{if(pulseRequestTimer)clearTimeout(pulseRequestTimer);pulseChannel?.close?.().catch?.(()=>{})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();