import { CalendarColors } from "./google-calendar";

export type AreaCalendar =
  | "JURI"
  | "VIOLENCIA_DOMESTICA"
  | "EXECUCAO_PENAL"
  | "CRIMINAL"
  | "CRIMINAL_2_GRAU";

const ENV_KEY: Record<AreaCalendar, string> = {
  JURI: "GOOGLE_CALENDAR_ID_JURI",
  VIOLENCIA_DOMESTICA: "GOOGLE_CALENDAR_ID_VVD",
  EXECUCAO_PENAL: "GOOGLE_CALENDAR_ID_EP",
  CRIMINAL: "GOOGLE_CALENDAR_ID_CRIMINAL",
  CRIMINAL_2_GRAU: "GOOGLE_CALENDAR_ID_CRIMINAL_2",
};

/**
 * Resolve o calendar ID para a área da demanda.
 * Ordem: env específico da área → GOOGLE_CALENDAR_ID → "primary".
 */
export function resolveCalendarId(area: string | null | undefined): string {
  const fallback = process.env.GOOGLE_CALENDAR_ID || "primary";
  if (!area) return fallback;
  const envName = ENV_KEY[area as AreaCalendar];
  if (!envName) return fallback;
  return process.env[envName] || fallback;
}

/**
 * Cor do evento Calendar baseada no tipo da audiência.
 * Default: AZUL.
 */
export function colorIdForAudiencia(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (/plen[áa]rio|j[úu]ri/.test(t)) return CalendarColors.ROXO;
  if (/cust[óo]dia/.test(t)) return CalendarColors.VERMELHO;
  if (/oitiva\s+especial|depoimento\s+sem\s+dano/.test(t)) return CalendarColors.LARANJA;
  if (/preliminar.*maria/.test(t)) return CalendarColors.AMARELO;
  return CalendarColors.AZUL;
}
