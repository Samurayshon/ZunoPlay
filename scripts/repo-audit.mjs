import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const runtimeSourceExt=new Set(['.html','.js','.mjs','.css']);
const runtimeExt=new Set(['.html','.js','.mjs','.css','.svg','.webp','.png','.json','.txt']);
const ignoreDirs=new Set(['.git','node_modules']);
const canonicalRoots=new Set([
  'index.html','entrada.html','login.html','cadastro.html','perfil.html','avatar.html','amigos.html',
  'conversas.html','notificacoes.html','comunidades.html','salas.html','sala.html','jogos.html',
  'historico.html','momentos.html','zuno-stack.html','manifest.json','sw.js','nav.js',
  'icon-192.png','icon-512.png','zuno-app-icon.svg'
]);

function walk(dir,rel=''){
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoreDirs.has(ent.name))continue;
    const r=path.posix.join(rel,ent.name),abs=path.join(dir,ent.name);
    if(ent.isDirectory())out.push(...walk(abs,r));else out.push(r);
  }
  return out;
}
const files=walk(root),fileSet=new Set(files);
const runtimeInbound=new Map(files.map(f=>[f,new Set()]));
const broken=new Set(),versionedRefs=new Set(),rpcCalls=new Map();

function norm(from,raw){
  let value=String(raw||'').trim();
  if(!value||/^(?:https?:|data:|mailto:|javascript:|#)/i.test(value))return null;
  if(/[|*\\{}\[\]]/.test(value)||value.includes('${')||value.includes('`'))return null;
  value=value.split('#',1)[0].split('?',1)[0];
  if(!value)return null;
  if(value.startsWith('/'))value=value.slice(1);else value=path.posix.normalize(path.posix.join(path.posix.dirname(from),value));
  if(value.startsWith('../'))return null;
  return value.replace(/^\.\//,'');
}

// Conservative dependency graph: any exact local runtime filename literal counts as an inbound reference.
const quoted=/["'`]((?:\.?\.?\/|\/)?[^"'`\s<>]+\.(?:html|js|mjs|css|svg|webp|png|json|txt)(?:\?[^"'`\s<>]*)?)["'`]/gi;
const cssUrl=/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi;
// Broken-reference checks use only syntactic contexts that actually load/navigate to a resource.
const loaders=[
  /(?:src|href)\s*=\s*["']([^"']+)["']/gi,
  /(?:location\.(?:href|replace)|window\.location\.href)\s*(?:=|\()\s*["']([^"']+)["']/gi,
  /new\s+URL\(\s*["']([^"']+)["']/gi,
  /(?:\.src|\.href)\s*=\s*["']([^"']+)["']/gi,
  /(?:fetch|import)\(\s*["']([^"']+)["']/gi,
  /\b(?:js|css|load)\(\s*["'][^"']*["']\s*,\s*["']([^"']+)["']/gi,
  cssUrl
];

for(const f of files){
  const ext=path.extname(f).toLowerCase();
  if(!runtimeSourceExt.has(ext)||f.startsWith('.github/')||f.startsWith('scripts/'))continue;
  let text='';try{text=fs.readFileSync(path.join(root,f),'utf8')}catch{continue}
  for(const re of [quoted,cssUrl]){
    re.lastIndex=0;let m;
    while((m=re.exec(text))){
      const raw=m[1],target=norm(f,raw);if(!target)continue;
      if(/\?v=\d+/i.test(raw))versionedRefs.add(`${f} -> ${raw}`);
      // Service Worker cache membership alone does not make an asset part of the active runtime graph.
      if(fileSet.has(target)&&f!=='sw.js')runtimeInbound.get(target)?.add(f);
    }
  }
  for(const re of loaders){
    re.lastIndex=0;let m;
    while((m=re.exec(text))){
      const raw=m[1],target=norm(f,raw);if(!target)continue;
      const targetExt=path.extname(target).toLowerCase();
      if(runtimeExt.has(targetExt)&&!fileSet.has(target))broken.add(`${f} -> ${target}`);
    }
  }
  const rpc=/\.rpc\(\s*["']([^"']+)["']/g;let rm;
  while((rm=rpc.exec(text))){if(!rpcCalls.has(rm[1]))rpcCalls.set(rm[1],new Set());rpcCalls.get(rm[1]).add(f)}
}

const rootRuntime=files.filter(f=>!f.includes('/')&&runtimeExt.has(path.extname(f).toLowerCase()));
const orphanRoot=rootRuntime.filter(f=>!canonicalRoots.has(f)&&(runtimeInbound.get(f)?.size||0)===0).sort();
const swOnly=rootRuntime.filter(f=>!canonicalRoots.has(f)&&(runtimeInbound.get(f)?.size||0)===0&&new RegExp(`["']\\.?\\/?${f.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\?[^"']*)?["']`).test(fs.readFileSync('sw.js','utf8'))).sort();

const hashes=new Map();
for(const f of files){const ext=path.extname(f).toLowerCase();if(!runtimeExt.has(ext))continue;const buf=fs.readFileSync(path.join(root,f));if(!buf.length)continue;const h=crypto.createHash('sha256').update(buf).digest('hex');if(!hashes.has(h))hashes.set(h,[]);hashes.get(h).push(f)}
const exactDup=[...hashes.values()].filter(v=>v.length>1).sort((a,b)=>b.length-a.length);

const versionFamilies=new Map();
for(const f of rootRuntime){const m=f.match(/^(.*?)(?:[-_.]v)(\d+)(\.[^.]+)$/i);if(!m)continue;const key=(m[1]+m[3]).toLowerCase();if(!versionFamilies.has(key))versionFamilies.set(key,[]);versionFamilies.get(key).push({file:f,v:Number(m[2])})}
const multiVersions=[...versionFamilies.values()].filter(v=>v.length>1).map(v=>v.sort((a,b)=>a.v-b.v));

const sw=fs.existsSync('sw.js')?fs.readFileSync('sw.js','utf8'):'',nav=fs.existsSync('nav.js')?fs.readFileSync('nav.js','utf8'):'',current=fs.existsSync('zuno-current.js')?fs.readFileSync('zuno-current.js','utf8'):'';
const navV=nav.match(/const\s+V=['"](\d+)['"]/)?.[1]||null,swV=sw.match(/CACHE_NAME\s*=\s*["']zunoplay-v(\d+)["']/)?.[1]||null,curV=current.match(/const\s+VERSION=['"](\d+)['"]/)?.[1]||null;
const staleSwVersionRefs=[...versionedRefs].filter(x=>x.startsWith('sw.js -> ')).filter(x=>{const m=x.match(/\?v=(\d+)/);return m&&swV&&m[1]!==swV}).sort();
const generationMismatch=[navV,swV,curV].every(Boolean)&&new Set([navV,swV,curV]).size>1;

function section(title,values){console.log(`\n=== ${title} (${values.length}) ===`);if(!values.length)console.log('none');else for(const v of values)console.log(Array.isArray(v)?v.map(x=>typeof x==='string'?x:x.file).join(' | '):v)}
console.log(`Files scanned: ${files.length}`);console.log(`Frontend versions: nav=${navV||'?'} sw=${swV||'?'} current=${curV||'?'}`);
section('BROKEN ACTIVE LOCAL REFERENCES',[...broken].sort());
section('ROOT RUNTIME FILES WITH NO ACTIVE INBOUND REFERENCE',orphanRoot);
section('SW-ONLY ROOT ASSETS',swOnly);
section('EXACT DUPLICATE FILE CONTENT',exactDup);
section('MULTIPLE VERSION FAMILIES',multiVersions);
section('STALE ?v= REFERENCES IN SERVICE WORKER',staleSwVersionRefs);
section('FRONTEND RPC CALLS',[...rpcCalls.entries()].sort().map(([name,refs])=>`${name}: ${[...refs].sort().join(', ')}`));
if(generationMismatch||broken.size||staleSwVersionRefs.length)process.exitCode=2;
