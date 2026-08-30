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
  const needle = new RegExp(`function\\s+public\\.${fn}\\s*\\(`, 'ig');
  let terminal = null;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    let match;
    while ((match = needle.exec(sql)) !== null) {
      const start = match.index;
      const remaining = sql.slice(start);
      const asMatch = remaining.match(/\bas\s+\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/i);
      const header = asMatch ? remaining.slice(0, asMatch.index) : remaining.slice(0, 1600);
      terminal = { file, header };
    }
  }
  return terminal;
}

const report = [];
for (const fn of publicFunctions) {
  const terminal = terminalDefinition(fn);
  if (!terminal) throw new Error(`missing terminal definition for public.${fn}`);
  if (/security\s+definer/i.test(terminal.header)) {
    throw new Error(`terminal public RPC remains SECURITY DEFINER: ${fn} in ${terminal.file}`);
  }
  report.push({ function: fn, source: terminal.file, mode: /security\s+invoker/i.test(terminal.header) ? 'explicit_invoker' : 'default_invoker' });
}

console.log(JSON.stringify({ checked: report.length, publicFunctions: report }, null, 2));
