(()=>{
  if(window.__ZUNOPLAY_HOME_V30__)return;
  window.__ZUNOPLAY_HOME_V30__=true;
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html')return;

  const svgData=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace(/\n+/g,' ').trim());

  const avatarSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 450">
    <defs>
      <radialGradient id="a" cx="50%" cy="70%"><stop stop-color="#a855f7" stop-opacity=".82"/><stop offset=".45" stop-color="#6d28d9" stop-opacity=".28"/><stop offset="1" stop-color="#090813" stop-opacity="0"/></radialGradient>
      <linearGradient id="h" x1="0" x2="1"><stop stop-color="#17131e"/><stop offset=".55" stop-color="#050508"/><stop offset="1" stop-color="#25133e"/></linearGradient>
      <linearGradient id="p" x1="0" x2="1"><stop stop-color="#f4c8b8"/><stop offset="1" stop-color="#e9aa9c"/></linearGradient>
      <linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#191620"/><stop offset="1" stop-color="#050509"/></linearGradient>
      <filter id="g"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <ellipse cx="190" cy="405" rx="130" ry="34" fill="url(#a)" filter="url(#g)"/>
    <ellipse cx="190" cy="400" rx="102" ry="22" fill="none" stroke="#9b4dff" stroke-width="4" opacity=".9"/>
    <g stroke="#4c2b70" stroke-width="3">
      <path d="M112 357c-15 26-19 48-10 66h64l8-67z" fill="#0c0b11"/>
      <path d="M206 356l8 67h64c9-18 5-40-10-66z" fill="#0c0b11"/>
      <path d="M95 418c9-13 27-20 67-16l12 22H96z" fill="#15101d" stroke="#7c3aed"/>
      <path d="M206 424l12-22c40-4 58 3 67 16l-1 6z" fill="#15101d" stroke="#7c3aed"/>
    </g>
    <path d="M114 225c16-36 46-54 76-54s60 18 76 54l13 127c-22 19-50 27-89 27s-67-8-89-27z" fill="url(#c)" stroke="#30253f" stroke-width="4"/>
    <path d="M123 236c-16 10-28 31-31 67l30 10 22-63z" fill="#0e0d14"/><path d="M257 236c16 10 28 31 31 67l-30 10-22-63z" fill="#0e0d14"/>
    <path d="M151 286h78l-6 59c-18 9-48 9-66 0z" fill="#111017" stroke="#292033" stroke-width="3"/>
    <path d="M167 250h46l-23 59z" fill="none" stroke="#b44cff" stroke-width="7" stroke-linejoin="round"/><path d="M169 251h43l-23 58" fill="none" stroke="#e879f9" stroke-width="2" opacity=".85"/>
    <circle cx="190" cy="138" r="72" fill="url(#p)" stroke="#32233b" stroke-width="4"/>
    <path d="M112 131c0-64 33-100 79-100 42 0 76 31 78 88-23-14-43-17-63-9-14 6-26 17-37 30-15-13-34-18-57-9z" fill="url(#h)" stroke="#22182e" stroke-width="5"/>
    <path d="M112 103l-20-18 28-2-9-25 27 13 8-30 21 23 18-34 15 34 31-29-1 36 35-18-15 36 31 5-25 24-20-7-18-43-62 4-31 39z" fill="url(#h)" stroke="#22182e" stroke-width="5" stroke-linejoin="round"/>
    <path d="M132 113c22-30 78-45 116-10-28-5-53 2-74 24-12-12-26-17-42-14z" fill="#09090d"/>
    <ellipse cx="162" cy="145" rx="12" ry="15" fill="#f5efff"/><ellipse cx="218" cy="145" rx="12" ry="15" fill="#f5efff"/>
    <ellipse cx="163" cy="148" rx="7" ry="10" fill="#8b5cf6"/><ellipse cx="217" cy="148" rx="7" ry="10" fill="#8b5cf6"/>
    <circle cx="165" cy="145" r="3" fill="#fff"/><circle cx="219" cy="145" r="3" fill="#fff"/>
    <path d="M177 176q13 9 26 0" fill="none" stroke="#a15768" stroke-width="4" stroke-linecap="round"/>
    <path d="M134 207q56 25 112 0" fill="none" stroke="#2f2337" stroke-width="7" stroke-linecap="round" opacity=".7"/>
  </svg>`;
  const avatarSrc=svgData(avatarSvg);

  const icons=[
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#d989ff"/><stop offset="1" stop-color="#8b2dff"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="5"/></filter></defs><circle cx="80" cy="62" r="48" fill="#8b2dff" opacity=".22" filter="url(#f)"/><rect x="19" y="31" width="89" height="55" rx="14" fill="url(#g)"/><path d="M41 86l-4 22 25-22" fill="url(#g)"/><rect x="53" y="16" width="87" height="53" rx="14" fill="#aa4cff" opacity=".8"/><circle cx="52" cy="59" r="6" fill="#4a1978"/><circle cx="72" cy="59" r="6" fill="#4a1978"/><circle cx="92" cy="59" r="6" fill="#4a1978"/></svg>`,
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" y1="0" y2="1"><stop stop-color="#6ff7ff"/><stop offset="1" stop-color="#17bdf6"/></linearGradient><filter id="f"><feGaussianBlur stdDeviation="5"/></filter></defs><circle cx="80" cy="59" r="49" fill="#25d9ff" opacity=".2" filter="url(#f)"/><rect x="57" y="13" width="46" height="67" rx="23" fill="none" stroke="url(#g)" stroke-width="9"/><path d="M43 58v8c0 23 16 38 37 38s37-15 37-38v-8M80 103v16M58 119h44" fill="none" stroke="url(#g)" stroke-width="8" stroke-linecap="round"/></svg>`,
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#ff7be5"/><stop offset="1" stop-color="#d62bb6"/></linearGradient></defs><circle cx="80" cy="35" r="18" fill="url(#g)"/><circle cx="39" cy="47" r="13" fill="#ea4acb"/><circle cx="121" cy="47" r="13" fill="#ea4acb"/><path d="M48 101c1-30 12-46 32-46s31 16 32 46z" fill="url(#g)"/><path d="M13 101c1-23 10-36 26-36 9 0 16 4 21 11-8 7-13 16-15 25zM147 101c-1-23-10-36-26-36-9 0-16 4-21 11 8 7 13 16 15 25z" fill="#e746c8"/></svg>`,
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#6dd3ff"/><stop offset="1" stop-color="#4b7cff"/></linearGradient></defs><path d="M41 36c-18 3-30 20-34 52-2 18 8 25 20 12l17-18h72l17 18c12 13 22 6 20-12-4-32-16-49-34-52z" fill="url(#g)"/><path d="M45 50v25M32 62h26" stroke="#163a8a" stroke-width="7" stroke-linecap="round"/><circle cx="113" cy="57" r="6" fill="#173b8f"/><circle cx="130" cy="70" r="6" fill="#173b8f"/><circle cx="80" cy="70" r="6" fill="#d5efff"/></svg>`,
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" y1="0" y2="1"><stop stop-color="#ffe27a"/><stop offset="1" stop-color="#f29a21"/></linearGradient></defs><path d="M25 88l10-49 31 25 14-44 16 44 29-25 10 49z" fill="url(#g)" stroke="#ffd66b" stroke-width="4" stroke-linejoin="round"/><circle cx="34" cy="35" r="7" fill="#ffda68"/><circle cx="80" cy="14" r="7" fill="#ffda68"/><circle cx="126" cy="35" r="7" fill="#ffda68"/><rect x="31" y="92" width="98" height="10" rx="5" fill="#f5ad32"/></svg>`,
    `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#65fff1"/><stop offset="1" stop-color="#22c8ca"/></linearGradient></defs><circle cx="82" cy="61" r="41" fill="none" stroke="url(#g)" stroke-width="9" stroke-dasharray="206 55" transform="rotate(-48 82 61)"/><path d="M35 29L16 31l8 18" fill="none" stroke="#55efe5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M82 36v28l-20 14" fill="none" stroke="#56eee6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  ];

  const roomSvgs=[
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#260a50"/><stop offset="1" stop-color="#080914"/></linearGradient><radialGradient id="n"><stop stop-color="#a855f7" stop-opacity=".7"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient></defs><rect width="500" height="280" fill="url(#b)"/><circle cx="390" cy="55" r="90" fill="url(#n)"/><path d="M0 185h500v95H0z" fill="#090812"/><path d="M28 191h133v58H28zM335 187h136v62H335z" fill="#17112a" stroke="#6d28d9"/><rect x="173" y="139" width="153" height="107" rx="14" fill="#130f20" stroke="#7c3aed"/><path d="M221 170h58l-43 43h48" fill="none" stroke="#b34cff" stroke-width="9"/><ellipse cx="250" cy="255" rx="170" ry="23" fill="#7c3aed" opacity=".24"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280"><defs><linearGradient id="b" y2="1"><stop stop-color="#08102b"/><stop offset="1" stop-color="#050713"/></linearGradient><radialGradient id="m"><stop stop-color="#6049cb"/><stop offset=".6" stop-color="#20245e"/><stop offset="1" stop-color="#0a0c20"/></radialGradient></defs><rect width="500" height="280" fill="url(#b)"/><circle cx="362" cy="75" r="78" fill="url(#m)"/><circle cx="79" cy="43" r="2" fill="#fff"/><circle cx="130" cy="73" r="2" fill="#a5b4fc"/><circle cx="245" cy="34" r="2" fill="#fff"/><path d="M0 184l70-35 61 25 60-45 87 42 65-31 157 59v81H0z" fill="#0b1025"/><path d="M22 231h151v34H22zM310 223h159v42H310z" fill="#11182f" stroke="#3548a6"/><ellipse cx="250" cy="255" rx="220" ry="22" fill="#3143b8" opacity=".2"/></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280"><defs><linearGradient id="sky" y2="1"><stop stop-color="#37214c"/><stop offset=".5" stop-color="#b26a73"/><stop offset="1" stop-color="#15203a"/></linearGradient></defs><rect width="500" height="280" fill="url(#sky)"/><circle cx="91" cy="66" r="46" fill="#ffd6a3" opacity=".72"/><path d="M0 215l69-42 55 24 61-70 44 47 51-89 54 78 48-45 52 69 66-24v117H0z" fill="#0c1221"/><path d="M319 80h19v102h-19zM302 112h55v16h-55zM326 43l21 44h-42zM379 113h15v73h-15zM365 137h42v13h-42z" fill="#111226"/><path d="M0 235c105-25 207-20 291 2 84 22 143 16 209-10v53H0z" fill="#09101b"/></svg>`
  ];

  function injectStyle(){
    if(document.getElementById('zuno-home-v30-art-style'))return;
    const style=document.createElement('style');
    style.id='zuno-home-v30-art-style';
    style.textContent=`
      body.zuno-home-official .menu-icon{filter:none!important;display:grid!important;place-items:center!important}
      body.zuno-home-official .menu-icon svg{width:112px;height:86px;max-width:100%;max-height:100%;filter:drop-shadow(0 0 15px currentColor)}
      body.zuno-home-official .profile-avatar.zuno-official-fallback{width:235px!important;height:315px!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;object-fit:contain!important}
      body.zuno-home-official .aura-emblem{overflow:visible!important}
      body.zuno-home-official .aura-flame svg{width:60px;height:60px;display:block}
      body.zuno-home-official .room-card{isolation:isolate!important;background:#090816!important}
      body.zuno-home-official .zuno-room-art{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;pointer-events:none}
      body.zuno-home-official .room-card:before{z-index:-1!important;opacity:.35!important}
      @media(max-width:760px){body.zuno-home-official .menu-icon svg{width:90px;height:68px}body.zuno-home-official .profile-avatar.zuno-official-fallback{width:185px!important;height:245px!important}}
      @media(max-width:430px){body.zuno-home-official .menu-icon svg{width:78px;height:60px}}
    `;
    document.head.appendChild(style);
  }

  function decorateMenu(){
    document.querySelectorAll('.menu-card .menu-icon').forEach((el,i)=>{
      if(el.dataset.zunoArt==='1'||!icons[i])return;
      el.dataset.zunoArt='1';
      el.innerHTML=icons[i];
    });
    const challenge=document.getElementById('challengeBadge');
    if(challenge)challenge.setAttribute('aria-label','Desafio em destaque');
  }

  function decorateAura(){
    const flame=document.querySelector('.aura-flame');
    if(!flame||flame.dataset.zunoArt==='1')return;
    flame.dataset.zunoArt='1';
    flame.innerHTML=`<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" y1="0" y2="1"><stop stop-color="#f0d5ff"/><stop offset=".45" stop-color="#c257ff"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><path d="M40 5C30 21 13 28 16 49c3 18 14 27 24 27s23-9 25-27C67 32 55 22 48 13c1 11-3 17-8 21 1-10-4-18 0-29z" fill="url(#g)"/><path d="M40 32c-8 10-12 17-9 27 2 7 6 11 9 11 5 0 10-5 11-13 1-8-5-14-11-25z" fill="#f5e8ff" opacity=".8"/></svg>`;
  }

  function decorateAvatar(){
    const wrap=document.getElementById('profileAvatarWrap');
    if(!wrap)return;
    const fallback=wrap.querySelector('.profile-fallback');
    if(fallback){
      const img=document.createElement('img');
      img.className='profile-avatar zuno-official-fallback';
      img.alt='Avatar oficial Zuno';
      img.src=avatarSrc;
      fallback.replaceWith(img);
    }
    const mini=document.getElementById('profileButton');
    if(mini&&!mini.querySelector('img')&&(mini.textContent||'').trim()){
      const img=document.createElement('img');
      img.src=avatarSrc;img.alt='Perfil';mini.replaceChildren(img);
    }
  }

  function decorateRooms(){
    const box=document.getElementById('activeRooms');
    if(!box)return;
    box.querySelectorAll('.room-card').forEach((card,i)=>{
      if(card.dataset.zunoArt==='1')return;
      card.dataset.zunoArt='1';
      const img=document.createElement('img');
      img.className='zuno-room-art';
      img.alt='';
      img.src=svgData(roomSvgs[i%roomSvgs.length]);
      card.prepend(img);
    });
  }

  function applyStatic(){
    document.body?.classList.add('zuno-home-official');
    injectStyle();
    decorateMenu();
    decorateAura();
    decorateAvatar();
    decorateRooms();
  }

  function observeDynamic(){
    const avatar=document.getElementById('profileAvatarWrap');
    if(avatar){
      new MutationObserver(()=>decorateAvatar()).observe(avatar,{childList:true,subtree:false});
    }
    const rooms=document.getElementById('activeRooms');
    if(rooms){
      new MutationObserver(()=>decorateRooms()).observe(rooms,{childList:true,subtree:false});
    }
    const profile=document.getElementById('profileButton');
    if(profile){
      new MutationObserver(()=>decorateAvatar()).observe(profile,{childList:true,subtree:false});
    }
  }

  function boot(){applyStatic();observeDynamic();setTimeout(applyStatic,250);setTimeout(applyStatic,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();