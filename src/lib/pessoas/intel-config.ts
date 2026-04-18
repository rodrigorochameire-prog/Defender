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

/**
 * Thresholds e parâmetros calibráveis da Fase I-B.
 * Ajustar aqui permite iterar sem tocar componentes.
 */
export const INTEL_CONFIG = {
  dot: {
    subtleMin: 2,              // >= N casos → dot subtle
    normalMin: 3,              // >= N casos → dot normal
    emeraldCasosMin: 5,        // >= N casos
    emeraldConsistenciasMin: 3, // + >= N consistencias (Fase IV)
  },
  banner: {
    // Banner só liga se há >= 1 pessoa com qualquer critério abaixo
    contradicoesMin: 1,        // >= N contradições (Fase IV)
    casosMin: 3,               // >= N casos totais
    sameComarcaMin: 2,         // + >= N casos na mesma comarca
    maxItems: 3,               // máx. de pessoas listadas collapsed
    dismissDurationDays: 30,
  },
  peek: {
    delayMs: 250,              // delay antes de abrir peek
    fadeOutMs: 100,            // fade out on mouseleave
    showOnTouch: false,        // mobile vai direto pra sheet
  },
  staleness: {
    signalTTLSeconds: 300,     // cache client 5min
    cronHour: 3,               // refresh diário 03:00 local time
  },
} as const;
