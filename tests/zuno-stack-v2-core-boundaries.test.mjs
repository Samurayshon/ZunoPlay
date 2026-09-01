import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {extname,join,relative} from 'node:path';

const ROOT=new URL('../src/zuno-stack-v2/core/',import.meta.url);
const forbidden=[
  /\bwindow\b/,
  /\bdocument\b/,
  /\bMutationObserver\b/,
  /\bWebSocket\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bsupabase\b/i,
  /\bRealtime\b/,
  /\bMath\.random\b/,
  /\bDate\.now\b/,
  /\bplayerAuthority\b/i,
  /\branking\b/i,
  /\baura\b/i
];

async function files(dir){
  const out=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);
    if(entry.isDirectory())out.push(...await files(path));
    else if(extname(entry.name)==='.mjs')out.push(path);
  }
  return out;
}

const sourceFiles=await files(ROOT);
assert.ok(sourceFiles.length>=4,'Phase 1 Block 1 must expose an isolated executable core');

for(const file of sourceFiles){
  const source=await readFile(file,'utf8');
  const name=relative(ROOT.pathname,file);
  for(const pattern of forbidden)assert.doesNotMatch(source,pattern,`${name} contains forbidden dependency/token ${pattern}`);
  const imports=[...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map(match=>match[1]);
  for(const specifier of imports)assert.ok(specifier.startsWith('./')||specifier.startsWith('../'),`${name} imports non-local dependency ${specifier}`);
}

console.log('zuno stack v2 core dependency boundaries: ok');
