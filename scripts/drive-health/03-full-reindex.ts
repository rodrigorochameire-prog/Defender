/**
 * 03-full-reindex.ts
 *
 * Triggers a full re-sync of all Drive atribuicao folders into drive_files.
 * Uses existing syncFolderWithDatabase() which handles insert/update/delete.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/03-full-reindex.ts
 * Options: --only=JURI  (process single folder)
 */

import { db } from '../../src/lib/db';
import { driveFiles, driveSyncFolders } from '../../src/lib/db/schema/drive';
import { sql, eq } from 'drizzle-orm';
import { syncFolderWithDatabase } from '../../src/lib/services/google-drive';
import { ATRIBUICAO_FOLDER_IDS } from '../../src/lib/utils/text-extraction';

const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]?.toUpperCase();

const FOLDERS: Record<string, string> = {
  JURI: ATRIBUICAO_FOLDER_IDS.JURI,
  VVD: ATRIBUICAO_FOLDER_IDS.VVD,
  EP: ATRIBUICAO_FOLDER_IDS.EP,
  SUBSTITUICAO: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO,
  GRUPO_JURI: ATRIBUICAO_FOLDER_IDS.GRUPO_JURI,
};

async function main() {
  console.log('=== 03: FULL RE-INDEX DRIVE FILES ===');

  const [before] = await db
    .select({ count: sql<number>`count(*)`, files: sql<number>`count(*) filter (where not is_folder)` })
    .from(driveFiles);
  console.log(`\nBefore: ${before.count} total rows (${before.files} files)`);

  const toSync = ONLY ? { [ONLY]: FOLDERS[ONLY] } : FOLDERS;

  for (const [name, folderId] of Object.entries(toSync)) {
    if (!folderId) {
      console.log(`\n  SKIP ${name} — folder ID not found`);
      continue;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Syncing ${name} (${folderId.substring(0, 20)}...)`);
    console.log('This may take several minutes for large folders...');

    const start = Date.now();
    try {
      const result = await syncFolderWithDatabase(folderId);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      console.log(`  Done in ${elapsed}s`);
      console.log(`  Added:   ${result.filesAdded}`);
      console.log(`  Updated: ${result.filesUpdated}`);
      console.log(`  Removed: ${result.filesRemoved}`);
      if (result.errors.length > 0) {
        console.log(`  Errors:  ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message}`);
    }
  }

  const [after] = await db
    .select({ count: sql<number>`count(*)`, files: sql<number>`count(*) filter (where not is_folder)` })
    .from(driveFiles);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`After: ${after.count} total rows (${after.files} files)`);
  console.log(`Delta: +${Number(after.count) - Number(before.count)} rows`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
