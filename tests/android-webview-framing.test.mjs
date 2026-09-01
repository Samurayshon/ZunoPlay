import fs from 'node:fs';
import assert from 'node:assert/strict';

const activity = fs.readFileSync('android-v0/app/src/main/java/com/zunoplay/app/MainActivity.java', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');

assert.match(activity, /settings\.setUseWideViewPort\(true\)/, 'Android WebView must keep responsive wide viewport support');
assert.match(activity, /settings\.setLoadWithOverviewMode\(false\)/, 'Android WebView must preserve normal mobile browser scale');
assert.doesNotMatch(activity, /settings\.setLoadWithOverviewMode\(true\)/, 'overview auto zoom must stay disabled');
assert.doesNotMatch(activity, /setDecorFitsSystemWindows\(false\)/, 'minimal shell must let Android fit content inside system bars');
assert.doesNotMatch(activity, /setOnApplyWindowInsetsListener/, 'minimal shell must not add a second native inset layer');
assert.doesNotMatch(activity, /setPadding\(/, 'minimal shell must not reshape the web viewport with native padding');
assert.match(activity, /webView\.loadUrl\(START_URL\)/, 'APK must load the canonical web mobile app directly');
assert.match(activity, /Color\.rgb\(2, 4, 13\)/, 'native surfaces must share the web base background');
assert.match(home, /name=["']viewport["'][^>]*width=device-width[^>]*initial-scale=1\.0[^>]*viewport-fit=cover/i, 'web app must retain device-width viewport contract');

console.log('android webview framing guard: ok');
