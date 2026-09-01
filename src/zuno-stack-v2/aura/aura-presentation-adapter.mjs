import {projectPublicAura} from './aura-projection.mjs';
import {getAuraVisualPreset} from './aura-presets.mjs';
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}return value;};
export function createAuraPresentation(authorityProjection,{profile='standard'}={}){
 const aura=projectPublicAura(authorityProjection,{reducedMotion:profile==='reduced-motion',lowEnd:profile==='low-end'});
 const preset=getAuraVisualPreset(aura.tier,profile);
 return deepFreeze({contractVersion:aura.contractVersion,authoritySource:aura.authoritySource,playerId:aura.playerId,tier:aura.tier,level:aura.level,profile,render:Object.freeze({pointerEvents:'none',layoutAffecting:false,properties:Object.freeze(['transform','opacity']),glow:preset.glow,particles:preset.particles,pulse:preset.pulse,depth:preset.depth}),competitiveEffects:false,authorityMutation:false,rankingMutation:false,rewardsEnabled:false,xpEnabled:false});
}
export function serializeAuraPresentation(authorityProjection,options){return JSON.stringify(createAuraPresentation(authorityProjection,options));}
