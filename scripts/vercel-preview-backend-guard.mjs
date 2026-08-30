#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROD_REF = 'rliymfbbhqoejgfvsbuu';
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const SKIP_DIRS = new Set(['.git', '.github', '.vercel', 'android-v0', 'docs', 'node_modules', 'scripts', 'supabase']);
const EXTENSIONS = new Set(['.html', '.js', '.mjs']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function findProductionBackendRefs() {
  return walk(ROOT).flatMap((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(PROD_REF) && !content.includes(PROD_URL)) return [];
    return [path.relative(ROOT, file)];
  });
}

function isPublishableKey(value) {
  if (!value) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('eyJ');
}

function validateVercelEnvironment(env = process.env) {
  const vercelEnv = String(env.VERCEL_ENV || '').toLowerCase();
  if (vercelEnv === 'production') {
    throw new Error('Vercel production is forbidden: GitHub Pages is the canonical ZunoPlay production host.');
  }

  const url = String(env.ZUNO_SUPABASE_URL || '').trim();
  const key = String(env.ZUNO_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url || !key) throw new Error('Preview/Staging requires explicit ZUNO_SUPABASE_URL and ZUNO_SUPABASE_PUBLISHABLE_KEY.');
  if (url.includes(PROD_REF)) throw new Error('Preview/Staging must not use the production Supabase project.');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) throw new Error('ZUNO_SUPABASE_URL is not a valid Supabase project URL.');
  if (!isPublishableKey(key)) throw new Error('Preview/Staging requires a publishable/anon-compatible client key, never a service-role/secret key.');

  const refs = findProductionBackendRefs();
  if (refs.length) throw new Error(`Frontend is still coupled to production Supabase in: ${refs.join(', ')}`);
}

function selfTest() {
  const expectFailure = (name, env, pattern) => {
    try { validateVercelEnvironment(env); }
    catch (error) {
      if (!pattern.test(String(error?.message || error))) throw error;
      console.log(`PASS: ${name}`);
      return;
    }
    throw new Error(`Self-test unexpectedly passed: ${name}`);
  };
  expectFailure('Vercel production authority is rejected', { VERCEL_ENV: 'production', ZUNO_SUPABASE_URL: 'https://example.supabase.co', ZUNO_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, /production is forbidden/i);
  expectFailure('missing staging backend fails closed', { VERCEL_ENV: 'preview' }, /requires explicit/i);
  expectFailure('production Supabase is rejected for preview', { VERCEL_ENV: 'preview', ZUNO_SUPABASE_URL: PROD_URL, ZUNO_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, /must not use the production/i);
}

const mode = process.argv[2] || '--vercel-build';
if (mode === '--self-test') { selfTest(); process.exit(0); }
const refs = findProductionBackendRefs();
if (mode === '--audit-current') {
  console.log(JSON.stringify({ productionProjectRef: PROD_REF, frontendProductionReferences: refs }, null, 2));
  process.exit(0);
}
if (process.env.VERCEL !== '1') throw new Error('This guard is intended for Vercel builds. Set VERCEL=1 only in the real Vercel build environment.');
validateVercelEnvironment(process.env);
console.log('Preview/Staging backend isolation guard passed.');
