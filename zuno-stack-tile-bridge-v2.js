(()=>{
if(window.__ZUNO_STACK_TILE_BRIDGE_V2__)return;window.__ZUNO_STACK_TILE_BRIDGE_V2__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let busy=false;
async function authority(){for(let i=0;i<100;i++){if(window.ZunoStackAuthority)return window.ZunoStackAuthority;await sleep(80)}return null}
function pristine(s){return !!s?.active&&Array.isArray(s.tiles)&&s.tiles.length===90&&s.tiles.every(t=>!t.removed)&&Array.isArray(s.tray)&&s.tray.length===0&&Number(s.score||0)===0&&Number(s.matches||0)===0}
async function serverRound(auth){
  const meta=auth?.getState?.()||{},roomId=String(meta.roomId||window.__ZUNO_STACK_AUTHORITY_ROOM_ID__||''),sb=window.ZunoSupabaseClient;
  if(!sb||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roomId))return null;
  try{const {data,error}=await sb.from('zuno_stack_match_state').select('revision,state').eq('room_id',roomId).maybeSingle();if(error||!data)return null;return{revision:Number(data.revision)||0,engine:data.state?.engine||null}}catch(_){return null}
}
function activeRound(r){return !!r?.engine?.active&&Array.isArray(r.engine?.tiles)&&r.engine.tiles.length===90}
async function confirmStart(auth){
  const local=window.ZunoStackCore?.getState?.();if(!pristine(local))return false;
  let round=await serverRound(auth);if(activeRound(round)){await auth.reconcile?.('tile_bridge_v2_active_round');return true}
  const baseline=Number(round?.revision)||Number(auth.getState?.()?.revision)||0;
  for(let i=0;i<10;i++){
    await sleep(60);
    if(Number(auth.getState?.()?.revision)>baseline){round=await serverRound(auth);if(activeRound(round)){await auth.reconcile?.('tile_bridge_v2_start_confirmed');return true}}
  }
  const ok=await auth.commit?.('start',local);if(ok===false)return false;
  for(let i=0;i<12;i++){
    await sleep(70);round=await serverRound(auth);
    if(activeRound(round)){await auth.reconcile?.('tile_bridge_v2_start_recovered');return true}
  }
  return false
}
async function play(tileId){if(busy)return false;busy=true;try{const auth=await authority();if(!auth||!(await confirmStart(auth)))return false;let ok=await auth.applyTile?.(tileId);if(!ok){await auth.reconcile?.('tile_bridge_v2_retry');await sleep(70);ok=await auth.applyTile?.(tileId)}return !!ok}finally{busy=false}}
function capture(event){const tile=event.target instanceof Element?event.target.closest('[data-tile]'):null;if(!tile||!window.ZunoStackCore?.isActive?.())return;event.preventDefault();event.stopImmediatePropagation();play(tile.getAttribute('data-tile')).catch(()=>{})}
document.addEventListener('pointerdown',capture,true);
document.addEventListener('click',capture,true);
})();