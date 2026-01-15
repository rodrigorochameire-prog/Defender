/**
 * Serviço de Integração com Google Drive
 * 
 * Este serviço gerencia a criação automática de pastas no Google Drive
 * para cada processo, permitindo organização centralizada de documentos.
 * 
 * Requer configuração do Google Cloud Platform com a API do Drive ativada.
 */

import { db } from "@/lib/db";
import { processos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Tipos
export interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string; // Pasta raiz onde serão criadas as subpastas
}

// Configuração (será carregada das variáveis de ambiente)
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

/**
 * Obtém um token de acesso válido usando o refresh token
 */
async function getAccessToken(): Promise<string | null> {
  const config = getConfig();
  if (!config) return null;

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
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Erro ao obter access token:", error);
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
