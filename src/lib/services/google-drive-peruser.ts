import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const GOOGLE_API_BASE = "https://www.googleapis.com";

const ATRIBUICAO_SUBFOLDERS: Array<{ key: string; name: string }> = [
  { key: "JURI", name: "Processos - Júri" },
  { key: "VVD", name: "Processos - VVD (Criminal)" },
  { key: "EP", name: "Processos - Execução Penal" },
  { key: "SUBSTITUICAO", name: "Processos - Substituição" },
  { key: "GRUPO_JURI", name: "Processos - Grupo do Júri" },
  { key: "CRIMINAL", name: "Processos" },
];

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

async function getUserToken(userId: number): Promise<{ refreshToken: string; accessToken: string }> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (!token) throw new Error("Google não vinculado para este usuário");

  const accessToken = await getAccessToken(token.refreshToken);

  await db.execute(sql`
    UPDATE user_google_tokens SET access_token = ${accessToken}, updated_at = NOW()
    WHERE user_id = ${userId}
  `);

  return { refreshToken: token.refreshToken, accessToken };
}

async function createSubfolder(accessToken: string, parentId: string, name: string): Promise<string> {
  const folder = await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  return folder.id as string;
}

async function driveRequest(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${GOOGLE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive API error (${res.status}): ${err}`);
  }
  return res.json();
}

export async function createUserDriveStructure(userId: number): Promise<{
  rootFolderId: string;
  rootFolderUrl: string;
  driveGroupId: number;
}> {
  const { accessToken } = await getUserToken(userId);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  // Idempotency: if a drive_group already exists for this user, return existing data.
  if (user.driveGroupId != null && user.driveFolderId) {
    return {
      rootFolderId: user.driveFolderId,
      rootFolderUrl: `https://drive.google.com/drive/folders/${user.driveFolderId}`,
      driveGroupId: user.driveGroupId,
    };
  }

  const comarcaResult = await db.execute(sql`SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`);
  const comarcaNome = (comarcaResult[0] as any)?.nome ?? "";

  const rootFolder = await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: `OMBUDS — ${user.name}${comarcaNome ? ` — ${comarcaNome}` : ""}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  // Create "Modelos" subfolder (pre-existing behaviour)
  await createSubfolder(accessToken, rootFolder.id, "Modelos");

  // Create standard atribuição subfolders and build the folder map
  const atribuicaoFolders: Record<string, string[]> = {};
  for (const sf of ATRIBUICAO_SUBFOLDERS) {
    const folderId = await createSubfolder(accessToken, rootFolder.id, sf.name);
    atribuicaoFolders[sf.key] = [folderId];
  }

  // Persist drive_folder_id (existing behaviour)
  await db.execute(sql`
    UPDATE users SET drive_folder_id = ${rootFolder.id} WHERE id = ${userId}
  `);

  // Create the drive_groups row for this defensor
  const groupRows = await db.execute(sql`
    INSERT INTO drive_groups (owner_user_id, label, atribuicao_folders)
    VALUES (${userId}, ${`OMBUDS — ${user.name}`}, ${JSON.stringify(atribuicaoFolders)}::jsonb)
    RETURNING id
  `);
  const groupId = (groupRows[0] as any).id as number;

  // Link the group back to the user and mark Google as linked
  await db.execute(sql`
    UPDATE users SET drive_group_id = ${groupId}, google_linked = true WHERE id = ${userId}
  `);

  return {
    rootFolderId: rootFolder.id,
    rootFolderUrl: `https://drive.google.com/drive/folders/${rootFolder.id}`,
    driveGroupId: groupId,
  };
}

export async function isGoogleLinked(userId: number): Promise<boolean> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  return !!token;
}

export async function getUserGoogleEmail(userId: number): Promise<string | null> {
  const token = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  return token?.email ?? null;
}
