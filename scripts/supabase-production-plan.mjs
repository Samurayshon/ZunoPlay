#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationsDir = path.join(root, 'supabase/migrations');
const reconciliationDir = path.join(root, 'supabase/reconciliation');
const allowlistPath = path.join(root, '.github/supabase-production-approved-migrations.txt');
const args = process.argv.slice(2);
const jsonOnly = args.includes('--json');
const check = args.includes('--check');

function optionValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`missing value for ${name}`);
  return value;
}

function parseCsv(text, file) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift();
  if (header !== 'version,name,statement_count,statements_md5') {
    throw new Error(`unexpected ledger header in ${file}: ${header}`);
  }

  return lines.filter(Boolean).map((line) => {
    const [version, name, statementCount, statementsMd5] = line.split(',');
    if (!/^\d{14}$/.test(version) || !name || !/^\d+$/.test(statementCount) || !/^[a-f0-9]{32}$/.test(statementsMd5)) {
      throw new Error(`invalid ledger row in ${file}: ${line}`);
    }
    return { version, name, statementCount: Number(statementCount), statementsMd5, ledgerFile: file };
  });
}

function parseMigrationFilename(file) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  return match ? { file, version: match[1], name: match[2] } : null;
}

function duplicateValues(values) {
  return [...new Set(values.filter((value, index, all) => all.indexOf(value) !== index))].sort();
}

function readAllowlist() {
  if (!fs.existsSync(allowlistPath)) throw new Error(`missing allowlist: ${allowlistPath}`);
  const values = fs.readFileSync(allowlistPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const invalid = values.filter((value) => !/^\d{14}$/.test(value));
  if (invalid.length) throw new Error(`invalid allowlist version(s): ${invalid.join(', ')}`);
  const duplicates = duplicateValues(values);
  if (duplicates.length) throw new Error(`duplicate allowlist version(s): ${duplicates.join(', ')}`);
  return values;
}

function readRemoteVersions(filePath) {
  if (!filePath) return null;
  const absolute = path.resolve(root, filePath);
  if (!fs.existsSync(absolute)) throw new Error(`missing remote versions file: ${absolute}`);
  const versions = fs.readFileSync(absolute, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const invalid = versions.filter((version) => !/^\d{14}$/.test(version));
  if (invalid.length) throw new Error(`invalid remote migration version(s): ${invalid.join(', ')}`);
  return [...new Set(versions)].sort();
}

if (!fs.existsSync(migrationsDir)) throw new Error(`missing migrations directory: ${migrationsDir}`);
if (!fs.existsSync(reconciliationDir)) throw new Error(`missing reconciliation directory: ${reconciliationDir}`);

const ledgerFiles = fs.readdirSync(reconciliationDir)
  .filter((file) => /^production-migrations-\d{8}\.csv$/.test(file))
  .sort();
if (!ledgerFiles.length) throw new Error(`missing production migration ledger in ${reconciliationDir}`);

const production = ledgerFiles
  .flatMap((file) => parseCsv(fs.readFileSync(path.join(reconciliationDir, file), 'utf8'), file))
  .sort((a, b) => a.version.localeCompare(b.version));

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();
const parsedMigrations = migrationFiles.map(parseMigrationFilename);
const invalidFilenames = migrationFiles.filter((_, index) => !parsedMigrations[index]);
const local = parsedMigrations.filter(Boolean);
const allowlistedVersions = readAllowlist();
const remoteVersions = readRemoteVersions(optionValue('--remote-versions-file'));

const duplicateProductionVersions = duplicateValues(production.map((row) => row.version));
const duplicateLocalVersions = duplicateValues(local.map((row) => row.version));
const productionByVersion = new Map(production.map((row) => [row.version, row]));
const localByVersion = new Map(local.map((row) => [row.version, row]));
const productionByName = new Map();
for (const row of production) {
  const rows = productionByName.get(row.name) ?? [];
  rows.push(row);
  productionByName.set(row.name, rows);
}

const alreadyApplied = [];
const pending = [];
const drift = [];

for (const file of invalidFilenames) drift.push({ type: 'invalid_local_filename', file });
for (const version of duplicateProductionVersions) drift.push({ type: 'duplicate_production_version', version });
for (const version of duplicateLocalVersions) drift.push({ type: 'duplicate_local_version', version });

for (const migration of local) {
  const applied = productionByVersion.get(migration.version);
  if (applied) {
    if (applied.name === migration.name) {
      alreadyApplied.push({ ...migration, ledgerFile: applied.ledgerFile });
    } else {
      drift.push({
        type: 'version_name_mismatch',
        version: migration.version,
        localName: migration.name,
        productionName: applied.name,
        ledgerFile: applied.ledgerFile,
      });
    }
    continue;
  }

  const sameName = productionByName.get(migration.name) ?? [];
  if (sameName.length) {
    drift.push({
      type: 'retimestamped_applied_migration',
      file: migration.file,
      localVersion: migration.version,
      productionVersions: sameName.map((row) => row.version),
    });
    continue;
  }

  pending.push(migration);
}

for (const row of production) {
  if (!localByVersion.has(row.version)) {
    drift.push({
      type: 'production_migration_missing_local_file',
      version: row.version,
      name: row.name,
      ledgerFile: row.ledgerFile,
    });
  }
}

const pendingByVersion = new Map(pending.map((row) => [row.version, row]));
const appliedVersions = new Set(alreadyApplied.map((row) => row.version));
const allowlistSet = new Set(allowlistedVersions);
const approvedPending = pending.filter((row) => allowlistSet.has(row.version));
const unauthorizedPending = pending.filter((row) => !allowlistSet.has(row.version));
const staleApprovals = allowlistedVersions.filter((version) => appliedVersions.has(version));
const legacyApprovals = allowlistedVersions.filter((version) => !appliedVersions.has(version) && !pendingByVersion.has(version));

const safetyErrors = [];
for (const migration of pending) {
  const sql = fs.readFileSync(path.join(migrationsDir, migration.file), 'utf8');
  if (!/^\s*(begin|start transaction)\s*;/im.test(sql)) {
    safetyErrors.push({ type: 'missing_transaction_start', file: migration.file });
  }
  if (!/^\s*commit\s*;/im.test(sql)) {
    safetyErrors.push({ type: 'missing_commit', file: migration.file });
  }
  if (/(^|[^A-Za-z0-9_])(drop\s+(table|schema|database)|truncate\s+table)/i.test(sql)) {
    safetyErrors.push({ type: 'destructive_operation', file: migration.file });
  }
}

let remote = null;
if (remoteVersions) {
  const productionVersions = new Set(production.map((row) => row.version));
  const remoteSet = new Set(remoteVersions);
  const ledgerMissingRemotely = [...productionVersions].filter((version) => !remoteSet.has(version)).sort();
  const remoteMissingFromLedger = remoteVersions.filter((version) => !productionVersions.has(version)).sort();
  remote = { count: remoteVersions.length, ledgerMissingRemotely, remoteMissingFromLedger };
  for (const version of ledgerMissingRemotely) drift.push({ type: 'ledger_version_missing_remotely', version });
  for (const version of remoteMissingFromLedger) drift.push({ type: 'remote_version_missing_from_ledger', version });
}

const blockers = {
  drift: drift.length,
  unauthorizedPending: unauthorizedPending.length,
  safetyErrors: safetyErrors.length,
};
const blockerCount = Object.values(blockers).reduce((sum, value) => sum + value, 0);

const plan = {
  baseline: {
    authority: 'production-ledger',
    ledgerFiles,
    count: production.length,
    firstVersion: production.at(0)?.version ?? null,
    lastVersion: production.at(-1)?.version ?? null,
  },
  local: { count: local.length },
  classifications: {
    alreadyApplied,
    pending,
    approvedPending,
    unauthorizedPending,
    staleApprovals,
    legacyApprovals,
    drift,
    safetyErrors,
  },
  remote,
  blockers,
  ok: blockerCount === 0,
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
} else {
  console.log('Supabase production migration plan');
  console.log(`Baseline authority: production ledger (${production.length} versions, through ${plan.baseline.lastVersion ?? 'n/a'})`);
  console.log(`Already applied: ${alreadyApplied.length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Approved pending: ${approvedPending.length}`);
  console.log(`Unauthorized pending: ${unauthorizedPending.length}`);
  console.log(`Stale approvals (already applied, tolerated): ${staleApprovals.length}`);
  console.log(`Legacy approvals with no local migration (inert, tolerated): ${legacyApprovals.length}`);
  console.log(`Drift: ${drift.length}`);
  console.log(`Safety errors: ${safetyErrors.length}`);
  if (remote) console.log(`Remote versions: ${remote.count}`);
}

if (check && blockerCount > 0) {
  console.error(`Supabase production plan blocked (${blockerCount} issue(s)).`);
  process.exit(1);
}
