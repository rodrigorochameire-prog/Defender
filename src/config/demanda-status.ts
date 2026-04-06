import React from "react";
import {
  AlertCircle,
  ClipboardList,
  FileSearch,
  User,
  Search,
  Eye,
  Edit,
  FileCheck,
  Send,
  Users,
  Inbox,
  FileText,
  CheckCircle2,
  FolderOpen,
  Scale,
  XCircle,
  Flame,
  Activity,
  Mail,
  Archive,
  Clock,
  UserPlus,
} from "lucide-react";

// ==========================================
// TIPOS
// ==========================================

/** Colunas principais do Kanban (4) */
export type KanbanColumn = "triagem" | "em_andamento" | "concluida" | "arquivado";

/** Sub-grupos dentro de "Em Andamento" (3) */
export type EmAndamentoSubGroup = "preparacao" | "diligencias" | "saida";

/** Todos os grupos de status (granular) */
export type StatusGroup =
  | "triagem"
  | "preparacao"
  | "diligencias"
  | "saida"
  | "concluida"
  | "arquivado";

/** Flags de status (overlays, não colunas) */
export type StatusFlag = "urgente" | "aguardando";

// ==========================================
// CONFIGURAÇÃO DAS COLUNAS KANBAN
// ==========================================

export interface KanbanColumnConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  subGroups?: EmAndamentoSubGroup[];
}

export const KANBAN_COLUMNS: Record<KanbanColumn, KanbanColumnConfig> = {
  triagem: {
    label: "Triagem",
    color: "#A1A1AA",
    icon: Inbox,
  },
  em_andamento: {
    label: "Em Andamento",
    color: "#E8C87A",
    icon: Activity,
    subGroups: ["preparacao", "diligencias", "saida"],
  },
  concluida: {
    label: "Concluída",
    color: "#84CC9B",
    icon: CheckCircle2,
  },
  arquivado: {
    label: "Arquivado",
    color: "#71717A",
    icon: Archive,
  },
};

// ==========================================
// SUB-GRUPOS (dentro de Em Andamento)
// ==========================================

export interface SubGroupConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_GROUPS: Record<EmAndamentoSubGroup, SubGroupConfig> = {
  preparacao: {
    label: "Preparação",
    color: "#E8C87A",   // Amber pastel
    icon: Activity,
  },
  diligencias: {
    label: "Diligências",
    color: "#8DB4D2",   // Azul pastel
    icon: FileText,
  },
  saida: {
    label: "Saída",
    color: "#D4A574",   // Laranja pastel
    icon: Send,
  },
};

/** Seções visuais dentro de cada sub-grupo (para o Kanban expandido) */
export const SUB_GROUP_SECTIONS: Partial<Record<EmAndamentoSubGroup, Array<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: string[];
}>>> = {
  preparacao: [
    { label: "Analisar", icon: FileSearch, statuses: ["analisar"] },
    { label: "Elaborar", icon: Edit, statuses: ["elaborar", "elaborando"] },
    { label: "Relatório", icon: ClipboardList, statuses: ["relatorio"] },
    { label: "Monitorar", icon: Eye, statuses: ["monitorar"] },
    { label: "Revisar", icon: FileCheck, statuses: ["revisar", "revisando"] },
  ],
  diligencias: [
    { label: "Atender", icon: User, statuses: ["atender"] },
    { label: "Buscar", icon: Search, statuses: ["buscar"] },
    { label: "Diligenciar", icon: FileText, statuses: ["diligenciar"] },
    { label: "Investigar", icon: Eye, statuses: ["investigar"] },
    { label: "Documentos", icon: FileText, statuses: ["documentos"] },
    { label: "Testemunhas", icon: Users, statuses: ["testemunhas"] },
    { label: "Oficiar", icon: Mail, statuses: ["oficiar"] },
  ],
  saida: [
    { label: "Protocolar", icon: Send, statuses: ["protocolar"] },
    { label: "Delegação", icon: UserPlus, statuses: ["emilly", "amanda", "taissa"] },
  ],
};

// ==========================================
// STATUS_GROUPS (todos os grupos — incluindo sub-grupos)
// ==========================================

export const STATUS_GROUPS: Record<StatusGroup, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  triagem: {
    label: "Triagem",
    color: "#A1A1AA",  // Cinza neutro
    icon: Inbox,
  },
  preparacao: {
    label: "Preparação",
    color: "#E8C87A",  // Amber pastel
    icon: Activity,
  },
  diligencias: {
    label: "Diligências",
    color: "#8DB4D2",  // Azul pastel
    icon: FileText,
  },
  saida: {
    label: "Saída",
    color: "#D4A574",  // Laranja pastel
    icon: Send,
  },
  concluida: {
    label: "Concluída",
    color: "#84CC9B",  // Verde pastel
    icon: CheckCircle2,
  },
  arquivado: {
    label: "Arquivado",
    color: "#71717A",  // Cinza escuro
    icon: Archive,
  },
};

// ==========================================
// FLAGS
// ==========================================

export const STATUS_FLAGS: Record<StatusFlag, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  urgente: {
    label: "Urgente",
    color: "#D4A4A4",  // Rosa/vermelho pastel
    icon: Flame,
  },
  aguardando: {
    label: "Aguardando",
    color: "#B8A4C9",  // Roxo pastel
    icon: Clock,
  },
};

// ==========================================
// MAPEAMENTO: StatusGroup → KanbanColumn
// ==========================================

export const GROUP_TO_COLUMN: Record<StatusGroup, KanbanColumn> = {
  triagem: "triagem",
  preparacao: "em_andamento",
  diligencias: "em_andamento",
  saida: "em_andamento",
  concluida: "concluida",
  arquivado: "arquivado",
};

// ==========================================
// INDIVIDUAL STATUS DEFINITIONS
// ==========================================

export interface StatusConfig {
  label: string;
  group: StatusGroup;
  icon: React.ComponentType<{ className?: string }>;
}

export const DEMANDA_STATUS: Record<string, StatusConfig> = {
  // === TRIAGEM (2) ===
  fila:     { label: "Fila",     group: "triagem", icon: Inbox },
  urgente:  { label: "Urgente",  group: "triagem", icon: AlertCircle },

  // === PREPARAÇÃO (7) — 3 seções: Elaborar, Monitorar, Revisar ===
  elaborar:   { label: "Elaborar",   group: "preparacao", icon: Edit },
  elaborando: { label: "Elaborando", group: "preparacao", icon: Edit },
  analisar:   { label: "Analisar",   group: "preparacao", icon: FileSearch },
  relatorio:  { label: "Relatório",  group: "preparacao", icon: ClipboardList },
  revisar:    { label: "Revisar",    group: "preparacao", icon: FileCheck },
  revisando:  { label: "Revisando",  group: "preparacao", icon: FileCheck },

  // === DILIGÊNCIAS (7) ===
  atender:     { label: "Atender",     group: "diligencias", icon: User },
  documentos:  { label: "Documentos",  group: "diligencias", icon: FileText },
  testemunhas: { label: "Testemunhas", group: "diligencias", icon: Users },
  investigar:  { label: "Investigar",  group: "diligencias", icon: Eye },
  buscar:      { label: "Buscar",      group: "diligencias", icon: Search },
  diligenciar: { label: "Diligenciar", group: "diligencias", icon: FileText },
  oficiar:     { label: "Oficiar",     group: "diligencias", icon: Mail },

  // === SAÍDA (4) — 2 seções: Protocolar, Delegação ===
  protocolar: { label: "Protocolar", group: "saida", icon: Send },
  emilly:     { label: "Emilly",     group: "saida", icon: UserPlus },
  amanda:     { label: "Amanda",     group: "saida", icon: UserPlus },
  taissa:     { label: "Taissa",     group: "saida", icon: UserPlus },

  // Monitorar fica em Preparação (acompanhamento ativo)
  monitorar:  { label: "Monitorar",  group: "preparacao", icon: Eye },

  // === CONCLUÍDA (5) ===
  protocolado:        { label: "Protocolado",        group: "concluida", icon: CheckCircle2 },
  ciencia:            { label: "Ciência",            group: "concluida", icon: Eye },
  resolvido:          { label: "Resolvido",          group: "concluida", icon: CheckCircle2 },
  constituiu_advogado: { label: "Constituiu advogado", group: "concluida", icon: Scale },
  sem_atuacao:        { label: "Sem atuação",        group: "concluida", icon: XCircle },

  // === ARQUIVADO (1) ===
  arquivado: { label: "Arquivado", group: "arquivado", icon: Archive },
};

// ==========================================
// STATUS DO DB → SUBSTATUS FRONTEND
// ==========================================

/** Mapeamento do status DB enum para o grupo frontend */
export function mapDbStatusToGroup(dbStatus: string | null | undefined, substatus: string | null | undefined): StatusGroup {
  if (!dbStatus) return "triagem";

  const s = dbStatus.toUpperCase();

  // Concluída
  if (s === "7_PROTOCOLADO" || s === "7_CIENCIA" || s === "7_SEM_ATUACAO" || s === "CONCLUIDO") {
    return "concluida";
  }
  // Arquivado
  if (s === "ARQUIVADO") {
    return "arquivado";
  }
  // Se tem substatus, usa o substatus para determinar grupo
  if (substatus) {
    // Remove prefixo numérico ("2 - Analisar" → "Analisar", "6 - Documentos" → "Documentos")
    const withoutPrefix = substatus.replace(/^\d+\s*-\s*/, "");
    // Normaliza: lowercase, espaços→underscore, remove acentos
    const normalized = withoutPrefix
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");
    const config = DEMANDA_STATUS[normalized];
    if (config) return config.group;
  }
  // Urgente
  if (s === "URGENTE") return "triagem";
  // Fila → triagem, Atender sem substatus → diligências, Monitorar → monitorar
  if (s === "5_FILA") return "triagem";
  if (s === "2_ATENDER") return "diligencias";
  if (s === "4_MONITORAR") return "preparacao";

  return "triagem";
}

/** Retorna a coluna Kanban para uma demanda */
export function getKanbanColumn(dbStatus: string | null | undefined, substatus: string | null | undefined): KanbanColumn {
  const group = mapDbStatusToGroup(dbStatus, substatus);
  return GROUP_TO_COLUMN[group];
}

// ==========================================
// HELPERS — BACKWARDS COMPATIBLE
// ==========================================

/** Status do DB que indicam demanda concluída — excluir de contagem de prazos */
export const STATUS_CONCLUIDOS = [
  "CONCLUIDO", "ARQUIVADO", "7_PROTOCOLADO", "7_CIENCIA", "7_SEM_ATUACAO",
] as const;

/** Verifica se um status de demanda é considerado concluído */
export function isStatusConcluido(status: string | null | undefined): boolean {
  if (!status) return false;
  return (STATUS_CONCLUIDOS as readonly string[]).includes(status);
}

/** Retorna configuração de um status individual (por substatus ou status DB) */
export function getStatusConfig(status: string | null | undefined): StatusConfig & { color: string } {
  // Fallback para status vazio
  if (!status) {
    return {
      label: "Pendente",
      group: "triagem" as StatusGroup,
      icon: Inbox,
      color: STATUS_GROUPS.triagem.color,
    };
  }

  // Remove prefixo numérico ("2 - Elaborar" → "Elaborar") e normaliza
  const withoutPrefix = status.replace(/^\d+\s*-\s*/, "");
  const normalizedStatus = withoutPrefix.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

  // Tenta achar no mapa de status individuais
  const config = DEMANDA_STATUS[normalizedStatus];
  if (config) {
    return {
      ...config,
      color: STATUS_GROUPS[config.group].color,
    };
  }

  // Mapeamento de status DB antigos para novos grupos
  const dbMap: Record<string, StatusConfig> = {
    "5_fila":         { label: "Fila",         group: "triagem",      icon: Inbox },
    "2_atender":      { label: "Atender",      group: "diligencias",  icon: User },
    "4_monitorar":    { label: "Monitorar",    group: "preparacao",   icon: Eye },
    "7_protocolado":  { label: "Protocolado",  group: "concluida", icon: CheckCircle2 },
    "7_ciencia":      { label: "Ciência",      group: "concluida", icon: Eye },
    "7_sem_atuacao":  { label: "Sem atuação",  group: "concluida", icon: XCircle },
    "concluido":      { label: "Concluído",    group: "concluida", icon: CheckCircle2 },
    "arquivado":      { label: "Arquivado",    group: "arquivado", icon: Archive },
  };

  const dbConfig = dbMap[normalizedStatus];
  if (dbConfig) {
    return {
      ...dbConfig,
      color: STATUS_GROUPS[dbConfig.group].color,
    };
  }

  // Fallback — grupo triagem
  return {
    label: status,
    group: "triagem" as StatusGroup,
    icon: Inbox,
    color: STATUS_GROUPS.triagem.color,
  };
}

// ==========================================
// STATUS OPTIONS (para selects e dropdowns)
// ==========================================

export const STATUS_OPTIONS_BY_COLUMN: Record<KanbanColumn, Array<{ value: string; label: string; group: StatusGroup }>> = {
  triagem: [
    { value: "fila", label: "Fila", group: "triagem" },
  ],
  em_andamento: [
    // Preparação — Elaborar
    { value: "elaborar", label: "Elaborar", group: "preparacao" },
    { value: "elaborando", label: "Elaborando", group: "preparacao" },
    { value: "analisar", label: "Analisar", group: "preparacao" },
    { value: "relatorio", label: "Relatório", group: "preparacao" },
    // Preparação — Monitorar
    { value: "monitorar", label: "Monitorar", group: "preparacao" },
    // Preparação — Revisar
    { value: "revisar", label: "Revisar", group: "preparacao" },
    { value: "revisando", label: "Revisando", group: "preparacao" },
    // Diligências
    { value: "atender", label: "Atender", group: "diligencias" },
    { value: "documentos", label: "Documentos", group: "diligencias" },
    { value: "testemunhas", label: "Testemunhas", group: "diligencias" },
    { value: "investigar", label: "Investigar", group: "diligencias" },
    { value: "buscar", label: "Buscar", group: "diligencias" },
    { value: "diligenciar", label: "Diligenciar", group: "diligencias" },
    { value: "oficiar", label: "Oficiar", group: "diligencias" },
    // Saída — Protocolar
    { value: "protocolar", label: "Protocolar", group: "saida" },
    // Saída — Delegação
    { value: "emilly", label: "Emilly", group: "saida" },
    { value: "amanda", label: "Amanda", group: "saida" },
    { value: "taissa", label: "Taissa", group: "saida" },
  ],
  concluida: [
    { value: "protocolado", label: "Protocolado", group: "concluida" },
    { value: "ciencia", label: "Ciência", group: "concluida" },
    { value: "resolvido", label: "Resolvido", group: "concluida" },
    { value: "constituiu_advogado", label: "Constituiu advogado", group: "concluida" },
    { value: "sem_atuacao", label: "Sem atuação", group: "concluida" },
  ],
  arquivado: [
    { value: "arquivado", label: "Arquivado", group: "arquivado" },
  ],
};

/** Flat list of all status options for dropdowns */
export const ALL_STATUS_OPTIONS = Object.values(STATUS_OPTIONS_BY_COLUMN).flat();

// ==========================================
// PIPELINE STAGES (para progress bar / selector)
// ==========================================

export const PIPELINE_STAGES: { key: StatusGroup; label: string; short: string }[] = [
  { key: "triagem", label: "Triagem", short: "Triagem" },
  { key: "preparacao", label: "Preparação", short: "Prep." },
  { key: "diligencias", label: "Diligências", short: "Dilig." },
  { key: "saida", label: "Saída", short: "Saída" },
  { key: "concluida", label: "Concluída", short: "Concl." },
];

/** Retorna o índice do estágio para um grupo */
export function getStageIndex(group: StatusGroup): number {
  if (group === "arquivado") return PIPELINE_STAGES.length - 1;
  return PIPELINE_STAGES.findIndex(s => s.key === group);
}

// ==========================================
// UI_STATUS_TO_DB (mapeamento granular → DB enum)
// ==========================================

export const UI_STATUS_TO_DB: Record<string, string> = {
  "fila": "5_FILA",
  "atender": "2_ATENDER",
  "analisar": "2_ATENDER",
  "elaborar": "2_ATENDER",
  "elaborando": "2_ATENDER",
  "buscar": "2_ATENDER",
  "diligenciar": "2_ATENDER",
  "revisar": "2_ATENDER",
  "revisando": "2_ATENDER",
  "relatorio": "2_ATENDER",
  "documentos": "2_ATENDER",
  "testemunhas": "2_ATENDER",
  "investigar": "2_ATENDER",
  "oficiar": "2_ATENDER",
  "monitorar": "4_MONITORAR",
  "protocolar": "5_FILA",
  "protocolado": "7_PROTOCOLADO",
  "ciencia": "7_CIENCIA",
  "sem_atuacao": "7_SEM_ATUACAO",
  "constituiu_advogado": "CONCLUIDO",
  "urgente": "URGENTE",
  "resolvido": "CONCLUIDO",
  "arquivado": "ARQUIVADO",
};
