(()=>{
if(window.__ZUNO_STACK_TILE_BRIDGE__)return;window.__ZUNO_STACK_TILE_BRIDGE__=true;
let busy=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function authority(){for(let i=0;i<80;i++){if(window.ZunoStackAuthority)return window.ZunoStackAuthority;await wait(100)}return null}
function pristine(s){return !!s?.active&&Array.isArray(s.tiles)&&s.tiles.length===90&&s.tiles.every(t=>!t.removed)&&Array.isArray(s.tray)&&s.tray.length===0&&Number(s.score||0)===0&&Number(s.matches||0)===0}
async function ensureAuthoritativeRound(auth,core){
  let server=auth.getState?.()||{};
  let local=core.getState?.();
  if(!local?.active)return false;
  const serverEngine=server.engine||{};
  if(serverEngine.active&&Array.isArray(serverEngine.tiles)&&serverEngine.tiles.length===90)return true;
  if(!pristine(local))return false;
  const ok=await auth.commit?.('start',local);
  await auth.reconcile?.('tile_bridge_start_confirm');
  server=auth.getState?.()||{};
  return ok!==false&&!!server.engine?.active&&Array.isArray(server.engine?.tiles)&&server.engine.tiles.length===90;
}
async function handleTile(tileId){
  if(busy)return;
  const core=window.ZunoStackCore,state=core?.getState?.();
  if(!core?.isActive?.()||!state)return;
  busy=true;
  try{
    const auth=await authority();
    if(!auth)return;
    if(!(await ensureAuthoritativeRound(auth,core)))return;
    let ok=await auth.applyTile?.(tileId);
    if(ok===false){
      await auth.reconcile?.('tile_bridge_retry');
      ok=await auth.applyTile?.(tileId);
    }
    if(ok!==true)await auth.reconcile?.('tile_bridge_rejected');
  }finally{busy=false}
}
document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest('[data-tile]'):null;
  if(!target||!window.ZunoStackCore?.isActive?.())return;
  event.preventDefault();event.stopImmediatePropagation();
  handleTile(target.getAttribute('data-tile')).catch(()=>{});
},true);
})();