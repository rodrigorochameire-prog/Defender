import crypto from "crypto";
import { db } from "@/lib/db";
import { userMicrosoftTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Escopos mínimos necessários para o fluxo do OMBUDS:
// - Files.ReadWrite: leitura/escrita no drive do próprio usuário logado (suficiente
//   para o caso de uso — não precisamos mexer em drives de outros usuários nem no
//   SharePoint, então Files.ReadWrite.All foi removido por princípio de menor privilégio)
// - offline_access: permite refresh tokens (caso contrário o acesso dura ~1h)
// - User.Read: pra pegar email/displayName ao salvar os tokens (Graph /me)
const SCOPES = [
  "Files.ReadWrite",
  "offline_access",
  "User.Read",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientId(): string {
  return process.env.MICROSOFT_CLIENT_ID!;
}

function getClientSecret(): string {
  return process.env.MICROSOFT_CLIENT_SECRET!;
}

function getTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function getRedirectUri(): string {
  // Aceita NEXTAUTH_URL (convenção NextAuth legado) ou NEXT_PUBLIC_APP_URL
  // (nome usado no projeto atual). Fallback para dev local.
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base}/api/microsoft/callback`;
}

/** base64url-encode a Buffer (no padding). */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// ---------------------------------------------------------------------------
// getAuthUrl — raw URL construction with PKCE (no MSAL)
// ---------------------------------------------------------------------------

export async function getAuthUrl(
  _userId: number,
  _returnTo: string
): Promise<{ url: string; state: string; codeVerifier: string }> {
  const state = crypto.randomBytes(32).toString("hex");

  // PKCE: verifier = random 32-byte base64url; challenge = SHA256(verifier) base64url
  const verifierBuf = crypto.randomBytes(32);
  const codeVerifier = base64url(verifierBuf);
  const challengeBuf = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64url(challengeBuf);

  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    response_mode: "query",
  });

  const url = `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/authorize?${params.toString()}`;

  return { url, state, codeVerifier };
}

// ---------------------------------------------------------------------------
// Raw token response shape
// ---------------------------------------------------------------------------

interface MsTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

// ---------------------------------------------------------------------------
// exchangeCode — raw fetch, returns token response directly
// ---------------------------------------------------------------------------

export async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<MsTokenResponse> {
  const res = await fetch(
    `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        code,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
        scope: SCOPES.join(" "),
      }),
    }
  );

  const data: MsTokenResponse = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      `Microsoft token exchange failed: ${data.error_description || data.error || res.status}`
    );
  }

  return data;
}

// ---------------------------------------------------------------------------
// getAccessToken — return valid token, refreshing via raw fetch if needed
// ---------------------------------------------------------------------------

export async function getAccessToken(userId: number): Promise<string> {
  const [record] = await db
    .select()
    .from(userMicrosoftTokens)
    .where(eq(userMicrosoftTokens.userId, userId))
    .limit(1);

  if (!record) {
    throw new Error("OneDrive desconectado — reconecte nas configurações");
  }

  // If token expires more than 5 minutes in the future, reuse it
  const fiveMinutes = 5 * 60 * 1000;
  if (record.expiresAt && record.accessToken) {
    const expiresAt = new Date(record.expiresAt).getTime();
    if (expiresAt > Date.now() + fiveMinutes) {
      return record.accessToken;
    }
  }

  // Refresh the token via raw fetch
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${getTenantId()}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: getClientId(),
          client_secret: getClientSecret(),
          refresh_token: record.refreshToken,
          grant_type: "refresh_token",
          scope: SCOPES.join(" "),
        }),
      }
    );

    const data: MsTokenResponse = await res.json();

    if (!res.ok || data.error) {
      throw new Error(
        `Token refresh failed: ${data.error_description || data.error || res.status}`
      );
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    await db
      .update(userMicrosoftTokens)
      .set({
        accessToken: data.access_token,
        // Persist new refresh_token if Microsoft rotated it
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userMicrosoftTokens.userId, userId));

    return data.access_token;
  } catch (err) {
    console.error("[OneDrive] Token refresh failed:", err);
    throw new Error("OneDrive desconectado — reconecte nas configurações");
  }
}

// ---------------------------------------------------------------------------
// saveMicrosoftTokens — upsert tokens + update users table
// ---------------------------------------------------------------------------

export async function saveMicrosoftTokens(
  userId: number,
  tokenData: MsTokenResponse,
  userInfo: {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
    id?: string;
  }
): Promise<void> {
  const email = userInfo.mail || userInfo.userPrincipalName || "";
  const displayName = userInfo.displayName || null;
  const microsoftUserId = userInfo.id || null;

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  await db
    .insert(userMicrosoftTokens)
    .values({
      userId,
      email,
      displayName,
      microsoftUserId,
      refreshToken: tokenData.refresh_token,
      accessToken: tokenData.access_token,
      expiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userMicrosoftTokens.userId,
      set: {
        email,
        displayName,
        microsoftUserId,
        refreshToken: tokenData.refresh_token,
        accessToken: tokenData.access_token,
        expiresAt,
        updatedAt: new Date(),
      },
    });

  await db
    .update(users)
    .set({ microsoftLinked: true, storageProvider: "onedrive" })
    .where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// disconnectMicrosoft — remove tokens and reset user flags
// ---------------------------------------------------------------------------

export async function disconnectMicrosoft(userId: number): Promise<void> {
  await db
    .delete(userMicrosoftTokens)
    .where(eq(userMicrosoftTokens.userId, userId));

  await db
    .update(users)
    .set({ microsoftLinked: false, storageProvider: "google" })
    .where(eq(users.id, userId));
}
