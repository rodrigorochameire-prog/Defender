import { db } from "@/lib/db";
import { userGoogleTokens, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const GOOGLE_API_BASE = "https://www.googleapis.com";

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
}> {
  const { accessToken } = await getUserToken(userId);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error("Usuário não encontrado");

  const comarcaResult = await db.execute(sql`SELECT nome FROM comarcas WHERE id = ${user.comarcaId}`);
  const comarcaNome = (comarcaResult[0] as any)?.nome ?? "";

  const rootFolder = await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: `OMBUDS — ${user.name}${comarcaNome ? ` — ${comarcaNome}` : ""}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  await driveRequest(accessToken, "/drive/v3/files", {
    method: "POST",
    body: JSON.stringify({
      name: "Modelos",
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolder.id],
    }),
  });

  await db.execute(sql`
    UPDATE users SET drive_folder_id = ${rootFolder.id} WHERE id = ${userId}
  `);

  return {
    rootFolderId: rootFolder.id,
    rootFolderUrl: `https://drive.google.com/drive/folders/${rootFolder.id}`,
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
