import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createCommand, createGameState, createModeRules, createPlayerState, createPrng, createRulesContext, transition } from '../core/index.js';

const rules = createModeRules({ id: 'core-test', playerCount: 1, allowedCommands: ['START_MATCH'] });
const makeState = () => createGameState({ mode: 'core-test', seed: 'seed-42', players: [createPlayerState({ playerId: 'p1' })] });

test('core executes without browser globals', () => {
  assert.equal(typeof window, 'undefined');
  const state = makeState();
  const result = transition(state, createCommand('START_MATCH', 'p1'), createRulesContext({ modeRules: rules, logicalTime: 1, rng: createPrng(state.seed) }));
  assert.equal(result.accepted, true);
  assert.equal(result.state.status, 'active');
});

test('same seed produces identical sequence', () => {
  const a = createPrng('zuno');
  const b = createPrng('zuno');
  assert.deepEqual(Array.from({ length: 20 }, () => a()), Array.from({ length: 20 }, () => b()));
});

test('invalid command does not mutate state', () => {
  const state = makeState();
  const before = JSON.stringify(state);
  const result = transition(state, createCommand('PICK_TILE', 'p1'), createRulesContext({ modeRules: rules, rng: createPrng(state.seed) }));
  assert.equal(result.accepted, false);
  assert.strictEqual(result.state, state);
  assert.equal(JSON.stringify(state), before);
});

test('canonical state is JSON serializable', () => {
  const state = makeState();
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test('core source contains no forbidden platform dependencies', () => {
  const root = path.resolve(import.meta.dirname, '../core');
  const forbidden = [/\bdocument\b/, /\bwindow\b/, /MutationObserver/, /localStorage/, /sessionStorage/, /supabase/i, /WebSocket/, /Realtime/, /Math\.random\s*\(/, /Date\.now\s*\(/, /PlayerAuthority/, /\bAura\b/, /\bRanking\b/];
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const pattern of forbidden) assert.equal(pattern.test(source), false, `${file} contains forbidden ${pattern}`);
  }
});
