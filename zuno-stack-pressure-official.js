(()=>{
if(window.__ZUNO_STACK_PRESSURE_OFFICIAL__)return;window.__ZUNO_STACK_PRESSURE_OFFICIAL__=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let last='LOW',lastPct=-1,lastPulse=0,lastSig='',timer=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function num(sel,def=0){const n=parseInt($(sel)?.textContent||'',10);return Number.isFinite(n)?n:def}
function seconds(){const t=($('#zsoTime')?.textContent||'5:00').split(':').map(Number);return t.length===2&&t.every(Number.isFinite)?t[0]*60+t[1]:300}
function tray(){return $$('#tray .slot.filled').length}
function combo(){return num('#zsoCombo b',0)}
function removed(){const left=num('#tilesLeft',90);return clamp(90-left,0,90)}
function compute(sec,t,c,r){const trayP=t/7,progress=r/90,timeP=sec<=75?(75-sec)/75:0,comboP=clamp(c/6,0,1);return clamp(Math.max(trayP,progress*.64,timeP*.92,comboP*.52),0,1)}
function level(p){return p>=.86?'CRITICAL':p>=.64?'HIGH':p>=.38?'MEDIUM':'LOW'}
function label(l){return({LOW:'BAIXA',MEDIUM:'MÉDIA',HIGH:'ALTA',CRITICAL:'CRÍTICA'})[l]}
function ensureMeter(){const box=$('#zsoPressure');if(!box||box.querySelector('.zsr-meter'))return;const m=document.createElement('i');m.className='zsr-meter';m.innerHTML='<em></em>';box.appendChild(m)}
function announce(l){const now=Date.now();if(now-lastPulse<900)return;lastPulse=now;const evt=$('#zsoEvent');if(evt){const msg=l==='CRITICAL'?'⚠ PRESSÃO CRÍTICA':l==='HIGH'?'PRESSÃO ALTA':l==='MEDIUM'?'RITMO AUMENTANDO':'';if(msg){evt.textContent=msg;evt.classList.add('show');clearTimeout(evt._zsr);evt._zsr=setTimeout(()=>evt.classList.remove('show'),1150)}}try{if(l==='CRITICAL')navigator.vibrate?.([18,28,32]);else if(l==='HIGH')navigator.vibrate?.(14)}catch(_){}}
function sync(force=false){if(document.hidden||!document.body.classList.contains('zstack-playing'))return;ensureMeter();const sec=seconds(),t=tray(),c=combo(),r=removed(),sig=`${Math.floor(sec/2)}|${t}|${c}|${r}`;if(!force&&sig===lastSig)return;lastSig=sig;const p=compute(sec,t,c,r),l=level(p),pct=Math.round(p*100);document.body.dataset.zsrPressure=l.toLowerCase();document.body.style.setProperty('--zsr-pressure',String(p));const box=$('#zsoPressure');if(box){box.dataset.level=label(l);const b=box.querySelector('b');if(b&&b.textContent!==label(l))b.textContent=label(l);const em=box.querySelector('.zsr-meter em');if(em&&pct!==lastPct)em.style.width=pct+'%'}if(l!==last){announce(l);last=l}lastPct=pct;document.body.classList.toggle('zsr-climax',l==='CRITICAL');document.body.classList.toggle('zsr-rush',c>=4)}
function boot(){ensureMeter();timer=setInterval(sync,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync(true)});document.addEventListener('zuno-stack-state',()=>sync(true));sync(true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();