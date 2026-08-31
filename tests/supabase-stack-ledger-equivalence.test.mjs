import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const equivalences = JSON.parse(fs.readFileSync(path.join(root, 'scripts/zuno-stack-ledger-equivalences.json'), 'utf8'));
const expected = {
  '20260830190000': { productionVersion: '20260831063921', name: 'zuno_stack_basic_trio_helper' },
  '20260830200000': { productionVersion: '20260831063945', name: 'zuno_stack_post_trio_scoring_helper' },
  '20260830210000': { productionVersion: '20260831064010', name: 'zuno_stack_pulse_helper' },
  '20260830220000': { productionVersion: '20260831064030', name: 'zuno_stack_tray_finish_helper' },
  '20260830230000': { productionVersion: '20260831064047', name: 'zuno_stack_score_cap_helper' },
  '20260830240000': { productionVersion: '20260831064103', name: 'zuno_stack_relay_send_score_cap_helper' },
  '20260830250000': { productionVersion: '20260831064119', name: 'zuno_stack_pulse_shift_score_cap_helper' },
};

test('Stack validated historical versions map only to the seven canonical production versions', () => {
  assert.deepEqual(equivalences, expected);
});

test('all seven canonical production migration files exist with matching names', () => {
  for (const { productionVersion, name } of Object.values(expected)) {
    const file = path.join(root, 'supabase/migrations', `${productionVersion}_${name}.sql`);
    assert.equal(fs.existsSync(file), true, `missing ${path.basename(file)}`);
  }
});

test('historical duplicate Stack migration files are absent after canonical retimestamping', () => {
  for (const [historicalVersion, { name }] of Object.entries(expected)) {
    const file = path.join(root, 'supabase/migrations', `${historicalVersion}_${name}.sql`);
    assert.equal(fs.existsSync(file), false, `historical duplicate still exists: ${path.basename(file)}`);
  }
});
