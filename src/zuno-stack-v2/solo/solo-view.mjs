import {getAvailableTileIds} from '../core/index.mjs';

export function projectSoloView(state,events=[]){
  const player=state.players[0];
  const available=new Set(getAvailableTileIds(player.board));
  return Object.freeze({
    status:state.status,
    score:player.score,
    combo:player.combo.count,
    pulse:player.pulse.value,
    pulseMax:10,
    tray:[...player.tray],
    trayCount:player.tray.length,
    trayCapacity:7,
    resources:{...player.resources},
    canUndo:(player.resources?.undo??0)>0,
    canHint:(player.resources?.hint??0)>0,
    canRescue:(player.resources?.rescue??0)>0&&player.tray.length>=6,
    canUseShift:(player.resources?.powerShift??0)>0&&player.pulse.value>=3&&player.tray.length>0,
    tiles:player.board.tiles.filter(tile=>!tile.removed).map(tile=>({id:tile.id,family:tile.family,x:tile.position.x,y:tile.position.y,layer:tile.layer,available:available.has(tile.id)})),
    events:events.map(event=>({...event,payload:event.payload?{...event.payload}:{}}))
  });
}

export function diffSoloView(previous,next){
  if(!previous)return Object.freeze({full:true,status:true,hud:true,tray:true,tiles:true,events:true});
  const previousTiles=new Map(previous.tiles.map(tile=>[tile.id,tile]));
  const changedTiles=next.tiles.filter(tile=>JSON.stringify(previousTiles.get(tile.id))!==JSON.stringify(tile));
  const removedTileIds=previous.tiles.filter(tile=>!next.tiles.some(candidate=>candidate.id===tile.id)).map(tile=>tile.id);
  return Object.freeze({
    full:false,
    status:previous.status!==next.status,
    hud:previous.score!==next.score||previous.combo!==next.combo||previous.pulse!==next.pulse||JSON.stringify(previous.resources)!==JSON.stringify(next.resources),
    tray:JSON.stringify(previous.tray)!==JSON.stringify(next.tray),
    tiles:changedTiles.length>0||removedTileIds.length>0,
    changedTiles,
    removedTileIds,
    events:next.events.length>0
  });
}
