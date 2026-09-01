import {TRAY_CAPACITY,acceptedTransition,createCoreTransitions,createDomainEvent,createModeRules,createRulesContext,createValidatedBoardState,createPrng,generateBoard,getAvailableTileIds,rejectedTransition} from '../core/index.mjs';

export const TRIO_MODE='trio';
export const TRIO_RULESET_VERSION='trio-basic-r1';
export const TRIO_STATUS=Object.freeze({CREATED:'CREATED',PLAYING:'PLAYING',WON:'WON',LOST:'LOST'});
export const TRIO_COMMAND=Object.freeze({RELAY_PUT:'TRIO_RELAY_PUT',RELAY_TAKE:'TRIO_RELAY_TAKE',USE_SHARED_PULSE:'TRIO_USE_SHARED_PULSE'});
export const RELAY_CAPACITY=3;
export const DEFAULT_TRIO_BOARD=Object.freeze({layerCounts:Object.freeze([24,18,15,12,9,6,6,6,6,6,6,6]),columns:6,rows:4,families:Object.freeze(['ember','nova','wave','leaf','volt','moon'])});

const playerIndex=(state,id)=>state.players.findIndex(player=>player.playerId===id);
const relaySlots=shared=>Array.isArray(shared?.relay)?shared.relay:Array(RELAY_CAPACITY).fill(null);

export function createTrioBoard(config=DEFAULT_TRIO_BOARD,seed='trio-seed'){
  const base=generateBoard(config,seed);
  const families=[...config.families];
  if(base.tiles.length%3!==0)throw new RangeError('Trio board tile count must be divisible by 3');
  const working={...base,tiles:base.tiles.map(tile=>({...tile}))};
  const order=[];
  while(order.length<working.tiles.length){const id=getAvailableTileIds(working)[0];if(!id)throw new Error('Trio board has no deterministic removal path');order.push(id);working.tiles=working.tiles.map(tile=>tile.id===id?{...tile,removed:true}:tile)}
  const cycle=createPrng(`${seed}|trio-families`).shuffle(families);
  const familyById=new Map();
  for(let i=0;i<order.length;i++)familyById.set(order[i],cycle[Math.floor(i/3)%cycle.length]);
  return createValidatedBoardState({tiles:base.tiles.map(tile=>({...tile,family:familyById.get(tile.id)})),layerCount:base.layerCount,meta:{...base.meta,mode:TRIO_MODE,guaranteedTrioPath:true,experimentalLayers:base.layerCount}});
}

function relayPut(state,command){
  const index=playerIndex(state,command.actorId);if(index<0)return rejectedTransition(state,'PLAYER_NOT_FOUND');
  const player=state.players[index];const tileId=command.payload?.tileId;
  if(typeof tileId!=='string'||!player.tray.includes(tileId))return rejectedTransition(state,'RELAY_TILE_NOT_OWNED');
  const slots=relaySlots(state.shared);const slot=slots.findIndex(value=>value===null);if(slot<0)return rejectedTransition(state,'RELAY_FULL');
  const nextSlots=[...slots];nextSlots[slot]={tileId,ownerId:command.actorId};
  const nextPlayer={...player,tray:player.tray.filter(id=>id!==tileId)};
  return acceptedTransition({...state,players:state.players.map((p,i)=>i===index?nextPlayer:p),shared:{...state.shared,relay:nextSlots}},[createDomainEvent('TRIO_RELAY_PUT',{actorId:command.actorId,slot,tileId})]);
}

function relayTake(state,command){
  const index=playerIndex(state,command.actorId);if(index<0)return rejectedTransition(state,'PLAYER_NOT_FOUND');
  const slot=command.payload?.slot;if(!Number.isInteger(slot)||slot<0||slot>=RELAY_CAPACITY)return rejectedTransition(state,'RELAY_SLOT_INVALID');
  const slots=relaySlots(state.shared);const item=slots[slot];if(!item)return rejectedTransition(state,'RELAY_SLOT_EMPTY');
  const player=state.players[index];if(player.tray.length>=TRAY_CAPACITY)return rejectedTransition(state,'TRAY_FULL');
  const nextSlots=[...slots];nextSlots[slot]=null;const nextPlayer={...player,tray:[...player.tray,item.tileId]};
  return acceptedTransition({...state,players:state.players.map((p,i)=>i===index?nextPlayer:p),shared:{...state.shared,relay:nextSlots}},[createDomainEvent('TRIO_RELAY_TAKEN',{actorId:command.actorId,slot,tileId:item.tileId,ownerId:item.ownerId})]);
}

function useSharedPulse(state,command){
  const index=playerIndex(state,command.actorId);if(index<0)return rejectedTransition(state,'PLAYER_NOT_FOUND');
  const cost=1;const current=state.shared?.pulse?.value??0;if(current<cost)return rejectedTransition(state,'SHARED_PULSE_INSUFFICIENT');
  return acceptedTransition({...state,shared:{...state.shared,pulse:{...state.shared.pulse,value:current-cost}}},[createDomainEvent('TRIO_SHARED_PULSE_USED',{actorId:command.actorId,cost,previous:current,current:current-cost})]);
}

export function createTrioRules(){const transitions={...createCoreTransitions(),[TRIO_COMMAND.RELAY_PUT]:relayPut,[TRIO_COMMAND.RELAY_TAKE]:relayTake,[TRIO_COMMAND.USE_SHARED_PULSE]:useSharedPulse};const rules=createModeRules({modeId:TRIO_MODE,playerSlots:3,transitions});rules.progression={scorePerTrio:100,comboStep:1,comboResetOnPickWithoutTrio:false,pulsePerTrio:1,pulseMax:10,pulseUseCost:1};return rules}
export function createTrioRulesContext(){return createRulesContext({rules:createTrioRules(),config:{trayCapacity:TRAY_CAPACITY,relayCapacity:RELAY_CAPACITY}})}
export function evaluateTrioStatus(state){if(state.players.length!==3)return TRIO_STATUS.LOST;const allWon=state.players.every(player=>player.board.tiles.every(tile=>tile.removed)&&player.tray.length===0);if(allWon)return TRIO_STATUS.WON;const anyLost=state.players.some(player=>player.tray.length>=TRAY_CAPACITY||(player.board.tiles.some(tile=>!tile.removed)&&getAvailableTileIds(player.board).length===0));return anyLost?TRIO_STATUS.LOST:TRIO_STATUS.PLAYING}
