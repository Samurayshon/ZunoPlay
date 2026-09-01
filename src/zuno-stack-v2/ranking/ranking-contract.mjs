export const RANKING_FORMULA_VERSION='ranking-r1';
export const RANKING_MODE=Object.freeze({SOLO:'solo',TRIO:'trio',PVP:'pvp'});
export const RANKING_SUPPORTED_MODES=Object.freeze(Object.values(RANKING_MODE));
export const PVP_POINTS=Object.freeze({WIN:3,LOSS:0});
const clone=value=>JSON.parse(JSON.stringify(value));

export function createRankingSeason({seasonId,startsAt=0,endsAt=null,formulaVersion=RANKING_FORMULA_VERSION}={}){
 if(typeof seasonId!=='string'||!seasonId.trim())throw new TypeError('seasonId must be a non-empty server-owned string');
 if(!Number.isSafeInteger(startsAt)||startsAt<0)throw new TypeError('startsAt must be a safe integer >= 0');
 if(endsAt!==null&&(!Number.isSafeInteger(endsAt)||endsAt<=startsAt))throw new TypeError('endsAt must be null or > startsAt');
 return Object.freeze({seasonId,startsAt,endsAt,formulaVersion});
}
export function rankingProcessingKey({season,result,formulaVersion=season?.formulaVersion}={}){
 if(!season||!result)return null;
 return `${season.seasonId}:${result.mode}:${result.matchId}:${formulaVersion}`;
}
export function validateVerifiedResultForRanking(result,{season,blockingAntiFarmFlags=[]}={}){
 const reasons=[];
 if(!result||typeof result!=='object')reasons.push('VERIFIED_RESULT_REQUIRED');
 else{
  if(result.type!=='MATCH_RESULT'||result.valid!==true)reasons.push('VERIFIED_RESULT_REQUIRED');
  if(typeof result.matchId!=='string'||!result.matchId.trim())reasons.push('MATCH_ID_REQUIRED');
  if(!RANKING_SUPPORTED_MODES.includes(result.mode))reasons.push('UNSUPPORTED_MODE');
  if(!Array.isArray(result.players)||result.players.length<1||new Set(result.players).size!==result.players.length)reasons.push('INVALID_PARTICIPANTS');
  if(!Number.isSafeInteger(result.startedAt)||!Number.isSafeInteger(result.finishedAt)||result.finishedAt<result.startedAt)reasons.push('INVALID_AUTHORITATIVE_TIME');
  if(season&&(result.finishedAt<season.startsAt||(season.endsAt!==null&&result.finishedAt>=season.endsAt)))reasons.push('OUTSIDE_SEASON');
  const flags=Array.isArray(result.antiFarmFlags)?result.antiFarmFlags:[];
  if(flags.some(flag=>blockingAntiFarmFlags.includes(flag)))reasons.push('BLOCKING_ANTI_FARM_FLAG');
 }
 return Object.freeze({eligible:reasons.length===0,reasons:Object.freeze(reasons)});
}
export function deriveRankingFacts(result){
 const performance=Array.isArray(result.performance)?result.performance:[];
 const byPlayer=Object.fromEntries(performance.map(item=>[item.playerId,clone(item)]));
 if(result.mode===RANKING_MODE.SOLO){const id=result.players[0];return {deltas:{[id]:Number(byPlayer[id]?.score??result.score??0)},tieBreak:{remainingTiles:Number(byPlayer[id]?.remainingTiles??0),finishedAt:result.finishedAt}};}
 if(result.mode===RANKING_MODE.TRIO){const delta=Number(result.score??performance.reduce((sum,item)=>sum+Number(item.score??0),0));return {deltas:Object.fromEntries(result.players.map(id=>[id,delta])),tieBreak:{remainingTiles:performance.reduce((sum,item)=>sum+Number(item.remainingTiles??0),0),finishedAt:result.finishedAt}};}
 if(result.mode===RANKING_MODE.PVP){const winnerId=result.winnerId??(result.result==='won'?result.players[0]:null);if(!winnerId||!result.players.includes(winnerId))throw new Error('PVP_SERVER_WINNER_REQUIRED');return {deltas:Object.fromEntries(result.players.map(id=>[id,id===winnerId?PVP_POINTS.WIN:PVP_POINTS.LOSS])),tieBreak:{verifiedScore:Number(result.score??0),finishedAt:result.finishedAt}};}
 throw new Error('UNSUPPORTED_MODE');
}
