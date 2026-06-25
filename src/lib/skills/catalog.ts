/**
 * Catálogo de skills jurídicas expostas na interface do OMBUDS.
 *
 * Fonte única de verdade da UI para "quais skills o Defensor pode disparar".
 * Cada `slug` é executado pelo daemon (`scripts/claude-code-daemon.mjs` → `claude -p`
 * no login Max, custo zero) e DEVE resolver a um diretório real em
 * `.claude/skills-cowork/` ou a uma chave em `SKILL_ALIASES.json`
 * (garantido pelo teste `catalog-resolves.test.ts`).
 *
 * Distinto do `Skill` de `types.ts` (skills de navegação/painel do command palette):
 * aqui só moram skills que produzem análise/peça/documento via daemon.
 */

/** Valores do `atribuicaoEnum` (src/lib/db/schema/enums.ts). */
export type Atribuicao =
  | "JURI_CAMACARI"
  | "VVD_CAMACARI"
  | "EXECUCAO_PENAL"
  | "SUBSTITUICAO"
  | "SUBSTITUICAO_CIVEL"
  | "GRUPO_JURI"
  | "MUTIRAO_PROTEGE"
  | "CRIMINAL_CAMACARI"
  | "CRIMINAL_SIMOES_FILHO"
  | "CRIMINAL_LAURO_DE_FREITAS"
  | "CRIMINAL_CANDEIAS"
  | "CRIMINAL_ITAPARICA"
  | "CRIMINAL_2_GRAU_SALVADOR";

/** Família temática usada para filtrar skills por atribuição. */
export type SkillFamilia = "JURI" | "VVD" | "EXECUCAO_PENAL" | "CRIMINAL" | "ANY";

/** Entidade do OMBUDS sobre a qual a skill opera. */
export type SkillEntity = "processo" | "assistido" | "caso";

export type SkillCategoria =
  | "analise"
  | "peca"
  | "preparacao"
  | "revisao"
  | "transcricao"
  | "consulta";

export interface CatalogSkill {
  /** Slug do daemon (chave em SKILL_ALIASES.json ou diretório de skill). */
  slug: string;
  label: string;
  description: string;
  /** Nome do ícone Lucide (string — resolvido no componente). */
  icon: string;
  /** Entidades onde a skill faz sentido. */
  appliesTo: SkillEntity[];
  /** Famílias temáticas; `ANY` = sempre disponível. */
  familias: SkillFamilia[];
  category: SkillCategoria;
  /** Ordem dentro da categoria (ascendente). */
  order: number;
}

/** Ordem de exibição das categorias na UI. */
export const CATEGORIA_ORDER: Record<SkillCategoria, number> = {
  analise: 0,
  peca: 1,
  preparacao: 2,
  revisao: 3,
  transcricao: 4,
  consulta: 5,
};

export const CATEGORIA_LABEL: Record<SkillCategoria, string> = {
  analise: "Análise",
  peca: "Peças",
  preparacao: "Preparação",
  revisao: "Revisão",
  transcricao: "Transcrição",
  consulta: "Consulta",
};

/**
 * Mapeia uma atribuição real (enum) para as famílias temáticas que ela cobre.
 * Cível não cobre nenhuma família penal (retorna []).
 */
export function familiaDeAtribuicao(
  atribuicao: Atribuicao,
): Exclude<SkillFamilia, "ANY">[] {
  switch (atribuicao) {
    case "JURI_CAMACARI":
      return ["JURI", "CRIMINAL"];
    case "GRUPO_JURI":
      return ["JURI"];
    case "VVD_CAMACARI":
    case "MUTIRAO_PROTEGE":
      return ["VVD"];
    case "EXECUCAO_PENAL":
      return ["EXECUCAO_PENAL"];
    case "SUBSTITUICAO":
    case "CRIMINAL_CAMACARI":
    case "CRIMINAL_SIMOES_FILHO":
    case "CRIMINAL_LAURO_DE_FREITAS":
    case "CRIMINAL_2_GRAU_SALVADOR":
      return ["CRIMINAL"];
    case "CRIMINAL_CANDEIAS":
      return ["CRIMINAL", "JURI"];
    case "CRIMINAL_ITAPARICA":
      return ["CRIMINAL", "JURI", "EXECUCAO_PENAL"];
    case "SUBSTITUICAO_CIVEL":
      return [];
    default: {
      // Exhaustiveness guard — novo valor do enum força revisão aqui.
      const _never: never = atribuicao;
      return _never;
    }
  }
}

/** Famílias penais (qualquer atuação criminal). */
const PENAIS: SkillFamilia[] = ["JURI", "VVD", "EXECUCAO_PENAL", "CRIMINAL"];

/**
 * Catálogo. Slugs verificados contra `.claude/skills-cowork/` em
 * `catalog-resolves.test.ts`.
 */
export const SKILL_CATALOG: CatalogSkill[] = [
  {
    slug: "analise-audiencias",
    label: "Análise estratégica dos autos",
    description:
      "Lê os autos e produz a análise estratégica (teses, provas, riscos) no padrão DPE-BA.",
    icon: "ScanSearch",
    appliesTo: ["processo", "caso"],
    familias: PENAIS,
    category: "analise",
    order: 0,
  },
  {
    slug: "juri",
    label: "Estratégia do Júri",
    description:
      "Análise e estratégia para o Tribunal do Júri (pronúncia, plenário, quesitos, diligências 422).",
    icon: "Scale",
    appliesTo: ["processo", "caso"],
    familias: ["JURI"],
    category: "analise",
    order: 1,
  },
  {
    slug: "vvd",
    label: "Análise VVD / Maria da Penha",
    description:
      "Análise de violência doméstica: MPU, Lei 11.340/06, uso instrumental, FONAVID.",
    icon: "ShieldAlert",
    appliesTo: ["processo", "caso"],
    familias: ["VVD"],
    category: "analise",
    order: 2,
  },
  {
    slug: "criminal-comum",
    label: "Análise criminal",
    description:
      "Análise de crimes comuns (tráfico, roubo, furto, porte, receptação): HC, RA, apelação.",
    icon: "Gavel",
    appliesTo: ["processo", "caso"],
    familias: ["CRIMINAL"],
    category: "analise",
    order: 3,
  },
  {
    slug: "execucao-penal",
    label: "Análise de execução penal",
    description:
      "Progressão de regime, livramento condicional, saída temporária, remição (LEP).",
    icon: "DoorOpen",
    appliesTo: ["processo", "caso"],
    familias: ["EXECUCAO_PENAL"],
    category: "analise",
    order: 4,
  },
  {
    slug: "analise-acordao",
    label: "Analisar acórdão",
    description: "Lê o acórdão e extrai a ratio, teses vencidas e cabimento recursal.",
    icon: "FileSearch",
    appliesTo: ["processo"],
    familias: ["CRIMINAL", "JURI"],
    category: "analise",
    order: 5,
  },
  {
    slug: "dpe-ba-pecas",
    label: "Gerar peça (DPE-BA)",
    description:
      "Gera minuta de peça no formato institucional DPE-BA a partir do contexto dos autos.",
    icon: "FileText",
    appliesTo: ["processo", "caso"],
    familias: PENAIS,
    category: "peca",
    order: 0,
  },
  {
    slug: "preparar-audiencias",
    label: "Preparar audiência",
    description:
      "Monta o dossiê de preparação da audiência: painel de depoentes, pontos e estratégia.",
    icon: "CalendarClock",
    appliesTo: ["processo"],
    familias: PENAIS,
    category: "preparacao",
    order: 0,
  },
  {
    slug: "revisar-minutas",
    label: "Revisar minuta",
    description:
      "Revisa a minuta do(a) estagiário(a) por rubrica de 9 dimensões, preservando o estilo.",
    icon: "PenLine",
    appliesTo: ["processo", "caso"],
    familias: ["ANY"],
    category: "revisao",
    order: 0,
  },
  {
    slug: "transcrever-audiencia",
    label: "Transcrever audiência",
    description: "Transcreve a mídia da audiência (PJe Mídias) em texto navegável.",
    icon: "AudioLines",
    appliesTo: ["processo"],
    familias: ["ANY"],
    category: "transcricao",
    order: 0,
  },
  {
    slug: "transcrever-depoimento",
    label: "Transcrever depoimento",
    description: "Transcreve o depoimento/testemunho com marcação de quem fala.",
    icon: "Mic",
    appliesTo: ["processo"],
    familias: ["ANY"],
    category: "transcricao",
    order: 1,
  },
  {
    slug: "transcrever-atendimento",
    label: "Transcrever atendimento",
    description: "Transcreve o atendimento ao(à) assistido(a) (áudio → texto).",
    icon: "MessageSquareText",
    appliesTo: ["assistido"],
    familias: ["ANY"],
    category: "transcricao",
    order: 2,
  },
  {
    slug: "pergunte-ao-auto",
    label: "Pergunte aos autos",
    description: "Faz perguntas em linguagem natural e responde com base nos autos.",
    icon: "MessageCircleQuestion",
    appliesTo: ["processo"],
    familias: ["ANY"],
    category: "consulta",
    order: 0,
  },
];

export interface SkillContext {
  entity: SkillEntity;
  atribuicao: Atribuicao;
}

function familiaMatch(skill: CatalogSkill, atribuicao: Atribuicao): boolean {
  if (skill.familias.includes("ANY")) return true;
  const familias = familiaDeAtribuicao(atribuicao);
  return skill.familias.some((f) => familias.includes(f as never));
}

/**
 * Retorna as skills aplicáveis ao contexto, ordenadas de forma determinística
 * por (ordem da categoria, ordem interna, slug).
 */
export function skillsForContext(ctx: SkillContext): CatalogSkill[] {
  return SKILL_CATALOG.filter(
    (s) =>
      s.appliesTo.includes(ctx.entity) && familiaMatch(s, ctx.atribuicao),
  ).sort((a, b) => {
    const byCat = CATEGORIA_ORDER[a.category] - CATEGORIA_ORDER[b.category];
    if (byCat !== 0) return byCat;
    if (a.order !== b.order) return a.order - b.order;
    return a.slug.localeCompare(b.slug);
  });
}
