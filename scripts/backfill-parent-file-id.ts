/**
 * Backfill parentFileId for all driveFiles.
 *
 * Uses listAllFilesRecursively (which is exported and handles auth)
 * to get Google Drive parent info, then updates parentFileId in DB.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/backfill-parent-file-id.ts
 */

import { db, driveFiles } from '../src/lib/db';
import { eq, sql } from 'drizzle-orm';
import { listAllFilesRecursively } from '../src/lib/services/google-drive';

const ROOT_FOLDER_IDS = {
  JURI: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
  VVD: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
  EP: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
  SUBSTITUICAO: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
  GRUPO_JURI: "1LUW4yauxm6iaJYCrjRgXAnSgTZIbel2j",
};

async function main() {
  console.log('=== BACKFILL parentFileId ===\n');

  let totalUpdated = 0;

  for (const [name, rootFolderId] of Object.entries(ROOT_FOLDER_IDS)) {
    console.log(`\n--- ${name} (${rootFolderId.substring(0,20)}...) ---`);

    // Get all DB files for this root folder
    const dbFiles = await db.select({
      id: driveFiles.id,
      driveFileId: driveFiles.driveFileId,
      parentFileId: driveFiles.parentFileId,
      name: driveFiles.name,
    }).from(driveFiles).where(eq(driveFiles.driveFolderId, rootFolderId));

    if (dbFiles.length === 0) {
      console.log('  No files in DB, skipping.');
      continue;
    }

    console.log(`  DB files: ${dbFiles.length}`);

    // Build driveFileId → dbId map
    const driveIdToDbId = new Map<string, number>();
    for (const f of dbFiles) {
      driveIdToDbId.set(f.driveFileId, f.id);
    }

    // Get fresh listing from Google Drive (includes parents)
    console.log('  Fetching from Google Drive API...');
    const driveFilesList = await listAllFilesRecursively(rootFolderId);

    if (!driveFilesList || driveFilesList.length === 0) {
      console.log('  Google Drive returned empty, skipping.');
      continue;
    }

    console.log(`  Drive files: ${driveFilesList.length}`);

    let updated = 0;
    let rootLevel = 0;
    let nested = 0;
    let notInDb = 0;

    for (const driveFile of driveFilesList) {
      const dbId = driveIdToDbId.get(driveFile.id);
      if (!dbId) {
        notInDb++;
        continue;
      }

      const parentDriveId = driveFile.parents?.[0];
      if (!parentDriveId) continue;

      if (parentDriveId === rootFolderId) {
        // This file is at the root level — parentFileId should be null
        rootLevel++;
        // Already null in DB, no update needed
        continue;
      }

      // This file's parent is a subfolder
      const parentDbId = driveIdToDbId.get(parentDriveId);
      if (parentDbId) {
        // Check if it's already correct
        const dbFile = dbFiles.find(f => f.driveFileId === driveFile.id);
        if (dbFile && dbFile.parentFileId !== parentDbId) {
          await db.update(driveFiles)
            .set({ parentFileId: parentDbId })
            .where(eq(driveFiles.id, dbId));
          updated++;
        }
        nested++;
      }
    }

    console.log(`  Root level: ${rootLevel}, Nested: ${nested}, Updated: ${updated}, Not in DB: ${notInDb}`);
    totalUpdated += updated;
  }

  // Final verification
  console.log('\n=== VERIFICATION ===');
  const [withParent] = await db.select({ count: sql<number>`count(*)::int` })
    .from(driveFiles)
    .where(sql`parent_file_id IS NOT NULL`);
  const [withoutParent] = await db.select({ count: sql<number>`count(*)::int` })
    .from(driveFiles)
    .where(sql`parent_file_id IS NULL`);

  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Files with parentFileId set: ${withParent.count}`);
  console.log(`Files at root (parentFileId=null): ${withoutParent.count}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
