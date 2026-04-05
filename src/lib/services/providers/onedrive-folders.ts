import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { OneDriveProvider } from "./onedrive-provider";

/**
 * Creates (or recovers) the "OMBUDS" root folder in the user's OneDrive,
 * then persists its ID to `users.onedriveRootFolderId`.
 */
export async function createOneDriveRootFolder(userId: number): Promise<string> {
  const provider = new OneDriveProvider(userId);

  // If the folder already exists (e.g. user is reconnecting), reuse it.
  const existing = await provider.findFolderByName("OMBUDS", "root");
  if (existing) {
    await db.execute(
      sql`UPDATE users SET onedrive_root_folder_id = ${existing.id} WHERE id = ${userId}`
    );
    return existing.id;
  }

  const folder = await provider.createFolder("OMBUDS", "root");
  await db.execute(
    sql`UPDATE users SET onedrive_root_folder_id = ${folder.id} WHERE id = ${userId}`
  );
  return folder.id;
}

/**
 * High-level entry point: guarantees the full three-level hierarchy
 * (OMBUDS → atribuição → assistido) exists in OneDrive before a file upload.
 *
 * Idempotent — safe to call repeatedly; each level is looked up before being created.
 *
 * @returns The assistido folder ID to use as `folderId` for uploads.
 */
export async function getOrCreateAssistidoFolder(
  userId: number,
  assistidoNome: string,
  atribuicao: string
): Promise<{ folderId: string }> {
  // 1. Ensure the OMBUDS root folder exists.
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onedriveRootFolderId: true },
  });

  let rootFolderId = (user as any)?.onedriveRootFolderId as string | null;
  if (!rootFolderId) {
    rootFolderId = await createOneDriveRootFolder(userId);
  }

  const provider = new OneDriveProvider(userId);

  // 2. Ensure the atribuição subfolder (e.g. "VVD", "Criminal", "Geral").
  const atribuicaoLabel = atribuicao?.trim() || "Geral";
  let atribuicaoFolder = await provider.findFolderByName(atribuicaoLabel, rootFolderId);
  if (!atribuicaoFolder) {
    atribuicaoFolder = await provider.createFolder(atribuicaoLabel, rootFolderId);
  }

  // 3. Ensure the assistido subfolder inside the atribuição folder.
  const nomeNormalized = assistidoNome.trim();
  let assistidoFolder = await provider.findFolderByName(nomeNormalized, atribuicaoFolder.id);
  if (!assistidoFolder) {
    assistidoFolder = await provider.createFolder(nomeNormalized, atribuicaoFolder.id);
  }

  return { folderId: assistidoFolder.id };
}
