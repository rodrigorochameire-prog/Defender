/**
 * Catálogo dos feeds ICS — fonte única (espelha os calendários por atribuição
 * do Outlook institucional do defensor). Um feed = um calendário assinado.
 * Spec: docs/superpowers/specs/2026-06-11-ics-feeds-outlook-design.md
 */

export type FonteFeed = "audiencias" | "sessoes_juri" | "atendimentos" | "prazos";

export interface FeedICS {
  slug: string;
  /** Nome do calendário no Outlook (X-WR-CALNAME) */
  nome: string;
  fonte: FonteFeed;
  /** Para fonte=audiencias: atribuições do processo cobertas pelo feed */
  atribuicoes?: string[];
}

export const FEEDS_ICS: FeedICS[] = [
  {
    slug: "juri-audiencias",
    nome: "Vara do Júri (audiências)",
    fonte: "audiencias",
    atribuicoes: ["JURI_CAMACARI"],
  },
  {
    slug: "juri-plenario",
    nome: "Vara do Júri (Sessão de Julgamento)",
    fonte: "sessoes_juri",
  },
  {
    slug: "grupo-juri",
    nome: "Grupo especializado do Tribunal do Júri",
    fonte: "audiencias",
    atribuicoes: ["GRUPO_JURI"],
  },
  {
    slug: "vvd",
    nome: "Vara da Justiça pela Paz em Casa",
    fonte: "audiencias",
    atribuicoes: ["VVD_CAMACARI", "MUTIRAO_PROTEGE"],
  },
  {
    slug: "ep",
    nome: "Vara da Execução Penal de Camaçari",
    fonte: "audiencias",
    atribuicoes: ["EXECUCAO_PENAL"],
  },
  // Mapeamento provisório (banco não distingue automática×cumulativa; a
  // cumulação real é Dias d'Ávila/cível). Ajustar SÓ aqui quando a distinção
  // existir nos dados. Hoje: 0 audiências de substituição no banco.
  {
    slug: "substituicao-automatica",
    nome: "Vara – Substituição automática",
    fonte: "audiencias",
    atribuicoes: ["SUBSTITUICAO"],
  },
  {
    slug: "substituicao-cumulativa",
    nome: "Vara – Substituição cumulativa",
    fonte: "audiencias",
    atribuicoes: ["SUBSTITUICAO_CIVEL"],
  },
  { slug: "atendimentos", nome: "OMBUDS – Atendimentos", fonte: "atendimentos" },
  { slug: "prazos", nome: "OMBUDS – Prazos", fonte: "prazos" },
];

export function feedPorSlug(slug: string): FeedICS | null {
  return FEEDS_ICS.find((f) => f.slug === slug) ?? null;
}
