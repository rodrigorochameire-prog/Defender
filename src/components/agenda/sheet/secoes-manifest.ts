/**
 * Identificador de seção do EventDetailSheet. Os valores coincidem com o `id`
 * usado em cada <CollapsibleSection>, para que o ToC (IntersectionObserver via
 * data-section-id) e o corpo apontem para a mesma âncora.
 */
export type SecaoId =
  | "resumo"             // Resumo Executivo (default / ação penal)
  | "resumo-audiencia"   // NOVO — resumo geral orientado ao subtipo
  | "motivo-designacao"
  | "requerimento-defesa" // NOVO
  | "intimacao"          // NOVO standalone (lê dossie.intimacao)
  | "dossie"             // Roteiro da defesa
  | "medidas"            // Medidas protetivas vigentes (unificada)
  | "preventiva"
  | "cautelares"
  | "ata"                // Ata: gravações (links) + resultado realizado
  | "anotacoes-rapidas"
  | "analise-ia"
  | "imputacao"
  | "fatos"
  | "relato-vitima"
  | "sintese"
  | "versao"             // Relato do assistido
  | "depoentes"
  | "depoimentos"
  | "contradicoes"
  | "laudos"
  | "investigacao"
  | "pendencias"
  | "teses"
  | "documentos"
  | "midia";

/**
 * Ordem-base reproduzindo o corpo renderizado hoje em event-detail-sheet.tsx.
 * A única diferença intencional: a antiga seção "medidas-deferidas"
 * (analysisData) foi fundida em "medidas" (ver medidas-fonte).
 */
export const SECOES_DEFAULT: SecaoId[] = [
  "resumo",
  "dossie",
  "medidas",
  "preventiva",
  "cautelares",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "imputacao",
  "fatos",
  "motivo-designacao",
  "relato-vitima",
  "sintese",
  "versao",
  "depoentes",
  "depoimentos",
  "contradicoes",
  "laudos",
  "investigacao",
  "pendencias",
  "teses",
  "documentos",
  "midia",
];

/** Justificação (MPU): por relevância para o defensor; sem seções de ação penal. */
export const SECOES_JUSTIFICACAO: SecaoId[] = [
  "motivo-designacao",
  "requerimento-defesa",
  "intimacao",
  "resumo-audiencia",
  "medidas",
  "relato-vitima",
  "versao",
  "dossie",
  "depoentes",
  "ata",
  "anotacoes-rapidas",
  "documentos",
  "midia",
];

export function resolverManifesto(config: { secoes?: SecaoId[] }): SecaoId[] {
  return config.secoes ?? SECOES_DEFAULT;
}
