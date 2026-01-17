/**
 * Google Integrations Configuration
 * 
 * Este módulo gerencia as integrações com Google Drive e Google Calendar.
 * Para funcionar em produção, é necessário configurar:
 * 
 * 1. Google Cloud Console:
 *    - Criar um projeto
 *    - Habilitar Google Drive API e Google Calendar API
 *    - Configurar OAuth 2.0 credentials
 *    - Adicionar redirect URIs
 * 
 * 2. Environment Variables:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REDIRECT_URI
 * 
 * 3. n8n Webhooks (opcional):
 *    - Configure webhooks para sincronização bidirecional
 */

// Types
export interface GoogleDriveFolder {
  id: string;
  name: string;
  webViewLink: string;
  createdTime: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  location?: string;
  colorId?: string;
}

// Google Drive Functions
export async function createDriveFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<GoogleDriveFolder | null> {
  try {
    const metadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentFolderId && { parents: [parentFolderId] }),
    };

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
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
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const folder = await response.json();
    return {
      id: folder.id,
      name: folder.name,
      webViewLink: `https://drive.google.com/drive/folders/${folder.id}`,
      createdTime: folder.createdTime,
    };
  } catch (error) {
    console.error("Error creating Drive folder:", error);
    return null;
  }
}

export async function listDriveFiles(
  accessToken: string,
  folderId: string
): Promise<GoogleDriveFile[]> {
  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const fields = "files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)";
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${fields}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing Drive files:", error);
    return [];
  }
}

// Google Calendar Functions
export async function createCalendarEvent(
  accessToken: string,
  event: Omit<GoogleCalendarEvent, "id">,
  calendarId: string = "primary"
): Promise<GoogleCalendarEvent | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating Calendar event:", error);
    return null;
  }
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = "primary"
): Promise<GoogleCalendarEvent | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating Calendar event:", error);
    return null;
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = "primary"
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error deleting Calendar event:", error);
    return false;
  }
}

// Helper functions for DefesaHub
export function buildProcessoFolderName(
  assistidoNome: string,
  numeroProcesso: string
): string {
  // Sanitize folder name
  const sanitizedNome = assistidoNome.replace(/[<>:"/\\|?*]/g, "").trim();
  const sanitizedNumero = numeroProcesso.replace(/[<>:"/\\|?*]/g, "").trim();
  return `${sanitizedNome} - ${sanitizedNumero}`;
}

export function buildCalendarEventFromPrazo(
  prazo: {
    ato: string;
    prazoData: Date;
    assistidoNome: string;
    processoNumero: string;
    reuPreso?: boolean;
  }
): Omit<GoogleCalendarEvent, "id"> {
  const prioridade = prazo.reuPreso ? "[RÉU PRESO] " : "";
  
  return {
    summary: `${prioridade}PRAZO: ${prazo.ato} - ${prazo.assistidoNome}`,
    description: `Processo: ${prazo.processoNumero}\nAto: ${prazo.ato}`,
    start: {
      dateTime: prazo.prazoData.toISOString(),
      timeZone: "America/Bahia",
    },
    end: {
      dateTime: new Date(prazo.prazoData.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: "America/Bahia",
    },
    colorId: prazo.reuPreso ? "11" : "4", // Red for preso, pale blue otherwise
  };
}

export function buildCalendarEventFromAudiencia(
  audiencia: {
    tipo: string;
    dataAudiencia: Date;
    assistidoNome: string;
    processoNumero: string;
    local?: string;
  }
): Omit<GoogleCalendarEvent, "id"> {
  return {
    summary: `AUDIÊNCIA ${audiencia.tipo.toUpperCase()}: ${audiencia.assistidoNome}`,
    description: `Processo: ${audiencia.processoNumero}\nTipo: ${audiencia.tipo}`,
    start: {
      dateTime: audiencia.dataAudiencia.toISOString(),
      timeZone: "America/Bahia",
    },
    end: {
      dateTime: new Date(audiencia.dataAudiencia.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      timeZone: "America/Bahia",
    },
    location: audiencia.local,
    colorId: "9", // Blue
  };
}

export function buildCalendarEventFromJuri(
  juri: {
    dataSessao: Date;
    assistidoNome: string;
    processoNumero: string;
    sala?: string;
    defensorNome?: string;
  }
): Omit<GoogleCalendarEvent, "id"> {
  return {
    summary: `JÚRI: ${juri.assistidoNome}`,
    description: `Processo: ${juri.processoNumero}\nDefensor: ${juri.defensorNome || "A definir"}\nSala: ${juri.sala || "A definir"}`,
    start: {
      dateTime: juri.dataSessao.toISOString(),
      timeZone: "America/Bahia",
    },
    end: {
      dateTime: new Date(juri.dataSessao.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours for full jury session
      timeZone: "America/Bahia",
    },
    location: juri.sala,
    colorId: "3", // Purple
  };
}
