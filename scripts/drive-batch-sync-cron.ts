import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema/core";
import { driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db/schema/drive";
import { and, isNull, inArray, eq, sql } from "drizzle-orm";
import { smartSync } from "@/lib/services/google-drive";

const LIMIT = parseInt(process.env.BATCH_LIMIT ?? "10");
const CRON_USER_ID = parseInt(process.env.CRON_DEFENSOR_ID ?? "1");
const DRY_RUN = process.env.DRY_RUN === "true";

async function main() {
  console.log(`=== Drive Batch Sync ===`);
  console.log(`userId: ${CRON_USER_ID}, dryRun: ${DRY_RUN}, limit: ${LIMIT}`);

  const withFolder = await db
    .select({ id: assistidos.id, nome: assistidos.nome, driveFolderId: assistidos.driveFolderId })
    .from(assistidos)
    .where(and(sql`${assistidos.driveFolderId} IS NOT NULL`, isNull(assistidos.deletedAt)));

  console.log(`\nAssistidos with driveFolderId: ${withFolder.length}`);

  if (withFolder.length === 0) { console.log("Nothing to sync."); process.exit(0); }

  const withFiles = await db
    .select({ assistidoId: driveFiles.assistidoId, count: sql<number>`count(*)::int` })
    .from(driveFiles)
    .where(and(inArray(driveFiles.assistidoId, withFolder.map(a => a.id)), eq(driveFiles.isFolder, false)))
    .groupBy(driveFiles.assistidoId);

  const hasFilesSet = new Set(withFiles.map(w => w.assistidoId));
  const pending = withFolder.filter(a => !hasFilesSet.has(a.id));

  console.log(`Assistidos with existing files: ${withFiles.length}`);
  console.log(`Pending (folder but no files): ${pending.length}`);

  const batch = pending.slice(0, LIMIT);
  console.log(`\nBatch to process (${batch.length} of ${pending.length}):`);
  batch.forEach(a => console.log(` - [${a.id}] ${a.nome} → ${a.driveFolderId}`));

  if (DRY_RUN) { console.log("\n[DRY RUN] No changes made."); process.exit(0); }

  const results: Array<{ assistidoId: number; nome: string; success: boolean; filesLinked: number; error?: string }> = [];

  for (const assistido of batch) {
    console.log(`\nSyncing [${assistido.id}] ${assistido.nome}...`);
    try {
      await db.insert(driveSyncFolders).values({
        name: assistido.nome,
        driveFolderId: assistido.driveFolderId!,
        driveFolderUrl: `https://drive.google.com/drive/folders/${assistido.driveFolderId}`,
        description: `Batch sync - ${assistido.nome}`,
        syncDirection: "drive_to_app",
        isActive: true,
        createdById: CRON_USER_ID,
      }).onConflictDoUpdate({ target: driveSyncFolders.driveFolderId, set: { isActive: true, updatedAt: new Date() } });

      const syncRes = await smartSync(assistido.driveFolderId!, CRON_USER_ID);
      console.log(`  smartSync success=${syncRes.success}`);

      const linked = await db
        .update(driveFiles)
        .set({ assistidoId: assistido.id, updatedAt: new Date() })
        .where(and(eq(driveFiles.driveFolderId, assistido.driveFolderId!), isNull(driveFiles.assistidoId)))
        .returning({ id: driveFiles.id });

      console.log(`  Linked ${linked.length} files`);
      results.push({ assistidoId: assistido.id, nome: assistido.nome, success: syncRes.success, filesLinked: linked.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR: ${msg}`);
      results.push({ assistidoId: assistido.id, nome: assistido.nome, success: false, filesLinked: 0, error: msg });
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const totalLinked = results.reduce((s, r) => s + r.filesLinked, 0);

  await db.insert(driveSyncLogs).values({
    driveFileId: null,
    action: "batch_sync_pending",
    status: "success",
    details: JSON.stringify({ totalProcessed: results.length, succeeded, totalLinked, results }),
    userId: CRON_USER_ID,
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`Processed: ${results.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Total files linked: ${totalLinked}`);
  results.filter(r => !r.success).forEach(r => console.log(`  ERROR [${r.assistidoId}] ${r.nome}: ${r.error}`));

  process.exit(0);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
