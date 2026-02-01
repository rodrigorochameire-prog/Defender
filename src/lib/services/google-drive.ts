/**
 * Serviço de Integração com Google Drive
 * 
 * Este serviço gerencia a sincronização bidirecional com o Google Drive,
 * incluindo criação de pastas, upload, download e detecção de mudanças.
 * 
 * Requer configuração do Google Cloud Platform com a API do Drive ativada.
 */

import { db } from "@/lib/db";
import { processos, driveFiles, driveSyncFolders, driveSyncLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ==========================================
// TIPOS
// ==========================================

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  parents?: string[];
  md5Checksum?: string;
  description?: string;
}

export interface DriveChange {
  kind: string;
  type: string;
  changeType: string;
  time: string;
  removed: boolean;
  fileId: string;
  file?: DriveFileInfo;
}

export interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesUpdated: number;
  filesRemoved: number;
  errors: string[];
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
}

// ==========================================
// CONFIGURAÇÃO
// ==========================================

const getConfig = (): GoogleDriveConfig | null => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN ||
    !process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  ) {
    return null;
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  };
};

// Cache de access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtém um token de acesso válido usando o refresh token
 * Implementa cache para evitar requisições desnecessárias
 */
async function getAccessToken(): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  // Verifica cache (com margem de 5 minutos)
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 300000) {
    return cachedAccessToken.token;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Erro ao obter access token:", await response.text());
      cachedAccessToken = null;
      return null;
    }

    const data = await response.json();
    
    // Cache do token
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };
    
    return data.access_token;
  } catch (error) {
    console.error("Erro ao obter access token:", error);
    cachedAccessToken = null;
    return null;
  }
}

/**
 * Cria uma pasta no Google Drive
 */
export async function createFolder(
  name: string,
  parentFolderId?: string
): Promise<DriveFolder | null> {
  const config = getConfig();
  if (!config) {
    console.warn("Google Drive não configurado. Pulando criação de pasta.");
    return null;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const metadata = {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId || config.rootFolderId],
    };

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      console.error("Erro ao criar pasta no Drive:", await response.text());
      return null;
    }

    const folder = await response.json();
    return {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
    };
  } catch (error) {
    console.error("Erro ao criar pasta no Drive:", error);
    return null;
  }
}

/**
 * Cria uma pasta para um processo no formato: "[Nome do Assistido] - [Número do Processo]"
 * e atualiza o registro do processo com o link
 */
export async function criarPastaProcesso(
  processoId: number,
  nomeAssistido: string,
  numeroAutos: string,
  area?: string
): Promise<DriveFolder | null> {
  const config = getConfig();
  if (!config) {
    console.warn("Google Drive não configurado.");
    return null;
  }

  // Nome da pasta no formato padrão
  const nomePasta = `${nomeAssistido} - ${numeroAutos}`;

  // Primeiro, verificar se existe uma pasta para a área (Júri, EP, VD, etc.)
  let pastaAreaId = config.rootFolderId;
  
  if (area) {
    // Criar ou encontrar pasta da área
    const pastaArea = await criarOuEncontrarPasta(area, config.rootFolderId);
    if (pastaArea) {
      pastaAreaId = pastaArea.id;
    }
  }

  // Criar pasta do processo
  const pastaProcesso = await createFolder(nomePasta, pastaAreaId);
  
  if (pastaProcesso) {
    // Atualizar o processo com o link do Drive
    await db
      .update(processos)
      .set({
        linkDrive: pastaProcesso.webViewLink,
        driveFolderId: pastaProcesso.id,
        updatedAt: new Date(),
      })
      .where(eq(processos.id, processoId));

    // Criar subpastas padrão
    await criarSubpastasProcesso(pastaProcesso.id);
  }

  return pastaProcesso;
}

/**
 * Cria subpastas padrão dentro da pasta do processo
 */
async function criarSubpastasProcesso(pastaProcessoId: string): Promise<void> {
  const subpastas = [
    "01 - Documentos Pessoais",
    "02 - Peças Protocoladas",
    "03 - Decisões e Sentenças",
    "04 - Audiências",
    "05 - Outros",
  ];

  for (const subpasta of subpastas) {
    await createFolder(subpasta, pastaProcessoId);
  }
}

/**
 * Cria uma pasta se não existir, ou retorna a existente
 */
async function criarOuEncontrarPasta(
  nome: string,
  parentFolderId: string
): Promise<DriveFolder | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Buscar pasta existente
    const query = `name='${nome}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        return {
          id: searchData.files[0].id,
          name: searchData.files[0].name,
          webViewLink: searchData.files[0].webViewLink,
        };
      }
    }

    // Se não existe, criar
    return await createFolder(nome, parentFolderId);
  } catch (error) {
    console.error("Erro ao buscar/criar pasta:", error);
    return null;
  }
}

/**
 * Faz upload de um arquivo para uma pasta
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<{ id: string; webViewLink: string } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Criar metadados
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    // Upload multipart
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      file.toString('base64') +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      console.error("Erro ao fazer upload:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return null;
  }
}

/**
 * Verifica se a integração com Google Drive está configurada
 */
export function isGoogleDriveConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Obtém o link da pasta raiz configurada
 */
export async function getRootFolderLink(): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${config.rootFolderId}?fields=webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.webViewLink;
    }
  } catch (error) {
    console.error("Erro ao obter link da pasta raiz:", error);
  }

  return null;
}

// ==========================================
// FUNÇÕES DE LISTAGEM
// ==========================================

/**
 * Lista todos os arquivos de uma pasta do Drive
 */
export async function listFilesInFolder(
  folderId: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<{ files: DriveFileInfo[]; nextPageToken?: string } | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const fields = "nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,md5Checksum,description)";
    
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=folder,name`;
    
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Erro ao listar arquivos:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    return null;
  }
}

/**
 * Lista todos os arquivos recursivamente (incluindo subpastas)
 */
export async function listAllFilesRecursively(
  folderId: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): Promise<DriveFileInfo[]> {
  if (currentDepth >= maxDepth) return [];

  const allFiles: DriveFileInfo[] = [];
  let pageToken: string | undefined;

  do {
    const result = await listFilesInFolder(folderId, pageToken);
    if (!result) break;

    for (const file of result.files) {
      allFiles.push(file);
      
      // Se for uma pasta, listar recursivamente
      if (file.mimeType === "application/vnd.google-apps.folder") {
        const subFiles = await listAllFilesRecursively(file.id, maxDepth, currentDepth + 1);
        allFiles.push(...subFiles);
      }
    }

    pageToken = result.nextPageToken;
  } while (pageToken);

  return allFiles;
}

/**
 * Obtém informações de um arquivo específico
 */
export async function getFileInfo(fileId: string): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const fields = "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink,parents,md5Checksum,description";
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao obter informações do arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao obter informações do arquivo:", error);
    return null;
  }
}

/**
 * Obtém informações de uma pasta
 */
export async function getFolderInfo(folderId: string): Promise<DriveFileInfo | null> {
  return getFileInfo(folderId);
}

// ==========================================
// FUNÇÕES DE SINCRONIZAÇÃO
// ==========================================

/**
 * Sincroniza uma pasta do Drive com o banco de dados local
 */
export async function syncFolderWithDatabase(
  folderId: string,
  userId?: number
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    filesAdded: 0,
    filesUpdated: 0,
    filesRemoved: 0,
    errors: [],
  };

  try {
    // Log de início
    await logSyncAction(null, "sync_started", "pending", `Sincronizando pasta ${folderId}`, undefined, userId);

    // Listar todos os arquivos do Drive
    const driveFilesList = await listAllFilesRecursively(folderId);
    
    if (!driveFilesList) {
      result.errors.push("Falha ao listar arquivos do Drive");
      await logSyncAction(null, "sync_completed", "failed", "Falha ao listar arquivos", result.errors.join(", "), userId);
      return result;
    }

    // Obter arquivos existentes no banco
    const existingFiles = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    const existingFilesMap = new Map(
      existingFiles.map((f) => [f.driveFileId, f])
    );

    const processedIds = new Set<string>();

    // Processar arquivos do Drive
    for (const driveFile of driveFilesList) {
      processedIds.add(driveFile.id);
      const existing = existingFilesMap.get(driveFile.id);

      if (!existing) {
        // Novo arquivo - inserir
        await db.insert(driveFiles).values({
          driveFileId: driveFile.id,
          driveFolderId: folderId,
          name: driveFile.name,
          mimeType: driveFile.mimeType,
          fileSize: driveFile.size ? parseInt(driveFile.size) : null,
          webViewLink: driveFile.webViewLink,
          webContentLink: driveFile.webContentLink,
          thumbnailLink: driveFile.thumbnailLink,
          iconLink: driveFile.iconLink,
          description: driveFile.description,
          lastModifiedTime: driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : null,
          driveChecksum: driveFile.md5Checksum,
          isFolder: driveFile.mimeType === "application/vnd.google-apps.folder",
          syncStatus: "synced",
          lastSyncAt: new Date(),
          createdById: userId,
        });
        result.filesAdded++;
      } else {
        // Arquivo existente - verificar se precisa atualizar
        const driveModified = driveFile.modifiedTime ? new Date(driveFile.modifiedTime) : null;
        const localModified = existing.lastModifiedTime;
        
        const needsUpdate = 
          existing.name !== driveFile.name ||
          existing.driveChecksum !== driveFile.md5Checksum ||
          (driveModified && localModified && driveModified > localModified);

        if (needsUpdate) {
          await db
            .update(driveFiles)
            .set({
              name: driveFile.name,
              mimeType: driveFile.mimeType,
              fileSize: driveFile.size ? parseInt(driveFile.size) : null,
              webViewLink: driveFile.webViewLink,
              webContentLink: driveFile.webContentLink,
              thumbnailLink: driveFile.thumbnailLink,
              iconLink: driveFile.iconLink,
              description: driveFile.description,
              lastModifiedTime: driveModified,
              driveChecksum: driveFile.md5Checksum,
              syncStatus: "synced",
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(driveFiles.id, existing.id));
          result.filesUpdated++;
        }
      }
    }

    // Marcar arquivos removidos do Drive
    const existingEntries = Array.from(existingFilesMap.entries());
    for (const [fileId, existing] of existingEntries) {
      if (!processedIds.has(fileId)) {
        await db
          .delete(driveFiles)
          .where(eq(driveFiles.id, existing.id));
        result.filesRemoved++;
      }
    }

    // Atualizar timestamp da última sincronização
    await db
      .update(driveSyncFolders)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(driveSyncFolders.driveFolderId, folderId));

    result.success = true;
    await logSyncAction(null, "sync_completed", "success", 
      `Adicionados: ${result.filesAdded}, Atualizados: ${result.filesUpdated}, Removidos: ${result.filesRemoved}`,
      undefined, userId);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
    result.errors.push(errorMsg);
    await logSyncAction(null, "sync_completed", "failed", "Erro na sincronização", errorMsg, userId);
  }

  return result;
}

/**
 * Registra uma ação de sincronização no log
 */
async function logSyncAction(
  driveFileId: string | null,
  action: string,
  status: string,
  details?: string,
  errorMessage?: string,
  userId?: number
): Promise<void> {
  try {
    await db.insert(driveSyncLogs).values({
      driveFileId,
      action,
      status,
      details,
      errorMessage,
      userId,
    });
  } catch (error) {
    console.error("Erro ao registrar log de sincronização:", error);
  }
}

// ==========================================
// FUNÇÕES DE UPLOAD PARA O DRIVE
// ==========================================

/**
 * Faz upload de um arquivo para o Drive a partir de uma URL
 */
export async function uploadFileFromUrl(
  fileUrl: string,
  fileName: string,
  mimeType: string,
  folderId: string,
  description?: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Baixar o arquivo da URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      console.error("Erro ao baixar arquivo da URL");
      return null;
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    return await uploadFileBuffer(
      Buffer.from(fileBuffer),
      fileName,
      mimeType,
      folderId,
      description
    );
  } catch (error) {
    console.error("Erro ao fazer upload de arquivo:", error);
    return null;
  }
}

/**
 * Verifica se um arquivo com o mesmo nome já existe em uma pasta
 * Retorna o arquivo existente ou null se não existir
 */
export async function findExistingFile(
  fileName: string,
  folderId: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const query = `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,md5Checksum)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao buscar arquivo existente:", await response.text());
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar arquivo existente:", error);
    return null;
  }
}

/**
 * Faz upload de um arquivo buffer para o Drive
 * Opcionalmente evita duplicações verificando se arquivo já existe
 */
export async function uploadFileBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string,
  description?: string,
  options?: {
    preventDuplicates?: boolean; // Se true, não faz upload se já existe
    updateIfExists?: boolean;    // Se true, atualiza arquivo existente
  }
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    // Verificar duplicação se solicitado
    if (options?.preventDuplicates || options?.updateIfExists) {
      const existingFile = await findExistingFile(fileName, folderId);
      
      if (existingFile) {
        if (options?.preventDuplicates && !options?.updateIfExists) {
          console.log(`[Drive] Arquivo já existe, pulando upload: ${fileName}`);
          return existingFile; // Retorna o arquivo existente
        }
        
        if (options?.updateIfExists) {
          console.log(`[Drive] Atualizando arquivo existente: ${fileName}`);
          return await updateFileInDrive(existingFile.id, buffer, mimeType);
        }
      }
    }

    const metadata = {
      name: fileName,
      parents: [folderId],
      description: description || undefined,
    };

    // Upload multipart
    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      buffer.toString('base64') +
      closeDelim;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,md5Checksum",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      }
    );

    if (!response.ok) {
      console.error("Erro no upload:", await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return null;
  }
}

/**
 * Atualiza um arquivo existente no Drive
 */
export async function updateFileInDrive(
  fileId: string,
  buffer: Buffer,
  mimeType: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,md5Checksum`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
        },
        body: new Uint8Array(buffer),
      }
    );

    if (!response.ok) {
      console.error("Erro ao atualizar arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao atualizar arquivo:", error);
    return null;
  }
}

/**
 * Renomeia um arquivo no Drive
 */
export async function renameFileInDrive(
  fileId: string,
  newName: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,modifiedTime,webViewLink`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      }
    );

    if (!response.ok) {
      console.error("Erro ao renomear arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao renomear arquivo:", error);
    return null;
  }
}

/**
 * Move um arquivo para outra pasta no Drive
 */
export async function moveFileInDrive(
  fileId: string,
  newParentId: string,
  oldParentId?: string
): Promise<DriveFileInfo | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    let url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&fields=id,name,mimeType,modifiedTime,webViewLink,parents`;
    
    if (oldParentId) {
      url += `&removeParents=${oldParentId}`;
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Erro ao mover arquivo:", await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao mover arquivo:", error);
    return null;
  }
}

/**
 * Exclui um arquivo do Drive (move para lixeira)
 */
export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    return false;
  }
}

/**
 * Move arquivo para a lixeira (soft delete)
 */
export async function trashFileInDrive(fileId: string): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trashed: true }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erro ao mover para lixeira:", error);
    return false;
  }
}

// ==========================================
// FUNÇÕES DE DOWNLOAD
// ==========================================

/**
 * Baixa o conteúdo de um arquivo do Drive
 */
export async function downloadFileContent(fileId: string): Promise<Buffer | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao baixar arquivo:", await response.text());
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Erro ao baixar arquivo:", error);
    return null;
  }
}

/**
 * Exporta um arquivo do Google Docs/Sheets/Slides para um formato específico
 */
export async function exportGoogleDoc(
  fileId: string,
  exportMimeType: string
): Promise<Buffer | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao exportar documento:", await response.text());
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Erro ao exportar documento:", error);
    return null;
  }
}

// ==========================================
// FUNÇÕES DE CONFIGURAÇÃO DE PASTAS
// ==========================================

/**
 * Registra uma pasta para sincronização
 */
export async function registerSyncFolder(
  folderId: string,
  name: string,
  description?: string,
  syncDirection: string = "bidirectional",
  userId?: number
): Promise<boolean> {
  try {
    // Verificar se a pasta existe no Drive
    const folderInfo = await getFolderInfo(folderId);
    if (!folderInfo) {
      console.error("Pasta não encontrada no Drive:", folderId);
      return false;
    }

    // Inserir ou atualizar registro
    await db
      .insert(driveSyncFolders)
      .values({
        name: name || folderInfo.name,
        driveFolderId: folderId,
        driveFolderUrl: folderInfo.webViewLink,
        description,
        syncDirection,
        isActive: true,
        createdById: userId,
      })
      .onConflictDoUpdate({
        target: driveSyncFolders.driveFolderId,
        set: {
          name: name || folderInfo.name,
          driveFolderUrl: folderInfo.webViewLink,
          description,
          syncDirection,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    // Sincronizar imediatamente
    await syncFolderWithDatabase(folderId, userId);

    return true;
  } catch (error) {
    console.error("Erro ao registrar pasta para sincronização:", error);
    return false;
  }
}

/**
 * Lista todas as pastas configuradas para sincronização
 */
export async function getSyncFolders(): Promise<typeof driveSyncFolders.$inferSelect[]> {
  try {
    return await db
      .select()
      .from(driveSyncFolders)
      .where(eq(driveSyncFolders.isActive, true))
      .orderBy(desc(driveSyncFolders.createdAt));
  } catch (error) {
    console.error("Erro ao listar pastas de sincronização:", error);
    return [];
  }
}

/**
 * Obtém arquivos sincronizados de uma pasta
 */
export async function getSyncedFiles(
  folderId: string,
  options?: {
    isFolder?: boolean;
    parentFileId?: number | null;
  }
): Promise<typeof driveFiles.$inferSelect[]> {
  try {
    let conditions = [eq(driveFiles.driveFolderId, folderId)];

    if (options?.isFolder !== undefined) {
      conditions.push(eq(driveFiles.isFolder, options.isFolder));
    }

    if (options?.parentFileId !== undefined) {
      if (options.parentFileId === null) {
        // Arquivos na raiz (sem parent)
        conditions.push(eq(driveFiles.parentFileId, 0)); // Isso não funcionará bem, precisamos de IS NULL
      } else {
        conditions.push(eq(driveFiles.parentFileId, options.parentFileId));
      }
    }

    return await db
      .select()
      .from(driveFiles)
      .where(and(...conditions))
      .orderBy(desc(driveFiles.isFolder), driveFiles.name);
  } catch (error) {
    console.error("Erro ao obter arquivos sincronizados:", error);
    return [];
  }
}

/**
 * Obtém logs de sincronização
 */
export async function getSyncLogs(
  limit: number = 50
): Promise<typeof driveSyncLogs.$inferSelect[]> {
  try {
    return await db
      .select()
      .from(driveSyncLogs)
      .orderBy(desc(driveSyncLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Erro ao obter logs de sincronização:", error);
    return [];
  }
}

// ==========================================
// SINCRONIZAÇÃO COM PAUTA E INTIMAÇÕES
// ==========================================

/**
 * Sincroniza documento de pauta/intimação com o Drive
 * Evita duplicações verificando se o arquivo já existe
 */
export async function syncPautaDocument(
  processoId: number,
  driveFolderId: string,
  documento: {
    nome: string;
    tipo: "pauta" | "intimacao" | "despacho" | "sentenca" | "outros";
    conteudo?: Buffer;
    url?: string;
    dataDocumento?: Date;
  }
): Promise<{ success: boolean; fileId?: string; message: string }> {
  try {
    // Verificar se pasta existe
    const folderInfo = await getFolderInfo(driveFolderId);
    if (!folderInfo) {
      return { success: false, message: "Pasta do processo não encontrada no Drive" };
    }

    // Mapear tipo para subpasta
    const subpastaMap: Record<string, string> = {
      pauta: "04 - Audiências",
      intimacao: "03 - Decisões e Sentenças",
      despacho: "03 - Decisões e Sentenças",
      sentenca: "03 - Decisões e Sentenças",
      outros: "05 - Outros",
    };

    const subpastaNome = subpastaMap[documento.tipo] || "05 - Outros";
    
    // Buscar ou criar subpasta
    const subpasta = await criarOuEncontrarPasta(subpastaNome, driveFolderId);
    if (!subpasta) {
      return { success: false, message: "Erro ao criar/encontrar subpasta" };
    }

    // Formatar nome do arquivo com data
    let nomeArquivo = documento.nome;
    if (documento.dataDocumento) {
      const dataStr = documento.dataDocumento.toISOString().split("T")[0];
      if (!nomeArquivo.includes(dataStr)) {
        nomeArquivo = `${dataStr}_${nomeArquivo}`;
      }
    }

    // Verificar duplicação
    const arquivoExistente = await findExistingFile(nomeArquivo, subpasta.id);
    if (arquivoExistente) {
      console.log(`[Drive] Documento já existe, pulando: ${nomeArquivo}`);
      return { 
        success: true, 
        fileId: arquivoExistente.id, 
        message: "Documento já sincronizado anteriormente" 
      };
    }

    // Upload do documento
    let resultado: DriveFileInfo | null = null;
    
    if (documento.conteudo) {
      resultado = await uploadFileBuffer(
        documento.conteudo,
        nomeArquivo,
        "application/pdf", // Default para PDF
        subpasta.id,
        `Documento ${documento.tipo} - Processo ${processoId}`,
        { preventDuplicates: true }
      );
    } else if (documento.url) {
      resultado = await uploadFileFromUrl(
        documento.url,
        nomeArquivo,
        "application/pdf",
        subpasta.id,
        `Documento ${documento.tipo} - Processo ${processoId}`
      );
    }

    if (resultado) {
      return {
        success: true,
        fileId: resultado.id,
        message: "Documento sincronizado com sucesso",
      };
    }

    return { success: false, message: "Falha ao fazer upload do documento" };
  } catch (error) {
    console.error("Erro ao sincronizar documento da pauta:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erro desconhecido" 
    };
  }
}

/**
 * Sincroniza múltiplos documentos de uma pauta/intimação
 * Processa em lote com prevenção de duplicações
 */
export async function syncMultiplePautaDocuments(
  processoId: number,
  driveFolderId: string,
  documentos: Array<{
    nome: string;
    tipo: "pauta" | "intimacao" | "despacho" | "sentenca" | "outros";
    conteudo?: Buffer;
    url?: string;
    dataDocumento?: Date;
  }>
): Promise<{
  total: number;
  sincronizados: number;
  duplicados: number;
  erros: number;
  detalhes: Array<{ nome: string; status: string; message: string }>;
}> {
  const resultado = {
    total: documentos.length,
    sincronizados: 0,
    duplicados: 0,
    erros: 0,
    detalhes: [] as Array<{ nome: string; status: string; message: string }>,
  };

  for (const documento of documentos) {
    const sync = await syncPautaDocument(processoId, driveFolderId, documento);
    
    if (sync.success) {
      if (sync.message.includes("já sincronizado")) {
        resultado.duplicados++;
        resultado.detalhes.push({
          nome: documento.nome,
          status: "duplicado",
          message: sync.message,
        });
      } else {
        resultado.sincronizados++;
        resultado.detalhes.push({
          nome: documento.nome,
          status: "sucesso",
          message: sync.message,
        });
      }
    } else {
      resultado.erros++;
      resultado.detalhes.push({
        nome: documento.nome,
        status: "erro",
        message: sync.message,
      });
    }
  }

  return resultado;
}

/**
 * Cria registro de audiência no Drive (arquivo de texto com informações)
 */
export async function registrarAudienciaNoDrive(
  driveFolderId: string,
  audiencia: {
    data: Date;
    hora: string;
    tipo: string;
    local?: string;
    observacoes?: string;
    numeroProcesso: string;
    nomeAssistido: string;
  }
): Promise<{ success: boolean; fileId?: string; message: string }> {
  try {
    // Buscar ou criar pasta de audiências
    const pastaAudiencias = await criarOuEncontrarPasta("04 - Audiências", driveFolderId);
    if (!pastaAudiencias) {
      return { success: false, message: "Erro ao criar pasta de audiências" };
    }

    // Formatar nome do arquivo
    const dataStr = audiencia.data.toISOString().split("T")[0];
    const nomeArquivo = `${dataStr}_Audiencia_${audiencia.tipo.replace(/\s+/g, "_")}.txt`;

    // Verificar se já existe
    const existente = await findExistingFile(nomeArquivo, pastaAudiencias.id);
    if (existente) {
      return {
        success: true,
        fileId: existente.id,
        message: "Registro de audiência já existe",
      };
    }

    // Criar conteúdo do arquivo
    const conteudo = `REGISTRO DE AUDIÊNCIA
${"=".repeat(50)}

Processo: ${audiencia.numeroProcesso}
Assistido: ${audiencia.nomeAssistido}

Data: ${dataStr}
Horário: ${audiencia.hora}
Tipo: ${audiencia.tipo}
${audiencia.local ? `Local: ${audiencia.local}` : ""}

${audiencia.observacoes ? `\nObservações:\n${audiencia.observacoes}` : ""}

${"=".repeat(50)}
Registrado automaticamente pelo DefensorHub
`;

    const buffer = Buffer.from(conteudo, "utf-8");
    const resultado = await uploadFileBuffer(
      buffer,
      nomeArquivo,
      "text/plain",
      pastaAudiencias.id,
      `Audiência ${audiencia.tipo} - ${dataStr}`,
      { preventDuplicates: true }
    );

    if (resultado) {
      return {
        success: true,
        fileId: resultado.id,
        message: "Registro de audiência criado no Drive",
      };
    }

    return { success: false, message: "Falha ao criar registro" };
  } catch (error) {
    console.error("Erro ao registrar audiência no Drive:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Verifica integridade da sincronização entre banco local e Drive
 * Retorna arquivos que existem no banco mas não no Drive e vice-versa
 */
export async function verificarIntegridadeSincronizacao(
  folderId: string
): Promise<{
  apenasNoBanco: Array<{ id: number; nome: string; driveFileId: string }>;
  apenasNoDrive: Array<{ id: string; nome: string }>;
  sincronizados: number;
}> {
  const resultado = {
    apenasNoBanco: [] as Array<{ id: number; nome: string; driveFileId: string }>,
    apenasNoDrive: [] as Array<{ id: string; nome: string }>,
    sincronizados: 0,
  };

  try {
    // Listar arquivos do banco local
    const arquivosBanco = await db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, folderId));

    // Listar arquivos do Drive
    const arquivosDrive = await listAllFilesRecursively(folderId, 3);
    
    const driveIdsSet = new Set(arquivosDrive.map((f) => f.id));
    const bancoIdsSet = new Set(arquivosBanco.map((f) => f.driveFileId));

    // Arquivos no banco mas não no Drive
    for (const arquivo of arquivosBanco) {
      if (!driveIdsSet.has(arquivo.driveFileId)) {
        resultado.apenasNoBanco.push({
          id: arquivo.id,
          nome: arquivo.name,
          driveFileId: arquivo.driveFileId,
        });
      } else {
        resultado.sincronizados++;
      }
    }

    // Arquivos no Drive mas não no banco
    for (const arquivo of arquivosDrive) {
      if (!bancoIdsSet.has(arquivo.id)) {
        resultado.apenasNoDrive.push({
          id: arquivo.id,
          nome: arquivo.name,
        });
      }
    }

    return resultado;
  } catch (error) {
    console.error("Erro ao verificar integridade:", error);
    return resultado;
  }
}
