#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'supabase', 'migrations');
const files = fs.readdirSync(dir).filter((file) => file.endsWith('.sql')).sort();
const publicFunctions = [
  'zuno_stack_apply_tile',
  'zuno_stack_apply_undo',
  'zuno_stack_relay_send',
  'zuno_stack_relay_take',
  'zuno_stack_pulse_shift',
  'zuno_stack_hint',
  'zuno_stack_power',
  'zuno_stack_gelo',
  'zuno_stack_desfazer',
];

function terminalDefinition(fn) {
  const createNeedle = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${fn}\\s*\\(`, 'ig');
  const alterNeedle = new RegExp(`alter\\s+function\\s+public\\.${fn}\\s*\\([^;]*?\\)\\s+(security\\s+(?:invoker|definer))`, 'ig');
  let terminal = null;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    let match;

    while ((match = createNeedle.exec(sql)) !== null) {
      const remaining = sql.slice(match.index);
      const asMatch = remaining.match(/\bas\s+\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/i);
      const header = asMatch ? remaining.slice(0, asMatch.index) : remaining.slice(0, 1600);
      terminal = {
        file,
        offset: match.index,
        mode: /security\s+definer/i.test(header) ? 'definer' : 'invoker',
        source: 'create',
      };
    }

    while ((match = alterNeedle.exec(sql)) !== null) {
      const candidate = {
        file,
        offset: match.index,
        mode: /security\s+definer/i.test(match[1]) ? 'definer' : 'invoker',
        source: 'alter',
      };
      if (!terminal || terminal.file.localeCompare(file) < 0 || (terminal.file === file && terminal.offset < candidate.offset)) {
        terminal = candidate;
      }
    }
  }

  return terminal;
}

const report = [];
for (const fn of publicFunctions) {
  const terminal = terminalDefinition(fn);
  if (!terminal) throw new Error(`missing terminal definition for public.${fn}`);
  if (terminal.mode === 'definer') {
    throw new Error(`terminal public RPC remains SECURITY DEFINER: ${fn} in ${terminal.file}`);
  }
  report.push({ function: fn, source: terminal.file, mode: 'invoker', sourceKind: terminal.source });
}

console.log(JSON.stringify({ checked: report.length, publicFunctions: report }, null, 2));
