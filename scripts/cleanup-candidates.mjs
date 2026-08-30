import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignore=new Set(['.git','node_modules']);
const sourceExt=new Set(['.html','.js','.mjs','.css','.json','.md','.yml','.yaml','.sql','.ts','.java','.xml','.gradle']);
const nonFrontendPrefixes=['.github/','scripts/','tests/','qa/','supabase/','android-v0/','docs/'];
function walk(dir,rel=''){const out=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(ignore.has(ent.name))continue;const r=path.posix.join(rel,ent.name),abs=path.join(dir,ent.name);if(ent.isDirectory())out.push(...walk(abs,r));else out.push(r)}return out}
const files=walk(root);
const texts=new Map();
for(const f of files){if(!sourceExt.has(path.extname(f).toLowerCase())&&!['Dockerfile'].includes(path.basename(f)))continue;try{texts.set(f,fs.readFileSync(path.join(root,f),'utf8'))}catch{}}
function countToken(token){let n=0,refs=[];for(const [f,t] of texts){const esc=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=t.match(new RegExp(esc,'g'));if(m?.length){n+=m.length;refs.push(`${f}:${m.length}`)}}return{n,refs}}
const emptyPlaceholders=[];
for(const [f,t] of texts){if(!f.endsWith('.html'))continue;const re=/<(style|script)\b([^>]*\bid=["']([^"']+)["'][^>]*)>\s*<\/\1>/gi;let m;while((m=re.exec(t))){const tag=m[1].toLowerCase(),attrs=m[2];if(tag==='script'&&/\bsrc\s*=/i.test(attrs))continue;const id=m[3],usage=countToken(id);if(usage.n===1)emptyPlaceholders.push(`${f} :: ${tag}#${id} :: only occurrence`)}}
const zeroByte=files.filter(f=>{try{return fs.statSync(path.join(root,f)).size===0}catch{return false}}).sort();
const suspiciousNames=files.filter(f=>/(?:^|[-_.])(old|backup|bak|copy|temp|tmp|deprecated|legacy|final2)(?:[-_.]|$)/i.test(path.basename(f))).sort();
const consoleLogs=[];
for(const [f,t] of texts){if(!/\.(?:js|mjs|ts)$/.test(f))continue;const n=(t.match(/\bconsole\.(?:log|debug)\s*\(/g)||[]).length;if(n)consoleLogs.push(`${f}: ${n}`)}
const externalRefs=new Map();
const clientBootstraps=[];
for(const [f,t] of texts){if(nonFrontendPrefixes.some(prefix=>f.startsWith(prefix)))continue;if(!/\.(?:html|js|mjs|css)$/.test(f))continue;const urlRe=/https:\/\/[^"'`\s<>\)]+/g;for(const raw of t.match(urlRe)||[]){let u;try{u=new URL(raw.replace(/[;,]+$/,''))}catch{continue}const key=`${u.origin}${u.pathname}`;if(!externalRefs.has(key))externalRefs.set(key,new Set());externalRefs.get(key).add(f)}const createCount=(t.match(/\.createClient\s*\(/g)||[]).length;const globalClientCount=(t.match(/ZunoSupabaseClient\s*=/g)||[]).length;if(createCount||globalClientCount)clientBootstraps.push(`${f}: createClient=${createCount}, ZunoSupabaseClient assignments=${globalClientCount}`)}
const externalRows=[...externalRefs.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([url,refs])=>`${url}: ${[...refs].sort().join(', ')}`);
function section(title,rows){console.log(`\n=== ${title} (${rows.length}) ===`);if(!rows.length)console.log('none');else rows.forEach(x=>console.log(x))}
console.log(`Files scanned: ${files.length}`);
section('EMPTY HTML STYLE/SCRIPT PLACEHOLDERS WITH NO OTHER ID REFERENCE',emptyPlaceholders);
section('ZERO-BYTE FILES',zeroByte);
section('SUSPICIOUS LEGACY/TEMP/BACKUP FILENAMES',suspiciousNames);
section('CONSOLE.LOG/DEBUG COUNTS (REVIEW ONLY)',consoleLogs.sort());
section('EXTERNAL FRONTEND RUNTIME URLS (INVENTORY ONLY)',externalRows);
section('SUPABASE CLIENT BOOTSTRAP LOCATIONS (REVIEW ONLY)',clientBootstraps.sort());
