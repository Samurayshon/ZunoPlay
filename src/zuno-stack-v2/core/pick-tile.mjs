import{acceptedTransition,createDomainEvent,rejectedTransition}from'./contracts.mjs';
import{canPickTile}from'./board.mjs';
import{appendTrayEntry,resolveFirstTrio,TRAY_CAPACITY}from'./tray.mjs';

function findPlayer(state,actorId){return state.players.find(player=>player.playerId===actorId)??null}
function reject(state,code,details=null){return rejectedTransition(state,code,details)}

export function pickTileTransition(state,command){
  const tileId=command?.payload?.tileId;
  if(typeof tileId!=='string'||!tileId)return reject(state,'INVALID_TILE_ID');
  const player=findPlayer(state,command.actorId);if(!player)return reject(state,'PLAYER_NOT_FOUND');
  const tile=player.board.tiles.find(candidate=>candidate.id===tileId);if(!tile)return reject(state,'TILE_NOT_FOUND',{tileId});
  if(tile.removed)return reject(state,'TILE_ALREADY_REMOVED',{tileId});
  if(!canPickTile(player.board,tileId))return reject(state,'TILE_BLOCKED',{tileId});
  if(player.tray.length>=TRAY_CAPACITY)return reject(state,'TRAY_FULL',{capacity:TRAY_CAPACITY});

  const board={...player.board,tiles:player.board.tiles.map(candidate=>candidate.id===tileId?{...candidate,removed:true}:candidate)};
  const appended=appendTrayEntry(player.tray,{tileId:tile.id,family:tile.family});
  const resolution=resolveFirstTrio(appended);
  const tray=resolution.tray;
  const nextPlayer={...player,board,tray};
  const nextState={...state,players:state.players.map(candidate=>candidate.playerId===player.playerId?nextPlayer:candidate)};
  const events=[createDomainEvent('TILE_PICKED',{playerId:player.playerId,tileId:tile.id,family:tile.family}),createDomainEvent('TRAY_CHANGED',{playerId:player.playerId,tileIds:tray.map(entry=>entry.tileId),size:tray.length})];
  if(resolution.resolved)events.splice(1,0,createDomainEvent('TRIO_RESOLVED',{playerId:player.playerId,family:resolution.resolved.family,tileIds:resolution.resolved.tileIds}));
  return acceptedTransition(nextState,events);
}

export function createCoreTransitions(){return{PICK_TILE:pickTileTransition}}
