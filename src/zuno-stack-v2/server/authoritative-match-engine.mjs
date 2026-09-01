import {createMatchCommandEnvelope,createMatchSnapshot,createCommandReceipt,MATCH_STATUS,SNAPSHOT_REASON,SERVER_MESSAGE} from './match-protocol.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const stable=value=>JSON.stringify(value);
const terminal=new Set([MATCH_STATUS.WON,MATCH_STATUS.LOST,MATCH_STATUS.FINISHED,MATCH_STATUS.ABORTED]);
const MAX_RECEIPTS=128;
const terminalResult=status=>status===MATCH_STATUS.WON?'won':status===MATCH_STATUS.LOST?'lost':status===MATCH_STATUS.ABORTED?'aborted':null;
const signature=envelope=>stable({matchId:envelope.matchId,mode:envelope.mode,actorId:envelope.actorId,actionId:envelope.actionId,command:envelope.command});
const rejection=(match,envelope,code,details=null)=>({match,receipt:createCommandReceipt({accepted:false,matchId:match.matchId,actionId:envelope.actionId,revision:match.revision,rejection:{code,details}})});

export function createAuthoritativeMatch({matchId,mode,players,state,context,status=MATCH_STATUS.PLAYING,maxReceipts=MAX_RECEIPTS,startedAt=0}={}){
  if(typeof matchId!=='string'||!matchId.trim())throw new TypeError('matchId must be a non-empty string');
  if(typeof mode!=='string'||!mode.trim())throw new TypeError('mode must be a non-empty string');
  if(!Array.isArray(players)||players.length<1)throw new TypeError('players must be a non-empty array');
  const ids=players.map(player=>typeof player==='string'?player:player?.playerId);
  if(ids.some(id=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length)throw new TypeError('players must contain unique player ids');
  if(!state||typeof state!=='object'||Array.isArray(state))throw new TypeError('state must be an object');
  if(state.mode!==undefined&&state.mode!==mode)throw new TypeError('state.mode must match match mode');
  if(!Number.isSafeInteger(maxReceipts)||maxReceipts<1)throw new TypeError('maxReceipts must be >= 1');
  if(!Number.isSafeInteger(startedAt)||startedAt<0)throw new TypeError('startedAt must be a safe integer >= 0');
  return {matchId,mode,status,revision:0,players:ids,state:clone(state),context,receipts:[],maxReceipts,startedAt,finishedAt:null,result:null,disconnects:[],antiFarmFlags:[]};
}

export function snapshotAuthoritativeMatch(match,reason=SNAPSHOT_REASON.BOOTSTRAP){return createMatchSnapshot({matchId:match.matchId,mode:match.mode,revision:match.revision,state:match.state,reason});}
export function reconnectAuthoritativeMatch(match){return snapshotAuthoritativeMatch(match,SNAPSHOT_REASON.RECONNECT);}

export function executeAuthoritativeCommand(match,input,{dispatch,createCommand}={}){
  if(typeof dispatch!=='function'||typeof createCommand!=='function')throw new TypeError('Frozen Core dispatch/createCommand are required');
  let envelope;
  try{envelope=createMatchCommandEnvelope(input)}catch(error){return {match,receipt:{type:SERVER_MESSAGE.REJECTED,accepted:false,matchId:match.matchId,actionId:input?.actionId??'invalid',revision:match.revision,events:[],rejection:{code:'INVALID_ENVELOPE',details:error.message},replayed:false}}}
  const requestSignature=signature(envelope);
  const prior=match.receipts.find(item=>item.actionId===envelope.actionId);
  if(prior){
    if(prior.signature!==requestSignature)return rejection(match,envelope,'ACTION_ID_COLLISION');
    return {match,receipt:{...clone(prior.receipt),replayed:true}};
  }
  if(envelope.matchId!==match.matchId)return rejection(match,envelope,'MATCH_ID_MISMATCH');
  if(envelope.mode!==match.mode)return rejection(match,envelope,'MODE_MISMATCH');
  if(!match.players.includes(envelope.actorId))return rejection(match,envelope,'ACTOR_NOT_IN_MATCH');
  if(match.result||terminal.has(match.status)||terminal.has(match.state?.status))return rejection(match,envelope,'MATCH_TERMINAL');
  if(envelope.expectedRevision!==match.revision)return rejection(match,envelope,envelope.expectedRevision<match.revision?'STALE_REVISION':'FUTURE_REVISION',{expected:match.revision,received:envelope.expectedRevision});
  const coreCommand=createCommand({type:envelope.command.type,actorId:envelope.actorId,payload:clone(envelope.command.payload)});
  const result=dispatch(match.state,coreCommand,match.context);
  if(!result?.accepted)return rejection(match,envelope,result?.rejection?.code??'CORE_REJECTED',result?.rejection?.details??null);
  const nextRevision=match.revision+1;
  const receipt=createCommandReceipt({accepted:true,matchId:match.matchId,actionId:envelope.actionId,revision:nextRevision,events:result.events??[]});
  const receipts=[...match.receipts,{actionId:envelope.actionId,signature:requestSignature,receipt:clone(receipt)}].slice(-match.maxReceipts);
  return {match:{...match,state:clone(result.state),status:result.state?.status??match.status,revision:nextRevision,receipts},receipt};
}

export function createVerifiedMatchResult(match,{finishedAt}={}){
  if(match.result)return clone(match.result);
  const status=match.state?.status??match.status;
  const result=terminalResult(status);
  if(!result)throw new Error('MATCH_NOT_TERMINAL');
  if(!Number.isSafeInteger(finishedAt)||finishedAt<match.startedAt)throw new TypeError('finishedAt must be a safe integer >= startedAt');
  const performance=match.state.players.map(player=>({playerId:player.playerId,score:player.score??0,combo:player.combo?.count??0,pulse:player.pulse?.value??0,trayCount:player.tray?.length??0,remainingTiles:player.board?.tiles?.filter(tile=>!tile.removed).length??0}));
  return clone({type:SERVER_MESSAGE.RESULT,matchId:match.matchId,mode:match.mode,players:[...match.players],startedAt:match.startedAt,finishedAt,result,score:performance.reduce((sum,item)=>sum+item.score,0),performance,disconnects:clone(match.disconnects??[]),valid:true,antiFarmFlags:clone(match.antiFarmFlags??[])});
}

export function finalizeAuthoritativeMatch(match,{finishedAt}={}){
  if(match.result)return {match,result:clone(match.result),replayed:true};
  const result=createVerifiedMatchResult(match,{finishedAt});
  return {match:{...match,status:MATCH_STATUS.FINISHED,finishedAt,result:clone(result)},result,replayed:false};
}

export function createRewardsBridgePayload(match){
  if(!match.result||match.result.valid!==true)throw new Error('VERIFIED_RESULT_REQUIRED');
  return {verifiedMatchResult:clone(match.result),rewardsEnabled:false,xpEnabled:false};
}

export function reconcileAuthoritativeMatch(match,{revision}={}){if(revision===match.revision)return {inSync:true,revision:match.revision,snapshot:null};return {inSync:false,revision:match.revision,snapshot:snapshotAuthoritativeMatch(match,SNAPSHOT_REASON.DESYNC)};}
