import fs from 'node:fs';
import assert from 'node:assert/strict';

const activity = fs.readFileSync('android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');

assert.match(activity, /settings\.setUseWideViewPort\(true\)/, 'Android WebView must keep responsive wide viewport support');
assert.match(activity, /settings\.setLoadWithOverviewMode\(false\)/, 'Android WebView must not zoom the entire document to fit oversized content');
assert.doesNotMatch(activity, /settings\.setLoadWithOverviewMode\(true\)/, 'Android WebView overview-mode auto zoom must stay disabled');
assert.match(home, /name=["']viewport["'][^>]*width=device-width[^>]*initial-scale=1\.0[^>]*viewport-fit=cover/i, 'web shell must retain device-width viewport contract');

console.log('android webview framing guard: ok');
