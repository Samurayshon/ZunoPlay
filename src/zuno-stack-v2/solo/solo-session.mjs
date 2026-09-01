import {PICK_TILE,createCommand,createGameState,createPlayerState,dispatch,generateBoard} from '../core/index.mjs';
import {SOLO_MODE,SOLO_RULESET_VERSION,SOLO_STATUS,createSoloRulesContext,evaluateSoloStatus} from './solo-rules.mjs';

// Phase 2 intentionally uses a tiny deterministic training board: three families,
// exactly one trio each. Balance, layered production boards and rescue mechanics
// remain Phase 3 work.
const DEFAULT_BOARD=Object.freeze({layerCounts:[9],columns:9,rows:1,families:['ember']});
export function createSoloSession({seed='solo-seed',boardConfig=DEFAULT_BOARD,playerId='solo-player'}={}){
  const board=generateBoard(boardConfig,seed);
  const state=createGameState({mode:SOLO_MODE,seed,rulesetVersion:SOLO_RULESET_VERSION,status:SOLO_STATUS.CREATED,players:[createPlayerState({playerId,board})]});
  return {state,context:createSoloRulesContext(),events:[]};
}
export function startSoloSession(session){
  if(session.state.status!==SOLO_STATUS.CREATED)return {...session,events:[]};
  const state={...session.state,status:SOLO_STATUS.PLAYING};
  return {...session,state,events:[{type:'SOLO_STARTED'}]};
}
export function soloPickTile(session,tileId){
  if(session.state.status!==SOLO_STATUS.PLAYING)return {...session,events:[]};
  const actorId=session.state.players[0].playerId;
  const result=dispatch(session.state,createCommand({type:PICK_TILE,actorId,payload:{tileId}}),session.context);
  if(!result.accepted)return {...session,events:result.events,rejection:result.rejection};
  const status=evaluateSoloStatus(result.state);
  const terminal=status!==SOLO_STATUS.PLAYING?[{type:status==='WON'?'SOLO_WON':'SOLO_LOST'}]:[];
  return {...session,state:{...result.state,status},events:[...result.events,...terminal],rejection:null};
}
