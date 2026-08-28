(()=>{
if(window.__ZUNO_STACK_OBJECTIVE__)return;window.__ZUNO_STACK_OBJECTIVE__=true;
const $=s=>document.querySelector(s),roomId=new URLSearchParams(location.search).get('room')||sessionStorage.getItem('zunoplay_room_id')||'';
const card=document.createElement('section');card.className='zstack-objective';card.innerHTML='<div class="zstack-objective-icon">◎</div><div class="zstack-objective-copy"><small>OBJETIVO DA EQUIPE</small><b id="zstackObjectiveTitle">Carregando objetivo...</b><div class="zstack-objective-bar"><i id="zstackObjectiveFill"></i></div><span id="zstackObjectiveHint">Progresso compartilhado entre os jogadores.</span></div><strong id="zstackObjectiveMeter">0/0</strong>';
const hud=$('.hud');hud?.insertAdjacentElement('afterend',card);
const title=$('#zstackObjectiveTitle'),fill=$('#zstackObjectiveFill'),hint=$('#zstackObjectiveHint'),meter=$('#zstackObjectiveMeter');
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const now=new Date(),slot=`${now.getUTCFullYear()}-${now.getUTCMonth()+1}-${now.getUTCDate()}-${now.getUTCHours()}`;
const defs=[
 {id:'trios',target:8,label:'Forme 8 trios em equipe',hint:'Cada trio concluído por qualquer jogador conta.',read:()=>Number($('#matches')?.textContent)||0},
 {id:'pecas',target:45,label:'Libere 45 peças em equipe',hint:'Toda peça removida do tabuleiro aumenta a meta.',read:()=>90-(Number($('#tilesLeft')?.textContent)||90)},
 {id:'pontos',target:6000,label:'Some 6.000 pontos em equipe',hint:'Pontuação de todos os jogadores entra no objetivo.',read:()=>Number($('#score')?.textContent)||0}
];
const objective=defs[hash(`${roomId||'solo'}:${slot}`)%defs.length];
title.textContent=objective.label;hint.textContent=roomId?objective.hint:'Objetivo individual desta rodada.';
let actor=`local-${Math.random().toString(36).slice(2)}`,channel=null,lastLocal=-1,done=false;const contributions=new Map();
function render(){const total=Math.min(objective.target,[...contributions.values()].reduce((a,b)=>a+Math.max(0,Number(b)||0),0));meter.textContent=`${Math.round(total)}/${objective.target}`;fill.style.width=`${Math.min(100,total/objective.target*100)}%`;const complete=total>=objective.target;card.classList.toggle('complete',complete);if(complete&&!done){done=true;hint.textContent=roomId?'Objetivo coletivo concluído! A equipe carregou o Núcleo.':'Objetivo concluído! Núcleo carregado.';card.dispatchEvent(new CustomEvent('zuno-stack-objective-complete',{bubbles:true,detail:{objective:objective.id,total}}))}else if(!complete&&done){done=false;hint.textContent=roomId?objective.hint:'Objetivo individual desta rodada.'}}
function updateLocal(send=true){const v=Math.max(0,objective.read());if(v===lastLocal)return;lastLocal=v;contributions.set(actor,v);render();if(send&&channel)channel.send({type:'broadcast',event:'stack_objective',payload:{actor,value:v,objective:objective.id,slot}}).catch(()=>{})}
const targets=['#matches','#tilesLeft','#score'].map($).filter(Boolean);targets.forEach(el=>new MutationObserver(()=>updateLocal()).observe(el,{childList:true,characterData:true,subtree:true}));
async function connect(){if(!roomId)return updateLocal(false);for(let i=0;i<50&&!window.ZunoSupabaseClient;i++)await new Promise(r=>setTimeout(r,100));const sb=window.ZunoSupabaseClient;if(!sb)return updateLocal(false);try{const {data}=await sb.auth.getUser();actor=data?.user?.id||actor;await sb.realtime.setAuth?.()}catch(_){}
 channel=sb.channel(`room:${roomId}:games`,{config:{private:true,broadcast:{self:false}}}).on('broadcast',{event:'stack_objective'},({payload})=>{if(!payload||payload.actor===actor||payload.objective!==objective.id||payload.slot!==slot)return;contributions.set(payload.actor,Math.max(0,Number(payload.value)||0));render()}).subscribe(status=>{if(status==='SUBSCRIBED'){updateLocal(false);channel.send({type:'broadcast',event:'stack_objective',payload:{actor,value:lastLocal,objective:objective.id,slot}}).catch(()=>{})}})
}
window.addEventListener('pagehide',()=>{try{channel&&window.ZunoSupabaseClient?.removeChannel(channel)}catch(_){}});
updateLocal(false);connect();
})();