/**
 * Script para reprocessar gravações do Plaud que falharam no upload ao Drive.
 * Uso: set -a && source .env.local && set +a && npx tsx scripts/reprocess-plaud.ts
 */
import { uploadFileBuffer } from "../src/lib/services/google-drive";
import { db } from "../src/lib/db";
import { plaudRecordings, driveFiles, assistidos } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

// Forçar ROOT_FOLDER_ID para que isGoogleDriveConfigured() retorne true
if (!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = "1Bxt9YA8xCj7jKIi1bP0m_n1w-UNjx1YR";
}

async function uploadTranscription(recordingId: number, assistidoId: number, folderId: string) {
  const [recording] = await db
    .select()
    .from(plaudRecordings)
    .where(eq(plaudRecordings.id, recordingId))
    .limit(1);

  if (!recording || !recording.transcription) {
    console.log(`No recording or transcription for ${recordingId}`);
    return;
  }

  const titulo = recording.title || recording.plaudRecordingId || "gravacao";
  const dataStr = new Date().toISOString().slice(0, 10);
  const safeTitle = titulo.replace(/[^a-zA-Z0-9_\- ]/g, "_").slice(0, 80);
  const fileName = `transcricao_${safeTitle}_${dataStr}.md`;

  const content = [
    `# Transcrição: ${titulo}`,
    "",
    `**Data:** ${dataStr}`,
    `**Assistido ID:** ${assistidoId}`,
    "",
    "---",
    "",
    recording.transcription,
  ].join("\n");

  const buffer = Buffer.from(content, "utf-8");
  console.log(`Uploading ${fileName} (${buffer.length} bytes) to folder ${folderId}`);

  const result = await uploadFileBuffer(
    buffer,
    fileName,
    "text/markdown",
    folderId,
    `Transcrição Plaud: ${titulo}`,
    { preventDuplicates: true }
  );

  if (result) {
    console.log(`✅ Uploaded! Drive ID: ${result.id}`);
    console.log(`   Link: ${result.webViewLink}`);

    await db
      .insert(driveFiles)
      .values({
        driveFileId: result.id,
        driveFolderId: folderId,
        name: result.name || fileName,
        mimeType: "text/markdown",
        fileSize: buffer.length,
        webViewLink: result.webViewLink,
        webContentLink: result.webContentLink,
        syncStatus: "synced",
        lastSyncAt: new Date(),
        assistidoId: assistidoId,
      })
      .onConflictDoNothing();

    console.log("   Registered in drive_files!");
  } else {
    console.log("❌ Upload returned null");
  }
}

async function main() {
  // Use processApprovedRecording which uses OAuth token (available with production env)
  const { processApprovedRecording } = await import("../src/lib/services/plaud-api");

  // === WALTER (recording 15, assistido 449, atendimento 3) ===
  console.log("=== Processing Walter (recording 15) ===");
  const r1 = await processApprovedRecording(15, 449, 3, null);
  console.log("Walter result:", JSON.stringify(r1));

  console.log("");

  // === JADSON (recording 16, assistido 332, atendimento 2) ===
  console.log("=== Processing Jadson (recording 16) ===");
  const r2 = await processApprovedRecording(16, 332, 2, null);
  console.log("Jadson result:", JSON.stringify(r2));
}

main()
  .catch((e) => console.error("Error:", e))
  .finally(() => process.exit(0));
