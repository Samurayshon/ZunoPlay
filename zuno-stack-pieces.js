(()=>{
  if(window.__ZUNO_STACK_PREMIUM_PIECES__)return;
  window.__ZUNO_STACK_PREMIUM_PIECES__=true;

  const PIECES={
    'Raio':{name:'Bolt',x:'60%',y:'0%'},
    'Cristal':{name:'Core',x:'20%',y:'0%'},
    'Estrela':{name:'Nova',x:'40%',y:'0%'},
    'Lua':{name:'Prism',x:'100%',y:'0%'},
    'Orbe':{name:'Orb',x:'80%',y:'0%'},
    'Folha':{name:'Echo',x:'0%',y:'100%'},
    'Bolt':{name:'Bolt',x:'60%',y:'0%'},
    'Core':{name:'Core',x:'20%',y:'0%'},
    'Nova':{name:'Nova',x:'40%',y:'0%'},
    'Prism':{name:'Prism',x:'100%',y:'0%'},
    'Orb':{name:'Orb',x:'80%',y:'0%'},
    'Echo':{name:'Echo',x:'0%',y:'100%'}
  };
  let queued=false;

  function art(meta){
    return `<span class="zsp-art" style="--zsp-x:${meta.x};--zsp-y:${meta.y}" aria-hidden="true"></span>`;
  }
  function findMeta(text){
    const clean=(text||'').trim();
    if(PIECES[clean])return PIECES[clean];
    return Object.entries(PIECES).find(([key])=>clean.includes(key))?.[1]||null;
  }
  function patchTile(tile){
    if(tile.dataset.zspPatched==='1')return;
    const label=tile.querySelector('.label');
    const glyph=tile.querySelector('.glyph');
    const meta=findMeta(label?.textContent);
    if(!meta||!glyph)return;
    glyph.className='glyph zsp-art';
    glyph.textContent='';
    glyph.style.setProperty('--zsp-x',meta.x);
    glyph.style.setProperty('--zsp-y',meta.y);
    label.textContent=meta.name;
    const blocked=!tile.classList.contains('active');
    tile.setAttribute('aria-label',meta.name+(blocked?' bloqueada':' disponível'));
    tile.dataset.zspPatched='1';
  }
  function patchSlot(slot){
    if(slot.dataset.zspPatched==='1')return;
    const label=slot.querySelector('.tiny');
    const glyph=slot.querySelector('.glyph');
    const meta=findMeta(label?.textContent);
    if(!meta||!glyph)return;
    glyph.className='glyph zsp-art';
    glyph.textContent='';
    glyph.style.setProperty('--zsp-x',meta.x);
    glyph.style.setProperty('--zsp-y',meta.y);
    label.textContent=meta.name;
    slot.querySelector('button')?.setAttribute('aria-label','Enviar '+meta.name+' ao Relay');
    slot.dataset.zspPatched='1';
  }
  function patchRelay(button){
    if(button.dataset.zspPatched==='1'||!button.classList.contains('filled'))return;
    const meta=findMeta(button.textContent);
    if(!meta)return;
    button.innerHTML=`<span class="zsp-relay-piece">${art(meta)}<small>${meta.name}</small></span>`;
    button.setAttribute('aria-label','Retirar '+meta.name+' do Relay');
    button.dataset.zspPatched='1';
  }
  function patch(){
    queued=false;
    document.querySelectorAll('#board .tile').forEach(patchTile);
    document.querySelectorAll('#tray .slot.filled').forEach(patchSlot);
    document.querySelectorAll('#relaySlots .relay-slot').forEach(patchRelay);
  }
  function queuePatch(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(patch);
  }

  const observer=new MutationObserver(queuePatch);
  const start=()=>{
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    patch();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
