/**
 * Action Registry — catálogo único e declarativo das skills jurídicas como
 * "ações de IA" do OMBUDS.
 *
 * Por quê: hoje cada skill é cabeada à mão em componentes/rotas diferentes
 * (analise.criarTask, /api/analyze, drive.ts, oficios.ts, substituicoes.ts,
 * instancia-superior.ts, rotas de áudio…). Isso espalha ~10 integrações por
 * telas distintas e dificulta descoberta. Este módulo é a FONTE ÚNICA DE
 * VERDADE: cada entrada descreve um uso (skill, onde aparece, que contexto
 * exige, como renderiza, status) e aponta `entryPoint` para onde já está
 * implementado. Serve de base para uma futura superfície de descoberta
 * unificada (ex.: paleta ⌘K / página "Ações de IA") SEM reescrever as
 * integrações existentes.
 *
 * `actionsFor`/`isEnabled` são lógica pura (sem React/DB) → testáveis.
 *
 * NOTA: `status: 'live'|'partial'` reflete o que JÁ existe (mapeado por
 * inventário do código em 2026-06-25). `planned` marca lacunas reais.
 * Ícones são nomes de ícones lucide (string) para manter o módulo sem deps.
 */

export type Surface =
  | "assistido"
  | "processo"
  | "caso"
  | "audiencia"
  | "depoente"
  | "registro"
  | "recurso"
  | "oficio"
  | "substituicao"
  | "drive"
  | "dashboard";

export type ContextKey =
  | "assistidoId"
  | "processoId"
  | "casoId"
  | "audienciaId"
  | "depoenteId"
  | "registroId"
  | "recursoId"
  | "acordaoId"
  | "oficioId"
  | "substituicaoId"
  | "driveFileId"
  | "audioDriveFileId"
  | "pergunta"
  | "acordaoTexto";

export type ResultKind =
  | "analise-blocks"
  | "qa-citacoes"
  | "analise-acordao"
  | "documento"
  | "oficio-score"
  | "transcricao"
  | "relatorio-md"
  | "radar"
  | "feedback";

export type Atribuicao =
  | "JURI_CAMACARI"
  | "VVD_CAMACARI"
  | "EXECUCAO_PENAL"
  | "SUBSTITUICAO"
  | "CRIMINAL_COMUM";

/** live = já acionável na UI; partial = existe mas pouco exposto; planned = lacuna. */
export type ActionStatus = "live" | "partial" | "planned";

export interface SkillAction {
  /** Identificador estável da ação (geralmente == skill). */
  id: string;
  /** Nome da skill enviada ao daemon (alias ou diretório). */
  skill: string;
  label: string;
  description: string;
  /** Nome do ícone lucide-react (resolvido na UI). */
  icon: string;
  /** Telas onde a ação faz sentido. */
  surfaces: Surface[];
  /** Contexto mínimo para habilitar a ação. */
  requires: ContextKey[];
  /** Se a ação pede input do usuário antes de disparar. */
  input?: "none" | "text" | "file";
  /** Como o resultado é renderizado. */
  result: ResultKind;
  /** Hint de roteamento de modelo (espelha src/lib/daemon/model-routing.mjs). */
  model?: "haiku" | "sonnet" | "opus";
  /** Restringe a ação a determinadas atribuições. */
  atribuicao?: Atribuicao[];
  /** Status de exposição na UI atual. */
  status: ActionStatus;
  /** Onde já está implementado hoje (file:line) ou nota — documentação. */
  entryPoint?: string;
}

export interface ActionContext {
  /** Surface atual (opcional; `actionsFor` recebe a surface explicitamente). */
  surface?: Surface;
  /** Valores de contexto disponíveis na tela atual. */
  available: Partial<Record<ContextKey, unknown>>;
  /** Atribuição do processo/caso em foco, se houver. */
  atribuicao?: Atribuicao;
}

/**
 * Catálogo. Reflete o inventário real (2026-06-25). Adicionar um uso novo =
 * mais uma entrada aqui.
 */
export const SKILL_ACTIONS: SkillAction[] = [
  // ── Análise do caso/autos ────────────────────────────────────────────────
  {
    id: "analise-autos",
    skill: "analise-autos",
    label: "Analisar autos",
    description: "Análise estratégica completa do caso (teses, contradições, nulidades).",
    icon: "Brain",
    surfaces: ["assistido", "processo", "caso"],
    requires: ["assistidoId"],
    input: "none",
    result: "analise-blocks",
    status: "live",
    entryPoint: "CaseSummaryCard.tsx; agenda/sheet/analyze-cta.tsx; /api/analyze",
  },
  {
    id: "analise-assistido",
    skill: "analise-assistido",
    label: "Analisar assistido",
    description: "Visão consolidada do assistido a partir dos processos vinculados.",
    icon: "UserSearch",
    surfaces: ["assistido"],
    requires: ["assistidoId"],
    input: "none",
    result: "analise-blocks",
    status: "live",
    entryPoint: "assistidos/[id]/_components/analise-button.tsx:55",
  },
  {
    id: "preparar-atendimentos",
    skill: "preparar-atendimentos",
    label: "Preparar atendimento",
    description: "Dossiê do atendimento: contexto, pendências e roteiro.",
    icon: "ClipboardList",
    surfaces: ["registro"],
    requires: ["registroId"],
    input: "none",
    result: "analise-blocks",
    status: "live",
    entryPoint: "trpc/routers/registros.ts:1345 (prepararAtendimento)",
  },

  // ── Pergunte aos autos ───────────────────────────────────────────────────
  {
    id: "pergunte-ao-auto",
    skill: "pergunte-ao-auto",
    label: "Pergunte aos autos",
    description: "Pergunta livre sobre o PDF do processo, com citação de página.",
    icon: "MessageCircleQuestion",
    surfaces: ["drive", "processo"],
    requires: ["driveFileId", "pergunta"],
    input: "text",
    result: "qa-citacoes",
    model: "sonnet",
    status: "live",
    entryPoint: "trpc/routers/drive.ts:6115; components/drive/PerguntarAoAutoPanel.tsx",
  },

  // ── Recursos / instância superior ────────────────────────────────────────
  {
    id: "analise-acordao",
    skill: "analise-acordao",
    label: "Analisar acórdão",
    description: "Teses acolhidas/rejeitadas e ganchos recursais sob a ótica da defesa.",
    icon: "Scale",
    surfaces: ["recurso"],
    requires: ["acordaoId"],
    input: "none",
    result: "analise-acordao",
    status: "live",
    entryPoint: "trpc/routers/instancia-superior.ts:449 (analisarAcordaoIA)",
  },

  // ── Ofícios ──────────────────────────────────────────────────────────────
  {
    id: "oficio-redacao",
    skill: "oficio-redacao",
    label: "Redigir/revisar ofício",
    description: "Gera o corpo do ofício ou revisa com score e sugestões.",
    icon: "PenLine",
    surfaces: ["oficio"],
    requires: ["oficioId"],
    input: "none",
    result: "oficio-score",
    status: "partial",
    entryPoint: "trpc/routers/oficios.ts:1988 (tarefaRedacao)",
  },
  {
    id: "oficio-gratificacao",
    skill: "oficio-gratificacao",
    label: "Ofício de substituição",
    description: "Gera ofício + relatório de atividades para pagamento de substituição.",
    icon: "FileBadge",
    surfaces: ["substituicao", "dashboard"],
    requires: ["substituicaoId"],
    input: "none",
    result: "documento",
    status: "partial",
    entryPoint: "trpc/routers/substituicoes.ts:144 (gerarGratificacao)",
  },

  // ── Transcrições de mídia ────────────────────────────────────────────────
  {
    id: "transcrever-audiencia",
    skill: "transcrever-audiencia",
    label: "Transcrever audiência",
    description: "Transcreve o áudio/vídeo da audiência e estrutura ata + minuta.",
    icon: "Mic",
    surfaces: ["audiencia"],
    requires: ["audienciaId", "audioDriveFileId"],
    input: "file",
    result: "transcricao",
    status: "partial",
    entryPoint: "app/api/audiencias/[id]/audio/route.ts:115",
  },
  {
    id: "transcrever-depoimento",
    skill: "transcrever-depoimento",
    label: "Transcrever depoimento",
    description: "Transcreve o depoimento de uma testemunha com segmentos por tempo.",
    icon: "Mic",
    surfaces: ["depoente"],
    requires: ["depoenteId", "audioDriveFileId"],
    input: "file",
    result: "transcricao",
    status: "partial",
    entryPoint: "app/api/depoentes/[id]/audio/route.ts:140",
  },
  {
    id: "transcrever-atendimento",
    skill: "transcrever-atendimento",
    label: "Transcrever atendimento",
    description: "Transcreve o áudio do atendimento e grava no registro.",
    icon: "Mic",
    surfaces: ["registro"],
    requires: ["registroId", "audioDriveFileId"],
    input: "file",
    result: "transcricao",
    status: "partial",
    entryPoint: "app/api/registros/[id]/audio/route.ts:105",
  },

  // ── Lacunas reais (planned) — pedidas pelo Defensor, ainda não existem ────
  {
    id: "investigar-fato",
    skill: "investigar-fato",
    label: "Investigar o fato (redes abertas)",
    description:
      "Busca OSINT sobre o fato da denúncia em fontes abertas e gera relatório. " +
      "Resultados são INDÍCIOS a verificar, nunca fatos.",
    icon: "Radar",
    surfaces: ["processo", "caso"],
    requires: ["processoId"],
    input: "none",
    result: "relatorio-md",
    status: "planned",
    entryPoint: "NÃO EXISTE — skill nova; precisa decisão de abordagem/privacidade",
  },
  {
    id: "perguntas-dinamicas",
    skill: "preparar-audiencia",
    label: "Formular perguntas (estado do caso)",
    description:
      "Gera perguntas estratégicas a partir do estado atual do caso (provas, denúncia, insights).",
    icon: "ListChecks",
    surfaces: ["processo", "audiencia"],
    requires: ["processoId"],
    input: "none",
    result: "analise-blocks",
    status: "planned",
    entryPoint: "Parcial via preparar-audiencia; falta gatilho dedicado/dinâmico",
  },
  {
    id: "radar-noticias",
    skill: "noticias",
    label: "Radar de notícias",
    description: "Curadoria diária: radar criminal Camaçari + jurisprudência nacional.",
    icon: "Newspaper",
    surfaces: ["dashboard"],
    requires: [],
    input: "none",
    result: "radar",
    status: "planned",
    entryPoint: "Skill existe; sem widget de UI",
  },
];

/**
 * `true` se todo contexto exigido está presente e a restrição de atribuição
 * (se houver) é satisfeita. Conservador: ação restrita a atribuições NÃO
 * habilita quando o contexto não informa a atribuição.
 */
export function isEnabled(action: SkillAction, context: ActionContext): boolean {
  for (const key of action.requires) {
    if (context.available[key] == null) return false;
  }
  if (action.atribuicao && action.atribuicao.length > 0) {
    if (!context.atribuicao) return false;
    if (!action.atribuicao.includes(context.atribuicao)) return false;
  }
  return true;
}

/**
 * Ações habilitadas para uma surface dado o contexto. Filtra por surface,
 * contexto exigido e atribuição. Não muta o catálogo.
 */
export function actionsFor(surface: Surface, context: ActionContext): SkillAction[] {
  return SKILL_ACTIONS.filter(
    (a) => a.surfaces.includes(surface) && isEnabled(a, context),
  );
}

/** Busca uma ação por id. */
export function actionById(id: string): SkillAction | undefined {
  return SKILL_ACTIONS.find((a) => a.id === id);
}

/** Todas as ações de uma surface, ignorando contexto (para catálogo/descoberta). */
export function catalogForSurface(surface: Surface): SkillAction[] {
  return SKILL_ACTIONS.filter((a) => a.surfaces.includes(surface));
}
