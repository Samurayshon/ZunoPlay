import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../.github/workflows/android-v0-build.yml', import.meta.url),
  'utf8',
);

test('manual Android builds default to build-only without emulator execution', () => {
  assert.match(workflow, /run_runtime_smoke:/);
  assert.match(workflow, /default: false/);
  assert.match(
    workflow,
    /Runtime smoke test on Android 14\n\s+if: \(github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'\) \|\| inputs\.run_runtime_smoke/,
  );
});

test('the isolated V2 branch can run build-only CI on push', () => {
  assert.match(workflow, /branches:\n\s+- main\n\s+- codex\/android-icon-v2-a/);
});

test('APK release publication is restricted to a push on main', () => {
  assert.match(
    workflow,
    /Publish APK release\n\s+if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/,
  );
});
