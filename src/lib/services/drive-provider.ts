/**
 * Storage provider abstraction.
 * Both Google Drive and OneDrive implement this interface.
 *
 * Named StorageFile (not DriveFile) to avoid collision with
 * the Drizzle ORM type in @/lib/db/schema/drive.ts.
 */

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  parentId: string | null;
  webUrl: string | null;
  downloadUrl: string | null;
  isFolder: boolean;
  provider: "google" | "onedrive";
}

export interface SyncResult {
  items: StorageFile[];
  newToken: string;
}

export interface DriveProvider {
  getProviderName(): "google" | "onedrive";

  // Files
  listFiles(folderId: string, options?: { pageSize?: number }): Promise<StorageFile[]>;
  getFileInfo(fileId: string): Promise<StorageFile>;
  uploadFile(buffer: Buffer, name: string, mimeType: string, folderId: string): Promise<StorageFile>;
  downloadFile(fileId: string): Promise<Buffer>;
  deleteFile(fileId: string): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<StorageFile>;
  moveFile(fileId: string, targetFolderId: string): Promise<StorageFile>;

  // Folders
  createFolder(name: string, parentId: string): Promise<StorageFile>;
  findFolderByName(name: string, parentId: string): Promise<StorageFile | null>;

  // Sync
  getChanges(syncToken?: string): Promise<SyncResult>;

  // URLs
  getDownloadUrl(fileId: string): Promise<string>;
  getWebViewUrl(fileId: string): Promise<string>;
}
