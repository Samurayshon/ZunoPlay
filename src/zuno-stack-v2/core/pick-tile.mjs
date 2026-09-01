import{acceptedTransition,createDomainEvent,rejectedTransition}from'./contracts.mjs';
import{canPickTile}from'./board.mjs';
import{appendTrayTileId,resolveFirstTrio,TRAY_CAPACITY,validateTrayState}from'./tray.mjs';

export const PICK_TILE='PICK_TILE';

function findPlayerIndex(state,actorId){if(!state||!Array.isArray(state.players))return-1;return state.players.findIndex(player=>player?.playerId===actorId)}
function reject(state,code,details=null){return rejectedTransition(state,code,details)}

export function pickTileTransition(state,command){
  if(!command||command.type!==PICK_TILE)return reject(state,'INVALID_PICK_COMMAND');
  const tileId=command.payload?.tileId;if(typeof tileId!=='string'||!tileId)return reject(state,'INVALID_TILE_ID');
  const playerIndex=findPlayerIndex(state,command.actorId);if(playerIndex<0)return reject(state,'PLAYER_NOT_FOUND',{actorId:command.actorId});
  const player=state.players[playerIndex];validateTrayState(player.board,player.tray);
  const tile=player.board.tiles.find(candidate=>candidate.id===tileId);if(!tile)return reject(state,'TILE_NOT_FOUND',{tileId});
  if(tile.removed)return reject(state,'TILE_ALREADY_REMOVED',{tileId});
  if(!canPickTile(player.board,tileId))return reject(state,'TILE_BLOCKED',{tileId});
  if(player.tray.length>=TRAY_CAPACITY)return reject(state,'TRAY_FULL',{capacity:TRAY_CAPACITY});

  const board={...player.board,tiles:player.board.tiles.map(candidate=>candidate.id===tileId?{...candidate,removed:true}:candidate)};
  const appended=appendTrayTileId(player.tray,tileId);
  const resolution=resolveFirstTrio(board,appended);
  validateTrayState(board,resolution.tray);
  const nextPlayer={...player,board,tray:resolution.tray};
  const nextState={...state,players:state.players.map((candidate,index)=>index===playerIndex?nextPlayer:candidate)};
  const events=[createDomainEvent('TILE_PICKED',{actorId:player.playerId,tileId:tile.id,family:tile.family})];
  if(resolution.resolved)events.push(createDomainEvent('TRIO_RESOLVED',{actorId:player.playerId,family:resolution.resolved.family,tileIds:resolution.resolved.tileIds}));
  events.push(createDomainEvent('TRAY_CHANGED',{actorId:player.playerId,tileIds:[...resolution.tray],size:resolution.tray.length,capacity:TRAY_CAPACITY}));
  return acceptedTransition(nextState,events);
}

export function createCoreTransitions(){return{[PICK_TILE]:pickTileTransition}}
