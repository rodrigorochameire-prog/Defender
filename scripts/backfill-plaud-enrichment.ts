/**
 * Backfill: popula enrichment_data nos .md files criados pelo Plaud
 * que ainda estao com enrichment_status = "pending".
 *
 * Uso: npx tsx scripts/backfill-plaud-enrichment.ts
 */
import { db } from "@/lib/db";
import { driveFiles, plaudRecordings, atendimentos } from "@/lib/db/schema";
import { eq, and, like, isNull } from "drizzle-orm";
import { enrichmentClient } from "@/lib/services/enrichment-client";

async function main() {
  console.log("=== Backfill Plaud enrichment_data ===\n");

  // Find .md files that look like Plaud transcriptions
  const mdFiles = await db
    .select()
    .from(driveFiles)
    .where(
      and(
        eq(driveFiles.mimeType, "text/markdown"),
        like(driveFiles.name, "transcricao_%"),
        eq(driveFiles.enrichmentStatus, "pending"),
      )
    );

  console.log(`Found ${mdFiles.length} pending Plaud .md files\n`);

  for (const file of mdFiles) {
    console.log(`Processing: ${file.name} (id=${file.id})`);

    // Find matching plaud_recording by assistidoId
    if (!file.assistidoId) {
      console.log("  SKIP: no assistidoId");
      continue;
    }

    const [recording] = await db
      .select()
      .from(plaudRecordings)
      .where(eq(plaudRecordings.assistidoId, file.assistidoId))
      .orderBy(plaudRecordings.id)
      .limit(1);

    if (!recording) {
      console.log("  SKIP: no matching plaud_recording");
      continue;
    }

    // Build enrichment_data
    const enrichmentData = {
      sub_type: "transcricao_plaud" as const,
      transcript: recording.transcription,
      transcript_plain: recording.transcription,
      speakers: recording.speakers || [],
      summary: recording.summary,
      confidence: 1.0,
      interlocutor: (recording.rawPayload as any)?.interlocutor || null,
      tipo_gravacao: (recording.rawPayload as any)?.tipoGravacao || null,
      plaud_recording_id: recording.id,
      atendimento_id: recording.atendimentoId,
    };

    await db.update(driveFiles).set({
      enrichmentStatus: "completed",
      documentType: "transcricao_plaud",
      enrichmentData,
      updatedAt: new Date(),
    }).where(eq(driveFiles.id, file.id));

    console.log(`  Updated: enrichment_data + status=completed + documentType=transcricao_plaud`);

    // Fire-and-forget: trigger Sonnet analysis
    if (recording.transcription && recording.transcription.length > 100) {
      try {
        await enrichmentClient.analyzeAsync({
          transcript: recording.transcription,
          fileName: file.name,
          dbRecordId: file.id,
          driveFileId: file.driveFileId,
        });
        console.log(`  Queued Sonnet analysis`);
      } catch (e) {
        console.log(`  Analysis queue failed (non-critical): ${e}`);
      }
    }
  }

  // Also fix atendimentos.duracao where null
  const atds = await db
    .select({
      atd_id: atendimentos.id,
      duracao: atendimentos.duracao,
      rec_id: plaudRecordings.id,
      rec_duracao: plaudRecordings.duration,
    })
    .from(atendimentos)
    .innerJoin(plaudRecordings, eq(plaudRecordings.atendimentoId, atendimentos.id))
    .where(isNull(atendimentos.duracao));

  console.log(`\nFixing ${atds.length} atendimentos with null duracao`);
  for (const a of atds) {
    if (a.rec_duracao) {
      await db.update(atendimentos).set({
        duracao: a.rec_duracao,
        updatedAt: new Date(),
      }).where(eq(atendimentos.id, a.atd_id));
      console.log(`  Atendimento ${a.atd_id}: duracao = ${a.rec_duracao}s`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
