/**
 * Mapeia atos de demanda que, ao serem protocolados, disparam o registro
 * de um recurso/impetração no 2º grau (tabela `recursos` — instância superior).
 */

export type TipoRecurso = "HC" | "APELACAO" | "RSE" | "AGRAVO_EXECUCAO";

interface AtoRecursoInfo {
  tipo: TipoRecurso;
  rotulo: string; // Rótulo legível no header do modal
  /** Se true, o número do recurso (autos em 2º grau) é obrigatório ao protocolar. */
  exigeNumero: boolean;
}

// Normaliza a grafia do ato (tira acentos, minúsculo, trim) — matching robusto
export function normalizeAto(ato: string | null | undefined): string {
  return (ato ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ATOS_RECURSO: Record<string, AtoRecursoInfo> = {
  "habeas corpus":                { tipo: "HC",              rotulo: "Habeas Corpus",              exigeNumero: true  },
  "apelacao":                     { tipo: "APELACAO",        rotulo: "Apelação",                   exigeNumero: false },
  "razoes de apelacao":           { tipo: "APELACAO",        rotulo: "Apelação (razões)",          exigeNumero: false },
  "contrarrazoes de apelacao":    { tipo: "APELACAO",        rotulo: "Apelação (contrarrazões)",   exigeNumero: false },
  "recurso em sentido estrito":   { tipo: "RSE",             rotulo: "Recurso em Sentido Estrito", exigeNumero: false },
  "agravo em execucao":           { tipo: "AGRAVO_EXECUCAO", rotulo: "Agravo em Execução",         exigeNumero: false },
};

export function isAtoRecurso(ato: string | null | undefined): boolean {
  return ATOS_RECURSO[normalizeAto(ato)] !== undefined;
}

export function infoDoAtoRecurso(ato: string | null | undefined): AtoRecursoInfo | null {
  return ATOS_RECURSO[normalizeAto(ato)] ?? null;
}
