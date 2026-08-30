#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowsDir = path.join(root, '.github', 'workflows');
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

const workflowFiles = fs.readdirSync(workflowsDir)
  .filter((file) => /\.ya?ml$/.test(file))
  .sort();

const missing = [];
const refPattern = /supabase\/migrations\/(\d{14})_([A-Za-z0-9_]+)\.sql/g;
for (const file of workflowFiles) {
  const full = path.join(workflowsDir, file);
  const text = fs.readFileSync(full, 'utf8');
  for (const match of text.matchAll(refPattern)) {
    const [reference, version, name] = match;
    if (fs.existsSync(path.join(root, reference))) continue;
    missing.push({
      workflow: file,
      reference,
      version,
      name,
      canonicalVersions: byName.get(name) ?? [],
    });
  }
}

console.log(JSON.stringify({ workflowsScanned: workflowFiles.length, missingCount: missing.length, missing }, null, 2));
if (missing.length > 0) process.exit(1);
