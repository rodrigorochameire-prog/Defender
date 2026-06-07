import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { registroAnexos, registros } from "@/lib/db/schema/agenda";
import { assistidos } from "@/lib/db/schema/core";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { atribuicaoToFolderKey } from "./atribuicao-folder-key";
import {
  uploadFileBuffer,
  criarOuEncontrarPasta,
  createOrFindAssistidoFolder,
} from "@/lib/services/google-drive";

/**
 * Espelha um anexo na pasta do assistido no Drive (subpasta "Registros").
 * Best-effort: nunca lança; atualiza drive_status para 'synced' ou 'error'.
 */
export async function mirrorAnexoToDrive(anexoId: number): Promise<void> {
  try {
    const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, anexoId) });
    if (!anexo) return;

    const registro = await db.query.registros.findFirst({ where: eq(registros.id, anexo.registroId) });
    if (!registro?.assistidoId) throw new Error("registro sem assistido");

    const assistido = await db.query.assistidos.findFirst({ where: eq(assistidos.id, registro.assistidoId) });
    if (!assistido) throw new Error("assistido não encontrado");

    let assistidoFolderId = assistido.driveFolderId ?? null;
    if (!assistidoFolderId) {
      const key = atribuicaoToFolderKey(assistido.atribuicaoPrimaria as string | null);
      if (!key) throw new Error(`sem pasta e atribuição sem mapa: ${assistido.atribuicaoPrimaria}`);
      const folder = await createOrFindAssistidoFolder(key, assistido.nome);
      if (!folder?.id) throw new Error("createOrFindAssistidoFolder retornou null");
      assistidoFolderId = folder.id;
    }

    const registrosFolder = await criarOuEncontrarPasta("Registros", assistidoFolderId);
    if (!registrosFolder?.id) throw new Error("não foi possível criar/achar subpasta Registros");

    const supabase = getSupabaseAdmin();
    const { data: blob } = await supabase.storage.from("documents").download(anexo.storagePath);
    if (!blob) throw new Error("falha ao baixar do Storage");
    const buffer = Buffer.from(await blob.arrayBuffer());

    const uploaded = await uploadFileBuffer(
      buffer,
      anexo.nomeOriginal,
      anexo.mimeType,
      registrosFolder.id,
      `Anexo do registro #${anexo.registroId}`,
    );
    const driveFileId = (uploaded as { id?: string } | null)?.id ?? null;

    await db.update(registroAnexos)
      .set({ driveFileId, driveStatus: driveFileId ? "synced" : "error" })
      .where(eq(registroAnexos.id, anexoId));
  } catch (err) {
    console.error(`[mirrorAnexoToDrive] anexo ${anexoId}:`, err);
    await db.update(registroAnexos)
      .set({ driveStatus: "error" })
      .where(eq(registroAnexos.id, anexoId))
      .catch(() => {});
  }
}
