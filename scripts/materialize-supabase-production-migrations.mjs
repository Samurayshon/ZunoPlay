#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'migration-ledger-export.json');
const ledgerPath = path.join(root, 'supabase/reconciliation/production-migrations-20260830.csv');
const migrationsDir = path.join(root, 'supabase/migrations');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift();
  if (header !== 'version,name,statement_count,statements_md5') throw new Error(`unexpected ledger header: ${header}`);
  return lines.filter(Boolean).map((line) => {
    const [version, name, statementCount, statementsMd5] = line.split(',');
    if (!/^\d{14}$/.test(version) || !/^[A-Za-z0-9_]+$/.test(name) || !/^\d+$/.test(statementCount) || !/^[a-f0-9]{32}$/.test(statementsMd5)) {
      throw new Error(`invalid ledger row: ${line}`);
    }
    return { version, name, statementCount: Number(statementCount), statementsMd5 };
  });
}

const manifest = parseCsv(fs.readFileSync(ledgerPath, 'utf8'));
const manifestByVersion = new Map(manifest.map((row) => [row.version, row]));
const payload = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const migrations = payload.migrations;

if (!Array.isArray(migrations)) throw new Error('export payload has no migrations array');
if (payload.count !== migrations.length) throw new Error(`export count mismatch: payload=${payload.count}, rows=${migrations.length}`);
if (migrations.length !== manifest.length) throw new Error(`ledger count mismatch: export=${migrations.length}, manifest=${manifest.length}`);

const seen = new Set();
const generated = [];
for (const row of migrations) {
  const version = String(row.version ?? '');
  const name = String(row.name ?? '');
  const statements = row.statements;
  if (!/^\d{14}$/.test(version) || !/^[A-Za-z0-9_]+$/.test(name) || !Array.isArray(statements) || statements.some((s) => typeof s !== 'string')) {
    throw new Error(`invalid export row for ${version || '<missing-version>'}`);
  }
  if (seen.has(version)) throw new Error(`duplicate production version: ${version}`);
  seen.add(version);

  const expected = manifestByVersion.get(version);
  if (!expected) throw new Error(`version absent from manifest: ${version}_${name}`);
  if (expected.name !== name) throw new Error(`name mismatch for ${version}: export=${name}, manifest=${expected.name}`);
  if (expected.statementCount !== statements.length) throw new Error(`statement count mismatch for ${version}: export=${statements.length}, manifest=${expected.statementCount}`);

  const sql = statements.join('\n');
  const md5 = crypto.createHash('md5').update(sql, 'utf8').digest('hex');
  if (md5 !== expected.statementsMd5) throw new Error(`SQL hash mismatch for ${version}_${name}: export=${md5}, manifest=${expected.statementsMd5}`);
  generated.push({ version, name, sql });
}

for (const expected of manifest) {
  if (!seen.has(expected.version)) throw new Error(`manifest migration missing from export: ${expected.version}_${expected.name}`);
}

generated.sort((a, b) => a.version.localeCompare(b.version));
fs.rmSync(migrationsDir, { recursive: true, force: true });
fs.mkdirSync(migrationsDir, { recursive: true });
for (const row of generated) {
  fs.writeFileSync(path.join(migrationsDir, `${row.version}_${row.name}.sql`), `${row.sql}\n`, 'utf8');
}

console.log(JSON.stringify({ materialized: generated.length, firstVersion: generated.at(0)?.version, lastVersion: generated.at(-1)?.version }, null, 2));
