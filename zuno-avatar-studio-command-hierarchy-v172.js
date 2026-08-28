(()=>{
  if(window.__ZUNO_AVATAR_STUDIO_COMMAND_HIERARCHY_V172__)return;
  window.__ZUNO_AVATAR_STUDIO_COMMAND_HIERARCHY_V172__=1;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='avatar.html')return;

  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  const AVATAR_SUBCATS=new Set(['Base','Rosto','Cabelo','Roupas','Calçados']);
  const RAIL_CATS=new Set(['Base','Acessórios','Efeitos','Mascote']);

  function normalizeTab(tab){
    const raw=tab.dataset.studioCat||(tab.textContent||'').trim();
    if(!tab.dataset.studioCat)tab.dataset.studioCat=raw;
    const visible=RAIL_CATS.has(raw);
    tab.dataset.studioRailVisible=visible?'1':'0';
    if(visible)tab.style.removeProperty('display');
    else tab.style.setProperty('display','none','important');
  }

  function currentCat(){
    const title=(q('#panelTitle')?.textContent||'Base').trim();
    return title==='Tipo de corpo'?'Base':title;
  }

  function syncHierarchy(){
    const tabs=qa('#tabs .tab');
    tabs.forEach(normalizeTab);
    const cat=currentCat();
    const base=tabs.find(t=>t.dataset.studioCat==='Base');
    if(base)base.classList.toggle('on',AVATAR_SUBCATS.has(cat));
    qa('.studio-subtab').forEach(b=>b.classList.toggle('on',b.dataset.cat===cat));
    const rail=q('.studio-category-rail');
    if(rail)rail.setAttribute('aria-label','Categorias principais: Avatar, Acessórios, Auras e Mascotes');
    const sub=q('.studio-subtabs');
    if(sub)sub.setAttribute('aria-label','Partes do avatar: Corpo, Rosto, Cabelo, Roupas e Calçados');
  }

  function installLabels(){
    const map={Base:'Avatar',Acessórios:'Acessórios',Efeitos:'Auras',Mascote:'Mascotes'};
    qa('#tabs .tab').forEach(tab=>{
      normalizeTab(tab);
      const raw=tab.dataset.studioCat;
      if(!RAIL_CATS.has(raw))return;
      const label=tab.querySelector('span:last-child');
      if(label&&map[raw])label.textContent=map[raw];
    });
  }

  function mount(){
    if(!q('#tabs')||!q('.studio-subtabs'))return void setTimeout(mount,60);
    installLabels();syncHierarchy();
    const observer=new MutationObserver(()=>{installLabels();syncHierarchy()});
    observer.observe(q('#tabs'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    const panel=q('#panelTitle');if(panel)new MutationObserver(syncHierarchy).observe(panel,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',e=>{
      if(e.target.closest('#tabs .tab,.studio-subtab'))setTimeout(syncHierarchy,0);
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();