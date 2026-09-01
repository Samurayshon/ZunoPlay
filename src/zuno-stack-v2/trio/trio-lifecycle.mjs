import {reconnectAuthoritativeMatch,reconcileAuthoritativeMatch,snapshotAuthoritativeMatch} from '../server/authoritative-match-engine.mjs';

export const TRIO_CONNECTION_STATUS=Object.freeze({CONNECTED:'connected',RECONNECTING:'reconnecting',TIMED_OUT:'timed_out'});
export const TRIO_SUPPORT_STATUS=Object.freeze({INACTIVE:'inactive',ACTIVE:'active'});
export const TRIO_LAST_STACK_STATUS=Object.freeze({INACTIVE:'inactive',ACTIVE:'active'});

const clone=value=>JSON.parse(JSON.stringify(value));
const slotIndex=(match,playerId)=>match.slots?.findIndex(slot=>slot.playerId===playerId)??-1;
const finished=player=>player.board.tiles.every(tile=>tile.removed)&&player.tray.length===0;

export function initializeTrioLifecycle(match,{reconnectWindowTicks=30,afkWarningTicks=20}={}){
  if(!Number.isSafeInteger(reconnectWindowTicks)||reconnectWindowTicks<1)throw new TypeError('reconnectWindowTicks must be >= 1');
  if(!Number.isSafeInteger(afkWarningTicks)||afkWarningTicks<1)throw new TypeError('afkWarningTicks must be >= 1');
  return {...match,lifecycle:{reconnectWindowTicks,afkWarningTicks,connections:match.slots.map(slot=>({playerId:slot.playerId,status:TRIO_CONNECTION_STATUS.CONNECTED,disconnectedAtRevision:null,lastActiveRevision:match.revision})),support:{status:TRIO_SUPPORT_STATUS.INACTIVE,eligiblePlayerIds:[]},lastStack:{status:TRIO_LAST_STACK_STATUS.INACTIVE,playerId:null}}};
}

export function markTrioDisconnected(match,playerId){
  const index=slotIndex(match,playerId);if(index<0)throw new Error('TRIO_SLOT_NOT_FOUND');
  const lifecycle=clone(match.lifecycle);const connection=lifecycle.connections[index];
  connection.status=TRIO_CONNECTION_STATUS.RECONNECTING;connection.disconnectedAtRevision=match.revision;
  return {...match,lifecycle,disconnects:[...(match.disconnects??[]),{playerId,revision:match.revision,type:'temporary'}]};
}

export function reconnectTrioPlayer(match,playerId,{clientRevision}={}){
  const index=slotIndex(match,playerId);if(index<0)throw new Error('TRIO_SLOT_NOT_FOUND');
  const lifecycle=clone(match.lifecycle);const connection=lifecycle.connections[index];
  if(connection.status===TRIO_CONNECTION_STATUS.TIMED_OUT)throw new Error('TRIO_RECONNECT_WINDOW_EXPIRED');
  connection.status=TRIO_CONNECTION_STATUS.CONNECTED;connection.disconnectedAtRevision=null;connection.lastActiveRevision=match.revision;
  const next={...match,lifecycle};
  const reconciliation=Number.isSafeInteger(clientRevision)?reconcileAuthoritativeMatch(next,{revision:clientRevision}):{inSync:false,revision:next.revision,snapshot:reconnectAuthoritativeMatch(next)};
  return {match:next,reconciliation};
}

export function reconcileTrioClient(match,{playerId,revision}={}){if(slotIndex(match,playerId)<0)throw new Error('TRIO_SLOT_NOT_FOUND');return reconcileAuthoritativeMatch(match,{revision});}
export function snapshotTrioMatch(match,reason){return snapshotAuthoritativeMatch(match,reason);}

export function refreshTrioCoopState(match){
  const completed=match.state.players.filter(finished).map(player=>player.playerId);const remaining=match.state.players.filter(player=>!finished(player));
  const lastStack=completed.length===2&&remaining.length===1?{status:TRIO_LAST_STACK_STATUS.ACTIVE,playerId:remaining[0].playerId}:{status:TRIO_LAST_STACK_STATUS.INACTIVE,playerId:null};
  const support=completed.length>0&&remaining.length>0?{status:TRIO_SUPPORT_STATUS.ACTIVE,eligiblePlayerIds:completed}:{status:TRIO_SUPPORT_STATUS.INACTIVE,eligiblePlayerIds:[]};
  return {...match,lifecycle:{...match.lifecycle,lastStack,support}};
}

export function advanceTrioLifecycle(match,{revision=match.revision}={}){
  const lifecycle=clone(match.lifecycle);for(const connection of lifecycle.connections){if(connection.status===TRIO_CONNECTION_STATUS.RECONNECTING&&revision-(connection.disconnectedAtRevision??revision)>=lifecycle.reconnectWindowTicks)connection.status=TRIO_CONNECTION_STATUS.TIMED_OUT;}
  return refreshTrioCoopState({...match,lifecycle});
}
