/**
 * 04-backfill-parent-file-id.ts
 *
 * Ensures all drive_files have correct parentFileId.
 * After Task 3 (full reindex), most should already be set by syncFolderWithDatabase().
 * This script handles any remaining stragglers.
 *
 * Strategy (in order):
 *  1. DB-only resolution: files whose drive_folder_id matches an existing drive_files row.
 *  2. Root-level: files whose drive_folder_id is one of the ATRIBUICAO_FOLDER_IDS or SPECIAL_FOLDER_IDS → already null (correct).
 *  3. Unknown parent folders: call Drive API getFileInfo to fetch the file's parents[] and
 *     walk up the hierarchy until we find a known anchor (or conclude it is outside scope).
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/04-backfill-parent-file-id.ts
 */

import { db } from '../../src/lib/db';
import { driveFiles } from '../../src/lib/db/schema/drive';
import { eq, isNull, and, sql, inArray } from 'drizzle-orm';
import { getFileInfo } from '../../src/lib/services/google-drive';
import { ATRIBUICAO_FOLDER_IDS, SPECIAL_FOLDER_IDS } from '../../src/lib/utils/text-extraction';

// Any file whose immediate parent (driveFolderId) is one of these folders
// is correctly root-level — parentFileId = null is intentional.
const ROOT_FOLDER_IDS = new Set([
  ...Object.values(ATRIBUICAO_FOLDER_IDS),
  ...Object.values(SPECIAL_FOLDER_IDS),
]);

async function main() {
  console.log('=== 04: BACKFILL parent_file_id ===\n');

  // ── Initial stats ──────────────────────────────────────────────────────────
  const [before] = await db
    .select({
      total: sql<number>`count(*)`,
      withParent: sql<number>`count(parent_file_id)`,
      missingNonFolders: sql<number>`count(*) filter (where parent_file_id is null and is_folder = false)`,
      rootFolders: sql<number>`count(*) filter (where parent_file_id is null and is_folder = true)`,
    })
    .from(driveFiles);

  console.log(`Total rows      : ${before.total}`);
  console.log(`With parentFileId: ${before.withParent}`);
  console.log(`Missing (non-folder): ${before.missingNonFolders}`);
  console.log(`Root folders (null OK): ${before.rootFolders}`);

  if (Number(before.missingNonFolders) === 0) {
    console.log('\nAll files have parentFileId. Nothing to do.');
    process.exit(0);
  }

  // ── Step 1: DB-only resolution ─────────────────────────────────────────────
  console.log('\n--- Step 1: DB-only resolution ---');
  // Files whose driveFolderId (immediate parent Drive ID) exists in drive_files
  // We can resolve these with a pure SQL UPDATE ... FROM JOIN
  const dbOnlyResult = await db.execute(sql`
    UPDATE drive_files df
    SET parent_file_id = pf.id
    FROM drive_files pf
    WHERE df.parent_file_id IS NULL
      AND NOT df.is_folder
      AND pf.drive_file_id = df.drive_folder_id
  `);
  const dbOnlyUpdated = (dbOnlyResult as any).rowCount ?? 0;
  console.log(`  Updated via DB join: ${dbOnlyUpdated}`);

  // ── Re-check remaining ─────────────────────────────────────────────────────
  const remaining = await db
    .select({
      id: driveFiles.id,
      driveFileId: driveFiles.driveFileId,
      driveFolderId: driveFiles.driveFolderId,
      name: driveFiles.name,
    })
    .from(driveFiles)
    .where(and(isNull(driveFiles.parentFileId), eq(driveFiles.isFolder, false)));

  console.log(`\nRemaining after DB join: ${remaining.length}`);

  // Separate root-level (correct null) from unknown-parent
  const rootLevel = remaining.filter(f => ROOT_FOLDER_IDS.has(f.driveFolderId));
  const unknownParent = remaining.filter(f => !ROOT_FOLDER_IDS.has(f.driveFolderId));

  console.log(`  Root-level (null OK): ${rootLevel.length}`);
  console.log(`  Unknown parent (needs Drive API): ${unknownParent.length}`);

  if (unknownParent.length === 0) {
    console.log('\nAll non-root files resolved. Done.');
  } else {
    // ── Step 2: Drive API resolution for unknown parents ─────────────────────
    console.log('\n--- Step 2: Drive API resolution ---');
    console.log('  Building driveFileId → dbId map from DB...');

    // Build lookup map of ALL known drive file IDs → DB IDs
    const allKnown = await db
      .select({ id: driveFiles.id, driveFileId: driveFiles.driveFileId })
      .from(driveFiles);
    const driveIdToDbId = new Map<string, number>();
    for (const f of allKnown) driveIdToDbId.set(f.driveFileId, f.id);

    // Group by unknown driveFolderId to minimize API calls
    const byParentFolder = new Map<string, typeof unknownParent>();
    for (const f of unknownParent) {
      const arr = byParentFolder.get(f.driveFolderId) ?? [];
      arr.push(f);
      byParentFolder.set(f.driveFolderId, arr);
    }

    console.log(`  ${byParentFolder.size} distinct unknown parent folders`);

    let driveApiUpdated = 0;
    let driveApiFailed = 0;
    let outOfScope = 0;

    for (const [parentDriveId, files] of byParentFolder.entries()) {
      console.log(`\n  Folder ${parentDriveId.slice(0, 12)}... (${files.length} files)`);

      // Try to look up this folder in Drive API
      try {
        const folderInfo = await getFileInfo(parentDriveId);
        if (!folderInfo) {
          console.log(`    Drive API returned null — folder may be deleted or inaccessible`);
          outOfScope += files.length;
          continue;
        }

        // Check if this parent folder itself is in our DB (it might have been inserted
        // after the initial query)
        let parentDbId: number | null = driveIdToDbId.get(parentDriveId) ?? null;

        // If the folder is not in DB, check if its parent chain leads to a known root
        if (parentDbId === null) {
          // Walk up: the parent folder of parentDriveId
          const grandParentId = folderInfo.parents?.[0];
          if (grandParentId && ROOT_FOLDER_IDS.has(grandParentId)) {
            // The folder is a direct child of an atribuicao root, so it SHOULD be in DB
            // but isn't — this is a missing folder. Files should remain null (orphaned).
            console.log(`    Parent folder is direct child of root but not in DB — ${files.length} files remain orphaned`);
            outOfScope += files.length;
          } else if (grandParentId && driveIdToDbId.has(grandParentId)) {
            parentDbId = driveIdToDbId.get(grandParentId)!;
            console.log(`    Found grandparent in DB (id=${parentDbId}), using it as parent`);
          } else {
            console.log(`    Cannot resolve parent chain — ${files.length} files remain null`);
            outOfScope += files.length;
          }
        }

        if (parentDbId !== null) {
          // Update all files in this group
          const ids = files.map(f => f.id);
          await db
            .update(driveFiles)
            .set({ parentFileId: parentDbId })
            .where(inArray(driveFiles.id, ids));
          driveApiUpdated += files.length;
          console.log(`    Set parentFileId=${parentDbId} for ${files.length} files`);
        }
      } catch (err: any) {
        console.error(`    ERROR fetching folder ${parentDriveId}: ${err.message}`);
        driveApiFailed += files.length;
      }

      // Rate limit: small delay between Drive API calls
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\nDrive API results:`);
    console.log(`  Updated: ${driveApiUpdated}`);
    console.log(`  Out-of-scope/orphaned: ${outOfScope}`);
    console.log(`  API errors: ${driveApiFailed}`);
  }

  // ── Final stats ────────────────────────────────────────────────────────────
  const [after] = await db
    .select({
      withParent: sql<number>`count(parent_file_id)`,
      missingNonFolders: sql<number>`count(*) filter (where parent_file_id is null and is_folder = false)`,
    })
    .from(driveFiles);

  console.log('\n=== FINAL STATE ===');
  console.log(`With parentFileId: ${after.withParent}`);
  console.log(`Files still missing parentFileId: ${after.missingNonFolders}`);

  if (Number(after.missingNonFolders) === 0) {
    console.log('\nAll files have parentFileId. Complete!');
  } else {
    console.log(`\n${after.missingNonFolders} files remain without parentFileId.`);
    console.log('These are likely orphaned (parent not in Drive scope) or in external folders.');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
