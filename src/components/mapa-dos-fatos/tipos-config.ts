/**
 * Configuração de apresentação do "mapa dos fatos": cor e rótulo por tipo de
 * participação de lugar. Pura (sem React) — testável e reutilizável.
 */

export const TIPOS_LUGAR = [
  "local-do-fato",
  "residencia-vitima",
  "residencia-agressor",
  "trabalho-agressor",
  "residencia-testemunha",
  "endereco-assistido",
  "local-atendimento",
  "radar-noticia",
  "outro",
] as const;

export type TipoLugar = (typeof TIPOS_LUGAR)[number];

export const TIPO_COR: Record<string, string> = {
  "local-do-fato": "#e11d48", // rose-600 — o fato em si
  "residencia-vitima": "#f59e0b", // amber-500
  "residencia-agressor": "#6b7280", // gray-500
  "trabalho-agressor": "#9ca3af", // gray-400
  "residencia-testemunha": "#8b5cf6", // violet-500
  "endereco-assistido": "#10b981", // emerald-500
  "local-atendimento": "#06b6d4", // cyan-500
  "radar-noticia": "#ec4899", // pink-500
  outro: "#71717a", // zinc-500
};

export const TIPO_LABEL: Record<string, string> = {
  "local-do-fato": "Local do fato",
  "residencia-vitima": "Residência da vítima",
  "residencia-agressor": "Residência do agressor",
  "trabalho-agressor": "Trabalho do agressor",
  "residencia-testemunha": "Residência de testemunha",
  "endereco-assistido": "Endereço do assistido",
  "local-atendimento": "Local de atendimento",
  "radar-noticia": "Notícia / radar",
  outro: "Outro",
};

const COR_FALLBACK = "#71717a";

export function corDoTipo(tipo: string | null | undefined): string {
  return (tipo && TIPO_COR[tipo]) || COR_FALLBACK;
}

export function labelDoTipo(tipo: string | null | undefined): string {
  return (tipo && TIPO_LABEL[tipo]) || "Outro";
}

/**
 * Cor do marcador quando há múltiplos tipos no mesmo lugar: prioriza o mais
 * relevante (local-do-fato > vítima > agressor > demais).
 */
export function corPrincipal(tipos: string[]): string {
  for (const t of TIPOS_LUGAR) {
    if (tipos.includes(t)) return TIPO_COR[t];
  }
  return COR_FALLBACK;
}
