/**
 * Papéis com alto valor de cruzamento (rotativos).
 * Em comarca única, pessoas nesses papéis mudam de caso pra caso —
 * merecem sinalização de inteligência (dot, peek, banner) em Fase I-B.
 */
export const PAPEIS_ROTATIVOS = new Set<string>([
  // Depoentes / Acusação
  "testemunha",
  "vitima",
  "informante",
  "co-reu",
  "testemunha-defesa",
  // Policial / Investigação
  "autoridade-policial",
  "policial-militar",
  "policial-civil",
  "policial-federal",
  "guarda-municipal",
  "agente-penitenciario",
  // Pericial / Técnico
  "perito-criminal",
  "perito-medico",
  "medico-legista",
  "medico-assistente",
  "psicologo-forense",
  "psiquiatra-forense",
  "assistente-social",
  "tradutor-interprete",
  // Parte contrária
  "advogado-parte-contraria",
]);

/**
 * Papéis estáveis — titularidade fixa em comarca única.
 * Entidade existe no banco (para estatística/audit) mas em Fase I-B
 * NÃO ganha dot/peek/banner.
 */
export const PAPEIS_ESTAVEIS = new Set<string>([
  "juiz",
  "desembargador",
  "promotor",
  "procurador",
  "servidor-cartorio",
  "oficial-justica",
  "analista-judiciario",
]);

/**
 * Lista completa de papéis válidos (para Zod enum).
 */
export const PAPEIS_VALIDOS = [
  ...PAPEIS_ROTATIVOS,
  ...PAPEIS_ESTAVEIS,
  "outro",
] as const;

export type PapelParticipacao = typeof PAPEIS_VALIDOS[number];

export function isPapelRotativo(papel: string | null | undefined): boolean {
  if (!papel) return false;
  return PAPEIS_ROTATIVOS.has(papel);
}
