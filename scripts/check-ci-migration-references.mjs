#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reconciliationDir = path.join(root, 'supabase', 'reconciliation');

const ledgerFiles = fs.readdirSync(reconciliationDir)
  .filter((file) => /^production-migrations-\d{8}\.csv$/.test(file))
  .sort();
if (!ledgerFiles.length) throw new Error('no production migration ledgers found');

const byName = new Map();
for (const file of ledgerFiles) {
  const manifestLines = fs.readFileSync(path.join(reconciliationDir, file), 'utf8').trim().split(/\r?\n/).slice(1);
  for (const line of manifestLines) {
    const [version, name] = line.split(',');
    const rows = byName.get(name) ?? [];
    rows.push(version);
    byName.set(name, rows);
  }
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

function shellAssignments(text) {
  const vars = new Map();
  const re = /\b([A-Z][A-Z0-9_]*)=(['"])([^'"\r\n]+)\2/g;
  for (const m of text.matchAll(re)) vars.set(m[1], m[3]);
  return vars;
}

function isProvenGeneratedMigration(text, reference) {
  const vars = shellAssignments(text);
  for (const [targetVar, target] of vars) {
    if (!targetVar.endsWith('_TARGET') || target !== reference) continue;
    const prefix = targetVar.slice(0, -'_TARGET'.length);
    const sourceVar = `${prefix}_SOURCE`;
    const source = vars.get(sourceVar);
    if (!source || source.startsWith('supabase/migrations/')) continue;
    if (!fs.existsSync(path.join(root, source))) continue;

    const escapedSource = sourceVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedTarget = targetVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const copy = new RegExp(`\\bcp\\s+["']?\\$${escapedSource}["']?\\s+["']?\\$${escapedTarget}["']?`);
    if (copy.test(text)) return true;
  }
  return false;
}

const scanRoots = [
  path.join(root, '.github', 'workflows'),
  path.join(root, 'tests'),
  path.join(root, 'scripts'),
];
const sourceFiles = scanRoots.flatMap((base) => collectFiles(base, (file) => /\.(?:ya?ml|m?js|cjs|ts|sh)$/i.test(file))).sort();

const missing = [];
const generated = [];
const refPattern = /supabase\/migrations\/(\d{14})_([A-Za-z0-9_]+)\.sql/g;
for (const full of sourceFiles) {
  const text = fs.readFileSync(full, 'utf8');
  for (const match of text.matchAll(refPattern)) {
    const [reference, version, name] = match;
    if (fs.existsSync(path.join(root, reference))) continue;
    const source = path.relative(root, full).replaceAll('\\', '/');
    if (isProvenGeneratedMigration(text, reference)) {
      generated.push({ source, reference, version, name });
      continue;
    }
    missing.push({
      source,
      reference,
      version,
      name,
      canonicalVersions: byName.get(name) ?? [],
    });
  }
}

console.log(JSON.stringify({ sourcesScanned: sourceFiles.length, generatedCount: generated.length, generated, missingCount: missing.length, missing }, null, 2));
if (missing.length > 0) process.exit(1);
