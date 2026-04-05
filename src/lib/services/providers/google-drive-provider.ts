import { db } from "@/lib/db";
import { userGoogleTokens } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { DriveProvider, StorageFile, SyncResult } from "../drive-provider";

const GOOGLE_API_BASE = "https://www.googleapis.com";
const DRIVE_FILES_FIELDS =
  "id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink";

export class GoogleDriveProvider implements DriveProvider {
  constructor(private userId: number) {}

  getProviderName(): "google" {
    return "google";
  }

  /**
   * Fetches a fresh access token using the stored refresh token,
   * then persists the new access token — mirrors google-drive-peruser.ts.
   */
  private async getToken(): Promise<string> {
    const token = await db.query.userGoogleTokens.findFirst({
      where: eq(userGoogleTokens.userId, this.userId),
    });
    if (!token) throw new Error("Google Drive não vinculado para este usuário");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (!res.ok) throw new Error(`Google token refresh failed: ${data.error}`);

    await db.execute(sql`
      UPDATE user_google_tokens SET access_token = ${data.access_token}, updated_at = NOW()
      WHERE user_id = ${this.userId}
    `);

    return data.access_token as string;
  }

  /**
   * Authenticated fetch that returns the raw Response so callers can choose
   * between .json() and .arrayBuffer() depending on the endpoint.
   */
  private async googleFetch(path: string, options?: RequestInit): Promise<Response> {
    const token = await this.getToken();
    const res = await fetch(`${GOOGLE_API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive API error (${res.status}): ${err}`);
    }
    return res;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFile(file: any): StorageFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType ?? "application/octet-stream",
      size: parseInt(file.size ?? "0", 10),
      createdAt: file.createdTime ?? "",
      modifiedAt: file.modifiedTime ?? "",
      parentId: file.parents?.[0] ?? null,
      webUrl: file.webViewLink ?? null,
      downloadUrl: file.webContentLink ?? null,
      isFolder: file.mimeType === "application/vnd.google-apps.folder",
      provider: "google",
    };
  }

  async listFiles(folderId: string, options?: { pageSize?: number }): Promise<StorageFile[]> {
    const pageSize = options?.pageSize ?? 200;
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const res = await this.googleFetch(
      `/drive/v3/files?q=${q}&fields=files(${DRIVE_FILES_FIELDS})&pageSize=${pageSize}`
    );
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.files as any[]).map((f) => this.mapFile(f));
  }

  async getFileInfo(fileId: string): Promise<StorageFile> {
    const res = await this.googleFetch(
      `/drive/v3/files/${encodeURIComponent(fileId)}?fields=${DRIVE_FILES_FIELDS}`
    );
    const data = await res.json();
    return this.mapFile(data);
  }

  async uploadFile(
    buffer: Buffer,
    name: string,
    mimeType: string,
    folderId: string
  ): Promise<StorageFile> {
    const token = await this.getToken();

    // Build multipart/related body: metadata part + media part
    const boundary = "ombuds_upload_boundary";
    const metadata = JSON.stringify({ name, parents: [folderId] });

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      `${metadata}\r\n`,
      `--${boundary}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ];

    const headerBytes = Buffer.from(bodyParts.join(""), "utf-8");
    const footerBytes = Buffer.from(`\r\n--${boundary}--`, "utf-8");
    const body = Buffer.concat([headerBytes, buffer, footerBytes]);

    const res = await fetch(`${GOOGLE_API_BASE}/upload/drive/v3/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive upload error (${res.status}): ${err}`);
    }

    // The upload response only contains id/name/mimeType by default; fetch full metadata
    const partial = await res.json();
    return this.getFileInfo(partial.id);
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const res = await this.googleFetch(
      `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
    );
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(fileId: string): Promise<void> {
    const token = await this.getToken();
    const res = await fetch(
      `${GOOGLE_API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    // 204 No Content is the expected success response for DELETE
    if (!res.ok && res.status !== 204) {
      const err = await res.text();
      throw new Error(`Google Drive delete error (${res.status}): ${err}`);
    }
  }

  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const res = await this.googleFetch(
      `/drive/v3/files/${encodeURIComponent(fileId)}?fields=${DRIVE_FILES_FIELDS}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
      }
    );
    const data = await res.json();
    return this.mapFile(data);
  }

  async moveFile(fileId: string, targetFolderId: string): Promise<StorageFile> {
    // We need the current parent(s) to pass as removeParents
    const current = await this.getFileInfo(fileId);
    const removeParents = current.parentId ? `&removeParents=${encodeURIComponent(current.parentId)}` : "";

    const res = await this.googleFetch(
      `/drive/v3/files/${encodeURIComponent(fileId)}` +
        `?addParents=${encodeURIComponent(targetFolderId)}${removeParents}` +
        `&fields=${DRIVE_FILES_FIELDS}`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
      }
    );
    const data = await res.json();
    return this.mapFile(data);
  }

  async createFolder(name: string, parentId: string): Promise<StorageFile> {
    const res = await this.googleFetch(
      `/drive/v3/files?fields=${DRIVE_FILES_FIELDS}`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        }),
      }
    );
    const data = await res.json();
    return this.mapFile(data);
  }

  async findFolderByName(name: string, parentId: string): Promise<StorageFile | null> {
    // Escape single quotes in name for the query string
    const safeName = name.replace(/'/g, "\\'");
    const q = encodeURIComponent(
      `name='${safeName}' and '${parentId}' in parents` +
        ` and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );
    const res = await this.googleFetch(
      `/drive/v3/files?q=${q}&fields=files(${DRIVE_FILES_FIELDS})&pageSize=1`
    );
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const files = data.files as any[];
    return files.length > 0 ? this.mapFile(files[0]) : null;
  }

  async getChanges(syncToken?: string): Promise<SyncResult> {
    if (!syncToken) {
      // Obtain the initial page token to start tracking changes from now
      const res = await this.googleFetch("/drive/v3/changes/startPageToken");
      const data = await res.json();
      syncToken = data.startPageToken as string;
      return { items: [], newToken: syncToken };
    }

    const res = await this.googleFetch(
      `/drive/v3/changes?pageToken=${encodeURIComponent(syncToken)}&fields=changes(file(${DRIVE_FILES_FIELDS})),newStartPageToken,nextPageToken`
    );
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: StorageFile[] = (data.changes as any[])
      .filter((c: any) => !!c.file)
      .map((c: any) => this.mapFile(c.file));

    const newToken: string = data.newStartPageToken ?? data.nextPageToken ?? syncToken;
    return { items, newToken };
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    // The URL requires an Authorization header; callers must supply the bearer token
    return `${GOOGLE_API_BASE}/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  }

  async getWebViewUrl(fileId: string): Promise<string> {
    const res = await this.googleFetch(
      `/drive/v3/files/${encodeURIComponent(fileId)}?fields=webViewLink`
    );
    const data = await res.json();
    const url: string | undefined = data.webViewLink;
    if (!url) throw new Error(`No webViewLink available for file ${fileId}`);
    return url;
  }
}
