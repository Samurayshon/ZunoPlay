import {PICK_TILE,createCommand,createDomainEvent,createGameState,createPlayerState,dispatch} from '../core/index.mjs';
import {DEFAULT_TRIO_BOARD,RELAY_CAPACITY,TRIO_COMMAND,TRIO_MODE,TRIO_RULESET_VERSION,TRIO_STATUS,createTrioBoard,createTrioRulesContext,evaluateTrioStatus} from './trio-rules.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const reject=(session,code,details=null)=>({...session,events:[],rejection:{code,details}});
const finish=(session,state,events)=>{const status=evaluateTrioStatus(state);const terminal=status===TRIO_STATUS.PLAYING?[]:[createDomainEvent(status===TRIO_STATUS.WON?'TRIO_WON':'TRIO_LOST')];return {...session,state:{...state,status},events:[...events,...terminal],rejection:null}};
const syncSharedPulse=(previous,next,events)=>{const gains=events.filter(event=>event.type==='PULSE_CHANGED'&&event.payload?.current>event.payload?.previous).reduce((sum,event)=>sum+(event.payload.current-event.payload.previous),0);if(!gains)return next;const current=previous.shared?.pulse?.value??0;const max=previous.shared?.pulse?.max??30;return {...next,shared:{...next.shared,pulse:{value:Math.min(max,current+gains),max}}}};

export function createTrioSession({seed='trio-seed',playerIds=['trio-1','trio-2','trio-3'],boardConfig=DEFAULT_TRIO_BOARD}={}){
  if(!Array.isArray(playerIds)||playerIds.length!==3||new Set(playerIds).size!==3)throw new TypeError('Trio requires exactly 3 unique player slots');
  const players=playerIds.map((playerId,index)=>createPlayerState({playerId,board:createTrioBoard(boardConfig,`${seed}|slot-${index}`)}));
  const state=createGameState({mode:TRIO_MODE,seed,rulesetVersion:TRIO_RULESET_VERSION,status:TRIO_STATUS.CREATED,players,shared:{relay:Array(RELAY_CAPACITY).fill(null),pulse:{value:0,max:30},logicalTurn:0}});
  return {state,context:createTrioRulesContext(),slots:playerIds.map((playerId,index)=>({slot:index,playerId})),events:[],rejection:null};
}
export function startTrioSession(session){if(session.state.status!==TRIO_STATUS.CREATED)return reject(session,'TRIO_ALREADY_STARTED');return {...session,state:{...session.state,status:TRIO_STATUS.PLAYING,startedAtLogical:0},events:[createDomainEvent('TRIO_STARTED',{players:session.slots.map(slot=>slot.playerId)})],rejection:null}}
export function executeTrioCommand(session,{actorId,type,payload={}}={}){if(session.state.status!==TRIO_STATUS.PLAYING)return reject(session,'TRIO_NOT_PLAYING');if(!session.slots.some(slot=>slot.playerId===actorId))return reject(session,'TRIO_ACTOR_NOT_IN_SLOT');const result=dispatch(session.state,createCommand({type,actorId,payload}),session.context);if(!result.accepted)return {...session,events:result.events,rejection:result.rejection};let state=syncSharedPulse(session.state,result.state,result.events);state={...state,shared:{...state.shared,logicalTurn:(state.shared.logicalTurn??0)+1}};return finish(session,state,result.events)}
export function trioPickTile(session,actorId,tileId){return executeTrioCommand(session,{actorId,type:PICK_TILE,payload:{tileId}})}
export function trioRelayPut(session,actorId,tileId){return executeTrioCommand(session,{actorId,type:TRIO_COMMAND.RELAY_PUT,payload:{tileId}})}
export function trioRelayTake(session,actorId,slot){return executeTrioCommand(session,{actorId,type:TRIO_COMMAND.RELAY_TAKE,payload:{slot}})}
export function trioUseSharedPulse(session,actorId){return executeTrioCommand(session,{actorId,type:TRIO_COMMAND.USE_SHARED_PULSE})}
export function projectTrioSession(session,viewerId){const viewer=session.state.players.find(player=>player.playerId===viewerId);if(!viewer)throw new Error('TRIO_VIEWER_NOT_IN_MATCH');return clone({mode:session.state.mode,status:session.state.status,viewerId,shared:session.state.shared,players:session.state.players.map(player=>({playerId:player.playerId,score:player.score,trayCount:player.tray.length,remainingTiles:player.board.tiles.filter(tile=>!tile.removed).length,layerCount:player.board.layerCount,local:player.playerId===viewerId})),local:{board:viewer.board,tray:viewer.tray,pulse:viewer.pulse},events:session.events})}
