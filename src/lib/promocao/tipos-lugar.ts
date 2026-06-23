/**
 * Tipos da camada de promoção de LUGARES.
 *
 * Espelha a arquitetura de promoção de pessoas (`tipos.ts`), porém é MAIS SIMPLES:
 * o endereço normalizado é determinístico, logo NÃO há ação "revisar". O resolver
 * faz dedup por endereço normalizado (match exato contra lugares não-merged); sem
 * match → cria. As "tipos de participação" são mapeados de `locais[].tipo`.
 */

/** Candidato a lugar extraído de `analysisData.locais[]`. */
export interface CandidatoLugar {
  /** Endereço completo conforme extraído (entrada do normalizador). */
  enderecoCompleto: string;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Tipo de participação já mapeado para o enum de `participacoes_lugar`. */
  tipo: LugarTipoParticipacao;
  /** Id da pessoa relacionada, se já resolvida (no piloto: sempre null). */
  pessoaId?: number | null;
  /** `analysis:<processoId>`. */
  fonteRef: string;
  confianca: number;
}

/** Valores do enum `lugar_tipo_participacao` (ver schema/lugares.ts). */
export type LugarTipoParticipacao =
  | "local-do-fato"
  | "endereco-assistido"
  | "residencia-agressor"
  | "trabalho-agressor"
  | "local-atendimento"
  | "radar-noticia";

/** Lugar já existente no workspace (pool de dedup por endereço normalizado). */
export interface LugarExistente {
  id: number;
  enderecoNormalizado: string;
}

/**
 * Resultado da resolução de um endereço contra os lugares existentes.
 * Sem "revisar" — endereço normalizado é determinístico.
 */
export type ResultadoResolucaoLugar =
  | { acao: "vincular"; lugarId: number; confianca: number; motivo: string }
  | { acao: "criar"; confianca: number; motivo: string };

/** Ação de promoção planejada para um candidato a lugar. */
export type AcaoPromocaoLugar =
  | { tipo: "criar"; candidato: CandidatoLugar }
  | { tipo: "vincular"; candidato: CandidatoLugar; lugarId: number }
  | { tipo: "ignorar"; candidato: CandidatoLugar; lugarId: number; motivo: string };

/** Participação de lugar já existente no processo (idempotência + soberania manual). */
export interface ParticipacaoLugarExistente {
  lugarId: number;
  processoId: number;
  tipo: string;
  fonte: string;
}
