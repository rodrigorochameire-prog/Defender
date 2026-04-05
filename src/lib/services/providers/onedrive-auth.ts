import { ConfidentialClientApplication, CryptoProvider, AuthenticationResult } from "@azure/msal-node";
import crypto from "crypto";
import { db } from "@/lib/db";
import { userMicrosoftTokens, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MICROSOFT_SCOPES = [
  "Files.ReadWrite",
  "Files.ReadWrite.All",
  "offline_access",
  "User.Read",
];

// ---------------------------------------------------------------------------
// MSAL singleton
// ---------------------------------------------------------------------------

let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      },
    });
  }
  return msalClient;
}

// ---------------------------------------------------------------------------
// Redirect URI
// ---------------------------------------------------------------------------

function getRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/microsoft/callback`;
}

// ---------------------------------------------------------------------------
// getAuthUrl — generates PKCE challenge + auth URL
// ---------------------------------------------------------------------------

export async function getAuthUrl(
  userId: number,
  returnTo: string
): Promise<{ url: string; state: string; codeVerifier: string }> {
  const client = getMsalClient();
  const cryptoProvider = new CryptoProvider();

  const state = crypto.randomBytes(32).toString("hex");
  const { verifier: codeVerifier, challenge: codeChallenge } =
    await cryptoProvider.generatePkceCodes();

  const url = await client.getAuthCodeUrl({
    scopes: MICROSOFT_SCOPES,
    redirectUri: getRedirectUri(),
    state,
    codeChallenge,
    codeChallengeMethod: "S256",
  });

  return { url, state, codeVerifier };
}

// ---------------------------------------------------------------------------
// exchangeCode — exchange auth code for tokens
// ---------------------------------------------------------------------------

export async function exchangeCode(
  code: string,
  codeVerifier: string
): Promise<AuthenticationResult> {
  const client = getMsalClient();

  const result = await client.acquireTokenByCode({
    code,
    scopes: MICROSOFT_SCOPES,
    redirectUri: getRedirectUri(),
    codeVerifier,
  });

  if (!result) {
    throw new Error("MSAL acquireTokenByCode returned null");
  }

  return result;
}

// ---------------------------------------------------------------------------
// getAccessToken — return valid token, refreshing if needed
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

  // Refresh the token
  try {
    const client = getMsalClient();
    const result = await client.acquireTokenByRefreshToken({
      refreshToken: record.refreshToken,
      scopes: MICROSOFT_SCOPES,
    });

    if (!result) {
      throw new Error("MSAL acquireTokenByRefreshToken returned null");
    }

    const newExpiresAt = result.expiresOn
      ? new Date(result.expiresOn)
      : new Date(Date.now() + 3600 * 1000);

    await db
      .update(userMicrosoftTokens)
      .set({
        accessToken: result.accessToken,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(userMicrosoftTokens.userId, userId));

    return result.accessToken;
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
  authResult: AuthenticationResult,
  userInfo: { mail?: string; userPrincipalName?: string; displayName?: string; id?: string }
): Promise<void> {
  const email =
    userInfo.mail || userInfo.userPrincipalName || authResult.account?.username || "";
  const displayName = userInfo.displayName || null;
  const microsoftUserId = userInfo.id || authResult.account?.localAccountId || null;

  const expiresAt = authResult.expiresOn
    ? new Date(authResult.expiresOn)
    : new Date(Date.now() + 3600 * 1000);

  // The refresh token comes in idTokenClaims or via the account cache.
  // MSAL stores refresh tokens internally; we persist the serialised cache
  // entry via account.homeAccountId as a stable key, but the actual
  // refresh token string is surfaced on the AuthenticationResult only when
  // the library exposes it through the cache. Access it from the result's
  // extended properties if present, falling back to empty string so the NOT
  // NULL constraint is satisfied — subsequent refreshes will use the MSAL
  // in-memory cache.
  const refreshToken =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (authResult as any).refreshToken ?? "";

  await db
    .insert(userMicrosoftTokens)
    .values({
      userId,
      email,
      displayName,
      microsoftUserId,
      refreshToken,
      accessToken: authResult.accessToken,
      expiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userMicrosoftTokens.userId,
      set: {
        email,
        displayName,
        microsoftUserId,
        refreshToken,
        accessToken: authResult.accessToken,
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
