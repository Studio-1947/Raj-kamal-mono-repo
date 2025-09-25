#!/usr/bin/env node
/**
 * Import script for Sales Excel workbook.
 * Usage: npx tsx backend/src/features/sales/scripts/import-excel.ts [--file "./data/file.xlsx"] [--chunk 500]
 */
import { importWorkbookFromDisk } from '../server/sales.routes';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { file?: string; chunk?: number } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--file' && args[i + 1]) out.file = String(args[++i]);
    if (a === '--chunk' && args[i + 1]) out.chunk = Number(args[++i]);
  }
  return out;
}

(async () => {
  const { file, chunk } = parseArgs();
  const opts: { filePath?: string; chunkSize?: number } = {};
  if (file) opts.filePath = String(file);
  if (typeof chunk === 'number' && !Number.isNaN(chunk)) opts.chunkSize = chunk;
  const result = await importWorkbookFromDisk(opts);
  console.log(JSON.stringify({ msg: 'sales_import_cli_done', ...result }));
  process.exit(0);
})().catch((e) => {
  console.error('sales_import_cli_failed', e);
  process.exit(1);
});
