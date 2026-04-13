/**
 * 05-auto-link-orphans.ts
 *
 * Links orphan drive_files to processos/assistidos using folder hierarchy resolution.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/05-auto-link-orphans.ts
 */

import { db } from '../../src/lib/db';
import { driveFiles } from '../../src/lib/db/schema/drive';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { resolveFileHierarchy, autoLinkByHierarchy } from '../../src/lib/services/google-drive';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

async function main() {
  console.log('=== 05: AUTO-LINK ORPHAN FILES ===');
  if (DRY_RUN) console.log('MODE: DRY-RUN');

  const [before] = await db
    .select({
      total: sql<number>`count(*) filter (where not is_folder)`,
      orphans: sql<number>`count(*) filter (where processo_id is null and assistido_id is null and not is_folder)`,
      withProcesso: sql<number>`count(processo_id)`,
      withAssistido: sql<number>`count(assistido_id)`,
    })
    .from(driveFiles);

  console.log(`\nBefore:`);
  console.log(`  Total files: ${before.total}`);
  console.log(`  Orphans: ${before.orphans}`);
  console.log(`  With processo: ${before.withProcesso}`);
  console.log(`  With assistido: ${before.withAssistido}`);

  const orphans = await db
    .select({ id: driveFiles.id })
    .from(driveFiles)
    .where(
      and(
        isNull(driveFiles.processoId),
        isNull(driveFiles.assistidoId),
        eq(driveFiles.isFolder, false)
      )
    );

  console.log(`\nProcessing ${orphans.length} orphan files in batches of ${BATCH_SIZE}...`);

  if (DRY_RUN) {
    console.log('\nSampling 10 files:');
    for (const orphan of orphans.slice(0, 10)) {
      const result = await resolveFileHierarchy(orphan.id);
      console.log(`  #${orphan.id}: processo=${result.processoId}, assistido=${result.assistidoId}, conf=${result.confidence}`);
    }
    process.exit(0);
  }

  let totalLinked = 0;
  let totalErrors = 0;

  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(o => o.id);

    const result = await autoLinkByHierarchy(batchIds);
    totalLinked += result.linked;
    totalErrors += result.errors;

    const progress = Math.min(i + BATCH_SIZE, orphans.length);
    console.log(`  [${progress}/${orphans.length}] linked: ${result.linked}, errors: ${result.errors}`);
  }

  const [after] = await db
    .select({
      orphans: sql<number>`count(*) filter (where processo_id is null and assistido_id is null and not is_folder)`,
      withProcesso: sql<number>`count(processo_id)`,
      withAssistido: sql<number>`count(assistido_id)`,
    })
    .from(driveFiles);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results:`);
  console.log(`  Linked: ${totalLinked}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Remaining orphans: ${after.orphans}`);
  console.log(`  With processo: ${after.withProcesso}`);
  console.log(`  With assistido: ${after.withAssistido}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
