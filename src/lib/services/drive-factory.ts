import { db } from "@/lib/db";
import { users, userMicrosoftTokens, userGoogleTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { DriveProvider } from "./drive-provider";
import { OneDriveProvider } from "./providers/onedrive-provider";
import { GoogleDriveProvider } from "./providers/google-drive-provider";

/**
 * Get the active drive provider for a user (based on their storage_provider preference).
 *
 * Resolution order:
 *  1. If user.storageProvider === "onedrive" AND microsoft token exists → OneDriveProvider
 *  2. Otherwise fall back to GoogleDriveProvider (if token exists)
 *  3. Throw if neither is configured
 */
export async function getDriveProvider(userId: number): Promise<DriveProvider> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { storageProvider: true },
  });

  const preferred = (user as any)?.storageProvider ?? "google";

  if (preferred === "onedrive") {
    const msToken = await db.query.userMicrosoftTokens.findFirst({
      where: eq(userMicrosoftTokens.userId, userId),
    });
    if (msToken) return new OneDriveProvider(userId);
  }

  // Fallback to Google
  const googleToken = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, userId),
  });
  if (googleToken) return new GoogleDriveProvider(userId);

  throw new Error(
    "Nenhum storage provider configurado. Conecte Google Drive ou OneDrive nas Configurações."
  );
}

/**
 * Get provider for a specific file (may differ from user's active provider).
 * Used when accessing existing files that might be stored on a different provider.
 */
export async function getProviderForFile(
  fileProvider: "google" | "onedrive",
  userId: number
): Promise<DriveProvider> {
  if (fileProvider === "onedrive") {
    return new OneDriveProvider(userId);
  }
  return new GoogleDriveProvider(userId);
}
