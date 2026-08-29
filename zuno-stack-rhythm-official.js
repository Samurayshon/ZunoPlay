(()=>{
if(window.__ZUNO_STACK_RHYTHM_OFFICIAL__)return;window.__ZUNO_STACK_RHYTHM_OFFICIAL__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const R={phase:'',lastEvent:'',lastEventAt:0,started:false,lastSig:''};
const PHASES=[
 {id:'opening',label:'ABERTURA',min:241,msg:'LEIA O TABULEIRO'},
 {id:'development',label:'DESENVOLVIMENTO',min:166,msg:'MONTE SEU RITMO'},
 {id:'pressure',label:'PRESSÃO',min:91,msg:'CUIDADO COM A BANDEJA'},
 {id:'climax',label:'CLÍMAX',min:0,msg:'AGORA É DECISÃO'}
];
function seconds(){const t=($('#zsoTime')?.textContent||'').trim();const m=t.match(/^(\d+):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):300}
function tray(){return $$('#tray .slot.filled').length}
function pressure(){return ($('#zsoPressure b')?.textContent||'BAIXA').trim().toUpperCase()}
function phaseFor(sec){return PHASES.find(p=>sec>=p.min)||PHASES[PHASES.length-1]}
function mount(){if($('#zsrRhythm'))return;const shell=$('.shell');if(!shell)return;const el=document.createElement('div');el.id='zsrRhythm';el.className='zsr-rhythm';el.setAttribute('aria-hidden','true');el.innerHTML='<span class="zsr-phase-dot"></span><div><small>RITMO</small><b id="zsrPhase">ABERTURA</b></div><i id="zsrPhaseLine"></i>';shell.appendChild(el)}
function banner(title,sub,type='neutral'){const old=$('.zsr-banner');old?.remove();const b=document.createElement('div');b.className='zsr-banner '+type;b.innerHTML=`<small>RITMO DA PARTIDA</small><b>${title}</b><span>${sub}</span>`;document.body.appendChild(b);requestAnimationFrame(()=>b.classList.add('show'));setTimeout(()=>b.classList.remove('show'),1200);setTimeout(()=>b.remove(),1500);try{navigator.vibrate?.(type==='critical'?[16,28,22]:12)}catch(_){}}
function setPhase(p){if(R.phase===p.id)return;R.phase=p.id;document.body.dataset.zsrPhase=p.id;const label=$('#zsrPhase');if(label)label.textContent=p.label;const line=$('#zsrPhaseLine');if(line)line.style.setProperty('--zsr-progress',({opening:18,development:44,pressure:72,climax:100}[p.id]||0)+'%');banner(p.label,p.msg,p.id==='climax'?'critical':p.id==='pressure'?'warning':'neutral')}
function eventKey(sec,t,p){if(p==='climax'&&sec<=60)return 'final-minute';if(t>=6)return 'tray-danger';if(p==='pressure'&&pressure()==='CRÍTICA')return 'critical-wave';if(p==='development'&&t<=2)return 'clean-flow';return ''}
function fireEvent(key){const now=Date.now();if(!key||key===R.lastEvent&&now-R.lastEventAt<18000)return;R.lastEvent=key;R.lastEventAt=now;document.body.dataset.zsrEvent=key;const map={'final-minute':['ÚLTIMO MINUTO','Cada escolha pesa agora','critical'],'tray-danger':['BANDEJA NO LIMITE','Priorize trios antes de empilhar mais','warning'],'critical-wave':['ONDA CRÍTICA','A arena entrou em máxima tensão','critical'],'clean-flow':['FLUXO LIMPO','Espaço de sobra — acelere o combo','positive']};const m=map[key];if(m)banner(m[0],m[1],m[2]);clearTimeout(fireEvent._t);fireEvent._t=setTimeout(()=>{if(document.body.dataset.zsrEvent===key)delete document.body.dataset.zsrEvent},4200)}
function sync(force=false){mount();const playing=document.body.classList.contains('zstack-playing');if(!playing){R.started=false;R.phase='';R.lastSig='';delete document.body.dataset.zsrPhase;delete document.body.dataset.zsrEvent;return}if(document.hidden)return;const sec=seconds(),t=tray(),pr=pressure(),p=phaseFor(sec),sig=`${p.id}|${Math.floor(sec/5)}|${t}|${pr}`;if(!force&&sig===R.lastSig)return;R.lastSig=sig;if(!R.started){R.started=true;R.lastEvent='';R.lastEventAt=0}setPhase(p);fireEvent(eventKey(sec,t,p.id));const root=$('#zsrRhythm');if(root){root.dataset.phase=p.id;root.dataset.pressure=pr.toLowerCase()}}
function boot(){mount();setInterval(sync,1200);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(true)});document.addEventListener('zuno-stack-state',()=>sync(true));sync(true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();