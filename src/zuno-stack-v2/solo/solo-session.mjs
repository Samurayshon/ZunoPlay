import {
  PICK_TILE,
  USE_POWER,
  createCommand,
  createDomainEvent,
  createGameState,
  createPlayerState,
  dispatch,
  generateBoard
} from '../core/index.mjs';
import {
  DEFAULT_SOLO_BOARD,
  DEFAULT_SOLO_RESOURCES,
  SOLO_MODE,
  SOLO_POWER,
  SOLO_RULESET_VERSION,
  SOLO_STATUS,
  chooseSoloHint,
  createSoloBoard,
  createSoloRulesContext,
  evaluateSoloStatus,
  rescueSoloPlayer
} from './solo-rules.mjs';

const MAX_HISTORY=3;
const terminalEvent=status=>createDomainEvent(status===SOLO_STATUS.WON?'SOLO_WON':'SOLO_LOST');
const withPlayer=(state,player)=>({...state,players:state.players.map((candidate,index)=>index===0?player:candidate)});
const rejectSession=(session,code,details=null)=>({...session,events:[],rejection:{code,details}});
const finalize=(session,state,events,history=session.history)=>{
  const status=evaluateSoloStatus(state);
  const terminal=status===SOLO_STATUS.PLAYING?[]:[terminalEvent(status)];
  return {...session,state:{...state,status},events:[...events,...terminal],history,rejection:null};
};

export function createSoloSession({seed='solo-seed',boardConfig=null,playerId='solo-player'}={}){
  const board=boardConfig?generateBoard(boardConfig,seed):createSoloBoard(DEFAULT_SOLO_BOARD,seed);
  const player=createPlayerState({playerId,board,resources:{...DEFAULT_SOLO_RESOURCES}});
  const state=createGameState({mode:SOLO_MODE,seed,rulesetVersion:SOLO_RULESET_VERSION,status:SOLO_STATUS.CREATED,players:[player],shared:{logicalTurn:0}});
  return {state,context:createSoloRulesContext(),events:[],history:[],rejection:null};
}

export function startSoloSession(session){
  if(session.state.status!==SOLO_STATUS.CREATED)return rejectSession(session,'SOLO_ALREADY_STARTED');
  const state={...session.state,status:SOLO_STATUS.PLAYING,startedAtLogical:0};
  return {...session,state,events:[createDomainEvent('SOLO_STARTED')],rejection:null};
}

export function soloPickTile(session,tileId){
  if(session.state.status!==SOLO_STATUS.PLAYING)return rejectSession(session,'SOLO_NOT_PLAYING');
  const actorId=session.state.players[0].playerId;
  const result=dispatch(session.state,createCommand({type:PICK_TILE,actorId,payload:{tileId}}),session.context);
  if(!result.accepted)return {...session,events:result.events,rejection:result.rejection};
  const nextState={...result.state,shared:{...result.state.shared,logicalTurn:(result.state.shared.logicalTurn??0)+1}};
  const history=[...session.history.slice(-(MAX_HISTORY-1)),session.state];
  return finalize(session,nextState,result.events,history);
}

export function soloUndo(session){
  if(session.state.status!==SOLO_STATUS.PLAYING)return rejectSession(session,'SOLO_NOT_PLAYING');
  const player=session.state.players[0];
  if((player.resources?.undo??0)<=0)return rejectSession(session,'SOLO_UNDO_EMPTY');
  if(!session.history.length)return rejectSession(session,'SOLO_UNDO_UNAVAILABLE');
  const previous=session.history[session.history.length-1];
  const restored=previous.players[0];
  const nextPlayer={...restored,resources:{...restored.resources,undo:player.resources.undo-1,hint:player.resources.hint,rescue:player.resources.rescue,powerShift:player.resources.powerShift}};
  const state=withPlayer({...previous,status:SOLO_STATUS.PLAYING},nextPlayer);
  return {...session,state,history:session.history.slice(0,-1),events:[createDomainEvent('SOLO_UNDONE',{remaining:nextPlayer.resources.undo})],rejection:null};
}

export function soloHint(session){
  if(session.state.status!==SOLO_STATUS.PLAYING)return rejectSession(session,'SOLO_NOT_PLAYING');
  const player=session.state.players[0];
  if((player.resources?.hint??0)<=0)return rejectSession(session,'SOLO_HINT_EMPTY');
  const tileId=chooseSoloHint(session.state);
  if(!tileId)return rejectSession(session,'SOLO_HINT_UNAVAILABLE');
  const nextPlayer={...player,resources:{...player.resources,hint:player.resources.hint-1}};
  return {...session,state:withPlayer(session.state,nextPlayer),events:[createDomainEvent('SOLO_HINTED',{tileId,remaining:nextPlayer.resources.hint})],rejection:null};
}

export function soloRescue(session){
  if(session.state.status!==SOLO_STATUS.PLAYING)return rejectSession(session,'SOLO_NOT_PLAYING');
  const player=session.state.players[0];
  if((player.resources?.rescue??0)<=0)return rejectSession(session,'SOLO_RESCUE_EMPTY');
  if(player.tray.length<6)return rejectSession(session,'SOLO_RESCUE_NOT_NEEDED');
  const restoredTileId=player.tray[player.tray.length-1];
  const restored=rescueSoloPlayer(player);
  if(!restored)return rejectSession(session,'SOLO_RESCUE_UNAVAILABLE');
  const nextPlayer={...restored,resources:{...restored.resources,rescue:restored.resources.rescue-1}};
  const state=withPlayer(session.state,nextPlayer);
  return finalize(session,state,[createDomainEvent('SOLO_RESCUED',{restoredTileId,remaining:nextPlayer.resources.rescue})]);
}

export function soloUsePower(session,powerId=SOLO_POWER.SHIFT){
  if(session.state.status!==SOLO_STATUS.PLAYING)return rejectSession(session,'SOLO_NOT_PLAYING');
  const actorId=session.state.players[0].playerId;
  const result=dispatch(session.state,createCommand({type:USE_POWER,actorId,payload:{powerId}}),session.context);
  if(!result.accepted)return {...session,events:result.events,rejection:result.rejection};
  return finalize(session,result.state,result.events);
}
