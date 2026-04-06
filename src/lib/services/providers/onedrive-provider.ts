import { DriveProvider, StorageFile, SyncResult } from "../drive-provider";
import { getAccessToken } from "./onedrive-auth";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export class OneDriveProvider implements DriveProvider {
  constructor(private userId: number) {}

  getProviderName(): "onedrive" {
    return "onedrive";
  }

  private async graphFetch(path: string, options?: RequestInit): Promise<Response> {
    const token = await getAccessToken(this.userId);
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        console.error("Token expired — auth service should handle refresh on next call.");
      }
      const errText = await res.text();
      throw new Error(`Graph API error (${res.status}): ${errText}`);
    }
    return res;
  }

  private mapItem(item: any): StorageFile {
    return {
      id: item.id,
      name: item.name,
      mimeType:
        item.file?.mimeType ??
        (item.folder ? "application/vnd.ms-folder" : "application/octet-stream"),
      size: item.size ?? 0,
      createdAt: item.createdDateTime ?? "",
      modifiedAt: item.lastModifiedDateTime ?? "",
      parentId: item.parentReference?.id ?? null,
      webUrl: item.webUrl ?? null,
      downloadUrl: item["@microsoft.graph.downloadUrl"] ?? null,
      isFolder: !!item.folder,
      provider: "onedrive",
    };
  }

  async listFiles(folderId: string, options?: { pageSize?: number }): Promise<StorageFile[]> {
    const pageSize = options?.pageSize ?? 200;
    const select =
      "id,name,size,file,folder,createdDateTime,lastModifiedDateTime,parentReference,webUrl,@microsoft.graph.downloadUrl";
    const res = await this.graphFetch(
      `/me/drive/items/${folderId}/children?$top=${pageSize}&$select=${select}`
    );
    const data = await res.json();
    return (data.value as any[]).map((item) => this.mapItem(item));
  }

  async getFileInfo(fileId: string): Promise<StorageFile> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}`);
    const data = await res.json();
    return this.mapItem(data);
  }

  async uploadFile(
    buffer: Buffer,
    name: string,
    mimeType: string,
    folderId: string
  ): Promise<StorageFile> {
    const FOUR_MB = 4 * 1024 * 1024;
    if (buffer.length >= FOUR_MB) {
      throw new Error(
        "File exceeds 4 MB — large file upload sessions are not yet supported. " +
          "Please use a file smaller than 4 MB or implement chunked upload."
      );
    }

    // Simple upload: PUT /me/drive/items/{folderId}:/{name}:/content
    const token = await getAccessToken(this.userId);
    const res = await fetch(
      `${GRAPH_BASE}/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": mimeType,
        },
        body: buffer as unknown as BodyInit,
      }
    );
    if (!res.ok) {
      if (res.status === 401) {
        console.error("Token expired — auth service should handle refresh on next call.");
      }
      const errText = await res.text();
      throw new Error(`Graph API error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return this.mapItem(data);
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    // Graph returns 302 redirect to a pre-authenticated download URL; fetch follows by default.
    const res = await this.graphFetch(`/me/drive/items/${fileId}/content`, {
      redirect: "follow",
    });
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(fileId: string): Promise<void> {
    const token = await getAccessToken(this.userId);
    const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // 204 No Content is the expected success response for DELETE
    if (!res.ok && res.status !== 204) {
      if (res.status === 401) {
        console.error("Token expired — auth service should handle refresh on next call.");
      }
      const errText = await res.text();
      throw new Error(`Graph API error (${res.status}): ${errText}`);
    }
  }

  async renameFile(fileId: string, newName: string): Promise<StorageFile> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    return this.mapItem(data);
  }

  async moveFile(fileId: string, targetFolderId: string): Promise<StorageFile> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ parentReference: { id: targetFolderId } }),
    });
    const data = await res.json();
    return this.mapItem(data);
  }

  async createFolder(name: string, parentId: string): Promise<StorageFile> {
    const res = await this.graphFetch(`/me/drive/items/${parentId}/children`, {
      method: "POST",
      body: JSON.stringify({
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      }),
    });
    const data = await res.json();
    return this.mapItem(data);
  }

  async findFolderByName(name: string, parentId: string): Promise<StorageFile | null> {
    const select = "id,name,folder,webUrl,parentReference";
    const filter = `name eq '${name.replace(/'/g, "''")}'`;
    const res = await this.graphFetch(
      `/me/drive/items/${parentId}/children?$filter=${encodeURIComponent(filter)}&$select=${select}`
    );
    const data = await res.json();
    const match = (data.value as any[]).find((item) => !!item.folder);
    return match ? this.mapItem(match) : null;
  }

  async getChanges(syncToken?: string): Promise<SyncResult> {
    const path = syncToken
      ? `/me/drive/root/delta?token=${encodeURIComponent(syncToken)}`
      : "/me/drive/root/delta";

    const res = await this.graphFetch(path);
    const data = await res.json();

    const items: StorageFile[] = (data.value as any[]).map((item) => this.mapItem(item));

    // @odata.deltaLink contains the token for the next delta query
    const deltaLink: string = data["@odata.deltaLink"] ?? "";
    const tokenMatch = deltaLink.match(/[?&]token=([^&]+)/);
    const newToken = tokenMatch ? decodeURIComponent(tokenMatch[1]) : deltaLink;

    return { items, newToken };
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}`);
    const data = await res.json();
    const url: string | undefined = data["@microsoft.graph.downloadUrl"];
    if (!url) {
      throw new Error(`No download URL available for item ${fileId}`);
    }
    return url;
  }

  async getWebViewUrl(fileId: string): Promise<string> {
    const res = await this.graphFetch(`/me/drive/items/${fileId}`);
    const data = await res.json();
    const url: string | undefined = data.webUrl;
    if (!url) {
      throw new Error(`No webUrl available for item ${fileId}`);
    }
    return url;
  }
}
