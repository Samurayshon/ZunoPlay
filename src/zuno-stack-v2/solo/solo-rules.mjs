import {createCoreTransitions,createModeRules,createRulesContext,getAvailableTileIds,TRAY_CAPACITY} from '../core/index.mjs';

export const SOLO_MODE='solo';
export const SOLO_RULESET_VERSION='solo-basic-r1';
export const SOLO_STATUS=Object.freeze({CREATED:'CREATED',PLAYING:'PLAYING',WON:'WON',LOST:'LOST'});

export function createSoloRules(){
  const rules=createModeRules({modeId:SOLO_MODE,playerSlots:1,transitions:createCoreTransitions()});
  rules.progression={scorePerTrio:100,comboStep:1,comboResetOnPickWithoutTrio:false,pulsePerTrio:1,pulseMax:10};
  return rules;
}
export function createSoloRulesContext(){return createRulesContext({rules:createSoloRules()});}
export function evaluateSoloStatus(state){
  const player=state.players[0];
  if(!player)return SOLO_STATUS.LOST;
  const remaining=player.board.tiles.filter(tile=>!tile.removed).length;
  if(remaining===0&&player.tray.length===0)return SOLO_STATUS.WON;
  if(player.tray.length>=TRAY_CAPACITY)return SOLO_STATUS.LOST;
  if(remaining>0&&getAvailableTileIds(player.board).length===0)return SOLO_STATUS.LOST;
  return SOLO_STATUS.PLAYING;
}
