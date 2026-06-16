/**
 * Convert a Cash Flow CFO CSV export to importable JSON.
 *
 * Usage:
 *   npx vite-node scripts/csv-to-json.ts path/to/cashflow.csv
 *   npx vite-node scripts/csv-to-json.ts path/to/cashflow.csv -o my-export.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { csvToExportPayload } from '../src/lib/csvImport';

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith('-'));
const outIndex = args.indexOf('-o');
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;

if (!inputPath) {
  console.error('Usage: npx vite-node scripts/csv-to-json.ts <file.csv> [-o output.json]');
  process.exit(1);
}

const csvText = readFileSync(resolve(inputPath), 'utf-8');
const result = csvToExportPayload(csvText);

if (!result.success || !result.payload) {
  console.error('Conversion failed:', result.error);
  process.exit(1);
}

const json = JSON.stringify(result.payload, null, 2);
const defaultOut = inputPath.replace(/\.csv$/i, '') + '-import.json';
const out = outputPath ? resolve(outputPath) : resolve(defaultOut);

writeFileSync(out, json, 'utf-8');

console.log('Converted successfully:');
console.log('  counts:', result.payload.meta.counts);
console.log('  written:', out);