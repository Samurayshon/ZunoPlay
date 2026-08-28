(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_REFERENCE_V170__)return;
  window.__ZUNO_AVATAR_STUDIO_REFERENCE_V170__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s);
  let tries=0;

  function forceBodyMode(){
    try{
      if(typeof state!=='undefined'){
        state.mode='Corpo inteiro';
        state.zoom=1;
        if(typeof renderAll==='function')renderAll();
      }
    }catch(_){}
    const hero=q('#hero');
    hero?.classList.remove('profile','room');
  }

  function fixLabels(){
    const cards=[...document.querySelectorAll('.studio-preview-card')];
    const back=cards[2];
    const title=back?.querySelector('strong');
    if(title)title.textContent='Vista traseira';
    const img=back?.querySelector('img');
    if(img)img.alt='Vista traseira do avatar';
  }

  function keepHeaderVisible(){
    const header=q('.zuno-global-header');
    if(header){
      header.style.removeProperty('display');
      header.setAttribute('aria-label','ZunoPlay · Avatar Studio');
    }
  }

  function mount(){
    const editor=q('.studio-reference-editor'),hero=q('#hero'),preview=q('#avatarPreview');
    if(!editor||!hero||!preview){
      if(tries++<80)setTimeout(mount,75);
      return;
    }
    document.body.classList.add('zuno-studio-reference-v170');
    try{history.scrollRestoration='manual'}catch(_){}
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
    keepHeaderVisible();
    forceBodyMode();
    fixLabels();

    const modelSwitch=q('#modelSwitch');
    modelSwitch?.addEventListener('click',()=>setTimeout(()=>{forceBodyMode();fixLabels()},80));

    const tabs=q('#tabs');
    tabs?.addEventListener('click',()=>setTimeout(()=>{forceBodyMode();fixLabels()},60));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
