#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase', 'migrations');
const manifestPath = path.join(root, 'supabase', 'reconciliation', 'production-migrations-20260830.csv');

const manifestLines = fs.readFileSync(manifestPath, 'utf8').trim().split(/\r?\n/).slice(1);
const byName = new Map();
for (const line of manifestLines) {
  const [version, name] = line.split(',');
  const rows = byName.get(name) ?? [];
  rows.push(version);
  byName.set(name, rows);
}

function collectFiles(base, predicate) {
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, predicate));
    else if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

const scanRoots = [
  path.join(root, '.github', 'workflows'),
  path.join(root, 'tests'),
  path.join(root, 'scripts'),
];
const sourceFiles = scanRoots.flatMap((base) => collectFiles(base, (file) => /\.(?:ya?ml|m?js|cjs|ts|sh)$/i.test(file))).sort();

const missing = [];
const refPattern = /supabase\/migrations\/(\d{14})_([A-Za-z0-9_]+)\.sql/g;
for (const full of sourceFiles) {
  const text = fs.readFileSync(full, 'utf8');
  for (const match of text.matchAll(refPattern)) {
    const [reference, version, name] = match;
    if (fs.existsSync(path.join(root, reference))) continue;
    missing.push({
      source: path.relative(root, full).replaceAll('\\', '/'),
      reference,
      version,
      name,
      canonicalVersions: byName.get(name) ?? [],
    });
  }
}

console.log(JSON.stringify({ sourcesScanned: sourceFiles.length, missingCount: missing.length, missing }, null, 2));
if (missing.length > 0) process.exit(1);
