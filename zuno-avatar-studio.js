export const ZUNO_AVATAR_STUDIO_VERSION='1.6.0';
export const ZUNO_BASE_AVATAR_ID='zuno-base-v1';
export const ZUNO_RIG_ID='zuno-humanoid-v1';
export const ZUNO_AVATAR_MANIFEST='./assets/avatar/zuno-base-v1/manifest.json';
export const ZUNO_AVATAR_SCHEMA=Object.freeze({body:['body','skin','morphs'],face:['morphs'],hair:['hair','hairColor'],wardrobe:['garments'],footwear:['garments'],accessories:['head','face','neck','back']});
export function normalizeAvatarConfig(input={}){return{studio:'zuno-avatar-studio',studioVersion:ZUNO_AVATAR_STUDIO_VERSION,baseAvatar:input.baseAvatar||ZUNO_BASE_AVATAR_ID,rig:input.rig||ZUNO_RIG_ID,style:'zuno-base-v1',body:input.body||'male',skin:input.skin||'#e7b18b',hair:input.hair||'none',hairColor:input.hairColor||'#111827',head:input.head||'none',face:input.face||'none',neck:input.neck||'none',back:input.back||'none',morphs:{...(input.morphs||{})},garments:{...(input.garments||{})},updatedAt:input.updatedAt||new Date().toISOString()}}
export function serializeAvatarConfig(state){return normalizeAvatarConfig({...state,updatedAt:new Date().toISOString()})}
export async function loadBaseAvatarManifest(){const res=await fetch(ZUNO_AVATAR_MANIFEST,{cache:'no-store'});if(!res.ok)throw new Error(`Manifesto do Zuno Base Avatar indisponível (${res.status})`);return res.json()}
window.ZunoAvatarStudio={version:ZUNO_AVATAR_STUDIO_VERSION,baseAvatar:ZUNO_BASE_AVATAR_ID,rig:ZUNO_RIG_ID,manifest:ZUNO_AVATAR_MANIFEST,schema:ZUNO_AVATAR_SCHEMA,normalizeAvatarConfig,serializeAvatarConfig,loadBaseAvatarManifest};