#!/usr/bin/env node
/**
 * Truncate event tables to allow clean reimport without rowHash conflicts.
 *
 * Usage examples:
 *   npx tsx backend/src/features/sales/scripts/truncate-events.ts --all
 *   npx tsx backend/src/features/sales/scripts/truncate-events.ts --offline --raj --lok
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { all?: boolean; offline?: boolean; raj?: boolean; lok?: boolean; online?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--all') out.all = true;
    else if (a === '--offline') out.offline = true;
    else if (a === '--raj') out.raj = true;
    else if (a === '--lok') out.lok = true;
    else if (a === '--online') out.online = true;
  }
  if (!out.all && !out.offline && !out.raj && !out.lok && !out.online) {
    // Default to truncating the three event tables often re-imported
    out.offline = true; out.raj = true; out.lok = true;
  }
  return out;
}

async function run() {
  const { all, offline, raj, lok, online } = parseArgs();
  const targets: string[] = [];
  if (all || online) targets.push('"OnlineSale"');
  if (all || offline) targets.push('"OfflineCashUPICCSale"');
  if (all || raj) targets.push('"RajRadhaEventSale"');
  if (all || lok) targets.push('"LokEventSale"');

  if (targets.length === 0) {
    console.log(JSON.stringify({ msg: 'truncate_skipped', reason: 'no_targets' }));
    return;
  }

  for (const t of targets) {
    const sql = `TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE;`;
    await prisma.$executeRawUnsafe(sql);
    console.log(JSON.stringify({ msg: 'truncate_ok', table: t }));
  }
}

run()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error('truncate_failed', e); await prisma.$disconnect(); process.exit(1); });

