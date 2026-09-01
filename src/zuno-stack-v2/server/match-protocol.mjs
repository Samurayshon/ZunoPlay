const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const nonEmpty=(value,name)=>{if(typeof value!=='string'||!value.trim())throw new TypeError(`${name} must be a non-empty string`);return value};
const revision=(value,name='revision')=>{if(!Number.isSafeInteger(value)||value<0)throw new TypeError(`${name} must be a safe integer >= 0`);return value};
const serializable=value=>{JSON.stringify(value);return value};

export const MATCH_STATUS=Object.freeze({CREATED:'CREATED',PLAYING:'PLAYING',WON:'WON',LOST:'LOST',FINISHED:'FINISHED',ABORTED:'ABORTED'});
export const SERVER_MESSAGE=Object.freeze({ACCEPTED:'MATCH_COMMAND_ACCEPTED',REJECTED:'MATCH_COMMAND_REJECTED',SNAPSHOT:'MATCH_SNAPSHOT',RESULT:'MATCH_RESULT'});
export const SNAPSHOT_REASON=Object.freeze({BOOTSTRAP:'bootstrap',RECONNECT:'reconnect',DESYNC:'desync'});

export function createMatchCommandEnvelope({matchId,mode,actorId,actionId,expectedRevision,command}={}){
  nonEmpty(matchId,'matchId');nonEmpty(mode,'mode');nonEmpty(actorId,'actorId');nonEmpty(actionId,'actionId');revision(expectedRevision,'expectedRevision');
  if(!plain(command))throw new TypeError('command must be a plain object');
  if('score'in command||'result'in command||'reward'in command||'xp'in command)throw new TypeError('client command cannot declare score/result/reward/xp');
  if(typeof command.type!=='string'||!command.type.trim())throw new TypeError('command.type must be a non-empty string');
  if(command.actorId!==undefined&&command.actorId!==actorId)throw new TypeError('command.actorId must match envelope actorId');
  return serializable({matchId,mode,actorId,actionId,expectedRevision,command:{type:command.type,payload:plain(command.payload)?{...command.payload}:{}}});
}

export function createMatchSnapshot({matchId,mode,revision:rev,state,reason=SNAPSHOT_REASON.BOOTSTRAP}={}){
  nonEmpty(matchId,'matchId');nonEmpty(mode,'mode');revision(rev);if(!Object.values(SNAPSHOT_REASON).includes(reason))throw new TypeError('invalid snapshot reason');
  return serializable({type:SERVER_MESSAGE.SNAPSHOT,matchId,mode,revision:rev,reason,state:JSON.parse(JSON.stringify(state))});
}

export function createCommandReceipt({accepted,matchId,actionId,revision:rev,events=[],rejection=null,replayed=false}={}){
  return serializable({type:accepted?SERVER_MESSAGE.ACCEPTED:SERVER_MESSAGE.REJECTED,accepted:Boolean(accepted),matchId:nonEmpty(matchId,'matchId'),actionId:nonEmpty(actionId,'actionId'),revision:revision(rev),events:JSON.parse(JSON.stringify(events)),rejection:rejection?JSON.parse(JSON.stringify(rejection)):null,replayed:Boolean(replayed)});
}
