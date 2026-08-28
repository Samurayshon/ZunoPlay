(()=>{
  if(window.__ZUNO_ROOMS_STAGE6__)return;
  window.__ZUNO_ROOMS_STAGE6__=true;
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(!['salas.html','sala.html'].includes(page))return;

  function cleanText(el,emojiPattern){
    if(!el||el.dataset.zunoStage6Clean==='1')return;
    el.textContent=(el.textContent||'').replace(emojiPattern,'').trim();
    el.dataset.zunoStage6Clean='1';
  }

  function decorateRooms(root=document){
    if(page!=='salas.html')return;
    document.body?.classList.add('zuno-rooms-list');
    root.querySelectorAll?.('.title').forEach(el=>cleanText(el,/^[\s🎙️🎤]+/u));
    root.querySelectorAll?.('.room-name').forEach(el=>cleanText(el,/^[\s🎙️🎤]+/u));
    root.querySelectorAll?.('.status').forEach(el=>{
      if(el.dataset.zunoStage6Status==='1')return;
      el.textContent=(el.textContent||'').replace(/^[\s●✅⏳]+/u,'').trim();
      el.dataset.zunoStage6Status='1';
    });
  }

  function decorateRoom(root=document){
    if(page!=='sala.html')return;
    document.body?.classList.add('zuno-room-immersive');
    const stage=root.querySelector?.('#roomStage');
    if(stage)stage.setAttribute('data-zuno-stage6','voice-stage');
    root.querySelectorAll?.('.presence-status,.room-status').forEach(el=>{
      if(el.dataset.zunoStage6Status==='1')return;
      el.textContent=(el.textContent||'').replace(/^●\s*/,'').trim();
      el.dataset.zunoStage6Status='1';
    });
  }

  function decorate(root=document){decorateRooms(root);decorateRoom(root)}
  function mount(){
    decorate();
    const target=document.querySelector('#app,.app,main')||document.body;
    if(!target)return;
    let pending=false;
    const obs=new MutationObserver(records=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{pending=false;records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1)decorate(n)}));decorate(target)});
    });
    obs.observe(target,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
