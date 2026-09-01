import {TRAY_CAPACITY,createCoreTransitions,createModeRules,createRulesContext} from '../core/index.mjs';
import {createSoloBoard,DEFAULT_SOLO_BOARD} from '../solo/solo-rules.mjs';

export const PVP_MODE='pvp';
export const PVP_RULESET_VERSION='pvp-1x1-r2';
export const PVP_STATUS=Object.freeze({FORMING:'forming',PREPARING:'preparing',READY_CHECK:'ready_check',COUNTDOWN:'countdown',PLAYING:'playing',RESOLVING:'resolving',FINISHED:'finished'});
export const PVP_COMMAND=Object.freeze({PRESSURE:'PVP_PRESSURE'});
export const DEFAULT_PVP_BOARD=DEFAULT_SOLO_BOARD;
export const PVP_COUNTDOWN_TICKS=3;
export const PVP_INTERFERENCE=Object.freeze({pressure:{cost:1,maxPendingPerTarget:2,cooldownRevisions:2,effect:'NEXT_VALID_PICK_PRESSURE',durationCommands:1}});

export function createPvpBoard(config=DEFAULT_PVP_BOARD,seed='pvp-seed',ownerId='player'){
  const base=createSoloBoard(config,seed);
  const prefix=`${ownerId}:`;
  const idMap=new Map(base.tiles.map(tile=>[tile.id,`${prefix}${tile.id}`]));
  return {...base,tiles:base.tiles.map(tile=>({...tile,id:idMap.get(tile.id),meta:{...tile.meta,ownerId}})),blockersByTile:Object.fromEntries(Object.entries(base.blockersByTile).map(([tileId,refs])=>[idMap.get(tileId),refs.map(ref=>idMap.get(ref))])),meta:{...base.meta,mode:PVP_MODE,ownerId}};
}
export function createPvpRules(){const rules=createModeRules({modeId:PVP_MODE,playerSlots:2,transitions:createCoreTransitions()});rules.progression={scorePerTrio:100,comboStep:1,comboResetOnPickWithoutTrio:false,pulsePerTrio:1,pulseMax:10,pulseUseCost:1};return rules}
export function createPvpRulesContext(){return createRulesContext({rules:createPvpRules(),config:{trayCapacity:TRAY_CAPACITY,resources:{}}})}
export function isPvpPlayerComplete(player){return player.board.tiles.every(tile=>tile.removed)&&player.tray.length===0}
export function getPvpWinnerId(state){const completed=state.players.filter(isPvpPlayerComplete);if(completed.length===1)return completed[0].playerId;if(completed.length>1)return [...completed].sort((a,b)=>(b.score??0)-(a.score??0)||a.playerId.localeCompare(b.playerId))[0].playerId;return null}
export function evaluatePvpStatus(state){return getPvpWinnerId(state)?PVP_STATUS.RESOLVING:PVP_STATUS.PLAYING}
