// Config do módulo Atendimentos — labels, paletas e helpers compartilhados
// entre a página, o sheet de detalhe e o modal de criação/edição.
// Spec: docs/superpowers/specs/2026-06-11-atendimentos-modulo-design.md

export interface DossieAtendimento {
  gerado_em?: string;
  fonte?: "ombuds" | "skill";
  objetivo?: string;
  resumo?: string[];
  situacao_processual?: Array<{
    cnj: string;
    area?: string | null;
    fase?: string | null;
    situacao?: string | null;
    proximo_evento?: string | null;
    observacao?: string | null;
  }>;
  alertas?: string[];
  medidas_vigentes?: string[];
  orientacoes?: string[];
  perguntas?: string[];
  documentos_solicitar?: string[];
  providencias?: string[];
  historico_relevante?: string[];
}

export interface AtendimentoListItem {
  id: number;
  assistidoId: number;
  processoId: number | null;
  demandaId: number | null;
  dataRegistro: Date | string;
  titulo: string | null;
  local: string | null;
  assunto: string | null;
  conteudo: string | null;
  status: string | null;
  numeroSolar: string | null;
  subtipo: string | null;
  area: string | null;
  pedido: string | null;
  anotacoesRecepcao: string | null;
  historicoSolar: { data: string; numero?: string; texto: string }[] | null;
  processosCitados: { cnj: string; processoId?: number; origem: string }[] | null;
  dossieAtendimento: DossieAtendimento | null;
  assistido: {
    id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    driveFolderId: string | null;
  } | null;
  processo: { id: number; numeroAutos: string | null; area: string | null; atribuicao: string | null } | null;
  autor: { id: number; name: string | null } | null;
}

/** Pasta do assistido no Google Drive. */
export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  agendado: {
    label: "Agendado",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  realizado: {
    label: "Realizado",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    badge: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

export const SUBTIPO_CONFIG: Record<string, { label: string; badge: string }> = {
  inicial: {
    label: "Inicial",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  retorno: {
    label: "Retorno",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
};

// Paleta por área alinhada ao padrão por atribuição (Júri=emerald, VVD=amber, EP=blue)
export const AREA_CONFIG: Record<string, { label: string; shortLabel: string; badge: string; border: string }> = {
  CRIMINAL: {
    label: "Criminal",
    shortLabel: "Crim.",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    border: "border-l-slate-500",
  },
  VIOLENCIA_DOMESTICA: {
    label: "Violência Doméstica",
    shortLabel: "VVD",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-l-amber-500",
  },
  JURI: {
    label: "Tribunal do Júri",
    shortLabel: "Júri",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "border-l-emerald-500",
  },
  EXECUCAO_PENAL: {
    label: "Execução Penal",
    shortLabel: "EP",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "border-l-blue-500",
  },
  CIVEL: {
    label: "Cível",
    shortLabel: "Cível",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    border: "border-l-purple-500",
  },
  FAMILIA: {
    label: "Família",
    shortLabel: "Fam.",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    border: "border-l-pink-500",
  },
  OUTRA: {
    label: "Outra",
    shortLabel: "Outra",
    badge: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    border: "border-l-neutral-400",
  },
};

export const SUBTIPO_OPTIONS = [
  { value: "inicial", label: "Inicial" },
  { value: "retorno", label: "Retorno" },
] as const;

export const AREA_OPTIONS = Object.entries(AREA_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

/** Consulta pública do PJe-TJBA com o CNJ pré-preenchido. */
export function pjeConsultaUrl(cnj: string): string {
  return `https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam?numeroProcesso=${encodeURIComponent(cnj)}`;
}
