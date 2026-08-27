(()=>{
  if(window.__ZUNO_ROOM_EXPERIENCE__)return;
  window.__ZUNO_ROOM_EXPERIENCE__=true;

  const params=new URLSearchParams(location.search);
  const roomId=params.get('room')||params.get('room_id')||params.get('id')||sessionStorage.getItem('zunoplay_room_id');
  const REACTIONS=['❤️','🔥','😂','😮','👏','⚡'];
  let reactionChannel=null;
  let currentUser=null;
  let speakingTimer=0;
  let previousUsers=new Set();

  function qs(sel,root=document){return root.querySelector(sel)}
  function qsa(sel,root=document){return [...root.querySelectorAll(sel)]}

  function ensureFXLayer(){
    const stage=qs('#roomStage');
    if(!stage||qs('.zuno-room-fx',stage))return;
    const fx=document.createElement('div');
    fx.className='zuno-room-fx';
    fx.setAttribute('aria-hidden','true');
    fx.innerHTML='<div class="zuno-pulse-core"><i></i><i></i><i></i></div><div class="zuno-reaction-layer"></div>';
    stage.appendChild(fx);
  }

  function mountExperienceControls(){
    const dock=qs('#voiceDock');
    if(!dock||qs('.zuno-room-actions',dock))return;
    const actions=document.createElement('div');
    actions.className='zuno-room-actions';
    actions.innerHTML=`
      <button class="zuno-room-action" type="button" data-action="members" aria-label="Participantes"><span>👥</span><small>Pessoas</small></button>
      <button class="zuno-room-action" type="button" data-action="reaction" aria-label="Reagir"><span>✨</span><small>Reagir</small></button>
      <div class="zuno-mic-orbit" aria-hidden="true"></div>
      <button class="zuno-room-action" type="button" data-action="hand" aria-label="Levantar a mão"><span>✋</span><small>Mão</small></button>
      <button class="zuno-room-action" type="button" data-action="audio" aria-label="Áudio"><span>🎧</span><small>Áudio</small></button>
      <div class="zuno-reaction-picker" aria-hidden="true"></div>`;
    dock.appendChild(actions);
    const picker=qs('.zuno-reaction-picker',actions);
    REACTIONS.forEach(emoji=>{
      const b=document.createElement('button');
      b.type='button';b.textContent=emoji;b.setAttribute('aria-label','Reagir '+emoji);
      b.addEventListener('click',()=>{sendReaction(emoji);togglePicker(false)});
      picker.appendChild(b);
    });
    qs('[data-action="members"]',actions)?.addEventListener('click',()=>qs('#peopleButton')?.click());
    qs('[data-action="reaction"]',actions)?.addEventListener('click',()=>togglePicker());
    qs('[data-action="audio"]',actions)?.addEventListener('click',()=>qs('#speakerButton')?.click());
    qs('[data-action="hand"]',actions)?.addEventListener('click',toggleHand);
  }

  function togglePicker(force){
    const picker=qs('.zuno-reaction-picker');if(!picker)return;
    const open=force??!picker.classList.contains('open');
    picker.classList.toggle('open',open);picker.setAttribute('aria-hidden',String(!open));
  }

  function toggleHand(e){
    const btn=e?.currentTarget||qs('[data-action="hand"]');
    const active=!btn?.classList.contains('active');
    btn?.classList.toggle('active',active);
    const seat=currentUser?.id?qs('.avatar-slot[data-user-id="'+CSS.escape(String(currentUser.id))+'"]'):null;
    seat?.classList.toggle('is-hand-raised',active);
    if(active)showReaction({emoji:'✋',user_id:currentUser?.id,kind:'hand'});
  }

  function updateMicOrbit(){
    const root=qs('#zunoVoiceControls');
    const orbit=qs('.zuno-mic-orbit');
    if(!root||!orbit)return;
    orbit.classList.toggle('active',root.classList.contains('is-active'));
    orbit.classList.toggle('speaking',root.classList.contains('is-speaking')||document.body.classList.contains('zuno-room-speaking'));
  }

  function applyVoice(detail){
    if(!document.body?.classList.contains('zuno-page-sala'))return;
    const state=detail?.state||'online';
    const id=detail?.user_id;
    if(id){
      const escaped=CSS.escape(String(id));
      qsa('.avatar-slot[data-user-id="'+escaped+'"]') .forEach(el=>{
        el.classList.toggle('is-speaking',state==='speaking');
        el.classList.toggle('is-listening',state==='listening');
        el.classList.toggle('is-muted',!!detail?.muted);
        const mic=qs('.mic-dot',el);
        if(mic)mic.textContent=detail?.muted?'🔇':state==='speaking'?'◉':'🎙';
      });
    }
    clearTimeout(speakingTimer);
    if(state==='speaking'){
      document.body.classList.add('zuno-room-speaking');
      speakingTimer=setTimeout(()=>{
        if(!qs('.avatar-slot.is-speaking'))document.body.classList.remove('zuno-room-speaking');
        updateMicOrbit();
      },950);
    }else if(!qs('.avatar-slot.is-speaking'))document.body.classList.remove('zuno-room-speaking');
    updateMicOrbit();
  }

  function showReaction(payload){
    ensureFXLayer();
    const layer=qs('.zuno-reaction-layer');if(!layer||!payload?.emoji)return;
    const burst=document.createElement('div');
    burst.className='zuno-reaction-burst';
    burst.textContent=payload.emoji;
    const seat=payload.user_id?qs('.avatar-slot[data-user-id="'+CSS.escape(String(payload.user_id))+'"]'):null;
    if(seat){
      const stage=qs('#roomStage'),sr=stage.getBoundingClientRect(),rr=seat.getBoundingClientRect();
      burst.style.left=((rr.left+rr.width/2-sr.left)/sr.width*100)+'%';
      burst.style.top=((rr.top+rr.height*.35-sr.top)/sr.height*100)+'%';
    }else{burst.style.left='50%';burst.style.top='52%'}
    layer.appendChild(burst);
    seat?.classList.add('has-reaction');
    setTimeout(()=>seat?.classList.remove('has-reaction'),650);
    setTimeout(()=>burst.remove(),1800);
  }

  async function getRealtime(){
    if(window.ZunoRealtime)return window.ZunoRealtime;
    return new Promise(resolve=>{
      const done=()=>resolve(window.ZunoRealtime||null);
      window.addEventListener('zuno:realtime-installed',done,{once:true});
      setTimeout(done,4000);
    });
  }

  async function setupReactions(){
    if(!roomId)return;
    try{
      const sb=window.ZunoSupabaseClient;
      if(sb){const {data}=await sb.auth.getSession();currentUser=data?.session?.user||null}
      const core=await getRealtime();if(!core)return;
      await core.start?.();
      reactionChannel=core.broadcast.scope('room:'+roomId+':reactions',{private:true});
      reactionChannel.on('reaction',p=>{
        const payload=p?.payload||p;
        if(payload?.room_id===roomId)showReaction(payload);
      });
      await reactionChannel.subscribe();
    }catch(err){console.warn('Zuno reactions indisponíveis',err)}
  }

  async function sendReaction(emoji){
    const payload={room_id:roomId,user_id:currentUser?.id||null,emoji,at:Date.now()};
    showReaction(payload);
    try{await reactionChannel?.send?.({type:'broadcast',event:'reaction',payload})}catch(err){console.warn('Falha ao enviar reação',err)}
  }

  function animatePresenceChanges(){
    const users=new Set(qsa('.avatar-slot[data-user-id]').map(el=>el.dataset.userId));
    users.forEach(id=>{
      if(previousUsers.size&&!previousUsers.has(id)){
        const el=qs('.avatar-slot[data-user-id="'+CSS.escape(String(id))+'"]');
        el?.classList.add('zuno-entering');
        setTimeout(()=>el?.classList.remove('zuno-entering'),900);
      }
    });
    previousUsers=users;
    ensureFXLayer();
  }

  function observeStage(){
    const stage=qs('#roomStage');if(!stage)return;
    animatePresenceChanges();
    new MutationObserver(()=>requestAnimationFrame(animatePresenceChanges)).observe(stage,{childList:true});
  }

  function syncVoiceRoot(){
    const root=qs('#zunoVoiceControls');if(!root)return;
    const mute=qs('.voice-mute',root),join=qs('.voice-join',root);
    const sync=()=>{
      document.body.classList.toggle('zuno-voice-connected',root.classList.contains('is-active'));
      const orbit=qs('.zuno-mic-orbit');
      if(orbit){orbit.innerHTML='<span>'+(root.classList.contains('is-active')?(mute?.textContent?.includes('Desmutar')?'🔇':'🎙️'):'🎙️')+'</span>'}
      updateMicOrbit();
    };
    new MutationObserver(sync).observe(root,{attributes:true,childList:true,subtree:true,characterData:true});
    join?.addEventListener('click',()=>setTimeout(sync,50));mute?.addEventListener('click',()=>setTimeout(sync,50));sync();
  }

  function init(){
    if(!document.body?.classList.contains('zuno-page-sala'))return;
    ensureFXLayer();mountExperienceControls();observeStage();setupReactions();
    const wait=setInterval(()=>{mountExperienceControls();syncVoiceRoot();if(qs('#zunoVoiceControls'))clearInterval(wait)},250);
    setTimeout(()=>clearInterval(wait),6000);
  }

  window.addEventListener('zuno:voice-presence',e=>applyVoice(e.detail));
  window.addEventListener('zuno:room-presence-sync',()=>{animatePresenceChanges();document.body?.classList.toggle('zuno-room-speaking',!!qs('.avatar-slot.is-speaking'));updateMicOrbit()});
  window.addEventListener('pagehide',()=>reactionChannel?.close?.().catch?.(()=>{}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();