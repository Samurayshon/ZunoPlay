(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_REFERENCE_V169__)return;
  window.__ZUNO_AVATAR_STUDIO_REFERENCE_V169__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s);
  let tries=0;

  function syncPanelCategory(){
    const panel=q('.panel'),title=q('#panelTitle');
    if(!panel||!title)return;
    const raw=(title.textContent||'Base').trim();
    panel.dataset.studioCategory=raw==='Tipo de corpo'?'Base':raw;
  }

  function mount(){
    const editor=q('.studio-reference-editor'),hero=q('#hero'),pulse=q('#pulseLabel'),models=q('#modelSwitch');
    if(!editor||!hero||!pulse||!models){
      if(tries++<80)setTimeout(mount,75);
      return;
    }
    if(editor.dataset.referenceV169==='1')return;
    editor.dataset.referenceV169='1';
    document.body.classList.add('zuno-studio-reference-v169');

    let top=q('.studio-reference-topbar');
    if(!top){
      top=document.createElement('div');
      top.className='studio-reference-topbar';
      editor.appendChild(top);
    }
    pulse.innerHTML='<b>Zuno Pulse</b><span>Visualize seu avatar em movimento</span>';
    top.append(pulse,models);

    const mini=q('.studio-preview-card.mini .studio-preview-frame');
    if(mini&&!mini.querySelector('.studio-preview-online')){
      const dot=document.createElement('span');
      dot.className='studio-preview-online';
      dot.setAttribute('aria-label','Online');
      mini.appendChild(dot);
    }

    const female=q('.studio-female-official');
    if(female&&!female.querySelector('.studio-female-next')){
      const next=document.createElement('button');
      next.type='button';
      next.className='studio-female-next';
      next.setAttribute('aria-label','Selecionar avatar feminino oficial');
      next.textContent='›';
      next.onclick=()=>q('#modelSwitch [data-model="feminino"]')?.click();
      female.appendChild(next);
    }

    const title=q('.zuno-global-page-title');
    if(title)title.textContent='Avatar Studio';

    syncPanelCategory();
    const panelTitle=q('#panelTitle');
    if(panelTitle)new MutationObserver(syncPanelCategory).observe(panelTitle,{childList:true,characterData:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
