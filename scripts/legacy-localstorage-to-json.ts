/**
 * Convert a browser-exported legacy localStorage dump to v2 import JSON.
 *
 * Export from old app browser console (F12):
 *   copy(JSON.stringify({
 *     expenses: JSON.parse(localStorage.getItem('expenses')||'[]'),
 *     incomes: JSON.parse(localStorage.getItem('incomes')||'[]'),
 *     savings: JSON.parse(localStorage.getItem('savings')||'[]'),
 *     fixedExpenses: JSON.parse(localStorage.getItem('fixedExpenses')||'[]'),
 *     targets: JSON.parse(localStorage.getItem('financialTargets')||'[]'),
 *     goals: JSON.parse(localStorage.getItem('goals')||'[]'),
 *     tasks: JSON.parse(localStorage.getItem('tasks')||'[]'),
 *   }, null, 2))
 *
 * Paste into legacy-data.json, then:
 *   npx vite-node scripts/legacy-localstorage-to-json.ts legacy-data.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migratePersistedState } from '../src/stores/finance/migration';
import type { ExportPayload } from '../src/lib/exportImport';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: npx vite-node scripts/legacy-localstorage-to-json.ts <legacy-data.json> [-o out.json]');
  process.exit(1);
}

const outArg = process.argv.indexOf('-o');
const outputPath = outArg >= 0 ? process.argv[outArg + 1] : null;

const raw = JSON.parse(readFileSync(resolve(inputPath), 'utf-8'));
const data = migratePersistedState({ ...raw, version: raw.version ?? 1 }, raw.version ?? 1);

const payload: ExportPayload = {
  meta: {
    app: 'cash-flow-cfo',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    counts: {
      expenses: data.expenses.length,
      incomes: data.incomes.length,
      savings: data.savings.length,
      fixedExpenses: data.fixedExpenses.length,
      targets: data.targets.length,
      goals: data.goals.length,
      tasks: data.tasks.length,
    },
  },
  data,
};

const out = outputPath
  ? resolve(outputPath)
  : resolve(inputPath.replace(/\.json$/i, '') + '-v2-import.json');

writeFileSync(out, JSON.stringify(payload, null, 2), 'utf-8');
console.log('Written:', out);
console.log('counts:', payload.meta.counts);