#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROD_REF = 'rliymfbbhqoejgfvsbuu';
const PROD_URL = `https://${PROD_REF}.supabase.co`;
const RUNTIME_PATH = path.join(ROOT, 'zuno-runtime-injected.js');
const AUTHORITY_PATH = path.join(ROOT, 'zuno-runtime-config.js');
const SKIP_DIRS = new Set(['.git', '.github', '.vercel', 'android-v0', 'docs', 'node_modules', 'scripts', 'supabase']);
const EXTENSIONS = new Set(['.html', '.js', '.mjs']);
const ALLOWED_PRODUCTION_REF_FILES = new Set(['zuno-runtime-config.js']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function relative(file) { return path.relative(ROOT, file).replaceAll('\\', '/'); }

function findProductionBackendRefs() {
  return walk(ROOT).flatMap((file) => {
    const rel = relative(file);
    if (ALLOWED_PRODUCTION_REF_FILES.has(rel)) return [];
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(PROD_REF) && !content.includes(PROD_URL)) return [];
    return [rel];
  });
}

function productionPublishableKeys() {
  const content = fs.readFileSync(AUTHORITY_PATH, 'utf8');
  return [...new Set(content.match(/sb_publishable_[A-Za-z0-9_-]+/g) || [])];
}

function isPublishableKey(value) {
  if (!value) return false;
  return value.startsWith('sb_publishable_') || value.startsWith('eyJ');
}

function projectRefFromUrl(url) {
  const match = String(url || '').match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  if (!match) throw new Error('Unable to derive Supabase project ref from Preview URL.');
  return match[1];
}

function readPreviewConfig(env = process.env) {
  const vercelEnv = String(env.VERCEL_ENV || '').toLowerCase();
  if (vercelEnv === 'production') throw new Error('Vercel production is forbidden: GitHub Pages is the canonical ZunoPlay production host.');
  if (vercelEnv !== 'preview') throw new Error('Only Vercel Preview deployments are allowed for the ZunoPlay staging frontend.');
  const url = String(env.ZUNO_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = String(env.ZUNO_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!url || !key) throw new Error('Preview/Staging requires explicit ZUNO_SUPABASE_URL and ZUNO_SUPABASE_PUBLISHABLE_KEY.');
  if (url.includes(PROD_REF)) throw new Error('Preview/Staging must not use the production Supabase project.');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) throw new Error('ZUNO_SUPABASE_URL is not a valid Supabase project URL.');
  if (!isPublishableKey(key)) throw new Error('Preview/Staging requires a publishable/anon-compatible client key, never a service-role/secret key.');
  const ref = projectRefFromUrl(url);
  if (ref === PROD_REF) throw new Error('Preview/Staging project ref must differ from production.');
  return { url, key, ref };
}

function rewriteLegacyPreviewCoupling({ url, key, ref }) {
  const prodKeys = productionPublishableKeys();
  let changed = 0;
  for (const file of walk(ROOT)) {
    const rel = relative(file);
    if (ALLOWED_PRODUCTION_REF_FILES.has(rel)) continue;
    const original = fs.readFileSync(file, 'utf8');
    let next = original.split(PROD_URL).join(url);
    for (const prodKey of prodKeys) next = next.split(prodKey).join(key);
    next = next.split(PROD_REF).join(ref);
    if (next !== original) { fs.writeFileSync(file, next); changed += 1; }
  }
  const refs = findProductionBackendRefs();
  if (refs.length) throw new Error(`Preview rewrite left production Supabase coupling in: ${refs.join(', ')}`);
  console.log(`Preview build rewrote legacy backend coupling in ${changed} frontend file(s).`);
}

function generateRuntimeConfig(env = process.env) {
  const config = readPreviewConfig(env);
  rewriteLegacyPreviewCoupling(config);
  const payload = { supabaseUrl: config.url, supabasePublishableKey: config.key, environment: 'preview' };
  fs.writeFileSync(RUNTIME_PATH, `window.__ZUNO_RUNTIME_CONFIG__=Object.freeze(${JSON.stringify(payload)});\n`, { mode: 0o600 });
  console.log('Preview runtime config generated for isolated staging backend.');
}

function selfTest() {
  const expectFailure = (name, env, pattern) => {
    try { readPreviewConfig(env); } catch (error) {
      if (!pattern.test(String(error?.message || error))) throw error;
      console.log(`PASS: ${name}`); return;
    }
    throw new Error(`Self-test unexpectedly passed: ${name}`);
  };
  expectFailure('Vercel production authority is rejected', { VERCEL_ENV: 'production', ZUNO_SUPABASE_URL: 'https://example.supabase.co', ZUNO_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, /production is forbidden/i);
  expectFailure('non-preview Vercel environment is rejected', { VERCEL_ENV: 'development', ZUNO_SUPABASE_URL: 'https://example.supabase.co', ZUNO_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, /only vercel preview/i);
  expectFailure('missing staging backend fails closed', { VERCEL_ENV: 'preview' }, /requires explicit/i);
  expectFailure('production Supabase is rejected for preview', { VERCEL_ENV: 'preview', ZUNO_SUPABASE_URL: PROD_URL, ZUNO_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, /must not use the production/i);
}

const mode = process.argv[2] || '--vercel-build';
if (mode === '--self-test') { selfTest(); process.exit(0); }
if (mode === '--audit-current') { console.log(JSON.stringify({ productionProjectRef: PROD_REF, frontendProductionReferences: findProductionBackendRefs() }, null, 2)); process.exit(0); }
if (process.env.VERCEL !== '1') throw new Error('This guard is intended for Vercel builds. Set VERCEL=1 only in the real Vercel build environment.');
generateRuntimeConfig(process.env);
