(()=>{
  if(window.__ZUNO_VOICE_ROOM_OFFICIAL__)return;
  window.__ZUNO_VOICE_ROOM_OFFICIAL__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(page!=='sala.html')return;

  function cleanStatus(){
    const el=document.getElementById('roomStatus');
    if(!el)return;
    const current=el.textContent||'';
    const text=current.replace(/^\s*[●•]\s*/,'').trim();
    if(text && current!==text)el.textContent=text;
    const t=text.toLowerCase();
    const state=t.includes('conect')?'connecting':t.includes('erro')||t.includes('falh')?'error':'online';
    if(el.dataset.state!==state)el.dataset.state=state;
  }

  function decorate(){
    if(!document.body)return;
    document.body.classList.add('zuno-voice-room-official');
    if(document.documentElement.dataset.zunoVoiceRoom!=='official-v2')document.documentElement.dataset.zunoVoiceRoom='official-v2';
    const stage=document.getElementById('roomStage');
    if(stage){
      if(stage.dataset.zunoVoiceStage!=='official')stage.dataset.zunoVoiceStage='official';
      if(stage.getAttribute('aria-label')!=='Palco oficial de voz do ZunoPlay com até 8 participantes')stage.setAttribute('aria-label','Palco oficial de voz do ZunoPlay com até 8 participantes');
    }
    const title=document.getElementById('roomTitle');
    if(title){const value=title.textContent||'Sala ZunoPlay';if(title.getAttribute('title')!==value)title.setAttribute('title',value)}
    const chat=document.querySelector('.chat-section');if(chat&&chat.dataset.zunoVoiceChat!=='official')chat.dataset.zunoVoiceChat='official';
    const composer=document.querySelector('.composer-wrap');if(composer&&composer.dataset.zunoVoiceDock!=='official')composer.dataset.zunoVoiceDock='official';
    cleanStatus();
  }

  function mount(){
    decorate();
    let scheduled=false;
    const obs=new MutationObserver(mutations=>{
      if(!mutations.some(m=>m.target===document.getElementById('roomStatus')||m.target===document.getElementById('roomTitle')||m.target===document.getElementById('roomStage')||m.target?.parentElement===document.getElementById('roomStatus')||m.target?.parentElement===document.getElementById('roomTitle')))return;
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;decorate()});
    });
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('pagehide',()=>obs.disconnect(),{once:true});
    window.dispatchEvent(new CustomEvent('zuno:voice-room-official-ready',{detail:{version:'official-v2'}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();