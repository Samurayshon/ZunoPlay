import {createMatchCommandEnvelope,createMatchSnapshot,createCommandReceipt,MATCH_STATUS,SNAPSHOT_REASON} from './match-protocol.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const terminal=new Set([MATCH_STATUS.WON,MATCH_STATUS.LOST,MATCH_STATUS.FINISHED,MATCH_STATUS.ABORTED]);
const MAX_RECEIPTS=128;

const rejection=(match,envelope,code,details=null)=>({
  match,
  receipt:createCommandReceipt({accepted:false,matchId:match.matchId,actionId:envelope.actionId,revision:match.revision,rejection:{code,details}})
});

export function createAuthoritativeMatch({matchId,mode,players,state,context,status=MATCH_STATUS.PLAYING,maxReceipts=MAX_RECEIPTS}={}){
  if(typeof matchId!=='string'||!matchId.trim())throw new TypeError('matchId must be a non-empty string');
  if(typeof mode!=='string'||!mode.trim())throw new TypeError('mode must be a non-empty string');
  if(!Array.isArray(players)||players.length<1)throw new TypeError('players must be a non-empty array');
  const ids=players.map(player=>typeof player==='string'?player:player?.playerId);
  if(ids.some(id=>typeof id!=='string'||!id.trim())||new Set(ids).size!==ids.length)throw new TypeError('players must contain unique player ids');
  if(!state||typeof state!=='object'||Array.isArray(state))throw new TypeError('state must be an object');
  if(state.mode!==undefined&&state.mode!==mode)throw new TypeError('state.mode must match match mode');
  if(!Number.isSafeInteger(maxReceipts)||maxReceipts<1)throw new TypeError('maxReceipts must be >= 1');
  return {matchId,mode,status,revision:0,players:ids,state:clone(state),context,receipts:[],maxReceipts};
}

export function snapshotAuthoritativeMatch(match,reason=SNAPSHOT_REASON.BOOTSTRAP){
  return createMatchSnapshot({matchId:match.matchId,mode:match.mode,revision:match.revision,state:match.state,reason});
}

export function executeAuthoritativeCommand(match,input,{dispatch,createCommand}={}){
  if(typeof dispatch!=='function'||typeof createCommand!=='function')throw new TypeError('Frozen Core dispatch/createCommand are required');
  let envelope;
  try{envelope=createMatchCommandEnvelope(input)}catch(error){return {match,receipt:{type:'MATCH_COMMAND_REJECTED',accepted:false,matchId:match.matchId,actionId:input?.actionId??'invalid',revision:match.revision,events:[],rejection:{code:'INVALID_ENVELOPE',details:error.message},replayed:false}}}
  const prior=match.receipts.find(item=>item.actionId===envelope.actionId);
  if(prior)return {match,receipt:{...clone(prior.receipt),replayed:true}};
  if(envelope.matchId!==match.matchId)return rejection(match,envelope,'MATCH_ID_MISMATCH');
  if(envelope.mode!==match.mode)return rejection(match,envelope,'MODE_MISMATCH');
  if(!match.players.includes(envelope.actorId))return rejection(match,envelope,'ACTOR_NOT_IN_MATCH');
  if(terminal.has(match.status)||terminal.has(match.state?.status))return rejection(match,envelope,'MATCH_TERMINAL');
  if(envelope.expectedRevision!==match.revision)return rejection(match,envelope,envelope.expectedRevision<match.revision?'STALE_REVISION':'FUTURE_REVISION',{expected:match.revision,received:envelope.expectedRevision});

  const coreCommand=createCommand({type:envelope.command.type,actorId:envelope.actorId,payload:clone(envelope.command.payload)});
  const result=dispatch(match.state,coreCommand,match.context);
  if(!result?.accepted)return rejection(match,envelope,result?.rejection?.code??'CORE_REJECTED',result?.rejection?.details??null);

  const nextRevision=match.revision+1;
  const receipt=createCommandReceipt({accepted:true,matchId:match.matchId,actionId:envelope.actionId,revision:nextRevision,events:result.events??[]});
  const receipts=[...match.receipts,{actionId:envelope.actionId,receipt:clone(receipt)}].slice(-match.maxReceipts);
  const next={...match,state:clone(result.state),status:result.state?.status??match.status,revision:nextRevision,receipts};
  return {match:next,receipt};
}

export function reconcileAuthoritativeMatch(match,{revision}={}){
  if(revision===match.revision)return {inSync:true,revision:match.revision,snapshot:null};
  return {inSync:false,revision:match.revision,snapshot:snapshotAuthoritativeMatch(match,SNAPSHOT_REASON.DESYNC)};
}
