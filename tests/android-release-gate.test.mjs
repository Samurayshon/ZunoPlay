import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/android-v0-build.yml','utf8');

assert.match(workflow,/workflow_dispatch:[\s\S]*?release_authorization:/,'Android release workflow must require an explicit dispatch authorization input');
assert.match(workflow,/Publish APK release[\s\S]*?if:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*inputs\.release_authorization\s*==\s*'PUBLICAR APK ZUNOPLAY'/,'APK publication must be impossible on ordinary main pushes');
assert.match(workflow,/push:[\s\S]*?branches:[\s\S]*?- main/,'ordinary main pushes may continue validating Android changes');

console.log('android release gate: ok');
