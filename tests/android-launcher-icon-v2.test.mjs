import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Android manifest keeps both launcher icon entry points', () => {
  const manifest = read('android-v0/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
});

test('adaptive launcher icons use the approved V2 background and canonical Zuno foreground', () => {
  for (const resource of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const xml = read(`android-v0/app/src/main/res/mipmap-anydpi-v26/${resource}`);
    assert.match(xml, /@drawable\/zuno_app_icon_background_v2/);
    assert.match(xml, /@drawable\/zuno_app_icon_foreground/);
  }
});

test('proposal A keeps a close-up safe framing and its premium contrast signature', () => {
  const foreground = read('android-v0/app/src/main/res/drawable/zuno_app_icon_foreground.xml');
  const background = read('android-v0/app/src/main/res/drawable/zuno_app_icon_background_v2.xml');

  assert.match(foreground, /approved proposal A \(Close-up Premium\)/);
  assert.match(foreground, /android:scaleX="0\.86"/);
  assert.match(foreground, /android:scaleY="0\.86"/);
  assert.match(foreground, /#22D3EE/);
  assert.match(foreground, /#A855F7/);
  assert.match(background, /#111B36/);
  assert.match(background, /#090B18/);
  assert.match(background, /#21103B/);
  assert.match(background, /Soft brand halo behind Zuno/);
});

test('legacy and round launchers retain masked gradient fallbacks', () => {
  const legacy = read('android-v0/app/src/main/res/drawable/zuno_app_icon_legacy.xml');
  const round = read('android-v0/app/src/main/res/drawable/zuno_app_icon_round.xml');

  assert.match(legacy, /android:radius="24dp"/);
  assert.match(legacy, /android:type="linear"/);
  assert.match(round, /android:shape="oval"/);
  assert.match(round, /android:type="linear"/);
});

test('the V2 APK version is distinct from the installed 0.0.5 validation build', () => {
  const gradle = read('android-v0/app/build.gradle');
  assert.match(gradle, /versionCode 7/);
  assert.match(gradle, /versionName '0\.0\.6'/);
});
