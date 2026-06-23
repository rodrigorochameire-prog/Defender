// Config do módulo Atendimentos — labels, paletas e helpers compartilhados
// entre a página, o sheet de detalhe e o modal de criação/edição.
// Spec: docs/superpowers/specs/2026-06-11-atendimentos-modulo-design.md

import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

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
// Rótulos próprios do atendimento (texto estável). As CORES vêm da atribuição
// central (lib/config/atribuicoes) para padronizar com o resto do app — Criminal
// = rose, Cível/Família = orange. Mapa área→chave de atribuição:
const AREA_PARA_ATRIBUICAO: Record<string, string> = {
  CRIMINAL: "CRIMINAL",
  VIOLENCIA_DOMESTICA: "VVD",
  JURI: "JURI",
  EXECUCAO_PENAL: "EXECUCAO_PENAL",
  CIVEL: "CIVEL",
  FAMILIA: "FAMILIA",
  OUTRA: "all",
};

const AREA_META: Record<string, { label: string; shortLabel: string }> = {
  CRIMINAL: { label: "Criminal", shortLabel: "Crim." },
  VIOLENCIA_DOMESTICA: { label: "Violência Doméstica", shortLabel: "VVD" },
  JURI: { label: "Tribunal do Júri", shortLabel: "Júri" },
  EXECUCAO_PENAL: { label: "Execução Penal", shortLabel: "EP" },
  CIVEL: { label: "Cível", shortLabel: "Cível" },
  FAMILIA: { label: "Família", shortLabel: "Fam." },
  OUTRA: { label: "Outra", shortLabel: "Outra" },
};

export const AREA_CONFIG: Record<string, { label: string; shortLabel: string; badge: string; border: string }> =
  Object.fromEntries(
    Object.entries(AREA_META).map(([area, meta]) => {
      const c = getAtribuicaoColors(AREA_PARA_ATRIBUICAO[area]);
      return [area, { ...meta, badge: `${c.bgSolid} ${c.text}`, border: c.border }];
    }),
  );

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

/**
 * Link wa.me para o telefone do assistido. Normaliza dígitos e prefixa 55
 * (Brasil) quando o número vem sem código de país. Retorna null se não houver
 * um telefone discável (sem DDD).
 */
export function whatsappUrl(telefone: string | null | undefined, texto?: string): string | null {
  if (!telefone) return null;
  let digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${digits}${q}`;
}

/**
 * Área do atendimento → enum de atribuição VÁLIDO para demandas.createFromForm
 * (só estes 6 são aceitos; processo.atribuicao pode trazer enums fora dessa
 * lista, então mapeamos sempre pela área, que é determinística).
 */
export const AREA_TO_ATRIBUICAO_ENUM: Record<string, string> = {
  CRIMINAL: "SUBSTITUICAO",
  VIOLENCIA_DOMESTICA: "VVD_CAMACARI",
  JURI: "JURI_CAMACARI",
  EXECUCAO_PENAL: "EXECUCAO_PENAL",
  CIVEL: "SUBSTITUICAO_CIVEL",
  FAMILIA: "SUBSTITUICAO_CIVEL",
  OUTRA: "SUBSTITUICAO",
};

/**
 * Atribuições válidas para criar demanda (demandas.createFromForm só aceita estes
 * 6 enums). Usado pelo seletor do "Gerar demanda" — permite corrigir a atribuição
 * quando a área do atendimento não bate com a coluna correta no Kanban.
 * `atosLabel` aponta para o catálogo de atos (ATOS_POR_ATRIBUICAO) correspondente.
 */
export const ATRIBUICAO_DEMANDA_OPTIONS: { value: string; label: string; atosLabel: string }[] = [
  { value: "SUBSTITUICAO", label: "Criminal (Substituição)", atosLabel: "Criminal Geral" },
  { value: "JURI_CAMACARI", label: "Tribunal do Júri", atosLabel: "Tribunal do Júri" },
  { value: "GRUPO_JURI", label: "Grupo Especial do Júri", atosLabel: "Tribunal do Júri" },
  { value: "VVD_CAMACARI", label: "Violência Doméstica", atosLabel: "Violência Doméstica" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal", atosLabel: "Execução Penal" },
  { value: "SUBSTITUICAO_CIVEL", label: "Curadoria Especial", atosLabel: "Criminal Geral" },
];

/**
 * Área do atendimento → label do catálogo de atos (ATOS_POR_ATRIBUICAO).
 * CIVEL/FAMILIA/OUTRA não têm catálogo próprio → "Criminal Geral" (ato é livre).
 */
export const AREA_TO_ATOS_LABEL: Record<string, string> = {
  CRIMINAL: "Criminal Geral",
  VIOLENCIA_DOMESTICA: "Violência Doméstica",
  JURI: "Tribunal do Júri",
  EXECUCAO_PENAL: "Execução Penal",
  CIVEL: "Criminal Geral",
  FAMILIA: "Criminal Geral",
  OUTRA: "Criminal Geral",
};
