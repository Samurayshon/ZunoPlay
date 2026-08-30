(()=>{
if(window.__ZUNO_STACK_TILE_BRIDGE_V2__)return;window.__ZUNO_STACK_TILE_BRIDGE_V2__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let busy=false;
async function authority(){for(let i=0;i<100;i++){if(window.ZunoStackAuthority)return window.ZunoStackAuthority;await sleep(80)}return null}
function pristine(s){return !!s?.active&&Array.isArray(s.tiles)&&s.tiles.length===90&&s.tiles.every(t=>!t.removed)&&Array.isArray(s.tray)&&s.tray.length===0&&Number(s.score||0)===0&&Number(s.matches||0)===0}
async function confirmStart(auth){
  let server=auth.getState?.()||{};
  if(server.engine?.active&&Array.isArray(server.engine?.tiles)&&server.engine.tiles.length===90)return true;
  await auth.reconcile?.('tile_bridge_v2_revision');server=auth.getState?.()||{};
  if(server.engine?.active&&Array.isArray(server.engine?.tiles)&&server.engine.tiles.length===90)return true;
  const local=window.ZunoStackCore?.getState?.();if(!pristine(local))return false;
  const ok=await auth.commit?.('start',local);if(ok===false)return false;
  await auth.reconcile?.('tile_bridge_v2_start_confirm');server=auth.getState?.()||{};
  return !!server.engine?.active&&Array.isArray(server.engine?.tiles)&&server.engine.tiles.length===90
}
async function play(tileId){if(busy)return false;busy=true;try{const auth=await authority();if(!auth||!(await confirmStart(auth)))return false;let ok=await auth.applyTile?.(tileId);if(!ok){await auth.reconcile?.('tile_bridge_v2_retry');await sleep(40);ok=await auth.applyTile?.(tileId)}return !!ok}finally{busy=false}}
function capture(event){const tile=event.target instanceof Element?event.target.closest('[data-tile]'):null;if(!tile||!window.ZunoStackCore?.isActive?.())return;event.preventDefault();event.stopImmediatePropagation();play(tile.getAttribute('data-tile')).catch(()=>{})}
document.addEventListener('pointerdown',capture,true);
document.addEventListener('click',capture,true);
})();