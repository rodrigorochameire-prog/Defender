/**
 * 01-clean-garbage-assistidos.ts
 *
 * Removes assistido records with invalid names (date strings, test entries).
 * Safe: checks for linked processos before deleting.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/01-clean-garbage-assistidos.ts
 */

import { db } from '../../src/lib/db';
import { assistidos, processos } from '../../src/lib/db/schema/core';
import { eq, sql, inArray } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');

// Patterns that indicate garbage records
const GARBAGE_PATTERNS = [
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/,  // Date strings
  /^\d{4}-\d{2}-\d{2}/,                 // ISO dates
  /^Teste?\s/i,                          // Test entries
];

async function main() {
  console.log('=== 01: CLEAN GARBAGE ASSISTIDOS ===');
  if (DRY_RUN) console.log('MODE: DRY-RUN');

  // Find garbage records
  const allAssistidos = await db
    .select({ id: assistidos.id, nome: assistidos.nome, atribuicao: assistidos.atribuicaoPrimaria })
    .from(assistidos);

  const garbage = allAssistidos.filter(a =>
    GARBAGE_PATTERNS.some(p => p.test(a.nome))
  );

  console.log(`\nFound ${garbage.length} garbage records:`);
  for (const g of garbage) {
    console.log(`  #${g.id}: "${g.nome}" (${g.atribuicao})`);
  }

  if (garbage.length === 0) {
    console.log('Nothing to clean.');
    process.exit(0);
  }

  // Check for linked processos
  const garbageIds = garbage.map(g => g.id);
  const linkedProcessos = await db
    .select({ id: processos.id, assistidoId: processos.assistidoId, autos: processos.numeroAutos })
    .from(processos)
    .where(inArray(processos.assistidoId, garbageIds));

  if (linkedProcessos.length > 0) {
    console.log(`\n  WARNING: ${linkedProcessos.length} processos reference garbage assistidos:`);
    for (const p of linkedProcessos) {
      console.log(`    Processo ${p.autos} → assistido #${p.assistidoId}`);
    }
    console.log('  These processos must be re-assigned before deletion.');
    console.log('  Skipping deletion of assistidos with linked processos.');
  }

  const safeToDelete = garbage.filter(g =>
    !linkedProcessos.some(p => p.assistidoId === g.id)
  );

  console.log(`\nSafe to delete: ${safeToDelete.length}`);

  if (!DRY_RUN && safeToDelete.length > 0) {
    const ids = safeToDelete.map(g => g.id);
    await db.delete(assistidos).where(inArray(assistidos.id, ids));
    console.log(`Deleted ${ids.length} garbage assistidos.`);
  }

  // Verify
  const [after] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assistidos);
  console.log(`\nAssistidos remaining: ${after.count}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
