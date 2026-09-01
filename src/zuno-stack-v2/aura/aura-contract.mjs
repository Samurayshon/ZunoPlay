export const AURA_CONTRACT_VERSION='aura-r1';
export const AURA_AUTHORITY_SOURCE='player-authority-r1';
export const AURA_TIERS=Object.freeze([
  Object.freeze({level:1,tier:'origin',minAuthority:0,intensity:0}),
  Object.freeze({level:2,tier:'signal',minAuthority:25,intensity:1}),
  Object.freeze({level:3,tier:'pulse',minAuthority:75,intensity:2}),
  Object.freeze({level:4,tier:'vector',minAuthority:175,intensity:3}),
  Object.freeze({level:5,tier:'nexus',minAuthority:350,intensity:4})
]);
const FORBIDDEN_INPUT_FIELDS=Object.freeze(['aura','auraTier','auraLevel','auraState','intensity','effects','rank','position','xp','reward','rewards']);
export function validateAuraAuthorityProjection(projection){const reasons=[];if(!projection||typeof projection!=='object')return Object.freeze({eligible:false,reasons:Object.freeze(['PLAYER_AUTHORITY_PROJECTION_REQUIRED'])});if(typeof projection.playerId!=='string'||!projection.playerId.trim())reasons.push('PLAYER_ID_REQUIRED');if(!Number.isSafeInteger(projection.authority)||projection.authority<0)reasons.push('INVALID_AUTHORITY');if(!Number.isSafeInteger(projection.level)||projection.level<1||projection.level>5)reasons.push('INVALID_AUTHORITY_LEVEL');if(typeof projection.tier!=='string'||!AURA_TIERS.some(item=>item.tier===projection.tier))reasons.push('INVALID_AUTHORITY_TIER');if(FORBIDDEN_INPUT_FIELDS.some(key=>Object.prototype.hasOwnProperty.call(projection,key)))reasons.push('CLIENT_AURA_FIELD_FORBIDDEN');return Object.freeze({eligible:reasons.length===0,reasons:Object.freeze(reasons)});}
export function deriveAuraTier(authority){if(!Number.isSafeInteger(authority)||authority<0)throw new TypeError('authority must be a non-negative safe integer');let selected=AURA_TIERS[0];for(const candidate of AURA_TIERS)if(authority>=candidate.minAuthority)selected=candidate;return selected;}
export function assertAuraMatchesAuthorityProjection(projection){const validation=validateAuraAuthorityProjection(projection);if(!validation.eligible)return validation;const derived=deriveAuraTier(projection.authority);const matches=projection.level===derived.level&&projection.tier===derived.tier;return Object.freeze({eligible:matches,reasons:Object.freeze(matches?[]:['AUTHORITY_PROJECTION_MISMATCH'])});}
