#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reconciliationDir = path.join(root, 'supabase/reconciliation');
const migrationsDir = path.join(root, 'supabase/migrations');
const strict = process.argv.includes('--strict');
const jsonOnly = process.argv.includes('--json');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift();
  if (header !== 'version,name,statement_count,statements_md5') {
    throw new Error(`unexpected ledger header: ${header}`);
  }
  return lines.filter(Boolean).map((line) => {
    const [version, name, statementCount, statementsMd5] = line.split(',');
    if (!/^\d{14}$/.test(version) || !name || !/^\d+$/.test(statementCount) || !/^[a-f0-9]{32}$/.test(statementsMd5)) {
      throw new Error(`invalid ledger row: ${line}`);
    }
    return { version, name, statementCount: Number(statementCount), statementsMd5 };
  });
}

function parseMigrationFilename(file) {
  const match = /^(\d{14})_(.+)\.sql$/.exec(file);
  if (!match) return null;
  return { file, version: match[1], name: match[2] };
}

if (!fs.existsSync(reconciliationDir)) throw new Error(`missing reconciliation directory: ${reconciliationDir}`);
if (!fs.existsSync(migrationsDir)) throw new Error(`missing migrations directory: ${migrationsDir}`);

const ledgerPaths = fs.readdirSync(reconciliationDir)
  .filter((file) => /^production-migrations-\d{8}\.csv$/.test(file))
  .sort()
  .map((file) => path.join(reconciliationDir, file));
if (!ledgerPaths.length) throw new Error(`missing production migration ledger in ${reconciliationDir}`);

const production = ledgerPaths
  .flatMap((ledgerPath) => parseCsv(fs.readFileSync(ledgerPath, 'utf8')))
  .sort((a, b) => a.version.localeCompare(b.version));
const localFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const local = localFiles.map(parseMigrationFilename);
const invalidFilenames = localFiles.filter((_, index) => !local[index]);
const parsedLocal = local.filter(Boolean);

const duplicateProductionVersions = production
  .map((row) => row.version)
  .filter((version, index, all) => all.indexOf(version) !== index)
  .filter((version, index, all) => all.indexOf(version) === index);
const productionByVersion = new Map(production.map((row) => [row.version, row]));
const localByVersion = new Map(parsedLocal.map((row) => [row.version, row]));
const productionByName = new Map();
for (const row of production) {
  const entries = productionByName.get(row.name) ?? [];
  entries.push(row);
  productionByName.set(row.name, entries);
}

const exact = [];
const versionNameMismatch = [];
const retimestampedUniqueName = [];
const retimestampedAmbiguousName = [];
const localOnly = [];

for (const row of parsedLocal) {
  const applied = productionByVersion.get(row.version);
  if (applied) {
    if (applied.name === row.name) exact.push({ local: row, production: applied });
    else versionNameMismatch.push({ local: row, production: applied });
    continue;
  }
  const sameName = productionByName.get(row.name) ?? [];
  if (sameName.length === 1) {
    retimestampedUniqueName.push({ local: row, production: sameName[0] });
  } else if (sameName.length > 1) {
    retimestampedAmbiguousName.push({ local: row, production: sameName });
  } else {
    localOnly.push(row);
  }
}

const productionMissingExactFile = production.filter((row) => !localByVersion.has(row.version));
const duplicateLocalVersions = parsedLocal
  .map((row) => row.version)
  .filter((version, index, all) => all.indexOf(version) !== index)
  .filter((version, index, all) => all.indexOf(version) === index);

const summary = {
  productionLedger: {
    count: production.length,
    firstVersion: production.at(0)?.version ?? null,
    lastVersion: production.at(-1)?.version ?? null,
    files: ledgerPaths.map((ledgerPath) => path.basename(ledgerPath)),
  },
  localDirectory: { count: parsedLocal.length },
  classifications: {
    exactVersionAndName: exact.length,
    versionNameMismatch: versionNameMismatch.length,
    retimestampedUniqueName: retimestampedUniqueName.length,
    retimestampedAmbiguousName: retimestampedAmbiguousName.length,
    localOnly: localOnly.length,
    genuinelyPending: localOnly.length,
    productionMissingExactFile: productionMissingExactFile.length,
    invalidFilenames: invalidFilenames.length,
    duplicateLocalVersions: duplicateLocalVersions.length,
    duplicateProductionVersions: duplicateProductionVersions.length,
  },
  details: {
    versionNameMismatch,
    retimestampedUniqueName,
    retimestampedAmbiguousName,
    localOnly,
    genuinelyPending: localOnly,
    productionMissingExactFile,
    invalidFilenames,
    duplicateLocalVersions,
    duplicateProductionVersions,
  },
};

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  console.log('Supabase migration reconciliation');
  console.log(JSON.stringify(summary, null, 2));
}

if (strict) {
  const c = summary.classifications;
  const structuralDrift = c.versionNameMismatch
    + c.retimestampedUniqueName
    + c.retimestampedAmbiguousName
    + c.productionMissingExactFile
    + c.invalidFilenames
    + c.duplicateLocalVersions
    + c.duplicateProductionVersions;
  if (structuralDrift > 0) {
    console.error(`Migration ledger drift detected (${structuralDrift} structural discrepancy/discrepancies).`);
    process.exit(1);
  }
  if (c.genuinelyPending > 0 && !jsonOnly) {
    console.log(`Pending migrations outside the production ledger: ${c.genuinelyPending}.`);
  }
}
