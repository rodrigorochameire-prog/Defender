import type { SecaoId, SecoesMap } from "./secoes-manifest";

/**
 * Modos internos do sheet de Demanda (Fase 4 do redesign).
 * Substituem a ToC scroll-spy sobre seções empilhadas por 4 abas focadas,
 * cada uma mostrando só o seu conteúdo. Agrupa as seções existentes.
 */
export type SheetModeKey = "registros" | "dados" | "autos" | "producao";

export interface SheetModeDef {
  key: SheetModeKey;
  label: string;
  /** Seções do manifesto que compõem este modo, na ordem de exibição. */
  secoes: SecaoId[];
}

export const SHEET_MODES: SheetModeDef[] = [
  { key: "registros", label: "Registros", secoes: ["registros"] },
  { key: "dados", label: "Dados", secoes: ["proxima-audiencia", "identificacao", "cronologia"] },
  { key: "autos", label: "Autos", secoes: ["autos", "recursos"] },
  // "oficio" + nota privada (a nota é renderizada à parte no sheet).
  { key: "producao", label: "Produção", secoes: ["oficio"] },
];

export interface ResolvedMode {
  key: SheetModeKey;
  label: string;
  /** Apenas as seções COM dado (temDado), na ordem definida. */
  secoes: SecaoId[];
  /** Soma dos counts das seções visíveis — alimenta o badge da aba. */
  count?: number;
}

/**
 * Resolve os 4 modos sempre presentes (nav estável), filtrando dentro de cada
 * um as seções sem dado e somando os counts para o badge.
 */
export function buildSheetModes(map: SecoesMap): ResolvedMode[] {
  return SHEET_MODES.map((m) => {
    const secoes = m.secoes.filter((id) => map[id]?.temDado);
    const count = secoes.reduce((acc, id) => acc + (map[id]?.count ?? 0), 0);
    return { key: m.key, label: m.label, secoes, count: count || undefined };
  });
}
