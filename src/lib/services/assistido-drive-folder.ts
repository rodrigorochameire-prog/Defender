import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema/core";

/**
 * Resolve (criando se necessário) a pasta do assistido no Drive e retorna o
 * folderId. Mesma lógica usada pelo pipeline do Plaud: usa
 * `assistidos.driveFolderId` se já existe; senão cria a partir da atribuição
 * primária e persiste o id no assistido. Retorna null se não for possível.
 */
export async function ensureAssistidoDriveFolder(
  assistidoId: number,
): Promise<{ folderId: string; nome: string } | null> {
  const [assistido] = await db
    .select({
      id: assistidos.id,
      nome: assistidos.nome,
      atribuicao: assistidos.atribuicaoPrimaria,
      driveFolderId: assistidos.driveFolderId,
    })
    .from(assistidos)
    .where(eq(assistidos.id, assistidoId))
    .limit(1);
  if (!assistido) return null;

  if (assistido.driveFolderId) {
    return { folderId: assistido.driveFolderId, nome: assistido.nome };
  }
  if (!assistido.atribuicao) return null;

  try {
    const { createOrFindAssistidoFolder, mapAtribuicaoToFolderKey, isGoogleDriveConfigured } =
      await import("@/lib/services/google-drive");
    if (!isGoogleDriveConfigured()) return null;
    const folderKey = mapAtribuicaoToFolderKey(assistido.atribuicao);
    if (!folderKey) return null;
    const folder = await createOrFindAssistidoFolder(folderKey, assistido.nome);
    if (!folder) return null;
    await db
      .update(assistidos)
      .set({ driveFolderId: folder.id, updatedAt: new Date() })
      .where(eq(assistidos.id, assistidoId));
    return { folderId: folder.id, nome: assistido.nome };
  } catch (e) {
    console.error(`[assistido-drive-folder] erro ao criar pasta p/ ${assistidoId}:`, e);
    return null;
  }
}
