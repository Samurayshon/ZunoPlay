(()=>{
if(window.__ZUNO_STACK_FRESH_ROUND_GUARD__)return;window.__ZUNO_STACK_FRESH_ROUND_GUARD__=true;
const q=new URLSearchParams(location.search);
if(q.get('new')!=='1')return;
let pending=true,lockTimer=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const valid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
function startButton(){return document.getElementById('start')}
function lockStart(){const b=startButton();if(!b||!pending)return;b.disabled=true;b.setAttribute('aria-busy','true');b.textContent='PREPARANDO NOVA PARTIDA…'}
function unlockStart(){pending=false;clearInterval(lockTimer);const b=startButton();if(b){b.disabled=false;b.removeAttribute('aria-busy');b.textContent='JOGAR AGORA'}}
function showFailure(){pending=true;clearInterval(lockTimer);const b=startButton();if(b){b.disabled=true;b.removeAttribute('aria-busy');b.textContent='NÃO FOI POSSÍVEL PREPARAR A PARTIDA'}const t=document.getElementById('toast');if(t){t.textContent='Não foi possível encerrar a partida anterior com segurança.';t.classList.add('show')}}
function restoreLobby(){const overlay=document.getElementById('overlay');overlay?.classList.remove('hide');const title=document.getElementById('overlayTitle');const text=document.getElementById('overlayText');const features=document.getElementById('features');const result=document.getElementById('resultGrid');if(title)title.textContent='Zuno Stack';if(text)text.textContent='Puzzle cooperativo do ZunoPlay.';if(features)features.style.display='grid';if(result)result.hidden=true;document.body.classList.remove('zstack-playing');document.body.classList.add('zstack-lobby-v2')}
function consumeIntent(){try{const u=new URL(location.href);u.searchParams.delete('new');history.replaceState(history.state,'',`${u.pathname}${u.search}${u.hash}`)}catch(_){}}
async function waitClient(){for(let i=0;i<100;i++){if(window.ZunoSupabaseClient)return window.ZunoSupabaseClient;await sleep(100)}return null}
async function waitRoom(){for(let i=0;i<120;i++){const id=window.__ZUNO_STACK_AUTHORITY_ROOM_ID__;if(valid(id))return id;await sleep(100)}return''}
async function fetchRow(sb,roomId){const {data,error}=await sb.from('zuno_stack_match_state').select('room_id,revision,state,host_id,host_lease_until').eq('room_id',roomId).maybeSingle();return error?null:data}
function actionId(){const raw=crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;return `abandon-${raw}`.slice(0,160)}
async function finishActiveRound(sb,roomId){let row=await fetchRow(sb,roomId);if(!row?.state?.engine?.active)return true;for(let attempt=0;attempt<2;attempt++){const {error}=await sb.rpc('zuno_stack_abandon_solo_round',{p_room_id:roomId,p_expected_revision:Number(row.revision)||0,p_action_id:actionId()});if(!error)break;if(!String(error.message||'').includes('revision_conflict'))return false;row=await fetchRow(sb,roomId);if(!row?.state?.engine?.active)return true}for(let i=0;i<30;i++){const verify=await fetchRow(sb,roomId);if(verify&&!verify.state?.engine?.active)return true;await sleep(100)}return false}
async function boot(){lockStart();lockTimer=setInterval(lockStart,120);const sb=await waitClient();const roomId=await waitRoom();if(!sb||!roomId)return showFailure();const {data:{session}}=await sb.auth.getSession();if(!session?.user)return showFailure();const ok=await finishActiveRound(sb,roomId);if(!ok)return showFailure();consumeIntent();try{await window.ZunoStackAuthority?.reconcile?.('fresh_solo_round_reset')}catch(_){}restoreLobby();unlockStart();document.dispatchEvent(new CustomEvent('zuno:stack-fresh-round-ready',{detail:{roomId}}))}
document.addEventListener('click',e=>{if(!pending)return;const target=e.target instanceof Element?e.target.closest('#start'):null;if(!target)return;e.preventDefault();e.stopImmediatePropagation();lockStart()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();