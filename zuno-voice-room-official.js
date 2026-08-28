(()=>{
  if(window.__ZUNO_VOICE_ROOM_OFFICIAL__)return;
  window.__ZUNO_VOICE_ROOM_OFFICIAL__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(page!=='sala.html')return;
  function cleanStatus(){
    const el=document.getElementById('roomStatus');
    if(!el)return;
    const text=(el.textContent||'').replace(/^\s*[●•]\s*/,'').trim();
    if(text)el.textContent=text;
    const t=text.toLowerCase();
    el.dataset.state=t.includes('conect')?'connecting':t.includes('erro')||t.includes('falh')?'error':'online';
  }
  function decorate(){
    if(!document.body)return;
    document.body.classList.add('zuno-voice-room-official');
    document.documentElement.dataset.zunoVoiceRoom='official-v1';
    const stage=document.getElementById('roomStage');
    if(stage){stage.dataset.zunoVoiceStage='official';stage.setAttribute('aria-label','Palco oficial de voz do ZunoPlay com até 8 participantes')}
    const title=document.getElementById('roomTitle');if(title)title.setAttribute('title',title.textContent||'Sala ZunoPlay');
    const chat=document.querySelector('.chat-section');if(chat)chat.dataset.zunoVoiceChat='official';
    const composer=document.querySelector('.composer-wrap');if(composer)composer.dataset.zunoVoiceDock='official';
    cleanStatus();
  }
  function mount(){
    decorate();
    const obs=new MutationObserver(()=>decorate());
    obs.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.dispatchEvent(new CustomEvent('zuno:voice-room-official-ready',{detail:{version:'official-v1'}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();