(()=>{
  if(window.__ZUNOPLAY_CURRENT_HOME__)return;
  window.__ZUNOPLAY_CURRENT_HOME__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;

  const svg=(body,color='currentColor')=>`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" style="color:${color}">${body}</svg>`;
  const icons={
    chat:svg('<path d="M13 15h38a7 7 0 0 1 7 7v19a7 7 0 0 1-7 7H30L18 56v-8h-5a7 7 0 0 1-7-7V22a7 7 0 0 1 7-7Z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="23" cy="32" r="3" fill="currentColor"/><circle cx="32" cy="32" r="3" fill="currentColor"/><circle cx="41" cy="32" r="3" fill="currentColor"/>','#8e45ff'),
    voice:svg('<path d="M8 33h5m5-12v24m7-34v42m7-50v58m7-47v36m7-26v16m7-8h5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>','#20dcff'),
    users:svg('<circle cx="25" cy="23" r="10" fill="currentColor" opacity=".92"/><circle cx="43" cy="25" r="8" fill="currentColor" opacity=".72"/><path d="M8 51c1-12 8-18 18-18s17 6 18 18H8Zm28 0c.6-8 4.5-13 11-14 6 1 10 5 11 14H36Z" fill="currentColor"/>','#e052e6'),
    game:svg('<path d="M18 22h28c8 0 12 8 12 18s-4 17-10 17c-4 0-7-5-11-8H27c-4 3-7 8-11 8-6 0-10-7-10-17s4-18 12-18Z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M17 36h12M23 30v12M42 33h.1M49 40h.1" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>','#31bfff'),
    crown:svg('<path d="M8 22l10 9 8-18 9 17 11-16 7 17 9-9-6 28H14L8 22Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M16 51h40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>','#ffc33f'),
    history:svg('<path d="M13 25A22 22 0 1 1 11 40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M13 13v12H1M32 19v15l10 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>','#21d4d7'),
    home:svg('<path d="M10 30 32 11l22 19v23H39V38H25v15H10Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>'),
    social:svg('<circle cx="24" cy="23" r="9" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="43" cy="25" r="7" fill="none" stroke="currentColor" stroke-width="4"/><path d="M7 53c2-12 9-18 18-18s16 6 18 18M37 40c8 1 13 5 15 13" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
    rooms:svg('<path d="M20 32h5m5-13v27m8-38v48m8-34v20m8-10h4" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
    profile:svg('<circle cx="32" cy="22" r="10" fill="none" stroke="currentColor" stroke-width="4"/><path d="M13 54c2-14 9-21 19-21s17 7 19 21Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>')
  };

  const criticalStyleIds=[
    'zunoplay-current-base-style',
    'zunoplay-current-stage-style',
    'zunoplay-current-home-style',
    'zunoplay-current-home-mobile-style',
    'zunoplay-current-home-stats-style',
    'zunoplay-current-interactions-style'
  ];
  let friendMiniSync=null,readyStartedAt=0,readySent=false;

  function syncFriendMini(){
    try{friendMiniSync?.()}catch(error){console.warn('ZunoPlay current friend sync',error)}
  }
  function markCurrentHomeReady(){
    if(readySent)return;
    if(!readyStartedAt)readyStartedAt=performance.now();
    const stylesReady=criticalStyleIds.every(id=>{
      const link=document.getElementById(id);
      return !link||!!link.sheet;
    });
    if(!stylesReady&&performance.now()-readyStartedAt<1800){
      setTimeout(markCurrentHomeReady,24);
      return;
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(readySent)return;
      readySent=true;
      document.documentElement.dataset.zunoHomeCurrentReady='1';
      window.dispatchEvent(new CustomEvent('zuno:home-current-ready'));
    }));
  }

  function mountNavIcons(){
    const nav=document.getElementById('bottomNav');
    if(!nav)return;
    nav.querySelectorAll('.nav-item').forEach(btn=>{
      const label=(btn.textContent||'').trim().toLowerCase();
      const holder=btn.querySelector('b');
      if(!holder)return;
      if(label.includes('home'))holder.innerHTML=icons.home;
      else if(label.includes('social'))holder.innerHTML=icons.social;
      else if(label.includes('salas'))holder.innerHTML=icons.rooms;
      else if(label.includes('perfil'))holder.innerHTML=icons.profile;
    });
  }

  function mount(){
    if(!document.body)return;
    document.body.classList.add('zuno-official-v33');
    document.documentElement.dataset.zunoInterface='current';

    const topbar=document.querySelector('#homeScreen .topbar');
    topbar?.querySelector('.brand')?.classList.remove('z32-brand-hidden');
    topbar?.querySelector('.z32-user-head')?.setAttribute('aria-hidden','true');

    const notif=document.getElementById('notificationBadge');
    const notifButton=notif?.parentElement;
    if(notifButton&&!notifButton.dataset.z33Bell){
      notifButton.dataset.z33Bell='1';
      notifButton.innerHTML='<svg class="z33-bell" viewBox="0 0 32 32" aria-hidden="true"><path d="M9 13a7 7 0 0 1 14 0v5l3 4H6l3-4v-5Z"/><path d="M13 26h6"/></svg>';
      notifButton.appendChild(notif);
    }

    const hero=document.querySelector('#homeScreen .hero');
    const heroGrid=hero?.querySelector('.hero-grid');
    const side=heroGrid?.querySelector('.hero-side');
    if(hero&&side&&!document.querySelector('.z33-stat-row')){
      const row=document.createElement('div');
      row.className='z33-stat-row';
      hero.insertAdjacentElement('afterend',row);
      row.appendChild(side);
    }

    /* O Avatar Studio ja renderiza o mascote oficial dentro do avatar da Home. */
    hero?.querySelectorAll('.z33-mascot').forEach(el=>el.remove());

    const menu=document.querySelector('#homeScreen .menu-grid');
    if(menu){
      menu.querySelectorAll('.menu-card').forEach(card=>{
        const title=(card.querySelector('h2')?.textContent||'').toLowerCase();
        const icon=card.querySelector('.menu-icon');
        if(!icon)return;
        if(title.includes('conversa'))icon.innerHTML=icons.chat;
        else if(title.includes('salas'))icon.innerHTML=icons.voice;
        else if(title.includes('comun'))icon.innerHTML=icons.users;
        else if(title.includes('jogos'))icon.innerHTML=icons.game;
        else if(title.includes('desafio'))icon.innerHTML=icons.crown;
        else if(title.includes('hist'))icon.innerHTML=icons.history;
      });
    }

    mountNavIcons();
    document.getElementById('activeRooms')?.closest('.section')?.classList.add('zuno-home-secondary-section');

    const friends=document.getElementById('friendsStrip');
    const onlinePill=document.getElementById('onlineCount')?.closest('.stat-pill');
    if(friends&&onlinePill){
      let mini=onlinePill.querySelector('.z33-friend-mini');
      if(!mini){mini=document.createElement('div');mini.className='z33-friend-mini';onlinePill.appendChild(mini)}
      friendMiniSync=()=>{
        const candidates=[...friends.querySelectorAll('.friend:not(.invite)')].slice(0,3);
        mini.innerHTML=candidates.map(friend=>{
          const img=friend.querySelector('img');
          const name=(friend.querySelector('.friend-name')?.textContent||'Z').trim();
          if(img?.src)return `<span style="background-image:url('${img.src.replace(/'/g,'%27')}');background-size:cover;background-position:center" title="${name.replace(/"/g,'&quot;')}"></span>`;
          return `<span title="${name.replace(/"/g,'&quot;')}">${(name[0]||'Z').toUpperCase()}</span>`;
        }).join('');
      };
      syncFriendMini();
      setTimeout(syncFriendMini,250);
      setTimeout(syncFriendMini,900);
    }

    markCurrentHomeReady();
  }

  ['zuno:presence:sync','zuno:presence:join','zuno:presence:leave'].forEach(name=>window.addEventListener(name,()=>setTimeout(syncFriendMini,0)));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
