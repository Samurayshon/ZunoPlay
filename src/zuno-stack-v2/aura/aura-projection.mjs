import {AURA_AUTHORITY_SOURCE,AURA_CONTRACT_VERSION,assertAuraMatchesAuthorityProjection,deriveAuraTier} from './aura-contract.mjs';

const PRESENTATION=Object.freeze({
  origin:Object.freeze({emphasis:'none',motion:'none',layers:0}),
  signal:Object.freeze({emphasis:'subtle',motion:'none',layers:1}),
  pulse:Object.freeze({emphasis:'soft',motion:'low',layers:1}),
  vector:Object.freeze({emphasis:'defined',motion:'low',layers:2}),
  nexus:Object.freeze({emphasis:'signature',motion:'moderate',layers:2})
});

export function deriveAuraState(authorityProjection,{reducedMotion=false,lowEnd=false}={}){
  const validation=assertAuraMatchesAuthorityProjection(authorityProjection);
  if(!validation.eligible){const error=new Error(validation.reasons.join(','));error.code='AURA_AUTHORITY_PROJECTION_REJECTED';throw error;}
  const tier=deriveAuraTier(authorityProjection.authority);
  const base=PRESENTATION[tier.tier];
  const motion=reducedMotion||lowEnd?'none':base.motion;
  return Object.freeze({
    contractVersion:AURA_CONTRACT_VERSION,
    authoritySource:AURA_AUTHORITY_SOURCE,
    playerId:authorityProjection.playerId,
    level:tier.level,
    tier:tier.tier,
    intensity:lowEnd?Math.min(tier.intensity,2):tier.intensity,
    presentation:Object.freeze({emphasis:base.emphasis,motion,layers:lowEnd?Math.min(base.layers,1):base.layers}),
    competitiveEffects:false,
    authorityMutation:false,
    rankingMutation:false,
    rewardsEnabled:false,
    xpEnabled:false
  });
}

export function projectPublicAura(authorityProjection,options){const aura=deriveAuraState(authorityProjection,options);return Object.freeze({...aura});}
