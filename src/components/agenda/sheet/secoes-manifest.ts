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

/**
 * AIJ / Sumariante / PAP — instrução completa (ordem do art. 400 CPP).
 *
 * Estrutura em 3 faixas para reduzir a poluição do sheet:
 *  1. Espinha (7): resumo → imputação → denúncia(fatos) → depoentes →
 *     depoimentos → laudos → documentos — o fluxo mental da audiência.
 *  2. Preparação: dossie (Roteiro) → teses.
 *  3. Contexto (colapsado ao final): ver {@link GRUPO_CONTEXTO_INSTRUCAO}.
 *
 * Espinha + preparação renderizam como seções de topo; o grupo Contexto é
 * renderizado dentro de um único CollapsibleSection no corpo do sheet AIJ.
 */
export const SECOES_INSTRUCAO: SecaoId[] = [
  // Espinha (8)
  "resumo",        // narrativa do caso — topo da aba Imputação
  "imputacao",
  "fatos",
  "depoentes",
  "intimacao",     // ← Intimações tab
  "depoimentos",
  "laudos",
  "documentos",
  // Preparação
  "dossie",
  "teses",
  // Contexto (colapsado via GRUPO_CONTEXTO_INSTRUCAO)
  "contradicoes", "versao", "relato-vitima", "sintese",
  "investigacao", "pendencias", "medidas", "ata",
  "anotacoes-rapidas", "analise-ia", "midia",
];

/**
 * Seções de "Contexto" da instrução — material de apoio agrupado num único
 * CollapsibleSection (colapsado por padrão) ao final do sheet AIJ. É disjunto
 * da espinha + preparação e, somado a ela, cobre toda a {@link SECOES_INSTRUCAO}.
 */
export const GRUPO_CONTEXTO_INSTRUCAO: SecaoId[] = [
  "contradicoes",
  "versao",
  "relato-vitima",
  "sintese",
  "investigacao",
  "pendencias",
  "medidas",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "midia",
];

/** Custódia — legalidade do flagrante, requisitos do art. 312 e cautelares. */
export const SECOES_CUSTODIA: SecaoId[] = [
  "motivo-designacao",
  "preventiva",
  "cautelares",
  "versao",
  "medidas",
  "dossie",
  "imputacao",
  "fatos",
  "relato-vitima",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

/** Plenário do Júri — preparação/acompanhamento ao vivo ficam no Cockpit. */
export const SECOES_PLENARIO: SecaoId[] = [
  "teses",
  "depoentes",
  "imputacao",
  "fatos",
  "contradicoes",
  "laudos",
  "dossie",
  "sintese",
  "versao",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

/** Oitiva/Depoimento Especial (Lei 13.431/17) — escuta protegida. */
export const SECOES_OITIVA_ESPECIAL: SecaoId[] = [
  "motivo-designacao",
  "relato-vitima",
  "depoentes",
  "dossie",
  "versao",
  "medidas",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

/** ANPP — confissão formal e pactuação de condições. */
export const SECOES_ANPP: SecaoId[] = [
  "motivo-designacao",
  "imputacao",
  "fatos",
  "versao",
  "dossie",
  "cautelares",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

/** Admonitória (EP) — leitura de condições e início do cumprimento. */
export const SECOES_ADMONITORIA: SecaoId[] = [
  "motivo-designacao",
  "versao",
  "dossie",
  "cautelares",
  "ata",
  "anotacoes-rapidas",
  "documentos",
  "midia",
];

/** Justificação na Execução Penal — falta disciplinar / descumprimento. */
export const SECOES_JUSTIFICACAO_EP: SecaoId[] = [
  "motivo-designacao",
  "versao",
  "depoentes",
  "dossie",
  "ata",
  "anotacoes-rapidas",
  "analise-ia",
  "documentos",
  "midia",
];

export function resolverManifesto(config: { secoes?: SecaoId[] }): SecaoId[] {
  return config.secoes ?? SECOES_DEFAULT;
}
