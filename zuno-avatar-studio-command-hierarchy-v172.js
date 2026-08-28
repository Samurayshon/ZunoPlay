(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_COMMAND_HIERARCHY_V173__)return;
  window.__ZUNO_AVATAR_STUDIO_COMMAND_HIERARCHY_V173__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  const AVATAR_SUBCATS=new Set(['Base','Rosto','Cabelo','Roupas','Calçados']);
  const RAIL_CATS=new Set(['Base','Acessórios','Efeitos','Mascote']);
  const LABELS={Base:'Avatar',Acessórios:'Acessórios',Efeitos:'Auras',Mascote:'Mascotes'};

  function cleanText(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }

  function inferCategory(tab){
    const stored=tab.dataset.studioCat;
    if(['Base','Rosto','Cabelo','Roupas','Calçados','Acessórios','Efeitos','Mascote'].includes(stored))return stored;
    const text=cleanText(tab.textContent);
    let cat='';
    if(text.includes('acessor'))cat='Acessórios';
    else if(text.includes('mascote'))cat='Mascote';
    else if(text.includes('aura')||text.includes('efeito'))cat='Efeitos';
    else if(text.includes('calcado'))cat='Calçados';
    else if(text.includes('roupa'))cat='Roupas';
    else if(text.includes('cabelo'))cat='Cabelo';
    else if(text.includes('rosto'))cat='Rosto';
    else if(text.includes('avatar')||text.includes('base')||text.includes('corpo'))cat='Base';
    if(cat)tab.dataset.studioCat=cat;
    return cat;
  }

  function normalizeTab(tab){
    const cat=inferCategory(tab);
    const visible=RAIL_CATS.has(cat);
    tab.dataset.studioRailVisible=visible?'1':'0';
    if(visible){
      tab.style.removeProperty('display');
      tab.removeAttribute('aria-hidden');
      const label=tab.querySelector('span:last-child');
      if(label&&LABELS[cat])label.textContent=LABELS[cat];
    }else{
      tab.style.setProperty('display','none','important');
      tab.setAttribute('aria-hidden','true');
    }
    return cat;
  }

  function currentCat(){
    const title=cleanText(q('#panelTitle')?.textContent||'base');
    if(title.includes('tipo de corpo')||title==='base'||title==='corpo')return 'Base';
    if(title.includes('acessor'))return 'Acessórios';
    if(title.includes('mascote'))return 'Mascote';
    if(title.includes('aura')||title.includes('efeito'))return 'Efeitos';
    if(title.includes('calcado'))return 'Calçados';
    if(title.includes('roupa'))return 'Roupas';
    if(title.includes('cabelo'))return 'Cabelo';
    if(title.includes('rosto'))return 'Rosto';
    return 'Base';
  }

  function syncPreviewLabel(){
    const title=q('.studio-preview-card.back strong');
    if(title&&title.textContent!=='Vista traseira')title.textContent='Vista traseira';
    const img=q('#studioPreviewBack');
    if(img)img.alt='Vista traseira do avatar';
  }

  function syncHierarchy(){
    const tabs=qa('#tabs .tab');
    tabs.forEach(normalizeTab);
    const cat=currentCat();
    tabs.forEach(tab=>{
      const tabCat=inferCategory(tab);
      if(!RAIL_CATS.has(tabCat))return;
      const shouldBeOn=AVATAR_SUBCATS.has(cat)?tabCat==='Base':tabCat===cat;
      tab.classList.toggle('on',shouldBeOn);
    });
    qa('.studio-subtab').forEach(b=>b.classList.toggle('on',b.dataset.cat===cat));
    const rail=q('.studio-category-rail');
    if(rail){
      rail.style.removeProperty('display');
      rail.style.removeProperty('visibility');
      rail.setAttribute('aria-label','Categorias principais: Avatar, Acessórios, Auras e Mascotes');
    }
    const sub=q('.studio-subtabs');
    if(sub)sub.setAttribute('aria-label','Partes do avatar: Corpo, Rosto, Cabelo, Roupas e Calçados');
    syncPreviewLabel();
  }

  function mount(){
    if(!q('#tabs')||!q('.studio-subtabs'))return void setTimeout(mount,60);
    syncHierarchy();
    const tabs=q('#tabs');
    const observer=new MutationObserver(()=>requestAnimationFrame(syncHierarchy));
    observer.observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-studio-cat']});
    const panel=q('#panelTitle');
    if(panel)new MutationObserver(()=>requestAnimationFrame(syncHierarchy)).observe(panel,{childList:true,subtree:true,characterData:true});
    const backTitle=q('.studio-preview-card.back strong');
    if(backTitle)new MutationObserver(syncPreviewLabel).observe(backTitle,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',e=>{
      if(e.target.closest('#tabs .tab,.studio-subtab'))setTimeout(syncHierarchy,0);
    },true);
    [80,220,500,1000,1800,3000].forEach(ms=>setTimeout(syncHierarchy,ms));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();