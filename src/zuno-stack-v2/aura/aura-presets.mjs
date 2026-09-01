export const AURA_PERFORMANCE_PROFILES=Object.freeze(['standard','reduced-motion','low-end']);
const freezePreset=p=>Object.freeze({...p,glow:Object.freeze(p.glow),particles:Object.freeze(p.particles),pulse:Object.freeze(p.pulse),depth:Object.freeze(p.depth)});
export const AURA_VISUAL_PRESETS=Object.freeze({
 origin:freezePreset({tier:'origin',glow:{opacity:0,scale:1},particles:{count:0,opacity:0},pulse:{enabled:false,amplitude:0},depth:{layers:0,offset:0}}),
 signal:freezePreset({tier:'signal',glow:{opacity:.16,scale:1.01},particles:{count:0,opacity:0},pulse:{enabled:false,amplitude:0},depth:{layers:1,offset:0}}),
 pulse:freezePreset({tier:'pulse',glow:{opacity:.24,scale:1.015},particles:{count:2,opacity:.18},pulse:{enabled:true,amplitude:.015},depth:{layers:1,offset:1}}),
 vector:freezePreset({tier:'vector',glow:{opacity:.32,scale:1.02},particles:{count:4,opacity:.22},pulse:{enabled:true,amplitude:.02},depth:{layers:2,offset:1}}),
 nexus:freezePreset({tier:'nexus',glow:{opacity:.4,scale:1.025},particles:{count:6,opacity:.26},pulse:{enabled:true,amplitude:.025},depth:{layers:2,offset:2}})
});
export function applyAuraPerformanceProfile(preset,profile='standard'){
 if(!AURA_PERFORMANCE_PROFILES.includes(profile))throw new TypeError('unsupported Aura performance profile');
 const reduced=profile==='reduced-motion',low=profile==='low-end';
 return freezePreset({tier:preset.tier,glow:{opacity:low?Math.min(preset.glow.opacity,.24):preset.glow.opacity,scale:reduced||low?1:preset.glow.scale},particles:{count:low?Math.min(preset.particles.count,2):preset.particles.count,opacity:low?Math.min(preset.particles.opacity,.18):preset.particles.opacity},pulse:{enabled:reduced||low?false:preset.pulse.enabled,amplitude:reduced||low?0:preset.pulse.amplitude},depth:{layers:low?Math.min(preset.depth.layers,1):preset.depth.layers,offset:low?0:preset.depth.offset}});
}
export function getAuraVisualPreset(tier,profile='standard'){const preset=AURA_VISUAL_PRESETS[tier];if(!preset)throw new TypeError('unsupported Aura tier');return applyAuraPerformanceProfile(preset,profile);}
