/**
 * Tipos da camada de promoção de CAUTELARES (medidas cautelares pessoais).
 *
 * Espelha a arquitetura de promoção de delitos (`tipos-delito.ts`): o "resolver"
 * faz MATCH na taxonomia (CATALOGO_CAUTELARES) por gatilhos de texto livre, não
 * dedup de identidade. Decisão de design (conservadora): NUNCA cria entradas no
 * catálogo. Quando uma medida não casa, registra `sem-correspondencia`.
 *
 * Fonte: `analysisData.pessoas[].medidasCautelares[]` (string array por pessoa),
 * achatado para TODAS as pessoas do processo. Cada string é um candidato.
 */

/** Candidato a cautelar extraído de `analysisData.pessoas[].medidasCautelares[]`. */
export interface CandidatoCautelar {
  /** Texto livre da medida conforme extraído (ex.: "monitoração eletrônica"). */
  medida: string;
  /** `analysis:<processoId>`. */
  fonteRef: string;
  confianca: number;
}

/**
 * Resultado da resolução de uma medida contra a taxonomia.
 * Sem "revisar" — o match por gatilhos é determinístico.
 */
export type ResultadoResolucaoCautelar =
  | {
      acao: "vincular";
      codigo: string;
      especie: "prisao" | "diversa";
      artigo: string;
      confianca: number;
      motivo: string;
    }
  | { acao: "sem-correspondencia"; confianca: number; motivo: string };

/** Ação de promoção planejada para um candidato a cautelar. */
export type AcaoPromocaoCautelar =
  | {
      tipo: "vincular";
      candidato: CandidatoCautelar;
      codigo: string;
      especie: "prisao" | "diversa";
      artigo: string;
    }
  | { tipo: "sem-correspondencia"; candidato: CandidatoCautelar }
  | { tipo: "ignorar"; candidato: CandidatoCautelar; codigo: string; motivo: string };

/** Decisão cautelar já existente no processo (idempotência + soberania manual). */
export interface CautelarExistente {
  processoId: number;
  codigo: string;
  origem: string;
}
