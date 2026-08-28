(()=>{
  if(window.__ZUNO_STACK__)return;
  window.__ZUNO_STACK__=true;

  const $=id=>document.getElementById(id);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=new URLSearchParams(location.search);
  const roomId=q.get('room')||sessionStorage.getItem('zunoplay_room_id')||'';
  const fromRoom=q.get('from')==='sala'&&!!roomId;
  const TRAY_LIMIT=6;
  const RISK_AT=5;

  const TYPES=[
    {id:'bolt',label:'Bolt',x:'60%',y:'0%'},
    {id:'gem',label:'Core',x:'20%',y:'0%'},
    {id:'star',label:'Nova',x:'40%',y:'0%'},
    {id:'moon',label:'Prism',x:'100%',y:'0%'},
    {id:'orb',label:'Orb',x:'80%',y:'0%'},
    {id:'leaf',label:'Echo',x:'0%',y:'100%'}
  ];
  const typeById=Object.fromEntries(TYPES.map(x=>[x.id,x]));

  let sb=null,user=null,playerName='Você';
  let tiles=[],tray=[],relay=[null,null,null],team=[];
  let score=0,matches=0,energy=0,active=false,lastMove=null;
  let undoLeft=1,hintsLeft=2,botTimer=0,pulseEventCount=0,doubleNext=false,startedAt=0;
  let riskAnnounced=false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const shuffle=a=>{
    const x=[...a];
    for(let i=x.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [x[i],x[j]]=[x[j],x[i]];
    }
    return x;
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function injectTrayRiskStyles(){
    if(document.getElementById('zunoStackTrayRiskStyles'))return;
    const style=document.createElement('style');
    style.id='zunoStackTrayRiskStyles';
    style.textContent=`
      .tray{grid-template-columns:repeat(6,1fr)!important;transition:filter .18s,transform .18s}
      .tray.tray-risk{animation:zunoTrayRiskPulse .85s ease-in-out infinite alternate;filter:drop-shadow(0 0 9px rgba(255,86,112,.42))}
      .tray.tray-risk .slot{border-color:rgba(255,96,121,.62);background:linear-gradient(180deg,rgba(59,15,28,.92),rgba(24,12,21,.96))}
      .tray.tray-critical{animation:zunoTrayCriticalPulse .4s ease-in-out infinite alternate;filter:drop-shadow(0 0 13px rgba(255,64,94,.65))}
      .tray.tray-critical .slot{border-color:#ff405e;background:#35101b}
      .tray-risk-copy{color:#ff7182!important;font-weight:950!important;text-shadow:0 0 10px rgba(255,80,105,.35)}
      @keyframes zunoTrayRiskPulse{from{transform:scale(1);opacity:.92}to{transform:scale(1.008);opacity:1}}
      @keyframes zunoTrayCriticalPulse{from{transform:scale(1)}to{transform:scale(1.012)}}
      @media(prefers-reduced-motion:reduce){.tray.tray-risk,.tray.tray-critical{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function syncStaticTrayCopy(){
    const head=document.querySelector('.tray-area .area-head b');
    if(head)head.textContent='Bandeja · máximo 6';
    const help=document.querySelector('.help');
    if(help)help.textContent='Peças bloqueadas ficam mais escuras. Forme 3 iguais. Com 5 peças a bandeja entra em RISCO; se chegar a 6 sem formar trio, a rodada termina. Um único membro da equipe limpando o tabuleiro garante a vitória.';
    const features=$('features');
    if(features){
      const items=features.querySelectorAll('.feature');
      if(items[1])items[1].textContent='6️⃣ bandeja de 6 espaços';
    }
  }

  function announce(t){$('live').textContent=t}
  function toast(t){
    const el=$('toast');
    el.textContent=t;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.classList.remove('show'),1800);
  }
  function clearTimers(){
    if(botTimer){clearInterval(botTimer);botTimer=0;}
  }

  function art(meta){
    return `<span class="zsp-art" style="--zsp-x:${meta.x};--zsp-y:${meta.y}" aria-hidden="true"></span>`;
  }

  function buildTiles(){
    const ids=shuffle(TYPES.flatMap(t=>Array(9).fill(t.id)));
    const positions=[];
    for(let y=0;y<6;y++)for(let x=0;x<6;x++)positions.push({x,y,layer:0});
    for(let y=1;y<=3;y++)for(let x=1;x<=4;x++)positions.push({x,y,layer:1});
    for(let y=2;y<=3;y++)for(let x=1;x<=3;x++)positions.push({x,y,layer:2});
    tiles=positions.map((p,i)=>({id:'t'+i,type:ids[i],...p,removed:false}));
  }

  function isActiveTile(t){
    if(t.removed)return false;
    return !tiles.some(o=>!o.removed&&o.x===t.x&&o.y===t.y&&o.layer>t.layer);
  }

  function mountBoard(){
    const board=$('board');
    board.innerHTML=tiles.map(t=>{
      const meta=typeById[t.type];
      return `<button class="tile" data-tile="${t.id}" style="--x:${t.x};--y:${t.y};--layer:${t.layer}" aria-label="${meta.label}"><span class="piece-shell">${art(meta)}<span class="label">${meta.label}</span></span></button>`;
    }).join('');
    board.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>pickTile(b.dataset.tile));
    board.dataset.zunoMounted='1';
  }

  function syncBoard(){
    const board=$('board');
    if(board.dataset.zunoMounted!=='1'||board.children.length!==tiles.length)mountBoard();
    for(const t of tiles){
      const button=board.querySelector(`[data-tile="${t.id}"]`);
      if(!button)continue;
      const available=isActiveTile(t);
      button.classList.toggle('active',available);
      button.classList.toggle('removed',t.removed);
      button.disabled=t.removed||!available;
      button.setAttribute('aria-label',`${typeById[t.type].label}${available?' disponível':' bloqueada'}`);
    }
  }

  function renderTray(){
    const box=$('tray');
    const risk=tray.length>=RISK_AT;
    const critical=tray.length>=TRAY_LIMIT;
    box.classList.toggle('tray-risk',risk&&!critical);
    box.classList.toggle('tray-critical',critical);
    box.setAttribute('aria-label',risk?`Bandeja em risco: ${tray.length} de ${TRAY_LIMIT} espaços ocupados`:`Bandeja: ${tray.length} de ${TRAY_LIMIT} espaços ocupados`);

    const head=document.querySelector('.tray-area .area-head b');
    if(head){
      head.textContent=risk?`⚠ RISCO · ${tray.length}/${TRAY_LIMIT}`:'Bandeja · máximo 6';
      head.classList.toggle('tray-risk-copy',risk);
    }

    box.innerHTML=Array.from({length:TRAY_LIMIT},(_,i)=>{
      const type=tray[i];
      const danger=risk&&i>=tray.length;
      if(!type)return `<div class="slot ${danger?'danger':''}"></div>`;
      const meta=typeById[type];
      return `<div class="slot filled ${risk?'danger':''}"><button data-tray="${i}" aria-label="Enviar ${meta.label} ao Relay"><span class="piece-shell">${art(meta)}<span class="tiny">${meta.label}</span></span></button></div>`;
    }).join('');
    box.querySelectorAll('[data-tray]').forEach(b=>b.onclick=()=>sendToRelay(Number(b.dataset.tray)));

    if(risk&&!riskAnnounced){
      riskAnnounced=true;
      toast(`⚠ RISCO: ${tray.length}/${TRAY_LIMIT} espaços ocupados.`);
      announce(`Atenção. Bandeja em risco com ${tray.length} de ${TRAY_LIMIT} espaços ocupados.`);
    }else if(!risk){
      riskAnnounced=false;
    }
  }

  function renderRelay(){
    const box=$('relaySlots');
    box.innerHTML=relay.map((type,i)=>{
      if(!type)return `<button class="relay-slot" data-relay="${i}" disabled>VAZIO</button>`;
      const meta=typeById[type];
      return `<button class="relay-slot filled" data-relay="${i}" aria-label="Retirar ${meta.label} do Relay"><span class="zsp-relay-piece">${art(meta)}<small>${meta.label}</small></span></button>`;
    }).join('');
    box.querySelectorAll('[data-relay]').forEach(b=>b.onclick=()=>takeRelay(Number(b.dataset.relay)));
  }

  function renderTeam(){
    const box=$('team');
    box.innerHTML=team.map((p,i)=>`<div class="mate ${i===0?'me':''}"><div class="mate-head"><div class="mate-icon">${i===0?'⚡':i===1?'🌙':'🔥'}</div><div class="mate-copy"><b>${esc(p.name)}</b><small>${i===0?'seu tabuleiro':p.status}</small></div></div><div class="mini-bar"><i style="width:${clamp(p.progress,0,100)}%"></i></div></div>`).join('');
  }

  function tilesLeft(){return tiles.reduce((n,t)=>n+(t.removed?0:1),0)}

  function renderHud(){
    const left=tilesLeft();
    $('score').textContent=Math.round(score);
    $('matches').textContent=matches;
    $('tilesLeft').textContent=left;
    $('energyText').textContent=energy+'/5';
    $('energy').style.width=(energy/5*100)+'%';
    $('pulse').disabled=energy<5||!active;
    $('undo').disabled=!active||undoLeft<=0||!lastMove;
    $('undo').textContent='↩ DESFAZER · '+undoLeft;
    $('hint').disabled=!active||hintsLeft<=0;
    $('hint').textContent='✦ DICA · '+hintsLeft;
    $('missionMeter').textContent=energy+'/5';
    if(team[0])team[0].progress=Math.round((54-left)/54*100);
    renderTeam();
  }

  function renderAll(){syncBoard();renderTray();renderRelay();renderHud();}

  function trayHasMatch(){
    const counts={};
    for(const t of tray){counts[t]=(counts[t]||0)+1;if(counts[t]>=3)return true;}
    return false;
  }

  function checkMatch(type){
    const idx=[];
    tray.forEach((t,i)=>{if(t===type)idx.push(i)});
    if(idx.length<3)return false;
    for(let i=idx.length-1;i>=idx.length-3;i--)tray.splice(idx[i],1);
    matches++;
    const gained=doubleNext?620:310;
    doubleNext=false;
    score+=gained;
    energy=clamp(energy+1,0,5);
    toast('Trio '+typeById[type].label+'! +'+gained);
    announce('Trio formado: '+typeById[type].label);
    if(matches%4===0)triggerPulseEvent();
    return true;
  }

  function pickTile(id){
    if(!active)return;
    const t=tiles.find(x=>x.id===id);
    if(!t||!isActiveTile(t))return;
    if(tray.length>=TRAY_LIMIT){lose('Bandeja cheia.');return;}
    t.removed=true;
    tray.push(t.type);
    lastMove={tileId:t.id,type:t.type};
    score+=25;
    checkMatch(t.type);
    renderAll();
    if(tilesLeft()===0){win('Você limpou o tabuleiro inteiro!');return;}
    if(tray.length>=TRAY_LIMIT&&!trayHasMatch())lose('A bandeja chegou a 6 peças sem um trio.');
  }

  function firstRelayEmpty(){return relay.findIndex(x=>!x)}

  function sendToRelay(index){
    if(!active||index<0||index>=tray.length)return;
    const slot=firstRelayEmpty();
    if(slot<0){toast('O Relay está cheio.');return;}
    const [type]=tray.splice(index,1);
    relay[slot]=type;
    score+=20;
    lastMove=null;
    toast(typeById[type].label+' enviado ao Relay.');
    renderAll();
  }

  function takeRelay(index){
    if(!active||!relay[index])return;
    if(tray.length>=TRAY_LIMIT){toast('Libere espaço na bandeja primeiro.');return;}
    const type=relay[index];
    relay[index]=null;
    tray.push(type);
    checkMatch(type);
    score+=10;
    lastMove=null;
    renderAll();
    if(tray.length>=TRAY_LIMIT&&!trayHasMatch())lose('A bandeja ficou cheia.');
  }

  function undo(){
    if(!active||undoLeft<=0||!lastMove)return;
    const pos=tray.lastIndexOf(lastMove.type);
    const tile=tiles.find(t=>t.id===lastMove.tileId);
    if(pos<0||!tile){toast('Essa jogada já virou um trio.');lastMove=null;renderHud();return;}
    tray.splice(pos,1);
    tile.removed=false;
    undoLeft--;
    score=Math.max(0,score-25);
    lastMove=null;
    toast('Última jogada desfeita.');
    renderAll();
  }

  function hint(){
    if(!active||hintsLeft<=0)return;
    const counts={};
    tray.forEach(t=>counts[t]=(counts[t]||0)+1);
    const activeTiles=tiles.filter(isActiveTile);
    const target=activeTiles.find(t=>(counts[t.type]||0)>=2)||activeTiles.find(t=>(counts[t.type]||0)>=1)||activeTiles[0];
    if(!target){toast('Não há peças disponíveis.');return;}
    hintsLeft--;
    renderHud();
    document.querySelector(`[data-tile="${target.id}"]`)?.animate([{outline:'0 solid #ffd16600'},{outline:'3px solid #ffd166'},{outline:'0 solid #ffd16600'}],{duration:700,easing:'ease-out'});
    toast('Dica: procure '+typeById[target.type].label+'.');
  }

  function pulseShift(){
    if(!active||energy<5)return;
    energy=0;
    const counts={};
    tray.forEach(t=>counts[t]=(counts[t]||0)+1);
    const candidates=tray.map((t,i)=>({t,i,c:counts[t]})).sort((a,b)=>a.c-b.c).slice(0,2).sort((a,b)=>b.i-a.i);
    candidates.forEach(x=>tray.splice(x.i,1));
    score+=150;
    pulseEventCount++;
    $('pulseBanner').textContent='⚡ PULSE SHIFT: o Núcleo removeu '+candidates.length+' peças de risco da bandeja.';
    $('pulseBanner').classList.add('show');
    setTimeout(()=>$('pulseBanner').classList.remove('show'),1800);
    lastMove=null;
    renderAll();
    toast('Pulse Shift ativado!');
  }

  function triggerPulseEvent(){
    const options=['double','gift','boost'];
    const event=options[pulseEventCount%options.length];
    pulseEventCount++;
    const banner=$('pulseBanner');
    if(event==='double'){
      doubleNext=true;
      banner.textContent='⚡ EVENTO PULSE · SINCRONIA: o próximo trio vale pontuação dobrada.';
    }else if(event==='gift'){
      const counts={};
      tray.forEach(t=>counts[t]=(counts[t]||0)+1);
      const wanted=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||TYPES[Math.floor(Math.random()*TYPES.length)].id;
      const slot=firstRelayEmpty();
      if(slot>=0)relay[slot]=wanted;
      banner.textContent='✦ EVENTO PULSE · PRESENTE: uma peça útil chegou ao Relay.';
    }else{
      team.slice(1).forEach(p=>p.progress=clamp(p.progress+8,0,100));
      banner.textContent='🤝 EVENTO PULSE · EQUIPE: seus parceiros ganharam avanço extra.';
    }
    banner.classList.add('show');
    setTimeout(()=>banner.classList.remove('show'),1900);
    renderAll();
  }

  function botStep(){
    if(!active||document.hidden)return;
    team.slice(1).forEach((p,idx)=>{
      p.progress=clamp(p.progress+Math.floor(Math.random()*3)+1,0,100);
      p.status=Math.random()>.55?'formando trio':'organizando peças';
      if(Math.random()>.58){
        const relayIndex=relay.findIndex(Boolean);
        if(relayIndex>=0){relay[relayIndex]=null;p.progress=clamp(p.progress+5,0,100);score+=15;}
      }
      if(Math.random()>.78){
        const empty=firstRelayEmpty();
        if(empty>=0){
          const counts={};
          tray.forEach(t=>counts[t]=(counts[t]||0)+1);
          relay[empty]=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||TYPES[(idx+matches)%TYPES.length].id;
        }
      }
    });
    renderRelay();
    renderTeam();
    if(team.slice(1).some(p=>p.progress>=100))win('Um parceiro limpou o tabuleiro. Vitória da equipe!');
  }

  function startGame(){
    clearTimers();
    buildTiles();
    tray=[];
    relay=[null,null,null];
    score=0;matches=0;energy=0;lastMove=null;undoLeft=1;hintsLeft=2;pulseEventCount=0;doubleNext=false;riskAnnounced=false;
    startedAt=Date.now();
    team=[
      {name:playerName,progress:0,status:'jogando'},
      {name:'Nova',progress:0,status:'organizando peças'},
      {name:'Kiro',progress:0,status:'buscando trios'}
    ];
    active=true;
    const board=$('board');
    board.dataset.zunoMounted='0';
    board.replaceChildren();
    $('overlay').classList.add('hide');
    $('resultGrid').hidden=true;
    $('features').style.display='grid';
    $('saving').textContent='';
    renderAll();
    botTimer=setInterval(botStep,3600);
    announce('Zuno Stack iniciado. A bandeja possui 6 espaços e entra em risco ao ocupar 5.');
  }

  function finish(won,reason){
    if(!active)return;
    active=false;
    clearTimers();
    const left=tilesLeft();
    const cleared=54-left;
    const best=Number(localStorage.getItem('zunoplay_zuno_stack_best')||0);
    if(score>best)localStorage.setItem('zunoplay_zuno_stack_best',String(Math.round(score)));
    $('overlayIcon').textContent=won?'🏆🧩':'🌀🧩';
    $('overlayTitle').textContent=won?'Stack concluído!':'Stack encerrado';
    $('overlayText').textContent=reason;
    $('features').style.display='none';
    const grid=$('resultGrid');
    grid.hidden=false;
    grid.innerHTML=`<div class="result"><small>RESULTADO</small><b>${won?'VITÓRIA':'FIM'}</b></div><div class="result"><small>PONTOS</small><b>${Math.round(score)}</b></div><div class="result"><small>TRIOS</small><b>${matches}</b></div><div class="result"><small>PEÇAS</small><b>${cleared}/54</b></div><div class="result"><small>TEMPO</small><b>${Math.max(1,Math.round((Date.now()-startedAt)/1000))}s</b></div><div class="result"><small>RECORDE</small><b>${Math.max(best,Math.round(score))}</b></div>`;
    $('start').textContent='Jogar novamente';
    $('start').onclick=startGame;
    $('overlay').classList.remove('hide');
    saveResult(won,cleared).catch(console.warn);
  }

  function win(reason){finish(true,reason)}
  function lose(reason){finish(false,reason+' Use o Relay e os poderes para controlar melhor os 6 espaços na próxima.');}

  async function waitClient(){
    for(let i=0;i<50;i++){
      if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;
      await sleep(100);
    }
    return null;
  }

  async function saveResult(won,cleared){
    const box=$('saving');
    if(!sb||!user){box.textContent='Resultado local salvo. Entre na conta para registrar XP.';return;}
    box.textContent='Salvando resultado...';
    const {data,error}=await sb.rpc('submit_zuno_stack_result',{p_score:Math.round(score),p_matches:matches,p_tiles_cleared:cleared,p_won:won});
    if(error){console.warn('Zuno Stack save',error);box.textContent='Resultado local salvo; XP não pôde ser registrado.';return;}
    const r=data?.[0];
    box.textContent=r?.recorded?'✓ Resultado registrado · Nível de Jogos '+(r.game_level||1):'Resultado concluído.';
  }

  injectTrayRiskStyles();
  syncStaticTrayCopy();
  $('undo').onclick=undo;
  $('hint').onclick=hint;
  $('pulse').onclick=pulseShift;
  $('start').onclick=startGame;
  $('back').onclick=()=>location.href=fromRoom?'sala.html?room='+encodeURIComponent(roomId):'jogos.html';
  $('exit').onclick=$('back').onclick;
  if(roomId)$('room').textContent='● Sala ativa';

  (async()=>{
    sb=await waitClient();
    if(sb){
      const {data}=await sb.auth.getSession();
      user=data?.session?.user||null;
      if(user){
        const {data:p}=await sb.from('profiles').select('username').eq('id',user.id).maybeSingle();
        playerName=p?.username||user.email?.split('@')[0]||'Você';
      }
    }
    team=[{name:playerName,progress:0,status:'pronto'},{name:'Nova',progress:0,status:'pronto'},{name:'Kiro',progress:0,status:'pronto'}];
    renderTeam();renderTray();renderRelay();renderHud();
  })().catch(console.warn);

  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)renderHud();});
  window.addEventListener('pagehide',clearTimers);
})();