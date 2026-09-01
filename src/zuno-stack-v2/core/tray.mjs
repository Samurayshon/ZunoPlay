export const TRAY_CAPACITY=7;

function getTile(board,tileId){return board?.tiles?.find(tile=>tile.id===tileId)??null}

export function appendTrayTileId(tray,tileId){
  if(!Array.isArray(tray))throw new TypeError('tray must be an array');
  if(tray.length>=TRAY_CAPACITY)throw new RangeError('tray capacity exceeded');
  if(typeof tileId!=='string'||!tileId)throw new TypeError('tileId must be a non-empty string');
  if(tray.includes(tileId))throw new Error(`tray already contains tile: ${tileId}`);
  return[...tray,tileId];
}

export function findFirstTrio(board,tray){
  if(!Array.isArray(tray))throw new TypeError('tray must be an array');
  const byFamily=new Map();
  for(const tileId of tray){
    const tile=getTile(board,tileId);if(!tile)throw new Error(`tray references unknown tile: ${tileId}`);
    const ids=byFamily.get(tile.family)??[];ids.push(tileId);byFamily.set(tile.family,ids);
    if(ids.length===3)return{family:tile.family,tileIds:[...ids]};
  }
  return null;
}

export function resolveFirstTrio(board,tray){
  const resolved=findFirstTrio(board,tray);if(!resolved)return{tray:[...tray],resolved:null};
  const selected=new Set(resolved.tileIds);
  return{tray:tray.filter(tileId=>!selected.has(tileId)),resolved};
}

export function validateTrayState(board,tray){
  if(!board||!Array.isArray(board.tiles))throw new TypeError('board must contain tiles');
  if(!Array.isArray(tray))throw new TypeError('tray must be an array');
  if(tray.length>TRAY_CAPACITY)throw new RangeError(`tray exceeds capacity ${TRAY_CAPACITY}`);
  const seen=new Set();
  for(const [index,tileId]of tray.entries()){
    if(typeof tileId!=='string'||!tileId)throw new TypeError(`tray[${index}] must be a tile id`);
    if(seen.has(tileId))throw new Error(`tray contains duplicate tile: ${tileId}`);seen.add(tileId);
    const tile=getTile(board,tileId);if(!tile)throw new Error(`tray references unknown tile: ${tileId}`);
    if(!tile.removed)throw new Error(`tray tile must already be removed from board: ${tileId}`);
  }
  if(findFirstTrio(board,tray)!==null)throw new Error('stable tray must not contain an unresolved trio');
  return true;
}
