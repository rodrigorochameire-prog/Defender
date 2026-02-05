import { google } from "googleapis";
import { db } from "@/lib/db";
import {
  jurisprudenciaJulgados,
  jurisprudenciaDriveFolders,
  type JurisprudenciaDriveFolder,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { analyzeJulgadoPDF, processJulgadoWithAI } from "./jurisprudencia-ai";

// ==========================================
// CONFIGURAÇÃO DO GOOGLE DRIVE
// ==========================================

function getGoogleDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

// ==========================================
// TIPOS
// ==========================================

interface SyncResult {
  total: number;
  sincronizados: number;
  erros: number;
  arquivosNovos: string[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  createdTime: string;
}

// ==========================================
// SINCRONIZAÇÃO COM DRIVE
// ==========================================

/**
 * Sincroniza uma pasta do Drive com o banco de jurisprudência
 */
export async function syncDriveFolderForJurisprudencia(
  folder: JurisprudenciaDriveFolder,
  userId: number
): Promise<SyncResult> {
  const drive = getGoogleDriveClient();
  const result: SyncResult = {
    total: 0,
    sincronizados: 0,
    erros: 0,
    arquivosNovos: [],
  };

  try {
    // Listar arquivos da pasta
    const response = await drive.files.list({
      q: `'${folder.folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document')`,
      fields: "files(id, name, mimeType, size, webViewLink, createdTime)",
      pageSize: 100,
    });

    const files = (response.data.files || []) as DriveFile[];
    result.total = files.length;

    // Buscar arquivos já importados
    const existingFiles = await db
      .select({ driveFileId: jurisprudenciaJulgados.driveFileId })
      .from(jurisprudenciaJulgados)
      .where(sql`${jurisprudenciaJulgados.driveFileId} IS NOT NULL`);

    const existingIds = new Set(existingFiles.map((f) => f.driveFileId));

    // Processar novos arquivos
    for (const file of files) {
      if (existingIds.has(file.id)) {
        result.sincronizados++;
        continue;
      }

      try {
        // Baixar arquivo
        const fileContent = await downloadDriveFile(drive, file.id, file.mimeType);

        if (!fileContent) {
          result.erros++;
          continue;
        }

        // Analisar PDF com IA
        const analise = await analyzeJulgadoPDF(fileContent, file.name);

        // Determinar tribunal com base na configuração da pasta ou análise
        const tribunal = folder.tribunal || analise.tribunal;

        // Criar julgado
        const [julgado] = await db
          .insert(jurisprudenciaJulgados)
          .values({
            tribunal: tribunal as any,
            tipoDecisao: analise.tipoDecisao as any,
            numeroProcesso: analise.numeroProcesso || null,
            relator: analise.relator || null,
            orgaoJulgador: analise.orgaoJulgador || null,
            dataJulgamento: analise.dataJulgamento || null,
            ementa: analise.ementa || null,
            textoIntegral: analise.textoIntegral,
            temaId: folder.temaId,
            driveFileId: file.id,
            driveFileUrl: file.webViewLink,
            arquivoNome: file.name,
            arquivoTamanho: parseInt(file.size) || null,
            fonte: "Google Drive",
            status: "pendente",
            createdById: userId,
          })
          .returning();

        result.arquivosNovos.push(file.name);
        result.sincronizados++;

        // Processar com IA em background (não bloqueia)
        processJulgadoWithAI(julgado).catch((err) => {
          console.error(`Erro ao processar julgado ${julgado.id}:`, err);
        });
      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
        result.erros++;
      }
    }

    return result;
  } catch (error) {
    console.error("Erro ao sincronizar pasta do Drive:", error);
    throw error;
  }
}

/**
 * Baixa arquivo do Drive
 */
async function downloadDriveFile(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  mimeType: string
): Promise<Buffer | null> {
  try {
    if (mimeType === "application/vnd.google-apps.document") {
      // Exportar Google Doc como PDF
      const response = await drive.files.export(
        { fileId, mimeType: "application/pdf" },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(response.data as ArrayBuffer);
    } else {
      // Baixar arquivo diretamente
      const response = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(response.data as ArrayBuffer);
    }
  } catch (error) {
    console.error("Erro ao baixar arquivo:", error);
    return null;
  }
}

/**
 * Lista pastas do Drive (para seleção pelo usuário)
 */
export async function listDriveFolders(parentId?: string): Promise<
  Array<{
    id: string;
    name: string;
    path: string;
  }>
> {
  const drive = getGoogleDriveClient();

  try {
    const query = parentId
      ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      : "mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents";

    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, parents)",
      pageSize: 50,
      orderBy: "name",
    });

    return (response.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      path: f.name!,
    }));
  } catch (error) {
    console.error("Erro ao listar pastas:", error);
    return [];
  }
}

/**
 * Verifica se há novos arquivos em uma pasta (para notificação)
 */
export async function checkForNewFiles(folderId: string): Promise<number> {
  const drive = getGoogleDriveClient();

  try {
    // Buscar última sincronização
    const [folder] = await db
      .select()
      .from(jurisprudenciaDriveFolders)
      .where(eq(jurisprudenciaDriveFolders.folderId, folderId));

    if (!folder) return 0;

    const lastSync = folder.lastSyncAt || new Date(0);

    // Contar arquivos novos
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document') and createdTime > '${lastSync.toISOString()}'`,
      fields: "files(id)",
      pageSize: 100,
    });

    return response.data.files?.length || 0;
  } catch (error) {
    console.error("Erro ao verificar novos arquivos:", error);
    return 0;
  }
}

/**
 * Obtém URL de visualização do arquivo
 */
export function getDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Obtém URL de download do arquivo
 */
export function getDriveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
