import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const dryRun = fs.readFileSync('.github/workflows/supabase-production-dry-run.yml', 'utf8');
const apply = fs.readFileSync('.github/workflows/supabase-production-apply.yml', 'utf8');
const manifest = fs.readFileSync('supabase/approved-production-migrations.txt', 'utf8');

test('Supabase CLI is pinned in both production workflows', () => {
  assert.match(dryRun, /version: 2\.116\.0/);
  assert.match(apply, /version: 2\.116\.0/);
  assert.doesNotMatch(dryRun, /version:\s*latest/);
  assert.doesNotMatch(apply, /version:\s*latest/);
});

test('PR workflow uses dry-run and never applies migrations', () => {
  assert.match(dryRun, /supabase db push --dry-run/);
  assert.doesNotMatch(dryRun, /supabase db push 2>&1/);
  assert.match(dryRun, /Require exact approved pending migration set/);
});

test('Production apply requires manual dispatch and explicit gates', () => {
  assert.match(apply, /workflow_dispatch:/);
  assert.doesNotMatch(apply, /pull_request:/);
  assert.doesNotMatch(apply, /\npush:/);
  assert.match(apply, /github\.ref == 'refs\/heads\/main'/);
  assert.match(apply, /github\.actor == 'Samurayshon'/);
  assert.match(apply, /APPLY APPROVED MIGRATIONS/);
  assert.match(apply, /EXPECTED_SHA/);
  assert.match(apply, /environment: production/);
});

test('Production apply re-runs dry-run before and after db push', () => {
  const dryRunCalls = apply.match(/supabase db push --dry-run/g) ?? [];
  assert.equal(dryRunCalls.length, 2);
  assert.match(apply, /Require exact approved pending migration set/);
  assert.match(apply, /Post-apply verification/);
});

test('Approval manifest is comments-only by default', () => {
  const entries = manifest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(entries, []);
});
