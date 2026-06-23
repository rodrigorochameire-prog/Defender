/**
 * Tipos da camada de promoção de DELITOS (tipificações).
 *
 * Espelha a arquitetura de promoção de pessoas (`tipos.ts`), porém o "resolver"
 * faz MATCH em catálogo (delitos_catalogo), não dedup de identidade. Decisão de
 * design (conservadora): NUNCA cria entradas no catálogo. Quando um artigo
 * extraído não casa, registra `sem-correspondencia` para revisão manual.
 */

/** Candidato a delito extraído de `analysisData.imputacoes[]`. */
export interface CandidatoDelito {
  /** Nome do crime conforme extraído (ex.: "Homicídio qualificado"). */
  crime: string;
  /** Texto bruto do artigo conforme extraído (ex.: "121, §2º", "art. 33"). */
  artigoBruto: string | null;
  qualificadoras: string[];
  majorantes: string[];
  minorantes: string[];
  /** `analysis:<processoId>`. */
  fonteRef: string;
  confianca: number;
  /** Texto livre de observações da imputação, se houver. */
  observacoes?: string | null;
}

/** Entrada do catálogo de delitos usada na resolução por match. */
export interface CatalogoDelito {
  id: number;
  codigoLei: string | null;
  artigo: string | null;
  /** Armazenado COM símbolos no catálogo (ex.: "§2º", "caput"). */
  paragrafo: string | null;
  inciso: string | null;
}

/**
 * Resultado da resolução de um artigo contra o catálogo.
 * Sem "revisar" — crimes são determinísticos (não há homônimos).
 */
export type ResultadoResolucaoDelito =
  | { acao: "vincular"; delitoId: number; confianca: number; motivo: string }
  | { acao: "sem-correspondencia"; confianca: number; motivo: string };

/** Ação de promoção planejada para um candidato a delito. */
export type AcaoPromocaoDelito =
  | { tipo: "vincular"; candidato: CandidatoDelito; delitoId: number }
  | { tipo: "sem-correspondencia"; candidato: CandidatoDelito }
  | { tipo: "ignorar"; candidato: CandidatoDelito; delitoId: number; motivo: string };

/** Tipificação já existente no processo (para idempotência + soberania manual). */
export interface TipificacaoExistente {
  processoId: number;
  delitoId: number;
  qualificadoras: string[];
  origem: string;
}
