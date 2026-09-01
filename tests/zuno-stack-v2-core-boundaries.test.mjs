import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root='src/zuno-stack-v2/core';
const files=fs.readdirSync(root).filter(name=>name.endsWith('.mjs')).sort();
assert.ok(files.length>=4,'core block 1 source files must exist');

const forbidden=[
  [/\bdocument\s*[.[]/,'DOM document'],
  [/\bwindow\s*[.[]/,'browser window'],
  [/\blocalStorage\b/,'localStorage'],
  [/\bsessionStorage\b/,'sessionStorage'],
  [/\bsupabase\b/i,'Supabase'],
  [/\bRealtime\b/,'Realtime'],
  [/\bWebSocket\b/,'WebSocket'],
  [/\bEventSource\b/,'EventSource'],
  [/\bMutationObserver\b/,'MutationObserver'],
  [/\bfetch\s*\(/,'network fetch'],
  [/\bsetInterval\s*\(/,'polling interval'],
  [/\bsetTimeout\s*\(/,'timer authority'],
  [/\brequestAnimationFrame\s*\(/,'render loop'],
  [/Math\.random\s*\(/,'implicit randomness'],
  [/Date\.now\s*\(/,'client clock authority'],
  [/\bplayerAuthority\b/i,'Player Authority'],
  [/\branking\b/i,'Ranking'],
  [/\baura\b/i,'Aura']
];

for(const name of files){
  const source=fs.readFileSync(path.join(root,name),'utf8');
  for(const [pattern,label] of forbidden)assert.doesNotMatch(source,pattern,`${name} must not depend on ${label}`);
  for(const match of source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)){
    assert.ok(match[2].startsWith('./')||match[2].startsWith('../'),`${name} must not import external/platform dependency: ${match[2]}`);
  }
}

console.log('zuno stack v2 core boundaries: ok');
