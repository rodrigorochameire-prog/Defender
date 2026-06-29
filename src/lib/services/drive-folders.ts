import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema/core";
import { driveGroups } from "@/lib/db/schema/drive";

export const ATRIBUICOES = [
  "JURI", "VVD", "EP", "SUBSTITUICAO", "GRUPO_JURI", "CRIMINAL",
] as const;
export type Atribuicao = (typeof ATRIBUICOES)[number];

/** Mapa armazenado no grupo: atribuição → lista de pastas (>1 por causa de MPU/cível/extras). */
export type AtribuicaoFoldersMap = Record<string, string[] | string>;

/** Lógica pura: TODAS as pastas da atribuição (tolera valor string legado). */
export function pickAtribuicaoFolders(
  folders: AtribuicaoFoldersMap,
  atribuicao: Atribuicao,
): string[] {
  const v = folders?.[atribuicao];
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Lógica pura: pasta primária (primeira) ou null. */
export function pickAtribuicaoFolderPrimary(
  folders: AtribuicaoFoldersMap,
  atribuicao: Atribuicao,
): string | null {
  return pickAtribuicaoFolders(folders, atribuicao)[0] ?? null;
}

/** Pura: varre o mapa de um grupo procurando o folderId → sua chave de atribuição. */
export function findAtribuicaoForFolder(
  folders: AtribuicaoFoldersMap,
  folderId: string,
): Atribuicao | null {
  for (const atribuicao of ATRIBUICOES) {
    if (pickAtribuicaoFolders(folders, atribuicao).includes(folderId)) {
      return atribuicao;
    }
  }
  return null;
}

async function loadGroupFolders(userId: number): Promise<AtribuicaoFoldersMap> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { driveGroupId: true },
  });
  if (!user?.driveGroupId) return {};
  const group = await db.query.driveGroups.findFirst({
    where: eq(driveGroups.id, user.driveGroupId),
  });
  return (group?.atribuicaoFolders ?? {}) as AtribuicaoFoldersMap;
}

/** TODAS as pastas de uma atribuição para um defensor (use nos loops de sync/scan). */
export async function resolveAtribuicaoFolders(
  userId: number,
  atribuicao: Atribuicao,
): Promise<string[]> {
  return pickAtribuicaoFolders(await loadGroupFolders(userId), atribuicao);
}

/** Pasta primária de uma atribuição (use onde se espera 1 pasta, ex. prompt de análise). */
export async function resolveAtribuicaoFolder(
  userId: number,
  atribuicao: Atribuicao,
): Promise<string | null> {
  return pickAtribuicaoFolderPrimary(await loadGroupFolders(userId), atribuicao);
}

/** Mapa completo do grupo (use para iterar todas as atribuições de uma vez). */
export async function resolveAllAtribuicaoFolders(
  userId: number,
): Promise<AtribuicaoFoldersMap> {
  return loadGroupFolders(userId);
}

/** Lookup reverso: folderId → {dono, grupo, atribuição}, sem sessão. Varre todos os grupos. */
export async function resolveFolderToAtribuicao(
  folderId: string,
): Promise<{ ownerUserId: number; driveGroupId: number; atribuicao: Atribuicao } | null> {
  const groups = await db.query.driveGroups.findMany({
    columns: { id: true, ownerUserId: true, atribuicaoFolders: true },
  });
  for (const g of groups) {
    const atribuicao = findAtribuicaoForFolder(
      (g.atribuicaoFolders ?? {}) as AtribuicaoFoldersMap,
      folderId,
    );
    if (atribuicao) {
      return { ownerUserId: g.ownerUserId, driveGroupId: g.id, atribuicao };
    }
  }
  return null;
}
