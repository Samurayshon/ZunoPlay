import {RANKING_SUPPORTED_MODES,deriveRankingFacts,rankingProcessingKey,validateVerifiedResultForRanking} from './ranking-contract.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const stable=value=>JSON.stringify(value,Object.keys(value??{}).sort());
export function createRankingStore(){return {processed:{},standings:{},history:[]};}
const ladderKey=(seasonId,mode)=>`${seasonId}:${mode}`;
const ensureLadder=(store,seasonId,mode)=>store.standings[ladderKey(seasonId,mode)]??={};
export function processVerifiedRankingResult(store,{season,result,blockingAntiFarmFlags=[]}={}){
 if(!store||!season)throw new TypeError('ranking store and trusted season required');
 const validation=validateVerifiedResultForRanking(result,{season,blockingAntiFarmFlags});
 if(!validation.eligible)return {store,applied:false,replayed:false,rejection:{code:'RANKING_INELIGIBLE',reasons:[...validation.reasons]}};
 const key=rankingProcessingKey({season,result});const fingerprint=stable(result);const existing=store.processed[key];
 if(existing){if(existing.fingerprint!==fingerprint)return {store,applied:false,replayed:false,rejection:{code:'RANKING_RESULT_COLLISION',reasons:['PROCESSED_RESULT_CHANGED']}};return {store,applied:false,replayed:true,receipt:clone(existing.receipt)};}
 const facts=deriveRankingFacts(result);const next=clone(store);const ladder=ensureLadder(next,season.seasonId,result.mode);const deltas={};
 for(const playerId of result.players){const delta=Number(facts.deltas[playerId]??0);const current=ladder[playerId]??{playerId,points:0,matches:0,wins:0,lastFinishedAt:null,bestRemainingTiles:null};const win=result.mode==='pvp'&&delta>0;ladder[playerId]={...current,points:current.points+delta,matches:current.matches+1,wins:current.wins+(win?1:0),lastFinishedAt:result.finishedAt,bestRemainingTiles:facts.tieBreak.remainingTiles===undefined?current.bestRemainingTiles:(current.bestRemainingTiles===null?facts.tieBreak.remainingTiles:Math.min(current.bestRemainingTiles,facts.tieBreak.remainingTiles))};deltas[playerId]=delta;}
 const antiFarmSignals=Array.isArray(result.antiFarmFlags)?[...result.antiFarmFlags]:[];const receipt={key,seasonId:season.seasonId,formulaVersion:season.formulaVersion,mode:result.mode,matchId:result.matchId,deltas,antiFarmSignals};
 next.processed[key]={fingerprint,receipt:clone(receipt)};next.history.push({key,seasonId:season.seasonId,formulaVersion:season.formulaVersion,matchId:result.matchId,mode:result.mode,players:[...result.players],startedAt:result.startedAt,finishedAt:result.finishedAt,result:result.result,score:result.score??null,winnerId:result.winnerId??null,deltas:clone(deltas),tieBreak:clone(facts.tieBreak),antiFarmSignals});
 return {store:next,applied:true,replayed:false,receipt};
}
export function getRankingStandings(store,{seasonId,mode}={}){if(!RANKING_SUPPORTED_MODES.includes(mode))throw new Error('UNSUPPORTED_MODE');const ladder=Object.values(store.standings[ladderKey(seasonId,mode)]??{});return clone(ladder.sort((a,b)=>b.points-a.points||(b.wins??0)-(a.wins??0)||(a.bestRemainingTiles??Number.MAX_SAFE_INTEGER)-(b.bestRemainingTiles??Number.MAX_SAFE_INTEGER)||(a.lastFinishedAt??Number.MAX_SAFE_INTEGER)-(b.lastFinishedAt??Number.MAX_SAFE_INTEGER)||a.playerId.localeCompare(b.playerId)).map((row,index)=>({...row,position:index+1})));}
export function getRankingHistory(store,{seasonId,mode}={}){return clone(store.history.filter(item=>(seasonId===undefined||item.seasonId===seasonId)&&(mode===undefined||item.mode===mode)));}
