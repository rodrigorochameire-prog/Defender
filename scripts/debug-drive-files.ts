import { db, driveFiles } from '../src/lib/db';
import { sql, isNull, isNotNull, eq, and, desc } from 'drizzle-orm';

// These are the actual folder IDs from the app config
const FOLDER_IDS = {
  JURI: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
  VVD: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
  EP: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
  SUBSTITUICAO: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
};

async function main() {
  console.log('=== TESTING EXACT QUERY THE UI WOULD MAKE ===\n');

  for (const [name, folderId] of Object.entries(FOLDER_IDS)) {
    // This is the exact query DriveContentArea makes at root level
    const files = await db.select({
      id: driveFiles.id,
      name: driveFiles.name,
      isFolder: driveFiles.isFolder,
      parentFileId: driveFiles.parentFileId,
    })
    .from(driveFiles)
    .where(and(
      eq(driveFiles.driveFolderId, folderId),
      isNull(driveFiles.parentFileId)
    ))
    .orderBy(desc(driveFiles.isFolder), driveFiles.name)
    .limit(10);

    console.log(`\n${name} (folderId: ${folderId.substring(0,20)}...):`);
    console.log(`  Query result: ${files.length} items (showing first 10)`);
    for (const f of files.slice(0, 5)) {
      console.log(`    ${f.isFolder ? '📁' : '📄'} ${f.name} [id=${f.id}]`);
    }
    if (files.length > 5) console.log(`    ... and ${files.length - 5} more`);
  }

  // Now simulate clicking a subfolder - e.g. first folder in JURI
  console.log('\n=== SIMULATING SUBFOLDER CLICK ===\n');
  const juriId = FOLDER_IDS.JURI;

  const firstFolder = await db.select({
    id: driveFiles.id,
    name: driveFiles.name,
    driveFileId: driveFiles.driveFileId,
  })
  .from(driveFiles)
  .where(and(
    eq(driveFiles.driveFolderId, juriId),
    isNull(driveFiles.parentFileId),
    eq(driveFiles.isFolder, true)
  ))
  .limit(1);

  if (firstFolder.length > 0) {
    const sf = firstFolder[0];
    console.log(`Clicking subfolder: 📁 ${sf.name} (driveFileId=${sf.driveFileId})\n`);

    // OLD QUERY: what the UI was doing before fix (folderId = subfolder driveFileId)
    const oldQuery = await db.select({ count: sql<number>`count(*)::int` })
      .from(driveFiles)
      .where(and(
        eq(driveFiles.driveFolderId, sf.driveFileId),
        isNull(driveFiles.parentFileId)
      ));
    console.log(`  OLD query (folderId=${sf.driveFileId.substring(0,15)}..., parentFileId=NULL): ${oldQuery[0].count} results`);

    // NEW QUERY: what my fix does (folderId = root, parentDriveFileId = subfolder)
    // Step 1: look up the DB id by driveFileId (this is what the router does with parentDriveFileId)
    const [parentLookup] = await db.select({ id: driveFiles.id })
      .from(driveFiles)
      .where(eq(driveFiles.driveFileId, sf.driveFileId))
      .limit(1);

    if (parentLookup) {
      const newQuery = await db.select({ count: sql<number>`count(*)::int` })
        .from(driveFiles)
        .where(and(
          eq(driveFiles.driveFolderId, juriId),
          eq(driveFiles.parentFileId, parentLookup.id)
        ));
      console.log(`  NEW query (folderId=JURI_ROOT, parentFileId=${parentLookup.id}): ${newQuery[0].count} results`);
    }

    // What about files that are actually in this Google Drive subfolder?
    // (files whose Google parent = this subfolder's driveFileId)
    // We can't check this from the DB since parent info wasn't stored.
    // But we know ALL files have parentFileId=null, so:
    console.log(`\n  >> Since ALL 2401 files have parentFileId=null,`);
    console.log(`     the NEW query also returns 0 because no files have parentFileId=${parentLookup?.id}`);
    console.log(`     SOLUTION: Need to backfill parentFileId using Google Drive API`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
