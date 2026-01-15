/**
 * Serviço de Integração com Google Calendar
 * 
 * Este serviço gerencia a criação automática de eventos no Google Calendar
 * para prazos, audiências e sessões do júri.
 * 
 * Eventos são criados com cores diferentes:
 * - Vermelho: Réu preso (prioridade máxima)
 * - Laranja: Prazo urgente
 * - Azul: Audiência
 * - Roxo: Sessão do Júri
 * - Verde: Evento padrão
 */

import { db } from "@/lib/db";
import { demandas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Cores do Google Calendar
export const CalendarColors = {
  VERMELHO: "11", // Réu preso
  LARANJA: "6",   // Urgente
  AZUL: "9",      // Audiência
  ROXO: "3",      // Júri
  VERDE: "10",    // Padrão
  AMARELO: "5",   // Atenção
};

// Tipos
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  location?: string;
  colorId?: string;
  htmlLink: string;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  location?: string;
  colorId?: string;
  reminders?: { method: string; minutes: number }[];
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string; // ID do calendário (pode ser 'primary')
}

// Configuração
const getConfig = (): GoogleCalendarConfig | null => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return null;
  }

  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
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
 * Cria um evento no Google Calendar
 */
export async function createCalendarEvent(
  params: CreateEventParams
): Promise<CalendarEvent | null> {
  const config = getConfig();
  if (!config) {
    console.warn("Google Calendar não configurado. Pulando criação de evento.");
    return null;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const timeZone = "America/Bahia";
    
    // Configurar início e fim
    let start: { dateTime?: string; date?: string; timeZone?: string };
    let end: { dateTime?: string; date?: string; timeZone?: string };

    if (params.isAllDay) {
      // Evento de dia inteiro
      start = { date: params.startDate.toISOString().split("T")[0] };
      end = {
        date: (params.endDate || params.startDate).toISOString().split("T")[0],
      };
    } else {
      // Evento com horário
      start = {
        dateTime: params.startDate.toISOString(),
        timeZone,
      };
      end = {
        dateTime: (params.endDate || new Date(params.startDate.getTime() + 60 * 60 * 1000)).toISOString(),
        timeZone,
      };
    }

    const event = {
      summary: params.summary,
      description: params.description,
      start,
      end,
      location: params.location,
      colorId: params.colorId,
      reminders: params.reminders
        ? {
            useDefault: false,
            overrides: params.reminders,
          }
        : { useDefault: true },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events`,
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
      console.error("Erro ao criar evento:", await response.text());
      return null;
    }

    const createdEvent = await response.json();
    return {
      id: createdEvent.id,
      summary: createdEvent.summary,
      description: createdEvent.description,
      start: createdEvent.start,
      end: createdEvent.end,
      location: createdEvent.location,
      colorId: createdEvent.colorId,
      htmlLink: createdEvent.htmlLink,
    };
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return null;
  }
}

/**
 * Atualiza um evento existente no Google Calendar
 */
export async function updateCalendarEvent(
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<CalendarEvent | null> {
  const config = getConfig();
  if (!config) return null;

  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  try {
    const timeZone = "America/Bahia";
    
    const updateData: Record<string, unknown> = {};

    if (params.summary) updateData.summary = params.summary;
    if (params.description) updateData.description = params.description;
    if (params.location) updateData.location = params.location;
    if (params.colorId) updateData.colorId = params.colorId;

    if (params.startDate) {
      if (params.isAllDay) {
        updateData.start = { date: params.startDate.toISOString().split("T")[0] };
        updateData.end = {
          date: (params.endDate || params.startDate).toISOString().split("T")[0],
        };
      } else {
        updateData.start = { dateTime: params.startDate.toISOString(), timeZone };
        updateData.end = {
          dateTime: (params.endDate || new Date(params.startDate.getTime() + 60 * 60 * 1000)).toISOString(),
          timeZone,
        };
      }
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      console.error("Erro ao atualizar evento:", await response.text());
      return null;
    }

    const updatedEvent = await response.json();
    return {
      id: updatedEvent.id,
      summary: updatedEvent.summary,
      description: updatedEvent.description,
      start: updatedEvent.start,
      end: updatedEvent.end,
      location: updatedEvent.location,
      colorId: updatedEvent.colorId,
      htmlLink: updatedEvent.htmlLink,
    };
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    return null;
  }
}

/**
 * Exclui um evento do Google Calendar
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return false;
  }
}

/**
 * Cria um evento de prazo no calendário e atualiza a demanda com o ID
 */
export async function criarEventoPrazo(
  demandaId: number,
  assistidoNome: string,
  ato: string,
  prazo: Date,
  reuPreso: boolean = false,
  numeroAutos?: string
): Promise<CalendarEvent | null> {
  // Determinar cor baseada na prioridade
  const colorId = reuPreso ? CalendarColors.VERMELHO : CalendarColors.LARANJA;

  // Montar descrição
  let description = `Ato: ${ato}`;
  if (numeroAutos) {
    description += `\nProcesso: ${numeroAutos}`;
  }
  if (reuPreso) {
    description += "\n\n⚠️ ATENÇÃO: RÉU PRESO";
  }

  // Título do evento
  const prefix = reuPreso ? "🔴 [RÉU PRESO] " : "⏰ ";
  const summary = `${prefix}${ato} - ${assistidoNome}`;

  const event = await createCalendarEvent({
    summary,
    description,
    startDate: prazo,
    isAllDay: true,
    colorId,
    reminders: [
      { method: "popup", minutes: 1440 }, // 1 dia antes
      { method: "popup", minutes: 60 },   // 1 hora antes
      { method: "email", minutes: 1440 }, // Email 1 dia antes
    ],
  });

  if (event) {
    // Atualizar a demanda com o ID do evento
    await db
      .update(demandas)
      .set({
        googleCalendarEventId: event.id,
        updatedAt: new Date(),
      })
      .where(eq(demandas.id, demandaId));
  }

  return event;
}

/**
 * Cria um evento de audiência no calendário
 */
export async function criarEventoAudiencia(
  assistidoNome: string,
  tipoAudiencia: string,
  dataAudiencia: Date,
  local?: string,
  numeroAutos?: string
): Promise<CalendarEvent | null> {
  let description = `Tipo: ${tipoAudiencia}`;
  if (numeroAutos) {
    description += `\nProcesso: ${numeroAutos}`;
  }

  const summary = `📅 Audiência ${tipoAudiencia} - ${assistidoNome}`;

  return createCalendarEvent({
    summary,
    description,
    startDate: dataAudiencia,
    isAllDay: false,
    location: local,
    colorId: CalendarColors.AZUL,
    reminders: [
      { method: "popup", minutes: 1440 }, // 1 dia antes
      { method: "popup", minutes: 120 },  // 2 horas antes
      { method: "popup", minutes: 30 },   // 30 minutos antes
    ],
  });
}

/**
 * Cria um evento de sessão do júri no calendário
 */
export async function criarEventoJuri(
  assistidoNome: string,
  dataSessao: Date,
  local?: string,
  numeroAutos?: string
): Promise<CalendarEvent | null> {
  let description = `Sessão do Tribunal do Júri`;
  if (numeroAutos) {
    description += `\nProcesso: ${numeroAutos}`;
  }
  description += "\n\n⚖️ PLENÁRIO DO JÚRI";

  const summary = `⚖️ JÚRI - ${assistidoNome}`;

  return createCalendarEvent({
    summary,
    description,
    startDate: dataSessao,
    isAllDay: true,
    location: local,
    colorId: CalendarColors.ROXO,
    reminders: [
      { method: "popup", minutes: 10080 }, // 1 semana antes
      { method: "popup", minutes: 1440 },  // 1 dia antes
      { method: "email", minutes: 10080 }, // Email 1 semana antes
    ],
  });
}

/**
 * Verifica se a integração com Google Calendar está configurada
 */
export function isGoogleCalendarConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Lista eventos próximos do calendário
 */
export async function listarEventosProximos(
  dias: number = 7
): Promise<CalendarEvent[]> {
  const config = getConfig();
  if (!config) return [];

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + dias);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events?` +
        new URLSearchParams({
          timeMin: now.toISOString(),
          timeMax: future.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Erro ao listar eventos:", await response.text());
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      start: item.start,
      end: item.end,
      location: item.location,
      colorId: item.colorId,
      htmlLink: item.htmlLink,
    }));
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    return [];
  }
}
