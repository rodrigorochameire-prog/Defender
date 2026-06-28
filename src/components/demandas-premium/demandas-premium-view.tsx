// @ts-nocheck
"use client";

import { cn } from "@/lib/utils";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { HeaderSlotTitle } from "@/components/layouts/header-slot-title";
import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
import { AudienciaConfirmModal, type AudienciaConfirmData } from "@/components/demandas-premium/audiencia-confirm-modal";
import { isAtoAudiencia } from "@/lib/audiencia-parser";
import { usePermissions } from "@/hooks/use-permissions";
import { RecursoConfirmModal, type RecursoConfirmData } from "@/components/demandas-premium/recurso-confirm-modal";
import { isAtoRecurso, infoDoAtoRecurso, type TipoRecurso } from "@/lib/recurso-helpers";
import { ConfigModal } from "@/components/demandas-premium/config-modal";
import { FilterSectionsCompact } from "@/components/demandas-premium/filter-sections-compact";
import { InfographicSelector } from "@/components/demandas-premium/infographic-selector";
import { ImportDropdown } from "@/components/demandas-premium/import-dropdown";
import dynamic from "next/dynamic";

// Lazy-loaded heavy components (charts: recharts ~300KB, export: jspdf+xlsx ~400KB)
const DynamicChart = dynamic(() => import("@/components/demandas-premium/dynamic-charts").then(m => ({ default: m.DynamicChart })), { ssr: false });
const HistoricoChart = dynamic(() => import("@/components/demandas-premium/historico-chart").then(m => ({ default: m.HistoricoChart })), { ssr: false });
const ChartConfigModal = dynamic(() => import("@/components/demandas-premium/chart-config-modal").then(m => ({ default: m.ChartConfigModal })), { ssr: false });
const ExportModal = dynamic(() => import("@/components/demandas-premium/export-modal").then(m => ({ default: m.ExportModal })), { ssr: false });
const ImportModal = dynamic(() => import("@/components/demandas-premium/import-modal").then(m => ({ default: m.ImportModal })), { ssr: false });
const PJeImportModal = dynamic(() => import("@/components/demandas-premium/pje-import-modal").then(m => ({ default: m.PJeImportModal })), { ssr: false });
const AdminConfigModal = dynamic(() => import("@/components/demandas-premium/admin-config-modal").then(m => ({ default: m.AdminConfigModal })), { ssr: false });
const SheetsImportModal = dynamic(() => import("@/components/demandas-premium/sheets-import-modal").then(m => ({ default: m.SheetsImportModal })), { ssr: false });
const SEEUImportModal = dynamic(() => import("@/components/demandas-premium/seeu-import-modal").then(m => ({ default: m.SEEUImportModal })), { ssr: false });
const IntimacoesImportModal = dynamic(() => import("@/components/demandas-premium/intimacoes-import-modal").then(m => ({ default: m.IntimacoesImportModal })), { ssr: false });
const VarreduraTriggerModal = dynamic(() => import("@/components/demandas-premium/varredura-trigger-modal").then(m => ({ default: m.VarreduraTriggerModal })), { ssr: false });
const DuplicatesModal = dynamic(() => import("@/components/demandas-premium/duplicates-modal").then(m => ({ default: m.DuplicatesModal })), { ssr: false });
const DelegacaoModal = dynamic(() => import("@/components/demandas/delegacao-modal").then(m => ({ default: m.DelegacaoModal })), { ssr: false });
const DelegacaoBatchModal = dynamic(() => import("@/components/demandas/delegacao-batch-modal").then(m => ({ default: m.DelegacaoBatchModal })), { ssr: false });
const NovoEncaminhamentoModal = dynamic(
  () => import("@/components/cowork/encaminhamentos/NovoEncaminhamentoModal").then(m => ({ default: m.NovoEncaminhamentoModal })),
  { ssr: false }
);
import { DemandaQuickPreview } from "@/components/demandas-premium/DemandaQuickPreview";
import type { StatusPrisional } from "@/components/demandas-premium/status-prisional-config";
import {
  KanbanPremium,
  PILL_CONFIG,
  PILL_STORAGE_KEY,
  matchesPill,
  type PillKey,
} from "@/components/demandas-premium/kanban-premium";
import { orderedCardIds, shiftRangeIds } from "@/components/demandas-premium/selection-range";
import { DemandaEventsDrawer } from "@/components/demanda-eventos/demanda-events-drawer";
import { PrazosTab } from "@/components/demandas-premium/prazos-tab";
import { getStatusConfig, getDemandaGroup, STATUS_GROUPS, DEMANDA_STATUS, UI_STATUS_TO_DB, STATUS_OPTIONS_BY_COLUMN, type StatusGroup } from "@/config/demanda-status";
import { getAtosPorAtribuicao, getTodosAtosUnicos, ATOS_POR_ATRIBUICAO, ATO_PRIORITY } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { copyToClipboard } from "@/lib/clipboard";
import { calcularPrazo, prazoTextoCurto } from "@/lib/prazo";
import React, { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useDefensor } from "@/contexts/defensor-context";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { useDebounce } from "@/hooks/use-debounce";
import { onlyDigits, formatCnj, isValidCnj } from "@/lib/format/cnj";
import { PrazoCockpitBar } from "./PrazoCockpitBar";
import { ActiveFiltersBar } from "./ActiveFiltersBar";
import { buildActiveFilterChips } from "./active-filters";
import { DemandasEmptyState } from "./DemandasEmptyState";
import { DemandasListSkeleton } from "./DemandasListSkeleton";
import { DemandasConnectionBanner } from "./DemandasConnectionBanner";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useProgressiveList } from "@/hooks/use-progressive-list";
import { useColumnWidths } from "@/hooks/use-column-widths";
import { useRealtimeDemandaEventos } from "@/hooks/use-realtime-demanda-eventos";
import { getOfflineDemandas } from "@/lib/offline/queries";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ViewModeDropdown, type ViewModeOption } from "@/components/shared/view-mode-dropdown";
import { HEADER_STYLE } from "@/lib/config/design-tokens";
import { getAtribuicaoHex } from "@/lib/config/atribuicoes";
import { DemandaCard } from "@/components/demandas-premium/DemandaCard";
import { DemandaTableView } from "@/components/demandas-premium/DemandaTableView";
import { DemandaCompactView } from "@/components/demandas-premium/DemandaCompactView";
import { AtribuicaoPills, MUTIRAO_PROTEGE_ICON } from "@/components/demandas-premium/AtribuicaoPills";
import { arrayMove } from "@dnd-kit/sortable";
// KPICardPremium/KPIGrid removed — stats now inline in charcoal header
import { useProfissional } from "@/contexts/profissional-context";
import {
  ListTodo,
  Plus,
  Search,
  Download,
  Upload,
  Archive,
  Sparkles,
  BarChart as BarChartIcon,
  Settings,
  CheckCircle2,
  Scale,
  Gavel,
  Target,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  FileEdit,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Trash2,
  X,
  LayoutList,
  Table2,
  LayoutGrid,
  Eye,
  Rows3,
  Zap,
  XCircle,
  MessageSquare,
  ScrollText,
  FileUp,
  Send,
  Clock,
  Users,
  Clipboard,
  Copy,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  PenTool,
  FileQuestion,
  FilePlus,
  HelpCircle,
  Inbox,
  DownloadCloud,
  Bell,
  BellOff,
  User,
  Mail,
  UserCheck,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Filter,
  Layers,
  ClipboardList,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  List,
  ArrowLeftRight,
  MoreHorizontal,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";

// Ícones e cores por atribuição
const atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Target,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Substituição Criminal": RefreshCw,
  "Curadoria Especial": Shield,
  // Mutirão usa UsersRound (grupo) — distinto do `Users` genérico (F5 dedupe).
  "Mutirão (TJBA Protege)": MUTIRAO_PROTEGE_ICON,
  MUTIRAO_PROTEGE: MUTIRAO_PROTEGE_ICON,
};

// Stable empty array to prevent useEffect infinite loop from inline `= []` default
const EMPTY_DEMANDAS: any[] = [];

const DEMANDAS_VIEW_OPTIONS: ViewModeOption[] = [
  { value: "kanban", label: "Kanban", icon: LayoutGrid },
  { value: "planilha", label: "Tabela", icon: Table2 },
  { value: "lista", label: "Lista", icon: List },
];

// Mapeamento de status do banco (enum) para status da UI
const DB_STATUS_TO_UI: Record<string, string> = {
  "2_ATENDER": "atender",
  "4_MONITORAR": "monitorar",
  "5_TRIAGEM": "triagem",
  "7_PROTOCOLADO": "protocolado",
  "7_CIENCIA": "ciencia",
  "7_SEM_ATUACAO": "sem_atuacao",
  "URGENTE": "urgente",
  "CONCLUIDO": "resolvido",
  "ARQUIVADO": "protocolado",
};

// Mapeamento de enum do banco para label amigável
const ATRIBUICAO_ENUM_TO_LABEL: Record<string, string> = {
  "JURI_CAMACARI": "Tribunal do Júri",
  "GRUPO_JURI": "Grupo Especial do Júri",
  "VVD_CAMACARI": "Violência Doméstica",
  "EXECUCAO_PENAL": "Execução Penal",
  "SUBSTITUICAO": "Substituição Criminal",
  "SUBSTITUICAO_CIVEL": "Curadoria Especial",
  "MUTIRAO_PROTEGE": "Mutirão (TJBA Protege)",
};

const atribuicaoColors: Record<string, string> = {
  "Tribunal do Júri": "text-green-600 dark:text-green-500",
  "Grupo Especial do Júri": "text-orange-600 dark:text-orange-500",
  "Violência Doméstica": "text-amber-600 dark:text-amber-500",
  "Execução Penal": "text-blue-600 dark:text-blue-500",
  "Substituição Criminal": "text-purple-600 dark:text-purple-500",
  "Curadoria Especial": "text-gray-600 dark:text-gray-400",
  "Mutirão (TJBA Protege)": "text-violet-600 dark:text-violet-500",
  MUTIRAO_PROTEGE: "text-violet-600 dark:text-violet-500",
};

// Cores HEX para bordas de atribuição (usadas nos cards)
// Cor de borda de atribuição — derivada do registry central (F1).
// Mantém o shape `Record<label, hex>` consumido aqui e por <DemandaCompactView>,
// mas a cor vem de getAtribuicaoHex (fonte única), sem hexes divergentes locais.
const ATRIBUICAO_BORDER_COLORS: Record<string, string> = Object.fromEntries(
  [
    "Tribunal do Júri",
    "Grupo Especial do Júri",
    "Violência Doméstica",
    "Execução Penal",
    "Substituição Criminal",
    "Curadoria Especial",
    "Mutirão (TJBA Protege)",
    "MUTIRAO_PROTEGE",
  ].map((k) => [k, getAtribuicaoHex(k)]),
);

// Background suave para atribuição
const ATRIBUICAO_BG_COLORS: Record<string, string> = {
  "Tribunal do Júri": "bg-green-50 dark:bg-green-950/20",
  "Grupo Especial do Júri": "bg-orange-50 dark:bg-orange-950/20",
  "Violência Doméstica": "bg-amber-50 dark:bg-amber-950/20",
  "Execução Penal": "bg-blue-50 dark:bg-blue-950/20",
  "Substituição Criminal": "bg-purple-50 dark:bg-purple-950/20",
  "Curadoria Especial": "bg-neutral-50 dark:bg-neutral-800/30",
  "Mutirão (TJBA Protege)": "bg-violet-50 dark:bg-violet-950/20",
  MUTIRAO_PROTEGE: "bg-violet-50 dark:bg-violet-950/20",
};

// ==========================================
// CONFIGURAÇÃO DE ATOS - Apenas ícones (cores neutras)
// ==========================================

// Mapeamento de categorias de atos para ícones Lucide (cores neutras para não conflitar)
const getAtoIcon = (ato: string): LucideIcon => {
  const atoLower = ato?.toLowerCase() || "";

  // Respostas e Contestações
  if (atoLower.includes("resposta à acusação") || atoLower.includes("contestação")) return MessageSquare;
  // Alegações finais / Memoriais
  if (atoLower.includes("alegações finais") || atoLower.includes("memoriais")) return ScrollText;
  // Recursos - Apelação, RESE, Agravo
  if (atoLower.includes("apelação") || atoLower.includes("rese") || atoLower.includes("agravo") || atoLower.includes("razões") || atoLower.includes("contrarrazões")) return ArrowUp;
  // Embargos de Declaração
  if (atoLower.includes("embargos")) return FileQuestion;
  // Habeas Corpus
  if (atoLower.includes("habeas corpus")) return Shield;
  // Liberdade - Revogação/Relaxamento
  if (atoLower.includes("revogação") || atoLower.includes("relaxamento") || atoLower.includes("liberdade")) return Lock;
  // MPU (Medidas Protetivas)
  if (atoLower.includes("mpu") || atoLower.includes("medida protetiva") || atoLower.includes("modulação")) return ShieldCheck;
  // Ciências (todas)
  if (atoLower.includes("ciência")) return Eye;
  // Manifestação
  if (atoLower.includes("manifestação")) return PenTool;
  // Petição intermediária
  if (atoLower.includes("petição") || atoLower.includes("peticao")) return FileText;
  // Diligências / Documentos / Testemunhas
  if (atoLower.includes("diligência") || atoLower.includes("testemunha") || atoLower.includes("documento") || atoLower.includes("juntada")) return Clipboard;
  // Execução Penal - Progressão/Indulto
  if (atoLower.includes("progressão") || atoLower.includes("indulto")) return ArrowDown;
  // Execução Penal - Designações
  if (atoLower.includes("designação") || atoLower.includes("admonitória") || atoLower.includes("justificação")) return Clock;
  // Transferência
  if (atoLower.includes("transferência")) return RefreshCw;
  // ANPP
  if (atoLower.includes("anpp") || atoLower.includes("não persecução")) return UserCheck;
  // Ofício
  if (atoLower.includes("ofício")) return Send;
  // Mandado de Segurança
  if (atoLower.includes("mandado de segurança")) return AlertCircle;
  // Atualização de endereço
  if (atoLower.includes("endereço") || atoLower.includes("endereco")) return Home;
  // Quesitos
  if (atoLower.includes("quesito")) return HelpCircle;
  // Incidente de insanidade
  if (atoLower.includes("insanidade") || atoLower.includes("incidente")) return AlertTriangle;
  // Desaforamento — Send (remessa a outra comarca); Target fica reservado à
  // atribuição "Grupo Especial do Júri" para não colidir o glifo (F5 dedupe).
  if (atoLower.includes("desaforamento")) return Send;
  // Prosseguimento do feito
  if (atoLower.includes("prosseguimento")) return Inbox;
  // Restituição
  if (atoLower.includes("restituição")) return Folder;
  // Default - Outros
  return FileText;
};

// Componente helper para renderizar ato com ícone (cores neutras)
const AtoWithIcon = ({ ato, className = "" }: { ato: string; className?: string }) => {
  const Icon = getAtoIcon(ato);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />
      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">{ato}</span>
    </div>
  );
};

// Mapeamento de status para ícones Lucide
const getStatusIcon = (status: string): LucideIcon => {
  const statusLower = status?.toLowerCase() || "";

  if (statusLower.includes("urgente")) return AlertTriangle;
  if (statusLower.includes("analisar")) return Search;
  if (statusLower.includes("elaborar") || statusLower.includes("elaborando")) return FileEdit;
  if (statusLower.includes("revisar") || statusLower.includes("revisando")) return FileCheck;
  if (statusLower.includes("protocolar")) return Upload;
  if (statusLower.includes("protocolado")) return CheckCircle2;
  if (statusLower.includes("monitorar")) return Eye;
  if (statusLower.includes("triagem")) return ListTodo;
  if (statusLower.includes("resolvido") || statusLower.includes("concluído")) return CheckCircle2;
  if (statusLower.includes("ciência") || statusLower.includes("ciencia")) return Bell;
  if (statusLower.includes("sem atuação") || statusLower.includes("sem atuacao")) return BellOff;
  if (statusLower.includes("amanda") || statusLower.includes("emilly") || statusLower.includes("taissa")) return Users;
  if (statusLower.includes("buscar")) return Search;
  if (statusLower.includes("documento")) return Clipboard;
  if (statusLower.includes("testemunha")) return Users;

  return ListTodo; // Default
};

// Componente helper para renderizar status com ícone (usa cores do STATUS_GROUPS)
const StatusWithIcon = ({ status, statusConfig }: { status: string; statusConfig: any }) => {
  const Icon = getStatusIcon(status);
  const statusColor = STATUS_GROUPS[statusConfig.group as keyof typeof STATUS_GROUPS]?.color || "#A1A1AA";

  return (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{
        backgroundColor: `${statusColor}20`,
        color: statusColor,
      }}
    >
      <Icon className="w-3 h-3" />
      <span>{status}</span>
    </div>
  );
};

const atribuicaoOptions = [
  { value: "Todas", label: "Todas Atribuições", icon: Scale },
  { value: "Tribunal do Júri", label: "Tribunal do Júri", icon: Gavel },
  { value: "Violência Doméstica", label: "Violência Doméstica", icon: Home },
  { value: "Execução Penal", label: "Execução Penal", icon: Lock },
  { value: "Substituição Criminal", label: "Substituição Criminal", icon: RefreshCw },
  { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri", icon: Target },
  { value: "Curadoria Especial", label: "Curadoria Especial", icon: Shield },
  { value: "Mutirão (TJBA Protege)", label: "Mutirão", icon: MUTIRAO_PROTEGE_ICON },
];

// Mapeia chaves da coluna `users.areasPrincipais` (jsonb) para os labels
// usados em `atribuicaoOptions.value`. Cobre as duas convenções vivas no
// codebase (curta tipo "VVD", e longa tipo "VIOLENCIA_DOMESTICA"). Quando
// chega uma chave nova, cai no fallback (não filtra) e o usuário pode
// ajustar — sem quebrar.
const AREA_KEY_TO_ATRIBUICAO_LABEL: Record<string, string> = {
  JURI: "Tribunal do Júri",
  GRUPO_JURI: "Grupo Especial do Júri",
  VVD: "Violência Doméstica",
  EXECUCAO: "Execução Penal",
  SUBSTITUICAO: "Substituição Criminal",
  CURADORIA: "Curadoria Especial",
  VIOLENCIA_DOMESTICA: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  MUTIRAO_PROTEGE: "Mutirão (TJBA Protege)",
};

// Persistência do default de atribuição. Override do usuário (qualquer
// mudança manual) salva em localStorage; flag de "Todas explícito" usa
// sessionStorage (vale só pra aba atual).
const LS_DEFAULT_ATRIBUICAO = "defender_default_atribuicao";
const SS_EXPLICIT_ALL = "defender_atribuicao_explicit_all";

const statusOptions = [
  // Triagem
  { value: "triagem", label: "Triagem", icon: ListTodo },
  { value: "atender", label: "Atender", icon: User },
  { value: "urgente", label: "Urgente", icon: AlertTriangle },
  // Preparação
  { value: "elaborar", label: "Elaborar", icon: FileEdit },
  { value: "elaborando", label: "Elaborando", icon: FileEdit },
  { value: "analisar", label: "Analisar", icon: Search },
  { value: "relatorio", label: "Relatório", icon: FileEdit },
  { value: "revisar", label: "Revisar", icon: FileCheck },
  { value: "revisando", label: "Revisando", icon: FileCheck },
  // Diligências
  { value: "documentos", label: "Documentos", icon: FileText },
  { value: "testemunhas", label: "Testemunhas", icon: Users },
  { value: "investigar", label: "Investigar", icon: Eye },
  { value: "buscar", label: "Buscar", icon: Search },
  { value: "oficiar", label: "Oficiar", icon: Mail },
  // Saída
  { value: "protocolar", label: "Protocolar", icon: Upload },
  { value: "monitorar", label: "Monitorar", icon: Eye },
  // Concluída
  { value: "protocolado", label: "Protocolado", icon: CheckCircle2 },
  { value: "ciencia", label: "Ciência", icon: Eye },
  { value: "resolvido", label: "Resolvido", icon: CheckCircle2 },
  { value: "constituiu_advogado", label: "Constituiu advogado", icon: Scale },
  { value: "sem_atuacao", label: "Sem atuação", icon: XCircle },
  // Arquivado
  { value: "arquivado", label: "Arquivado", icon: Archive },
];

const atoGroups = {
  principais: {
    label: "Atos Principais",
    atos: ["Alegações Finais", "Apelação", "Razões de apelação", "Contrarrazões de apelação", "Arguição"],
  },
  ciencias: {
    label: "Ciências",
    atos: ["Ciência", "Ciência de sentença", "Ciência absolvição", "Ciência condenação"],
  },
  liberdade: {
    label: "Liberdade",
    atos: ["Liberdade Provisória", "Relaxamento de Prisão", "Revogação de Prisão Preventiva", "Habeas Corpus"],
  },
  recursos: {
    label: "Recursos",
    atos: ["Recurso em Sentido Estrito", "Embargos de Declaração", "Agravo em Execução"],
  },
};

const chartOptions = [
  { value: "atribuicoes", label: "Atribuições", category: "Atribuições", icon: Scale, color: "#71717A" },
  { value: "status", label: "Status", category: "Status", icon: ListTodo, color: "#52525B" },
  { value: "atos", label: "Tipos de Atos", category: "Atos", icon: FileCheck, color: "#3F3F46" },
  { value: "situacao-prisional", label: "Situação Prisional", category: "Situação", icon: ShieldCheck, color: "#27272A" },
];

// ==========================================
// DEMANDA GRID CARD - Estilo Premium com Hover Sutil
// ==========================================

interface DemandaGridCardProps {
  demanda: any;
  statusConfig: any;
  borderColor: string;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  onStatusChange: (id: string, status: string) => void;
  onAtoChange?: (id: string, ato: string) => void;
  atoOptions?: Array<{ value: string; label: string }>;
  onEdit: (demanda: any) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => void;
}

function DemandaGridCard({
  demanda,
  statusConfig,
  borderColor,
  atribuicaoIcons,
  onStatusChange,
  onAtoChange,
  atoOptions,
  onEdit,
  onArchive,
  onDelete,
  copyToClipboard,
  isSelectMode,
  isSelected,
  onToggleSelect
}: DemandaGridCardProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);

  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao] || Scale;

  // Cor da atribuição para a borda do card
  const atribuicaoBorderColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";

  // Cor do status do STATUS_GROUPS
  const statusColor = STATUS_GROUPS[statusConfig.group]?.color || "#A1A1AA";
  const StatusIcon = getStatusIcon(demanda.substatus || demanda.status);

  // Calcular prazo
  // Severidade de prazo via fonte única (escala de litígio).
  // urgente = nível crítico/alerta (red/amber); tranquilo (green/gray) não urge.
  const prazoSev = calcularPrazo(demanda.prazo);
  const prazoInfo = prazoSev
    ? {
        text: prazoSev.dias < 0 ? "Vencido" : prazoTextoCurto(prazoSev.dias),
        urgent: prazoSev.nivel !== "tranquilo",
      }
    : null;
  const isPreso = demanda.estadoPrisional && demanda.estadoPrisional !== "Solto";

  return (
    <div className="group relative bg-white dark:bg-neutral-900/95 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-neutral-200/50 dark:hover:shadow-black/30 hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5">
      {/* TOP BAR INDICATOR - appears on hover (like assistidos/processos) */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(to right, transparent, ${atribuicaoBorderColor}, transparent)`
        }}
      />

      {/* Background gradient on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none rounded-2xl transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom right, ${atribuicaoBorderColor}15 0%, ${atribuicaoBorderColor}08 30%, transparent 60%)`
        }}
      />

      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className="absolute inset-0 bg-neutral-900/95 dark:bg-neutral-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl animate-in fade-in duration-200"
          onClick={() => setShowQuickActions(false)}
        >
          <button
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
            onClick={() => setShowQuickActions(false)}
          >
            <XCircle className="w-4 h-4" />
          </button>
          <p className="text-white/60 text-[10px] mb-2">{demanda.assistido}</p>
          <div className="grid grid-cols-2 gap-2 p-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onEdit(demanda); setShowQuickActions(false); }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all">
              <Eye className="w-4 h-4" /><span className="text-[9px]">Ver/Editar</span>
            </button>
            <button onClick={() => { copyToClipboard(demanda.processos?.[0]?.numero || "", "Processo copiado!"); setShowQuickActions(false); }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all">
              <FileText className="w-4 h-4" /><span className="text-[9px]">Copiar Nº</span>
            </button>
            <button onClick={() => { onArchive(demanda.id); setShowQuickActions(false); }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all">
              <Archive className="w-4 h-4" /><span className="text-[9px]">Arquivar</span>
            </button>
            <button onClick={() => { onDelete(demanda.id); setShowQuickActions(false); }} className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-rose-500/30 text-white/80 hover:text-rose-300 transition-all">
              <Trash2 className="w-4 h-4" /><span className="text-[9px]">Excluir</span>
            </button>
          </div>
          <p className="text-white/40 text-[9px] mt-2">Clique fora para fechar</p>
        </div>
      )}

      {/* Checkbox de seleção */}
      {isSelectMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={(e) => onToggleSelect?.(demanda.id, { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-emerald-400"
            }`}
          >
            {isSelected && <CheckSquare className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Card Content */}
      <div className="p-4 space-y-3 relative z-10">
        {/* Header: Nome + Quick Actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {isPreso && (
                <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate">
                {demanda.assistido}
              </p>
            </div>
            {onAtoChange && atoOptions && atoOptions.length > 0 ? (
              <div onClick={(e) => e.stopPropagation()}>
                <InlineDropdown
                  value={demanda.ato}
                  displayValue={<AtoWithIcon ato={demanda.ato || "Definir ato"} />}
                  options={atoOptions.filter((a) => a.value !== "Todos")}
                  onChange={(v) => onAtoChange(demanda.id, v)}
                  compact
                />
              </div>
            ) : (
              <AtoWithIcon ato={demanda.ato} />
            )}
          </div>
          <button
            onClick={() => setShowQuickActions(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all opacity-0 group-hover:opacity-100"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status + Prazo */}
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{
              backgroundColor: `${statusColor}15`,
              color: statusColor,
            }}
          >
            <StatusIcon className="w-3 h-3" />
            <span>{demanda.substatus || statusConfig.label}</span>
          </div>
          {prazoInfo && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              prazoInfo.urgent
                ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
            }`}>
              {prazoInfo.text}
            </span>
          )}
        </div>

        {/* Footer: Atribuição + Processo */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <div
            className="flex items-center gap-1.5 text-[10px] font-medium"
            style={{ color: atribuicaoBorderColor }}
          >
            <AtribuicaoIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[100px]">{demanda.atribuicao}</span>
          </div>
          {demanda.processos?.[0] && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(demanda.processos[0].numero, "Processo copiado!");
              }}
              className="text-[9px] font-mono text-neutral-400 hover:text-emerald-600 transition-colors truncate max-w-[120px]"
              title={demanda.processos[0].numero}
            >
              {demanda.processos[0].numero}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Demandas() {
  const urlSearchParams = useSearchParams();
  const { profissionalAtivo, isVisaoGeral } = useProfissional();
  // userId = users.id, que é o FK usado em demandas.defensorId
  const defensorUserId = profissionalAtivo.userId;
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false); // toggle da busca no formato responsivo menor (abaixo de md)
  // Ordenação multi-coluna empilhada (click-to-stack)
  type SortCriterion = { column: string; direction: "asc" | "desc" };
  const [sortStack, setSortStack] = useState<SortCriterion[]>([
    { column: "recentes", direction: "asc" }
  ]);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [selectedPrazoFilter, setSelectedPrazoFilter] = useState<string | null>(null);
  // Default da atribuição, ordem de prioridade:
  //   1. sessionStorage explicit_all → manter [] (modo "Todas")
  //   2. localStorage override do usuário → reusa último estado salvo
  //   3. (mais tarde, em useEffect) areasPrincipais do user → fallback
  //   4. (mais tarde, em useEffect) primeira atribuição em kanban/planilha
  const [selectedAtribuicoes, setSelectedAtribuicoes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    if (sessionStorage.getItem(SS_EXPLICIT_ALL) === "true") return [];
    const saved = localStorage.getItem(LS_DEFAULT_ATRIBUICAO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(v => typeof v === "string")) {
          return parsed;
        }
      } catch { /* ignore corrupted */ }
    }
    return [];
  });
  // Marca quando o init via areasPrincipais já rodou — evita reaplicar
  // quando o user re-renderiza (usePermissions emite múltiplas vezes).
  const [didInitFromUserAreas, setDidInitFromUserAreas] = useState(false);
  const { user: currentUser } = usePermissions();
  const [selectedEstadoPrisional, setSelectedEstadoPrisional] = useState<string | null>(null);
  const [selectedTipoAto, setSelectedTipoAto] = useState<string | null>(null);
  // Filtro por tipo de processo (AP/MPU/IP/APF/EP/CAUTELAR/ANPP/OUTRO).
  // Mantido por compatibilidade — usado por filtros de outras telas. O
  // header só expõe o switch MPU agora.
  const [selectedTipoProcesso, setSelectedTipoProcesso] = useState<string | null>(null);
  // Switch MPU 3-estados: tudo / só MPU / sem MPU. Substitui as 7 chips
  // que invadiam o topbar — útil principalmente em VVD pra alternar
  // rapidamente entre AP × MPU sem mudar de atribuição.
  type MpuFilter = "all" | "only_mpu" | "without_mpu";
  const [mpuFilter, setMpuFilter] = useState<MpuFilter>(() => {
    if (typeof window === "undefined") return "all";
    try {
      const v = localStorage.getItem("demandas:mpu-filter");
      if (v === "only_mpu" || v === "without_mpu" || v === "all") return v;
    } catch { /* ignore */ }
    return "all";
  });
  const cycleMpuFilter = useCallback(() => {
    setMpuFilter((prev) => {
      const next: MpuFilter = prev === "all" ? "only_mpu" : prev === "only_mpu" ? "without_mpu" : "all";
      try { localStorage.setItem("demandas:mpu-filter", next); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<StatusGroup | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["atribuicoes", "status", "atos", "situacao-prisional"]);
  const [chartTypes, setChartTypes] = useState<Record<string, string>>({
    atribuicoes: "pizza",
    status: "pizza",
    atos: "barras",
    "situacao-prisional": "pizza",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modal de confirmação de audiência — disparado quando o ato é alterado
  // para "Ciência designação/redesignação de audiência".
  const [audienciaModal, setAudienciaModal] = useState<{
    open: boolean;
    demandaId: number | null;
    assistidoNome?: string;
    numeroAutos?: string;
    sources: Array<string | null | undefined>;
  }>({ open: false, demandaId: null, sources: [] });

  // Modal de registro de recurso em 2º grau — disparado ao mudar status para
  // Protocolado em demanda cujo ato é HC/Apelação/RSE/Agravo em Execução.
  const [recursoModal, setRecursoModal] = useState<{
    open: boolean;
    demandaId: number | null;
    assistidoNome?: string;
    numeroAutosOrigem?: string;
    tipo: TipoRecurso | null;
    rotulo: string;
    exigeNumero: boolean;
  }>({ open: false, demandaId: null, tipo: null, rotulo: "", exigeNumero: false });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isChartConfigModalOpen, setIsChartConfigModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);
  const [isSheetsImportModalOpen, setIsSheetsImportModalOpen] = useState(false);
  const [isSEEUImportModalOpen, setIsSEEUImportModalOpen] = useState(false);
  const [isIntimacoesImportOpen, setIsIntimacoesImportOpen] = useState(false);
  const [isVarreduraModalOpen, setIsVarreduraModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const filtersBtnRef = useRef<HTMLButtonElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDemanda, setEditingDemanda] = useState<DemandaFormData | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isInfographicsExpanded, setIsInfographicsExpanded] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("defender_stats_collapsed") === "true";
  });
  const [activeTab, setActiveTab] = useState<"planilha" | "kanban" | "prazos" | "analytics">("kanban");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const [isAdminConfigModalOpen, setIsAdminConfigModalOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedId = useRef<string | null>(null);
  const { widths: columnWidths, setColumnWidth: handleColumnResize } = useColumnWidths();
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<"status" | "atribuicao" | null>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("defender_demandas_groupby") as "status" | "atribuicao" | null) || null;
    }
    return null;
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Estado para o modal de delegação
  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);
  const [delegacaoDemanda, setDelegacaoDemanda] = useState<{
    demandaId: number | null;
    demandaAto: string;
    assistidoId: number | null;
    assistidoNome: string;
    processoId: number | null;
    processoNumero: string;
    destinatarioNome: string;
  } | null>(null);

  // Quando o user solta um card numa coluna de parceiro defensor, primeiro abrimos
  // um mini-menu com 3 opções (transferir | compartilhar | dar ciência). A seleção
  // determina o initialTipo do NovoEncaminhamentoModal.
  const [colegaDropContext, setColegaDropContext] = useState<{
    demandaId: number | null;
    processoId: number | null;
    assistidoId: number | null;
    display: string;
    destinatarioId: number;
    destinatarioNome: string;
  } | null>(null);

  const [colegaModalTipo, setColegaModalTipo] = useState<"transferir" | "acompanhar" | "encaminhar" | null>(null);

  // Estado para o seletor de pessoa (abre ao dropar em coluna "Delegação")
  const [pessoaSelectorOpen, setPessoaSelectorOpen] = useState(false);
  const [pessoaSelectorDemanda, setPessoaSelectorDemanda] = useState<{
    demandaId: number | null;
    demandaAto: string;
    assistidoId: number | null;
    assistidoNome: string;
    processoId: number | null;
    processoNumero: string;
  } | null>(null);

  // Estado para o modal de delegação em lote
  const [batchDelegacaoOpen, setBatchDelegacaoOpen] = useState(false);

  const [viewMode, setViewMode] = useState<"table" | "cards" | "grid" | "compact">(() => {
    if (typeof window !== "undefined") {
      // Padrão é "compact" (modo planilha editável)
      return (localStorage.getItem("defender_demandas_view_mode") as "table" | "cards" | "grid" | "compact") || "compact";
    }
    return "compact";
  });

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================
  const { selectedDefensorId } = useDefensor();
  const demandasQuery = trpc.demandas.list.useQuery({
    defensorId: selectedDefensorId ?? undefined,
  });
  const {
    data: demandasDB = EMPTY_DEMANDAS,
    isLoading: loadingDemandas,
    isOffline: demandasOffline,
    isFromCache: demandasFromCache,
  } = useOfflineQuery(demandasQuery, getOfflineDemandas);

  const utils = trpc.useUtils();

  // Search queries para autocomplete de vinculação.
  // Debounce (250ms) evita disparar a query a cada tecla — só busca quando o usuário
  // pausa de digitar. Ver docs/specs/demandas-cnj-ux.md.
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");
  const [processoSearchQuery, setProcessoSearchQuery] = useState("");
  const debouncedAssistidoQuery = useDebounce(assistidoSearchQuery, 250);
  const debouncedProcessoQuery = useDebounce(processoSearchQuery, 250);

  const { data: assistidoSearchResults = [], isLoading: loadingAssistidoSearch } = trpc.demandas.searchAssistidos.useQuery(
    { search: debouncedAssistidoQuery },
    { enabled: debouncedAssistidoQuery.length >= 2 }
  );

  const { data: processoSearchResults = [], isLoading: loadingProcessoSearch } = trpc.demandas.searchProcessos.useQuery(
    { search: debouncedProcessoQuery },
    { enabled: debouncedProcessoQuery.length >= 2 }
  );


  // Batch fetch — eventos por demanda (última atividade + pendência) para Kanban cards
  const demandaIdsForEventos = useMemo(() => {
    return (demandasDB || [])
      .map((d: any) => Number(d.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);
  }, [demandasDB]);

  const { data: lastEventosByDemanda = {} } = trpc.demandaEventos.lastByDemandaIds.useQuery(
    { demandaIds: demandaIdsForEventos },
    { enabled: demandaIdsForEventos.length > 0, staleTime: 10_000 },
  );

  const { data: pendentesEventosByDemanda = {} } = trpc.demandaEventos.pendentesByDemandaIds.useQuery(
    { demandaIds: demandaIdsForEventos },
    { enabled: demandaIdsForEventos.length > 0, staleTime: 10_000 },
  );

  // Realtime: invalida queries em qualquer mudança em `demanda_eventos` para
  // qualquer demanda visível no Kanban (sem polling). Só ativa quando há ids
  // a observar para evitar canal sem propósito.
  useRealtimeDemandaEventos(
    demandaIdsForEventos,
    () => {
      utils.demandaEventos.lastByDemandaIds.invalidate();
      utils.demandaEventos.pendentesByDemandaIds.invalidate();
    },
    demandaIdsForEventos.length > 0,
  );

  // Mutation para criar demanda
  const createDemandaMutation = trpc.demandas.create.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!");
      utils.demandas.list.invalidate();
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda: " + error.message);
    },
  });

  // Mutation usada pelo modal "Nova" — resolve assistido/processo por nome/número
  const createFromFormMutation = trpc.demandas.createFromForm.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!");
      utils.demandas.list.invalidate();
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda: " + error.message);
    },
  });

  // Mutation para atualizar status prisional do assistido (chamada via Bloco A
  // do quick-preview). Atualização vai direto na tabela assistidos.
  const updateAssistidoMutation = trpc.assistidos.update.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
      toast.success("Status prisional atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status prisional: " + error.message);
    },
  });

  const handleStatusPrisionalChange = (assistidoId: number, status: string) => {
    updateAssistidoMutation.mutate({
      id: assistidoId,
      statusPrisional: status as StatusPrisional,
    });
  };

  // Disparado pelo botão "Agendar audiência" do Bloco C — abre o
  // AudienciaConfirmModal pré-populado com providências/ato como sources.
  const handleAgendarAudiencia = (demandaId: string) => {
    const numericId = parseInt(demandaId, 10);
    if (isNaN(numericId)) return;
    const demanda = demandas.find((d) => d.id === demandaId);
    if (!demanda) return;
    setAudienciaModal({
      open: true,
      demandaId: numericId,
      assistidoNome: demanda.assistido,
      numeroAutos: demanda.processos?.[0]?.numero,
      sources: [demanda.providencias ?? null, demanda.ato ?? null].filter(Boolean) as string[],
    });
  };

  // Atalho do card: abre o preview já com o painel de novo registro expandido.
  const handleOpenRegistro = (demandaId: string) => {
    setPreviewOpensWithRegistro(true);
    setPreviewDemandaId(demandaId);
  };

  // Atalho do card: alterna a prioridade entre URGENTE e NORMAL sem abrir o preview.
  // (réu preso é flag separada — não mexemos aqui pra não atropelar.)
  const handleToggleUrgent = (demandaId: string, currentlyUrgent: boolean) => {
    const numericId = parseInt(demandaId, 10);
    if (isNaN(numericId)) return;
    const next = currentlyUrgent ? "NORMAL" : "URGENTE";
    trpcUpdateDemanda.mutate(
      { id: numericId, prioridade: next },
      {
        onSuccess: () => {
          toast.success(currentlyUrgent ? "Urgência removida" : "Marcado como urgente");
        },
      },
    );
  };

  // Mutation para registrar audiência vinda do modal de confirmação
  const createAudienciaMutation = trpc.audiencias.create.useMutation({
    onSuccess: (result) => {
      if ((result as { duplicate?: boolean })?.duplicate) {
        toast.info("Esta audiência já estava agendada para a data.");
      } else if (result?.calendarSyncOk) {
        toast.success("Audiência registrada e agendada no Google Calendar");
      } else {
        toast.warning("Audiência registrada — mas falhou ao sincronizar com o Google Calendar");
      }
      utils.audiencias.invalidate();
      setAudienciaModal({ open: false, demandaId: null, sources: [] });
    },
    onError: (error) => {
      toast.error("Erro ao registrar audiência: " + error.message);
    },
  });

  // Mutation para registrar recurso (HC/Apelação/RSE/Agravo) em 2º grau
  const createRecursoMutation = trpc.instanciaSuperior.createRecursoFromForm.useMutation({
    onSuccess: (res: { duplicate?: boolean }) => {
      if (res.duplicate) {
        toast.info("Já existia um recurso deste tipo vinculado ao processo.");
      } else {
        toast.success("Recurso registrado em 2º grau!");
      }
      setRecursoModal({ open: false, demandaId: null, tipo: null, rotulo: "", exigeNumero: false });
    },
    onError: (error) => {
      toast.error("Erro ao registrar recurso: " + error.message);
    },
  });

  // Mutation para atualizar demanda (com suporte offline)
  // Nota: cada handler individual mostra seu próprio toast de sucesso (optimistic update),
  // então não mostramos toast genérico aqui para evitar double-toasting
  const trpcUpdateDemanda = trpc.demandas.update.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      // Tratar respostas não-JSON do servidor (ex: "Internal Server Error" em texto puro)
      const msg = error.message?.includes("is not valid JSON")
        ? "Erro de comunicação com o servidor. Tente novamente."
        : error.message;
      toast.error("Erro ao atualizar: " + msg);
    },
  });
  const updateDemandaMutation = useOfflineMutation({
    mutation: trpcUpdateDemanda,
    table: "demandas",
    operation: "update",
    getRecordId: (input: any) => input.id,
    onSuccess: () => {
      if (!navigator.onLine) toast.success("Salvo offline — será sincronizado");
    },
  });

  // Mutation para deletar demanda (soft delete, com suporte offline)
  const reordenarMutation = trpc.demandas.reordenar.useMutation();

  const exportToSheetsMutation = trpc.demandas.exportToSheets.useMutation();
  const reorderSheetsMutation = trpc.demandas.reorderSheets.useMutation();

  const batchUpdateMutation = trpc.demandas.batchUpdate.useMutation({
    onSuccess: (result) => {
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro no batch update: " + error.message);
    },
  });

  const trpcDeleteDemanda = trpc.demandas.delete.useMutation({
    onSuccess: () => {
      toast.success("Demanda deletada!");
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });
  const deleteDemandaMutation = useOfflineMutation({
    mutation: trpcDeleteDemanda,
    table: "demandas",
    operation: "delete",
    getRecordId: (input: any) => input.id,
    onSuccess: () => {
      if (!navigator.onLine) toast.success("Deletado offline — será sincronizado");
    },
  });

  // Mapear dados do banco para o formato do componente
  // Usar useMemo para evitar re-renders desnecessários
  const mappedDemandas = useMemo(() => {
    if (!demandasDB || demandasDB.length === 0) {
      return [];
    }
    return demandasDB.map((d: any) => ({
      id: String(d.id),
      assistido: d.assistido?.nome || d.titulo || "Sem assistido",
      assistidoId: d.assistido?.id || d.assistidoId || null,
      processoId: d.processo?.id || d.processoId || null,
      casoId: (d as any).casoId ?? null,
      notaPrivada: (d as any).notaPrivada ?? null,
      // Usar substatus granular quando disponível, senão mapear do status coarse do DB
      status: d.substatus || DB_STATUS_TO_UI[d.status] || d.status?.toLowerCase().replace(/_/g, " ") || "triagem", // "triagem" is a valid substatus key in DEMANDA_STATUS
      prazo: d.prazo ? new Date(d.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "",
      data: d.dataExpedicao ? new Date(d.dataExpedicao + "T12:00:00").toLocaleDateString("pt-BR") : d.dataEntrada ? new Date(d.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : "",
      // dataExpedicaoRaw: YYYY-MM-DD (lexicograficamente ordenável) usado pelo Kanban para sort por antiguidade
      dataExpedicaoRaw: (d.dataExpedicao ?? d.dataEntrada ?? null) as string | null,
      // dataInclusao: timestamp ISO para ordenação por recentes (usado na importação do PJe)
      dataInclusao: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      processos: d.processo?.numeroAutos
        ? [{ tipo: d.processo.tipoProcesso || "", numero: d.processo.numeroAutos }]
        : [],
      // isMpu derivado no servidor (nível da intimação) — fonte única src/lib/mpu.ts.
      // Captura MPU (MPUMPCrim) dentro de processo AP, que o chip de classe não mostra.
      isMpu: d.isMpu ?? false,
      ato: d.ato || d.titulo || "",
      providencias: d.providencias || "",
      providenciaResumo: d.providenciaResumo || "",
      analiseResumo: d.analiseResumo ?? null,
      registrosCount: d.registrosCount ?? 0,
      atribuicao: ATRIBUICAO_ENUM_TO_LABEL[d.processo?.atribuicao] || d.atribuicao || "Substituição Criminal",
      atribuicaoEnum: d.processo?.atribuicao || null,
      estadoPrisional: d.reuPreso ? "preso" : (d.assistido?.statusPrisional || "solto"),
      prioridade: d.prioridade || "normal",
      arquivado: d.status === "ARQUIVADO",
      reuPreso: d.reuPreso || false,
      substatus: d.substatus || null,
      photoUrl: d.assistido?.photoUrl || null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
      syncedAt: d.syncedAt ? new Date(d.syncedAt).toISOString() : null,
      // Defensor responsável (para filtro por profissional R/J/G)
      defensorId: d.defensorId ?? null,
      // Delegação — quem está executando a tarefa (servidor/estagiário)
      delegadoPara: d.delegadoPara ?? null,
      delegadoParaId: d.delegadoParaId ?? null,
      statusDelegacao: d.statusDelegacao ?? null,
      delegacaoWorkStatus: d.delegacaoWorkStatus ?? null,
      dataDelegacao: d.dataDelegacao ? new Date(d.dataDelegacao).toISOString() : null,
      // Rastreamento de importação
      importBatchId: d.importBatchId || null,
      ordemOriginal: d.ordemOriginal ?? null,
    }));
  }, [demandasDB]);

  // Sincronizar demandas mapeadas com o estado
  useEffect(() => {
    setDemandas(mappedDemandas);
  }, [mappedDemandas]);

  // Close sort dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('sort-dropdown');
      if (el && !el.classList.contains('hidden') && !(e.target as HTMLElement).closest('#sort-dropdown')?.parentElement) {
        el.classList.add('hidden');
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Abrir modal SEEU via evento global (ex: command palette)
  useEffect(() => {
    const handler = () => setIsSEEUImportModalOpen(true);
    window.addEventListener("open-seeu-import", handler);
    return () => window.removeEventListener("open-seeu-import", handler);
  }, []);

  // Gerar lista de atos dinamicamente baseado na atribuição selecionada
  const atoOptionsFiltered = useMemo(() => {
    // Se não houver atribuição selecionada, retorna todos os atos
    if (selectedAtribuicoes.length === 0) {
      return getTodosAtosUnicos();
    }

    // Se uma só selecionada, retorna atos específicos
    if (selectedAtribuicoes.length === 1) {
      return getAtosPorAtribuicao(selectedAtribuicoes[0]);
    }

    // Se múltiplas, combina atos de todas
    const allAtos = new Map<string, { value: string; label: string }>();
    selectedAtribuicoes.forEach(attr => {
      getAtosPorAtribuicao(attr).forEach(ato => allAtos.set(ato.value, ato));
    });
    return Array.from(allAtos.values());
  }, [selectedAtribuicoes]);

  // Mapeamento de status granular da UI para status coarse do banco
  const UI_STATUS_TO_DB: Record<string, string> = {
    "triagem": "5_TRIAGEM",
    "atender": "2_ATENDER",
    "analisar": "2_ATENDER",
    "elaborar": "2_ATENDER",
    "elaborando": "2_ATENDER",
    "buscar": "2_ATENDER",
    "revisar": "2_ATENDER",
    "revisando": "2_ATENDER",
    "relatorio": "2_ATENDER",
    "documentos": "2_ATENDER",
    "testemunhas": "2_ATENDER",
    "investigar": "2_ATENDER",
    "oficiar": "2_ATENDER",
    "monitorar": "4_MONITORAR",
    "protocolar": "5_TRIAGEM",
    "protocolado": "7_PROTOCOLADO",
    "ciencia": "7_CIENCIA",
    "sem_atuacao": "7_SEM_ATUACAO",
    "constituiu_advogado": "CONCLUIDO",
    "urgente": "URGENTE",
    "resolvido": "CONCLUIDO",
    "arquivado": "ARQUIVADO",
  };

  // Lista dinâmica de membros da equipe (servidores/estagiários) e parceiros defensores.
  // Usada para detectar drops do Kanban em colunas de pessoas e abrir o modal correto
  // SEM chamar updateDemandaMutation (que rejeitaria o nome como status inválido no enum).
  const { data: membrosEquipeQuery } = trpc.delegacao.membrosEquipe.useQuery();
  const { data: parceirosQuery } = trpc.parceiros.listar.useQuery();

  const equipeByKey = useMemo(() => {
    const map = new Map<string, { id: number; name: string; role: string }>();
    (membrosEquipeQuery ?? []).forEach((m) => {
      const key = m.name.split(" ")[0].toLowerCase();
      map.set(key, { id: m.id, name: m.name, role: m.role });
    });
    return map;
  }, [membrosEquipeQuery]);

  const parceirosByKey = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    (parceirosQuery ?? []).forEach((p) => {
      const key = p.name.split(" ")[0].toLowerCase();
      map.set(key, { id: p.id, name: p.name });
    });
    return map;
  }, [parceirosQuery]);

  const handleStatusChange = (demandaId: string, newStatus: string) => {
    const key = newStatus.toLowerCase();
    const numericId = parseInt(demandaId, 10);
    const demanda = demandas.find((d) => d.id === demandaId);

    // 0a) Drop em subsection "Delegados" → no-op (não cancela delegação existente).
    if (key === "delegado") return;

    // 0) Drop em coluna "Delegação" / subsection "A delegar" → abre seletor de pessoa.
    if ((key === "delegar" || key === "a_delegar") && demanda) {
      setPessoaSelectorDemanda({
        demandaId: isNaN(numericId) ? null : numericId,
        demandaAto: demanda.ato || "",
        assistidoId: demanda.assistidoId || null,
        assistidoNome: demanda.assistido || "",
        processoId: demanda.processoId || null,
        processoNumero: demanda.processos?.[0]?.numero || "",
      });
      setPessoaSelectorOpen(true);
      return;
    }

    // 1) Drop em membro da equipe → delegação. Abre modal, sem mutation no banco.
    const membro = equipeByKey.get(key);
    if (membro && demanda) {
      setDelegacaoDemanda({
        demandaId: isNaN(numericId) ? null : numericId,
        demandaAto: demanda.ato || "",
        assistidoId: demanda.assistidoId || null,
        assistidoNome: demanda.assistido || "",
        processoId: demanda.processoId || null,
        processoNumero: demanda.processos?.[0]?.numero || "",
        destinatarioNome: membro.name,
      });
      setDelegacaoModalOpen(true);
      return;
    }

    // 2) Drop em colega defensor → abre mini-menu com 3 opções antes de abrir o modal.
    const parceiro = parceirosByKey.get(key);
    if (parceiro && demanda) {
      setColegaDropContext({
        demandaId: isNaN(numericId) ? null : numericId,
        processoId: demanda.processoId || null,
        assistidoId: demanda.assistidoId || null,
        display: `${demanda.assistido ?? ""} · ${demanda.ato ?? "Demanda"}`.trim(),
        destinatarioId: parceiro.id,
        destinatarioNome: parceiro.name,
      });
      setColegaModalTipo(null);
      return;
    }

    // 3) Status real → atualizar localmente e no banco (comportamento original).
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus, substatus: newStatus } : d))
    );
    if (!isNaN(numericId)) {
      const dbStatus = UI_STATUS_TO_DB[newStatus] || newStatus.toUpperCase().replace(/ /g, "_");
      updateDemandaMutation.mutate({
        id: numericId,
        status: dbStatus as any,
        substatus: newStatus,
      });
    }

    // Gatilho recurso (mantém comportamento existente).
    if (newStatus.toLowerCase() === "protocolado" && !isNaN(numericId)) {
      const info = infoDoAtoRecurso(demanda?.ato);
      if (info) {
        setRecursoModal({
          open: true,
          demandaId: numericId,
          assistidoNome: demanda?.assistido,
          numeroAutosOrigem: demanda?.processos?.[0]?.numero,
          tipo: info.tipo,
          rotulo: info.rotulo,
          exigeNumero: info.exigeNumero,
        });
      }
    }
  };

  // Handler para delegação direta (via botão no card/row)
  const handleDelegateDirectly = (demanda: any) => {
    setDelegacaoDemanda({
      demandaId: parseInt(demanda.id, 10) || null,
      demandaAto: demanda.ato || "",
      assistidoId: demanda.assistidoId || null,
      assistidoNome: demanda.assistido || "",
      processoId: demanda.processoId || null,
      processoNumero: demanda.processos?.[0]?.numero || "",
      destinatarioNome: "",
    });
    setDelegacaoModalOpen(true);
  };

  // Handler para delegação em lote
  const handleBatchDelegate = () => {
    if (selectedIds.size === 0) return;
    setBatchDelegacaoOpen(true);
  };

  // Demandas selecionadas para batch
  const selectedDemandasForBatch = useMemo(() => {
    return demandas
      .filter(d => selectedIds.has(d.id))
      .map(d => ({
        id: parseInt(d.id, 10) || 0,
        ato: d.ato,
        processoNumero: d.processos?.[0]?.numero,
        assistidoNome: d.assistido,
      }));
  }, [demandas, selectedIds]);

  const handleAtoChange = (demandaId: string, newAto: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, ato: newAto } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({
        id: numericId,
        ato: newAto,
      });
    }

    toast.success(`Ato alterado para "${newAto}"!`, {
      description: "O prazo será recalculado automaticamente conforme o tipo de ato."
    });

    // Gatilho: "Ciência designação/redesignação de audiência" → abrir modal
    // de confirmação, pré-preenchendo com dados detectados em providências.
    // Antes de abrir, confere se o processo já tem audiência futura (ex.:
    // agendada pelo parser do registro de ciência) — nesse caso só informa.
    if (!isNaN(numericId) && isAtoAudiencia(newAto)) {
      const demanda = demandas.find((d) => d.id === demandaId);
      const abrirModal = () =>
        setAudienciaModal({
          open: true,
          demandaId: numericId,
          assistidoNome: demanda?.assistido,
          numeroAutos: demanda?.processos?.[0]?.numero,
          sources: [demanda?.providencias, demanda?.ato, newAto],
        });
      const processoId = demanda?.processoId ?? null;
      if (!processoId) {
        abrirModal();
        return;
      }
      void utils.audiencias.proximaAgendada
        .fetch({ processoId })
        .then((existente) => {
          if (!existente) {
            abrirModal();
            return;
          }
          const dt = new Date(existente.dataAudiencia);
          const quando = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
          toast.info("Audiência já agendada para este processo", {
            description: `${existente.tipo} — ${quando}${existente.horario ? ` às ${existente.horario}` : ""}. Se a data mudou, ajuste na tela de Audiências.`,
          });
        })
        .catch(() => abrirModal());
    }
  };

  // Task 6 (registros tipados): handleProvidenciasChange foi removido.
  // A edição de providências agora ocorre via timeline de registros (RegistrosTimeline +
  // NovoRegistroButton com tipoDefault="providencia"). O editor inline antigo foi
  // desconectado — sub-componentes que aceitam onProvidenciasChange devem receber undefined
  // ou um stub que orienta o usuário para o painel novo.
  const handleProvidenciasChangeLegacy = () => {
    toast.info("Use a timeline de registros para registrar uma providência.");
  };

  const handleAssistidoChange = (demandaId: string, nome: string) => {
    // Optimistic update local
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, assistido: nome } : d))
    );

    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, assistidoNome: nome });
    }

    toast.success("Nome atualizado!");
  };

  const handleProcessoChange = (demandaId: string, numero: string) => {
    // Normaliza para a máscara CNJ quando há 20 dígitos; senão preserva o texto
    // (o defensor pode registrar um número provisório/incompleto).
    const digits = onlyDigits(numero);
    const numeroNormalizado = digits.length === 20 ? formatCnj(digits) : numero;

    // Optimistic update local
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId
          ? { ...d, processos: d.processos?.length ? [{ ...d.processos[0], numero: numeroNormalizado }] : [{ tipo: "", numero: numeroNormalizado }] }
          : d
      )
    );

    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, processoNumero: numeroNormalizado });
    }

    // DV não confere → avisa, mas NÃO bloqueia (número pode ser provisório).
    if (digits.length === 20 && !isValidCnj(digits)) {
      toast.warning("DV do CNJ não confere — confira o número do processo.");
    } else {
      toast.success("Numero do processo atualizado!");
    }
  };

  // Vincular demanda a um assistido existente (via autocomplete)
  const handleAssistidoLink = (demandaId: string, assistidoId: number, nome: string) => {
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId ? { ...d, assistido: nome, assistidoId: assistidoId } : d
      )
    );
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, assistidoId });
    }
    toast.success(`Assistido vinculado: ${nome}`);
  };

  // Vincular demanda a um processo existente (via autocomplete)
  const handleProcessoLink = (demandaId: string, processoId: number, numero: string) => {
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId
          ? { ...d, processos: [{ tipo: d.processos?.[0]?.tipo || "", numero }], processoId }
          : d
      )
    );
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, processoId });
    }
    toast.success(`Processo vinculado: ${numero}`);
  };

  // Funções de busca para InlineAutocomplete — devem ser PURAS (sem setState)
  const searchAssistidosFn = useCallback((query: string) => {
    if (query.length < 2) return [];
    return assistidoSearchResults.map((a) => ({
      id: a.id,
      label: a.nome,
      sublabel: a.cpf || a.statusPrisional || undefined,
    }));
  }, [assistidoSearchResults]);

  const searchProcessosFn = useCallback((query: string) => {
    if (query.length < 2) return [];
    return processoSearchResults.map((p) => ({
      id: p.id,
      label: p.numeroAutos,
      sublabel: [p.vara, p.area].filter(Boolean).join(" - ") || undefined,
    }));
  }, [processoSearchResults]);

  const handlePrazoChange = (demandaId: string, newPrazo: string) => {
    // newPrazo chega como YYYY-MM-DD do date picker
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId
          ? { ...d, prazo: new Date(newPrazo + "T12:00:00").toLocaleDateString("pt-BR") }
          : d
      )
    );

    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({
        id: numericId,
        prazo: newPrazo,
      });
    }

    toast.success("Prazo atualizado!");
  };

  const ATRIBUICAO_LABEL_TO_ENUM: Record<string, string> = {
    "Tribunal do Júri": "JURI_CAMACARI",
    "Grupo Especial do Júri": "GRUPO_JURI",
    "Violência Doméstica": "VVD_CAMACARI",
    "Execução Penal": "EXECUCAO_PENAL",
    "Substituição Criminal": "SUBSTITUICAO",
    "Curadoria Especial": "SUBSTITUICAO_CIVEL",
  };

  const handleAtribuicaoChange = (demandaId: string, newAtribuicao: string) => {
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId ? { ...d, atribuicao: newAtribuicao } : d
      )
    );

    const numericId = parseInt(demandaId, 10);
    const enumValue = ATRIBUICAO_LABEL_TO_ENUM[newAtribuicao];
    if (!isNaN(numericId) && enumValue) {
      updateDemandaMutation.mutate({
        id: numericId,
        atribuicao: enumValue as any,
      });
    }

    toast.success(`Atribuição alterada para "${newAtribuicao}"!`);
  };

  // Update do tipo de processo. Atualiza local primeiro (otimista) e
  // dispara mutation no processo subjacente (não na demanda). Útil pra
  // corrigir importações com tipo errado.
  const updateProcessoTipoMutation = trpc.processos.update.useMutation({
    onError: () => toast.error("Falha ao atualizar tipo do processo"),
  });
  const handleTipoProcessoChange = (processoId: string, newTipo: string) => {
    const pid = parseInt(processoId, 10);
    if (isNaN(pid)) return;
    setDemandas((prev) =>
      prev.map((d) =>
        d.processoId === pid
          ? { ...d, processos: [{ ...(d.processos?.[0] ?? { numero: "" }), tipo: newTipo }] }
          : d,
      ),
    );
    updateProcessoTipoMutation.mutate({ id: pid, tipoProcesso: newTipo });
    toast.success(`Tipo alterado para "${newTipo}"`);
  };

  // Update do nome do assistido. Reflete em todas as demandas vinculadas
  // (filtramos por assistidoId). Mutation no router de assistidos.
  const updateAssistidoNomeMutation = trpc.assistidos.update.useMutation({
    onError: () => toast.error("Falha ao atualizar nome do assistido"),
  });
  const handleAssistidoNomeChange = (assistidoId: string, newNome: string) => {
    const aid = parseInt(assistidoId, 10);
    if (isNaN(aid)) return;
    const trimmed = newNome.trim();
    if (trimmed.length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    setDemandas((prev) =>
      prev.map((d) => (d.assistidoId === aid ? { ...d, assistido: trimmed } : d)),
    );
    updateAssistidoNomeMutation.mutate({ id: aid, nome: trimmed });
    toast.success(`Assistido atualizado: ${trimmed}`);
  };

  const handleSaveNewDemanda = (demandaData: DemandaFormData) => {
    // Persiste no banco via tRPC. A mutation resolve assistido/processo por
    // nome/número (find-or-create), converte status/atribuição e dispara o
    // sync da planilha. O modal fecha e a lista invalida no onSuccess.
    const primeiroProcesso = demandaData.processos?.[0];
    const reuPreso = (demandaData.estadoPrisional ?? "").toLowerCase() !== "solto"
      && (demandaData.estadoPrisional ?? "").trim() !== "";

    createFromFormMutation.mutate({
      assistidoNome: demandaData.assistido,
      assistidoId: demandaData.assistidoId ?? undefined,
      numeroAutos: primeiroProcesso?.numero || undefined,
      tipoProcesso: primeiroProcesso?.tipo || undefined,
      atribuicao: demandaData.atribuicao,
      ato: demandaData.ato || "Demanda",
      status: demandaData.status || "triagem",
      dataExpedicao: demandaData.data || undefined,
      prazo: demandaData.prazo || undefined,
      providencias: demandaData.providencias || undefined,
      reuPreso,
    });
  };

  const handleEditDemanda = (demanda: any) => {
    setEditingDemanda({
      ...demanda,
      processos: demanda.processos || [],
      providencias: demanda.providencias || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: DemandaFormData) => {
    if (editingDemanda) {
      setDemandas((prev) =>
        prev.map((d) => (d.id === editingDemanda.id ? { ...d, ...data } : d))
      );
      toast.success("Demanda atualizada!");
      setIsEditModalOpen(false);
      setEditingDemanda(null);
    }
  };

  const handleArchiveDemanda = (id: string) => {
    // Arquivar = mudar status para ARQUIVADO no banco
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, status: "ARQUIVADO" });
    } else {
      // Para demandas mock (string id), apenas atualiza estado local
      setDemandas((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, arquivado: true, dataArquivamento: new Date().toISOString() }
            : d
        )
      );
      toast.success("Demanda arquivada!");
    }
  };

  const handleUnarchiveDemanda = (id: string) => {
    // Desarquivar = mudar status de volta para FILA
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, status: "5_TRIAGEM" });
    } else {
      // Para demandas mock (string id), apenas atualiza estado local
      setDemandas((prev) =>
        prev.map((d) => (d.id === id ? { ...d, arquivado: false, dataArquivamento: undefined } : d))
      );
      toast.success("Demanda desarquivada!");
    }
  };

  const handleDeleteDemanda = (id: string) => {
    if (confirm("Deseja deletar esta demanda? Esta ação não pode ser desfeita.")) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        // Deletar no banco de dados (soft delete)
        deleteDemandaMutation.mutate({ id: numericId });
      } else {
        // Para demandas mock (string id), apenas atualiza estado local
        setDemandas((prev) => prev.filter((d) => d.id !== id));
        toast.success("Demanda deletada!");
      }
    }
  };

  const handleToggleSelect = (id: string, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
    if (event?.shiftKey && lastSelectedId.current !== null && lastSelectedId.current !== id) {
      // Range over the on-screen order (see selection-range.ts). The Kanban's nested
      // column layout means the flat demandasOrdenadas index would skip cards that sit
      // visually between the two clicks.
      const range = shiftRangeIds(
        orderedCardIds(demandasOrdenadas.map((d) => d.id)),
        lastSelectedId.current,
        id,
      );
      if (range.length > 0) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const rid of range) next.add(rid);
          return next;
        });
        // Anchor moves to the clicked card so subsequent shift+clicks extend from here.
        lastSelectedId.current = id;
        if (!isSelectMode) setIsSelectMode(true);
        return;
      }
      // If either card isn't in the rendered order, fall through to individual toggle.
    }

    // Individual toggle
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    lastSelectedId.current = id;

    // Auto-enable select mode on first selection
    if (!isSelectMode) setIsSelectMode(true);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === demandasOrdenadas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(demandasOrdenadas.map((d) => d.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja deletar ${selectedIds.size} demanda(s)? Esta ação não pode ser desfeita.`)) return;

    for (const id of selectedIds) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        deleteDemandaMutation.mutate({ id: numericId });
      }
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleBatchStatusChange = (substatus: string) => {
    if (selectedIds.size === 0) return;
    const numericIds = Array.from(selectedIds).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericIds.length === 0) return;

    // Mapear substatus granular → status DB
    const dbStatus = UI_STATUS_TO_DB[substatus] || "2_ATENDER";

    batchUpdateMutation.mutate(
      { ids: numericIds, status: dbStatus as any, substatus },
      {
        onSuccess: (result) => {
          const label = DEMANDA_STATUS[substatus as keyof typeof DEMANDA_STATUS]?.label || substatus;
          toast.success(`Status de ${result.updated} demanda(s) atualizado para "${label}"`);
          setSelectedIds(new Set());
          setIsSelectMode(false);
        },
      }
    );
  };

  const handleBatchAtoChange = (newAto: string) => {
    if (selectedIds.size === 0) return;
    const numericIds = Array.from(selectedIds).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericIds.length === 0) return;

    batchUpdateMutation.mutate(
      { ids: numericIds, ato: newAto },
      {
        onSuccess: (result) => {
          toast.success(`Ato de ${result.updated} demanda(s) alterado para "${newAto}"`);
          setSelectedIds(new Set());
          setIsSelectMode(false);
        },
      }
    );
  };

  // Mapeamento de nome amigável → DB enum para atribuição
  const ATRIBUICAO_LABEL_TO_DB: Record<string, string> = {
    "Tribunal do Júri": "JURI_CAMACARI",
    "Violência Doméstica": "VVD_CAMACARI",
    "Execução Penal": "EXECUCAO_PENAL",
    "Substituição Criminal": "SUBSTITUICAO",
    "Grupo Especial do Júri": "GRUPO_JURI",
    "Curadoria Especial": "SUBSTITUICAO_CIVEL",
  };

  const handleBatchAtribuicaoChange = (newAtribuicao: string) => {
    if (selectedIds.size === 0) return;
    const numericIds = Array.from(selectedIds).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericIds.length === 0) return;

    const dbAtribuicao = ATRIBUICAO_LABEL_TO_DB[newAtribuicao];
    if (!dbAtribuicao) return;

    batchUpdateMutation.mutate(
      { ids: numericIds, atribuicao: dbAtribuicao as any },
      {
        onSuccess: (result) => {
          toast.success(`Atribuição de ${result.updated} demanda(s) alterada para "${newAtribuicao}"`);
          setSelectedIds(new Set());
          setIsSelectMode(false);
        },
      }
    );
  };

  const handleBatchCopy = () => {
    if (selectedIds.size === 0) return;
    const header = "Assistido\tProcesso\tAto\tPrazo\tStatus\tProvidências";
    const rows = demandas
      .filter(d => selectedIds.has(d.id))
      .map(d => [d.assistido, d.processos?.[0]?.numero || "-", d.ato, d.prazo || "-", d.substatus || d.status, d.providencias || "-"].join("\t"))
      .join("\n");
    navigator.clipboard.writeText(`${header}\n${rows}`).then(() => {
      toast.success(`${selectedIds.size} linhas copiadas!`);
    });
  };

  // Copia as demandas selecionadas em formato pronto pra colar em corpo
  // de email (delegação). Cada demanda em bloco com nome do assistido,
  // ato e número dos autos.
  const handleBatchCopyEmail = () => {
    if (selectedIds.size === 0) return;
    const list = demandas.filter(d => selectedIds.has(d.id));
    if (list.length === 0) return;
    const lines: string[] = [];
    lines.push(`Demandas para delegação (${list.length}):`);
    lines.push("");
    list.forEach((d, i) => {
      const ato = d.ato || "Demanda";
      const autos = d.processos?.[0]?.numero || "—";
      lines.push(`${i + 1}) ${d.assistido} — ${ato}`);
      lines.push(`   Autos: ${autos}`);
      if (d.prazo) lines.push(`   Prazo: ${d.prazo}`);
      lines.push("");
    });
    const text = lines.join("\n").trimEnd();
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${list.length} demanda${list.length !== 1 ? "s" : ""} copiada${list.length !== 1 ? "s" : ""} pro email`);
    });
  };

  const handleExitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
    lastSelectedId.current = null;
  };

  const handleReorderSheets = async () => {
    setIsSettingsDropdownOpen(false);
    const toastId = toast.loading("Reordenando planilha...");
    try {
      const result = await reorderSheetsMutation.mutateAsync(undefined);
      toast.dismiss(toastId);
      const withErrors = result.sheets.filter((s) => s.error);
      if (withErrors.length > 0) {
        toast.warning(
          `Reordenado com ${withErrors.length} erro(s): ${withErrors.map((s) => s.sheet).join(", ")}`,
        );
      } else {
        toast.success(
          `Planilha reordenada: ${result.totalWritten} linhas em ${result.sheets.length} aba(s)`,
        );
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Falha ao reordenar: ${err?.message ?? "erro desconhecido"}`);
    }
  };

  const handleExportSheets = async () => {
    setIsSettingsDropdownOpen(false);
    const toastId = toast.loading("Exportando para Google Sheets...");
    try {
      const result = await exportToSheetsMutation.mutateAsync({
        titulo: "OMBUDS - Demandas",
        filtros: {
          atribuicao: selectedAtribuicoes[0] ?? undefined,
          status: selectedStatusGroup ?? undefined,
          search: searchTerm || undefined,
        },
      });
      toast.dismiss(toastId);
      toast.success(`Planilha criada com ${result.totalRows} demandas`, {
        duration: 8000,
        action: {
          label: "Abrir",
          onClick: () => window.open(result.spreadsheetUrl, "_blank"),
        },
      });
      window.open(result.spreadsheetUrl, "_blank");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message ?? "Erro ao exportar para Google Sheets");
    }
  };

  const importFromSheetsMutation = trpc.demandas.importFromSheets.useMutation({
    onSuccess: (result) => {
      utils.demandas.list.invalidate();
      utils.demandas.stats.invalidate();
      const messages: string[] = [];
      if (result.imported > 0) messages.push(`${result.imported} importadas`);
      if ((result as any).updated > 0) messages.push(`${(result as any).updated} atualizadas`);
      if (result.skipped > 0) messages.push(`${result.skipped} ignoradas`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} erros`);
      if (messages.length === 0) messages.push("nenhuma alteração detectada");
      toast.success(`Importação concluída: ${messages.join(", ")}`);
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
      // Alerta Solar: mostrar se há assistidos importados sem exportação ao Solar
      if (result.assistidosSemSolar > 0) {
        toast.warning(
          `${result.assistidosSemSolar} assistido${result.assistidosSemSolar > 1 ? "s" : ""} importado${result.assistidosSemSolar > 1 ? "s" : ""} não está${result.assistidosSemSolar > 1 ? "ão" : ""} no Solar`,
          {
            duration: 8000,
            description: "Exporte ao Solar para manter os sistemas sincronizados.",
            action: {
              label: "Ir para Solar",
              onClick: () => {
                window.location.href = "/admin/intimacoes?tab=assistidos";
              },
            },
          }
        );
      }
    },
    onError: (error) => {
      toast.error("Erro na importação: " + error.message);
    },
  });

  const handleImportDemandas = async (importedData: any[], atualizarExistentes?: boolean) => {
    // Gerar UUID do lote de importação para agrupar demandas importadas juntas
    const importBatchId = crypto.randomUUID();

    // Mapear dados do modal para o formato esperado pela mutation
    const rows = importedData.map((data, index) => ({
      assistido: data.assistido || "Não informado",
      processoNumero: data.processos?.[0]?.numero || "",
      ato: data.ato || "Outros",
      prazo: data.prazo || undefined,
      dataEntrada: data.data || undefined,
      // dataExpedicaoCompleta para verificação de duplicatas (inclui data+hora se disponível)
      // Vem do pjeData.dataExpedicao (PJe) ou data (se já tiver hora)
      dataExpedicaoCompleta: data.pjeData?.dataExpedicao || data.data || undefined,
      // Usar dataInclusao se fornecida (para ordenação precisa do SEEU/PJe)
      dataInclusao: data.dataInclusao || undefined,
      status: data.status || "triagem",
      estadoPrisional: data.estadoPrisional || "solto",
      providencias: data.providencias || undefined,
      atribuicao: data.atribuicao || "Substituição Criminal",
      // Rastreamento de importação
      importBatchId,
      ordemOriginal: data.pjeData?.ordemOriginal ?? index, // Posição original no texto colado
      // PJe Import v2: vinculação direta com assistido existente
      assistidoMatchId: data.assistidoMatchId || undefined,
      // PJe pass-through de dados (Fase 1)
      tipoDocumento: data.pjeData?.tipoDocumento || undefined,
      crime: data.pjeData?.crime || undefined,
      tipoProcesso: data.pjeData?.tipoProcesso || undefined,
      vara: data.pjeData?.vara || undefined,
      idDocumentoPje: data.pjeData?.idDocumento || undefined,
      atribuicaoDetectada: data.pjeData?.atribuicaoDetectada || undefined,
      // Audiência fields (from PJe Import v2 audiência detection)
      audienciaData: data.audienciaData || undefined,
      audienciaHora: data.audienciaHora || undefined,
      audienciaTipo: data.audienciaTipo || undefined,
      criarEventoAgenda: data.criarEventoAgenda || undefined,
    }));

    // Usar mutateAsync para retornar resultado ao modal (exibe confirmação do servidor)
    return importFromSheetsMutation.mutateAsync({ rows, atualizarExistentes: atualizarExistentes ?? true });
  };

  // Função para atualizar demandas existentes (usado pelo SheetsImportModal)
  // Processa em batches para evitar esgotar o pool de conexões do banco
  const handleUpdateDemandas = async (updatedData: any[]) => {
    const BATCH_SIZE = 5; // Processar 5 por vez para não sobrecarregar o banco
    const DELAY_BETWEEN_BATCHES = 300; // 300ms entre batches

    // Mapear status da planilha para status válido do enum
    // Chaves são em minúsculas para comparação case-insensitive
    const statusMap: Record<string, string> = {
      // 1 - Urgente
      'urgente': 'Urgente',

      // 2 - Análise/Elaboração
      'analisar': 'Analisar',
      'relatório': 'Relatório',
      'relatorio': 'Relatório',
      'atender': 'Atender',
      'elaborar': 'Elaborar',
      'buscar': 'Buscar',
      'revisar': 'Revisar',
      'elaborando': 'Elaborando',

      // 3 - Protocolar
      'protocolar': 'Protocolar',

      // 4 - Delegação para pessoas/estágios
      'amanda': 'Amanda',
      'estágio - taissa': 'Estágio - Taissa',
      'estagio - taissa': 'Estágio - Taissa',
      'taissa': 'Estágio - Taissa',
      'emilly': 'Emilly',
      'monitorar': 'Monitorar',

      // 5 - Triagem
      'triagem': 'Triagem',

      // 6 - Documentos/Testemunhas
      'documentos': 'Documentos',
      'testemunhas': 'Testemunhas',

      // 7 - Finalizados
      'protocolado': 'Protocolado',
      'sigad': 'Sigad',
      'ciência': 'Ciência',
      'ciencia': 'Ciência',
      'peticionamento irregular': 'Peticionamento irregular',
      'resolvido': 'Resolvido',
      'constituiu advogado': 'Constituiu advogado',
      'sem atuação': 'Sem atuação',
      'sem atuacao': 'Sem atuação',
      'arquivado': 'ARQUIVADO',
    };

    // Dividir em batches
    const batches: any[][] = [];
    for (let i = 0; i < updatedData.length; i += BATCH_SIZE) {
      batches.push(updatedData.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      // Processar cada item do batch sequencialmente
      for (const data of batch) {
        try {
          // Converter ID para número se for string
          const numericId = typeof data.id === 'string' ? parseInt(data.id, 10) : data.id;

          // Ignorar se não conseguiu converter para número válido
          if (isNaN(numericId)) {
            console.warn(`ID inválido para atualização: ${data.id}`);
            errorCount++;
            continue;
          }

          const statusNormalizado = data.status?.toLowerCase?.() || 'triagem';
          // Busca no mapa, se não encontrar usa o status original (capitalizado)
          const substatusValido = statusMap[statusNormalizado] || data.status || 'Triagem';

          // A mutation espera {id, ...campos} não {id, data: {...}}
          // O status da planilha vai para substatus (status granular)
          await updateDemandaMutation.mutateAsync({
            id: numericId,
            ato: data.ato || undefined,
            prazo: data.prazo || undefined,
            substatus: substatusValido, // Status granular da planilha
            providencias: data.providencias || undefined,
            reuPreso: data.estadoPrisional?.toLowerCase?.() === 'preso',
            // Atribuição - atualiza o processo vinculado
            atribuicao: data.atribuicao || undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`Erro ao atualizar demanda ${data.id}:`, error);
          errorCount++;
        }
      }

      // Pausa entre batches (exceto no último)
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Feedback ao usuário
    if (errorCount > 0) {
      toast.warning(`${successCount} atualizadas, ${errorCount} com erro`);
    } else {
      toast.success(`${successCount} demandas atualizadas!`);
    }

    // Invalidar cache após atualizações
    utils.demandas.list.invalidate();
  };

  const toggleChart = (chartType: string) => {
    setSelectedCharts((prev) => {
      if (prev.includes(chartType)) {
        return prev.filter((c) => c !== chartType);
      } else if (prev.length < 4) {
        return [...prev, chartType];
      }
      toast.error("Máximo de 4 gráficos");
      return prev;
    });
  };

  // Referência para todas as demandas (não filtradas)
  const allDemandas = demandas;

  // Filtrar demandas
  const demandasFiltradas = useMemo(() => {
    return demandas.filter((demanda) => {
      // Filtro por profissional ativo (R/J/Geral)
      const matchProfissional = isVisaoGeral ||
        demanda.defensorId === defensorUserId;
      const matchArchived = showArchived ? demanda.arquivado : !demanda.arquivado;
      const processosText = demanda.processos.map((p) => `${p.tipo} ${p.numero}`).join(" ");
      const matchSearch =
        demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        processosText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demanda.ato.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPrazoFilter = (() => {
        if (!selectedPrazoFilter) return true;
        if (selectedPrazoFilter === "prazo") return !!demanda.prazo;
        if (selectedPrazoFilter === "sem-prazo") return !demanda.prazo;
        if (!demanda.prazo) return false;
        try {
          const parts = demanda.prazo.split("/").map(Number);
          if (parts.length < 3) return false;
          const [dia, mes, ano] = parts;
          const fullYear = ano < 100 ? 2000 + ano : ano;
          const prazoDate = new Date(fullYear, mes - 1, dia);
          prazoDate.setHours(0, 0, 0, 0);
          const hojeDate = new Date(); hojeDate.setHours(0, 0, 0, 0);
          const diff = Math.ceil((prazoDate.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24));
          if (selectedPrazoFilter === "vencidos") return diff < 0;
          if (selectedPrazoFilter === "hoje") return diff === 0;
          if (selectedPrazoFilter === "semana") return diff > 0 && diff <= 7;
        } catch { return false; }
        return true;
      })();
      const matchAtribuicao =
        selectedAtribuicoes.length === 0 || selectedAtribuicoes.includes(demanda.atribuicao);
      const matchEstadoPrisional =
        !selectedEstadoPrisional || demanda.estadoPrisional === selectedEstadoPrisional;
      const matchTipoAto =
        !selectedTipoAto || demanda.tipoAto === selectedTipoAto;
      const matchTipoProcesso =
        !selectedTipoProcesso || (demanda.processos?.[0]?.tipo === selectedTipoProcesso);
      // MPU detectado no nível da INTIMAÇÃO (demanda.isMpu, do servidor) — não pela
      // classe do processo (MPUMPCrim costuma viver dentro de processo AP).
      const ehMpu = (demanda as { isMpu?: boolean }).isMpu === true;
      const matchMpu =
        mpuFilter === "all" ? true :
        mpuFilter === "only_mpu" ? ehMpu :
        /* without_mpu */ !ehMpu;
      const matchStatusGroup =
        !selectedStatusGroup ||
        selectedStatusGroup.includes(getDemandaGroup(demanda));

      return (
        matchProfissional &&
        matchArchived &&
        matchSearch &&
        matchPrazoFilter &&
        matchAtribuicao &&
        matchStatusGroup &&
        matchEstadoPrisional &&
        matchTipoAto &&
        matchTipoProcesso &&
        matchMpu
      );
    });
  }, [demandas, searchTerm, selectedPrazoFilter, selectedAtribuicoes, selectedEstadoPrisional, selectedTipoAto, selectedTipoProcesso, selectedStatusGroup, mpuFilter, showArchived, defensorUserId, isVisaoGeral]);

  // Adapta linha snake_case (raw SQL de demandaEventos) ao shape camelCase EventoLine
  function toEventoLine(row: any): any {
    if (!row) return null;
    return {
      id: row.id,
      tipo: row.tipo,
      subtipo: row.subtipo ?? null,
      status: row.status ?? null,
      resumo: row.resumo,
      prazo: row.prazo ?? null,
      createdAt: row.created_at ?? row.createdAt ?? new Date(),
    };
  }

  // Enriquecimento das demandas filtradas com last/pendente eventos para o Kanban
  const demandasFiltradasComEventos = useMemo(() => {
    return demandasFiltradas.map((d: any) => ({
      ...d,
      lastEvento: toEventoLine((lastEventosByDemanda as any)[Number(d.id)]),
      pendenteEvento: toEventoLine((pendentesEventosByDemanda as any)[Number(d.id)]),
    }));
  }, [demandasFiltradas, lastEventosByDemanda, pendentesEventosByDemanda]);

  // Filtros rápidos (atrasados/hoje/...) — DECLARADO AQUI pra ficar antes
  // dos useMemo abaixo que referenciam pillFilters. Mover pra baixo dispara
  // TDZ em build de produção (Cannot access 'pillFilters' before init).
  const [pillFilters, setPillFilters] = useState<Set<PillKey>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(PILL_STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw) as PillKey[]);
    } catch {
      // ignore
    }
    return new Set();
  });

  // Pills do header (atrasados/hoje/...) — aplicados em cima do conjunto já
  // filtrado por área, atribuição etc. Vazio = sem filtro de pill.
  const demandasComPills = useMemo(() => {
    if (pillFilters.size === 0) return demandasFiltradasComEventos;
    return demandasFiltradasComEventos.filter((d: any) => {
      for (const pill of pillFilters) if (!matchesPill(d, pill)) return false;
      return true;
    });
  }, [demandasFiltradasComEventos, pillFilters]);

  // Contagens por pill — aparece no popover pra dar leitura instantânea.
  const pillCounts = useMemo(() => {
    const counts: Record<PillKey, number> = {
      atrasados: 0, hoje: 0, semana: 0, sem_prazo: 0,
      expedidas_hoje: 0, expedidas_semana: 0,
      reu_preso: 0,
    };
    for (const d of demandasFiltradasComEventos) {
      for (const { key } of PILL_CONFIG) {
        if (matchesPill(d as any, key)) counts[key]++;
      }
    }
    return counts;
  }, [demandasFiltradasComEventos]);

  // Handler para click no header de coluna (multi-column sort)
  const handleReorder = useCallback((activeId: string, overId: string) => {
    setDemandas((prev) => {
      const oldIndex = prev.findIndex((d) => d.id === activeId);
      const newIndex = prev.findIndex((d) => d.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      // Persist order to DB (fire-and-forget)
      reordenarMutation.mutate({
        items: reordered.map((item, index) => ({ id: Number(item.id), ordem: index })),
      });
      return reordered;
    });
  }, [reordenarMutation]);

  const handleColumnSort = useCallback((columnId: string) => {
    setSortStack(prev => {
      const existingIdx = prev.findIndex(s => s.column === columnId);
      if (existingIdx === -1) {
        // Nova coluna: adiciona no topo (prioridade mais alta)
        return [{ column: columnId, direction: "asc" as const }, ...prev];
      }
      const existing = prev[existingIdx];
      if (existing.direction === "asc") {
        // Segunda vez: inverter para desc
        const next = [...prev];
        next[existingIdx] = { ...existing, direction: "desc" as const };
        return next;
      }
      // Terceira vez: remover o critério
      return prev.filter((_, i) => i !== existingIdx);
    });
  }, []);

  // Função de comparação por coluna
  const STATUS_GROUP_ORDER = ["triagem", "preparacao", "diligencias", "saida", "acompanhar", "concluida", "arquivado"];

  function compareByColumn(a: any, b: any, column: string): number {
    switch (column) {
      case "assistido":
        return (a.assistido || "").localeCompare(b.assistido || "");
      case "processo":
        return (a.processos?.[0]?.numero || "").localeCompare(b.processos?.[0]?.numero || "");
      case "ato": {
        const pa = ATO_PRIORITY[a.ato] ?? 50;
        const pb = ATO_PRIORITY[b.ato] ?? 50;
        return pa - pb;
      }
      case "prazo": {
        if (!a.prazo && !b.prazo) return 0;
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      }
      case "status": {
        const ga = STATUS_GROUP_ORDER.indexOf(getDemandaGroup(a));
        const gb = STATUS_GROUP_ORDER.indexOf(getDemandaGroup(b));
        return ga - gb;
      }
      case "atribuicao":
        return (a.atribuicao || "").localeCompare(b.atribuicao || "");
      case "recentes": {
        // 1. Ordenar por data de inclusão (mais novo primeiro)
        const dateA = a.dataInclusao || a.data || "";
        const dateB = b.dataInclusao || b.data || "";
        const dateCompare = dateB.localeCompare(dateA);
        if (dateCompare !== 0) return dateCompare;
        // 2. Dentro do mesmo lote, manter ordem original do PJe
        if (a.importBatchId && a.importBatchId === b.importBatchId) {
          const orderA = a.ordemOriginal ?? 999;
          const orderB = b.ordemOriginal ?? 999;
          return orderA - orderB;
        }
        // 3. Fallback: ID mais alto = mais recente
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      }
      default:
        return 0;
    }
  }

  // Ordenar demandas (multi-coluna)
  // Apply per-column filters after global filters
  const demandasColFiltered = useMemo(() => {
    const hasAnyFilter = Object.values(columnFilters).some(v => v.trim());
    if (!hasAnyFilter) return demandasFiltradas;

    return demandasFiltradas.filter(d => {
      for (const [colId, filterValue] of Object.entries(columnFilters)) {
        if (!filterValue.trim()) continue;
        const q = filterValue.toLowerCase();
        switch (colId) {
          case "assistido": if (!d.assistido?.toLowerCase().includes(q)) return false; break;
          case "processo": if (!d.processos?.[0]?.numero?.toLowerCase().includes(q)) return false; break;
          case "ato": if (!d.ato?.toLowerCase().includes(q)) return false; break;
          case "status": if (!(d.substatus || d.status)?.toLowerCase().includes(q)) return false; break;
          case "prazo": if (!d.prazo?.toLowerCase().includes(q)) return false; break;
          case "providencias": if (!d.providencias?.toLowerCase().includes(q)) return false; break;
        }
      }
      return true;
    });
  }, [demandasFiltradas, columnFilters]);

  const demandasOrdenadas = useMemo(() => {
    const sorted = [...demandasColFiltered];
    sorted.sort((a, b) => {
      // When groupBy is active, cluster by group first to avoid repeated headers
      if (groupBy) {
        const aGroup = groupBy === "status" ? a.status : a.atribuicao;
        const bGroup = groupBy === "status" ? b.status : b.atribuicao;
        if (aGroup !== bGroup) {
          return (aGroup || "").localeCompare(bGroup || "");
        }
      }
      // Then apply user's sort within each group
      for (const criterion of sortStack) {
        const cmp = compareByColumn(a, b, criterion.column);
        if (cmp !== 0) return criterion.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [demandasColFiltered, sortStack, groupBy]);

  // Progressive rendering — show first 20 instantly, reveal rest incrementally
  const { visibleItems: visibleDemandas, isComplete: allDemandasRendered } = useProgressiveList(demandasOrdenadas, 20, 20);

  // Estatísticas
  const statsData = useMemo(() => {
    const demandasAtivas = demandas.filter((d) => !d.arquivado);

    const emPreparacao = demandasAtivas.filter((d) =>
      ["elaborar", "elaborando", "revisar", "revisando"].includes(d.status.toLowerCase())
    ).length;

    const prazosCriticos = demandasAtivas.filter((d) => {
      if (!d.prazo) return false;
      try {
        const [dia, mes, ano] = d.prazo.split("/").map(Number);
        const prazo = new Date(2000 + ano, mes - 1, dia);
        const hoje = new Date();
        const diffDays = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      } catch {
        return false;
      }
    }).length;

    const totalComEstadoPrisional = demandasAtivas.filter((d) => d.estadoPrisional).length;
    const reusPresos = demandasAtivas.filter((d) => d.estadoPrisional === "preso").length;
    const percentualPresos =
      totalComEstadoPrisional > 0 ? Math.round((reusPresos / totalComEstadoPrisional) * 100) : 0;

    const comCautelar = demandasAtivas.filter((d) => d.estadoPrisional === "cautelar").length;

    return [
      {
        title: "Em Preparação",
        value: emPreparacao,
        subtitle: `${demandasAtivas.length > 0 ? Math.round((emPreparacao / demandasAtivas.length) * 100) : 0}% do total`,
        icon: FileEdit,
        gradient: "emerald" as const,
      },
      {
        title: "Prazos Críticos",
        value: prazosCriticos,
        subtitle: `${demandasAtivas.length > 0 ? Math.round((prazosCriticos / demandasAtivas.length) * 100) : 0}% do total`,
        icon: AlertTriangle,
        gradient: (prazosCriticos > 0 ? "rose" : "zinc") as "rose" | "zinc",
      },
      {
        title: "Réus Presos",
        value: `${percentualPresos}%`,
        subtitle: `${reusPresos} de ${totalComEstadoPrisional} réus`,
        icon: Lock,
        gradient: (reusPresos > 0 ? "amber" : "zinc") as "amber" | "zinc",
      },
      {
        title: "Cautelares Diversas",
        value: comCautelar,
        subtitle: `${totalComEstadoPrisional > 0 ? Math.round((comCautelar / totalComEstadoPrisional) * 100) : 0}% do total`,
        icon: ShieldCheck,
        gradient: "zinc" as const,
      },
    ];
  }, [demandas]);

  // Deadline urgency stats
  const deadlineStats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ativas = demandas.filter(d => !d.arquivado && d.prazo);
    let vencidas = 0, hojeCnt = 0, semanaCnt = 0;
    for (const d of ativas) {
      try {
        const parts = d.prazo.split("/").map(Number);
        if (parts.length < 3) continue;
        const [dia, mes, ano] = parts;
        const fullYear = ano < 100 ? 2000 + ano : ano;
        const prazo = new Date(fullYear, mes - 1, dia);
        prazo.setHours(0, 0, 0, 0);
        const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) vencidas++;
        else if (diff === 0) hojeCnt++;
        else if (diff <= 7) semanaCnt++;
      } catch { /* skip invalid */ }
    }
    return { vencidas, hoje: hojeCnt, semana: semanaCnt, total: vencidas + hojeCnt + semanaCnt };
  }, [demandas]);
  const [deadlineBannerDismissed, setDeadlineBannerDismissed] = useState(false);

  // Atribuição counts for pills
  const atribuicaoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of demandas) {
      if (!d.arquivado && d.atribuicao) {
        counts[d.atribuicao] = (counts[d.atribuicao] || 0) + 1;
      }
    }
    return counts;
  }, [demandas]);

  // Cor accent do icon-square baseada na atribuição ativa (echo visual com switcher)
  const headerAccentHex = useMemo(() => {
    if (selectedAtribuicoes.length === 1) {
      return ATRIBUICAO_BORDER_COLORS[selectedAtribuicoes[0]] ?? null;
    }
    return null;
  }, [selectedAtribuicoes]);

  // Contagem por tipo de processo dentro da atribuição/arquivado atual.
  // Base: respeita atribuição + arquivado, ignora o próprio tipoProcesso —
  // assim o chip ativo nunca some quando selecionado. Usado pra render
  // chips de facet "AP (X) | MPU (X) | …" só quando há múltiplos tipos.
  const tipoProcessoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let mpu = 0;
    for (const d of demandas) {
      const matchProfissional = isVisaoGeral || d.defensorId === defensorUserId;
      const matchArchived = showArchived ? d.arquivado : !d.arquivado;
      const matchAtribuicao =
        selectedAtribuicoes.length === 0 || selectedAtribuicoes.includes(d.atribuicao);
      if (!matchProfissional || !matchArchived || !matchAtribuicao) continue;
      const t = d.processos?.[0]?.tipo;
      if (t) counts[t] = (counts[t] || 0) + 1;
      if ((d as { isMpu?: boolean }).isMpu === true) mpu++;
    }
    // MPU = nível da intimação (isMpu), não a classe do processo — o switch MPU
    // do header usa este número (uma MPUMPCrim dentro de processo AP conta aqui).
    counts["MPU"] = mpu;
    return counts;
  }, [demandas, selectedAtribuicoes, showArchived, defensorUserId, isVisaoGeral]);

  // Ordem canônica + cores (espelha TIPO_PROCESSO_COLORS do DemandaQuickPreview).
  // Só os tipos com count > 0 são exibidos. Mostra a pílula apenas se houver
  // mais de um tipo distinto no recorte atual — caso contrário polui sem ganho.
  const tipoProcessoChips = useMemo(() => {
    const ORDER = ["AP", "MPU", "IP", "APF", "EP", "CAUTELAR", "ANPP", "OUTRO"];
    const COLORS: Record<string, string> = {
      AP: "#dc2626", IP: "#f59e0b", APF: "#ea580c", CAUTELAR: "#7c3aed",
      EP: "#2563eb", MPU: "#db2777", ANPP: "#0891b2", OUTRO: "#71717a",
    };
    const known = new Set(ORDER);
    const present = Object.keys(tipoProcessoCounts);
    const ordered = [
      ...ORDER.filter(k => tipoProcessoCounts[k] > 0),
      ...present.filter(k => !known.has(k) && tipoProcessoCounts[k] > 0),
    ];
    return ordered.map(tipo => ({
      tipo,
      count: tipoProcessoCounts[tipo],
      color: COLORS[tipo] ?? "#71717a",
    }));
  }, [tipoProcessoCounts]);

  const handleAtribuicaoToggle = (value: string) => {
    if (typeof window !== "undefined") sessionStorage.removeItem(SS_EXPLICIT_ALL);
    setSelectedAtribuicoes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
    setSelectedTipoProcesso(null);
  };

  // Single-select: always replaces (for kanban/planilha)
  const handleSingleAtribuicaoSelect = useCallback((value: string) => {
    if (typeof window !== "undefined") sessionStorage.removeItem(SS_EXPLICIT_ALL);
    setSelectedAtribuicoes([value]);
    setSelectedTipoProcesso(null);
  }, []);

  // "Todas": modo explícito de mostrar todas as atribuições, mesmo em
  // kanban/planilha. A flag em sessionStorage impede que o useEffect abaixo
  // re-selecione a primeira automaticamente.
  const handleClearAtribuicoes = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(SS_EXPLICIT_ALL, "true");
    setSelectedAtribuicoes([]);
    setSelectedTipoProcesso(null);
  }, []);

  // Default a partir de areasPrincipais quando user chega — só aplica se
  // não houver override em localStorage e usuário não escolheu "Todas".
  useEffect(() => {
    if (didInitFromUserAreas) return;
    if (!currentUser) return;
    setDidInitFromUserAreas(true);
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SS_EXPLICIT_ALL) === "true") return;
    if (localStorage.getItem(LS_DEFAULT_ATRIBUICAO)) return;
    if (selectedAtribuicoes.length > 0) return;
    const areas = currentUser.areasPrincipais ?? [];
    const validValues = new Set(atribuicaoOptions.map(o => o.value));
    const labels = areas
      .map(k => AREA_KEY_TO_ATRIBUICAO_LABEL[k] ?? k)
      .filter(l => validValues.has(l));
    if (labels.length > 0) {
      setSelectedAtribuicoes(labels);
    }
  }, [currentUser, didInitFromUserAreas, selectedAtribuicoes.length]);

  // Persistir override quando usuário muda manualmente. Sem isso, a próxima
  // sessão volta a inicializar a partir de areasPrincipais ignorando o gosto
  // recente do usuário (que pode ter alternado pra outra atribuição).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!didInitFromUserAreas) return;
    if (selectedAtribuicoes.length > 0) {
      localStorage.setItem(LS_DEFAULT_ATRIBUICAO, JSON.stringify(selectedAtribuicoes));
    }
  }, [selectedAtribuicoes, didInitFromUserAreas]);

  // Auto-select first atribuição in kanban/planilha if none selected.
  // Respeita: (a) flag explicit_all (usuário clicou em "Todas"), (b) init
  // pendente do areasPrincipais (didInitFromUserAreas=false → segura).
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SS_EXPLICIT_ALL) === "true") return;
    if (!didInitFromUserAreas) return;
    if ((activeTab === "kanban" || activeTab === "planilha") && selectedAtribuicoes.length === 0) {
      const firstOpt = atribuicaoOptions.find(o => o.value !== "Todas");
      if (firstOpt) setSelectedAtribuicoes([firstOpt.value]);
    }
  }, [activeTab, selectedAtribuicoes.length, didInitFromUserAreas]);

  // When switching TO kanban/planilha from multi-select, narrow to first selection.
  // Modo "Todas" (explicit_all) é exceção — preservar.
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(SS_EXPLICIT_ALL) === "true") return;
    if ((activeTab === "kanban" || activeTab === "planilha") && selectedAtribuicoes.length > 1) {
      setSelectedAtribuicoes([selectedAtribuicoes[0]]);
    }
  }, [activeTab]);

  // Quick-preview sheet
  const [previewDemandaId, setPreviewDemandaId] = useState<string | null>(null);

  // Deep-link: ?atribuicao=<label|enum>&focus=<id>. Usado pelo "Gerar demanda"
  // (ex.: a partir de um atendimento) para abrir o Kanban já na atribuição certa
  // — o Kanban mostra uma atribuição por vez — e destacar a demanda recém-criada,
  // evitando que ela pareça "sumida" por filtro de atribuição/prazo.
  const urlDeepLinkApplied = useRef(false);
  useEffect(() => {
    if (urlDeepLinkApplied.current) return;
    const atribParam = urlSearchParams?.get("atribuicao");
    const focusParam = urlSearchParams?.get("focus");
    if (!atribParam && !focusParam) return;
    urlDeepLinkApplied.current = true;
    if (atribParam) {
      const label = ATRIBUICAO_ENUM_TO_LABEL[atribParam] ?? atribParam;
      setDidInitFromUserAreas(true);
      setSelectedAtribuicoes([label]);
      try { localStorage.setItem(LS_DEFAULT_ATRIBUICAO, JSON.stringify([label])); } catch { /* ignore */ }
      // Limpa filtros de prazo — demandas novas não têm prazo e sumiriam.
      setPillFilters(new Set());
      setSelectedPrazoFilter(null);
    }
    if (focusParam) {
      // Abre o preview direto da demanda — visível independentemente de coluna/filtro.
      setPreviewDemandaId(focusParam);
    }
  }, [urlSearchParams]);
  // Quando o preview é aberto pelo atalho "Adicionar registro" no card,
  // o painel de novo registro abre junto. Resetado quando o sheet fecha.
  const [previewOpensWithRegistro, setPreviewOpensWithRegistro] = useState(false);

  // pillFilters declarado em escopo superior (linha ~1980) pra evitar TDZ
  // nos useMemo de demandasComPills/pillCounts que referenciam ele.
  const [isFiltrosOpen, setIsFiltrosOpen] = useState(false);
  const filtrosBtnRef = useRef<HTMLButtonElement>(null);

  const togglePill = useCallback((key: PillKey) => {
    setPillFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(PILL_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const clearPills = useCallback(() => {
    setPillFilters(new Set());
    try {
      localStorage.setItem(PILL_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }
  }, []);
  const [eventsDrawerDemandaId, setEventsDrawerDemandaId] = useState<number | null>(null);
  const previewDemanda = previewDemandaId ? demandasOrdenadas.find(d => d.id === previewDemandaId) || null : null;
  const previewIndex = previewDemandaId ? demandasOrdenadas.findIndex(d => d.id === previewDemandaId) : -1;
  const handlePreviewNavigate = useCallback((direction: "prev" | "next") => {
    if (!previewDemandaId) return;
    const idx = demandasOrdenadas.findIndex(d => d.id === previewDemandaId);
    if (idx < 0) return;
    const newIdx = direction === "prev" ? Math.max(0, idx - 1) : Math.min(demandasOrdenadas.length - 1, idx + 1);
    setPreviewDemandaId(demandasOrdenadas[newIdx].id);
  }, [previewDemandaId, demandasOrdenadas]);

  // Keyboard ↑↓ navigation when preview sheet is open
  useEffect(() => {
    if (!previewDemandaId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { e.preventDefault(); handlePreviewNavigate("prev"); }
      if (e.key === "ArrowDown") { e.preventDefault(); handlePreviewNavigate("next"); }
      if (e.key === "Escape") { setPreviewDemandaId(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewDemandaId, handlePreviewNavigate]);

  // ==========================================
  // KEYBOARD SHORTCUTS — J/K navigation, Enter to open, S for status, Escape to close
  // ==========================================
  const [focusedDemandaIndex, setFocusedDemandaIndex] = useState<number | null>(null);
  const focusedDemandaCardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerFocusedCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) focusedDemandaCardRefs.current.set(id, el);
    else focusedDemandaCardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when focus is inside any input, textarea, or contenteditable
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isEditing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (document.activeElement as HTMLElement)?.isContentEditable;
      if (isEditing) return;

      // Only activate in planilha/cards/grid view tabs where the list is visible
      if (activeTab !== "planilha" && activeTab !== "kanban") return;
      if (activeTab === "kanban") return; // Kanban uses card clicks, not linear nav

      const listLen = demandasOrdenadas.length;
      if (listLen === 0) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusedDemandaIndex(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, listLen - 1);
          const demanda = demandasOrdenadas[next];
          if (demanda) {
            const el = focusedDemandaCardRefs.current.get(String(demanda.id));
            el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
          return next;
        });
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusedDemandaIndex(prev => {
          const next = prev === null ? 0 : Math.max(prev - 1, 0);
          const demanda = demandasOrdenadas[next];
          if (demanda) {
            const el = focusedDemandaCardRefs.current.get(String(demanda.id));
            el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
          return next;
        });
      } else if (e.key === "Enter") {
        if (focusedDemandaIndex === null) return;
        e.preventDefault();
        const demanda = demandasOrdenadas[focusedDemandaIndex];
        if (demanda) setPreviewDemandaId(String(demanda.id));
      } else if (e.key === "s" || e.key === "S") {
        // S opens status change — delegate to the focused card's status button if present
        if (focusedDemandaIndex === null) return;
        e.preventDefault();
        const demanda = demandasOrdenadas[focusedDemandaIndex];
        if (demanda) {
          const el = focusedDemandaCardRefs.current.get(String(demanda.id));
          const statusBtn = el?.querySelector<HTMLButtonElement>("[data-status-trigger]");
          statusBtn?.click();
        }
      } else if (e.key === "Escape") {
        if (focusedDemandaIndex !== null) {
          e.preventDefault();
          setFocusedDemandaIndex(null);
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeTab, demandasOrdenadas, focusedDemandaIndex, setPreviewDemandaId]);

  // Toolbar do header consolidada — agora vive no bottomRow do
  // CollapsiblePageHeader (em vez de topbar separada + linha utility).
  // Esquerda: atribuições + MPU. Direita: ViewMode + busca + filtros +
  // chips ativos + atalho atrasadas/hoje + menu ⋯ (export/sort/group/admin).
  const headerToolbarLeft = (
    <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
      <AtribuicaoPills
        variant="dark"
        options={atribuicaoOptions}
        selectedValues={selectedAtribuicoes}
        onToggle={handleAtribuicaoToggle}
        onClear={handleClearAtribuicoes}
        counts={atribuicaoCounts}
        iconOnly
      />
      {(tipoProcessoCounts["MPU"] ?? 0) > 0 && (
        <>
          <span className="hidden sm:block h-4 w-px bg-white/[0.10] shrink-0" aria-hidden />
          {(() => {
            const mpuCount = tipoProcessoCounts["MPU"] ?? 0;
            const isOnly = mpuFilter === "only_mpu";
            const isWithout = mpuFilter === "without_mpu";
            const tooltip =
              mpuFilter === "all"
                ? `MPU: mostrando tudo (${mpuCount} MPU). Clique pra ver só MPU.`
                : isOnly
                  ? `MPU: só MPU. Clique pra excluir MPU.`
                  : `MPU: sem MPU. Clique pra voltar a mostrar tudo.`;
            return (
              <button
                type="button"
                onClick={cycleMpuFilter}
                title={tooltip}
                aria-label={tooltip}
                className={cn(
                  "hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer ring-1 ring-inset shrink-0",
                  isOnly && "bg-rose-500/20 text-rose-200 ring-rose-400/40",
                  isWithout && "bg-white/[0.06] text-white/70 ring-white/[0.10] line-through decoration-rose-300/70 decoration-[1.5px]",
                  !isOnly && !isWithout && "ring-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]",
                )}
              >
                <span>MPU</span>
                <span className={cn("tabular-nums font-semibold", isOnly ? "text-rose-100" : "text-white/40")}>
                  {mpuCount}
                </span>
              </button>
            );
          })()}
        </>
      )}
    </div>
  );

  const headerToolbarRight = (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Busca responsiva (abaixo de md): botão com lupa que revela o input */}
      <div className="flex md:hidden items-center shrink-0">
        {searchOpen ? (
          <div className="relative w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onBlur={() => { if (!searchTerm) setSearchOpen(false); }}
              placeholder="Buscar..."
              className="w-full bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg py-1.5 pl-7 pr-7 text-[11px] text-white/90 placeholder:text-white/35 outline-none focus:bg-black/[0.25] focus:ring-white/[0.15] transition-all"
            />
            <button
              type="button"
              onClick={() => { setSearchTerm(""); setSearchOpen(false); }}
              title="Fechar busca"
              aria-label="Fechar busca"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="Buscar"
            aria-label="Buscar"
            className="h-7 w-7 rounded-lg bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Busca — esconde abaixo de md (no responsivo menor usa o botão acima) */}
      <div className="hidden md:flex relative w-[140px] lg:w-[200px] shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar..."
          className="w-full bg-black/[0.15] ring-1 ring-white/[0.08] rounded-lg py-1.5 pl-7 pr-3 text-[11px] text-white/90 placeholder:text-white/35 outline-none focus:bg-black/[0.25] focus:ring-white/[0.15] transition-all"
        />
      </div>

      {/* (chips de pillFilters consolidados na ActiveFiltersBar — fonte única) */}
      {/* Menu ⋯ — visualização + filtros + exportar + ordenação + agrupar + modos + admin */}
      <div className="relative">
        <button
          ref={filtersBtnRef}
          onClick={() => setIsFiltersDropdownOpen(!isFiltersDropdownOpen)}
          className="relative h-7 w-7 rounded-lg bg-white/[0.08] text-white/70 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
          title="Mais opções"
          aria-label="Mais opções"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
          {(() => {
            const count =
              pillFilters.size +
              [selectedStatusGroup, selectedEstadoPrisional, selectedTipoAto, groupBy, showColumnFilters, showArchived].filter(Boolean).length;
            return count > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 text-[9px] tabular-nums font-bold rounded-full bg-emerald-500 text-neutral-900 flex items-center justify-center">
                {count}
              </span>
            ) : null;
          })()}
        </button>
        {isFiltersDropdownOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsFiltersDropdownOpen(false)} />
            <div className="fixed z-[9999] w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl shadow-black/[0.12] border border-neutral-200/80 dark:border-neutral-800 ring-1 ring-black/[0.04] py-1 max-h-[75vh] overflow-y-auto" style={(() => { const r = filtersBtnRef.current?.getBoundingClientRect(); return r ? { top: r.bottom + 4, right: window.innerWidth - r.right } : {}; })()}>
              {/* ───── Visualização (tabs) ───── */}
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Visualização</div>
              {DEMANDAS_VIEW_OPTIONS.map((opt) => {
                const TabIcon = opt.icon;
                const active = activeTab === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setActiveTab(opt.value as any); setIsFiltersDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] cursor-pointer",
                      active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                    )}
                  >
                    {TabIcon && <TabIcon className={cn("w-3.5 h-3.5", active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500")} />}
                    <span className="flex-1">{opt.label}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}

              {/* ───── Filtros de prazo / expedição / outros ───── */}
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Filtrar por</span>
                {pillFilters.size > 0 && (
                  <button
                    type="button"
                    onClick={() => clearPills()}
                    className="text-[10px] normal-case font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              {(["prazo", "expedicao", "outros"] as const).map((groupKey) => {
                const groupItems = PILL_CONFIG.filter((p) => p.group === groupKey);
                if (groupItems.length === 0) return null;
                const groupLabel =
                  groupKey === "prazo" ? "Por prazo" :
                  groupKey === "expedicao" ? "Por expedição" : "Outros";
                return (
                  <div key={groupKey}>
                    <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-300 dark:text-neutral-600">
                      {groupLabel}
                    </div>
                    {groupItems.map(({ key, label }) => {
                      const active = pillFilters.has(key);
                      const count = pillCounts[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePill(key)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] cursor-pointer",
                            active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                                active
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-neutral-300 dark:border-neutral-600",
                              )}
                            >
                              {active && (
                                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="2 6 5 9 10 3" />
                                </svg>
                              )}
                            </span>
                            <span>{label}</span>
                          </span>
                          <span
                            className={cn(
                              "text-[11px] tabular-nums",
                              active ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-neutral-400",
                              count === 0 && "opacity-40",
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* ───── Exportar ───── */}
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Exportar</div>
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); setIsExportModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Excel</span>
              </button>
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); handleExportSheets(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Google Sheets</span>
              </button>
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); handleReorderSheets(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Reordenar planilha</span>
              </button>
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); setIsDuplicatesModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Encontrar duplicatas</span>
              </button>
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Filtros</div>
              <button
                onClick={() => setSelectedEstadoPrisional(selectedEstadoPrisional === "preso" ? null : "preso")}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span className="flex-1">Apenas presos</span>
                {selectedEstadoPrisional === "preso" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Ver arquivados</span>
                {showArchived && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
              <button
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Filtros por coluna</span>
                {showColumnFilters && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Ordenar</div>
              <button
                onClick={() => setSortStack(prev => [{ column: prev[0]?.column === "recentes" ? "status" : "recentes", direction: "asc" }])}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Recentes / Status</span>
              </button>
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Agrupar por</div>
              <button
                onClick={() => setGroupBy(groupBy === "status" ? null : "status")}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span className="flex-1">Status</span>
                {groupBy === "status" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
              <button
                onClick={() => setGroupBy(groupBy === "atribuicao" ? null : "atribuicao")}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-violet-500" />
                <span className="flex-1">Atribuição</span>
                {groupBy === "atribuicao" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Modo de exibição</div>
              {([
                { value: "compact" as const, label: "Planilha", icon: List },
                { value: "table" as const, label: "Tabela", icon: Table2 },
                { value: "cards" as const, label: "Cards", icon: LayoutList },
                { value: "grid" as const, label: "Grid", icon: LayoutGrid },
              ] as const).map(({ value, label, icon: ModeIcon }) => (
                <button
                  key={value}
                  onClick={() => { setViewMode(value); localStorage.setItem("defender_demandas_view_mode", value); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
                >
                  <ModeIcon className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="flex-1">{label}</span>
                  {viewMode === value && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              ))}
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); setIsChartConfigModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Gráficos</span>
              </button>
              <button
                onClick={() => { setIsFiltersDropdownOpen(false); setIsAdminConfigModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500" />
                <span className="flex-1">Configurações</span>
              </button>
            </div>
          </>,
          document.body
        )}
      </div>

      <div className="h-5 w-px bg-white/[0.08] mx-0.5 shrink-0" />

      {/* Selecionar — só no Kanban */}
      {activeTab === "kanban" && (
        <button
          type="button"
          onClick={() => isSelectMode ? handleExitSelectMode() : setIsSelectMode(true)}
          aria-pressed={isSelectMode}
          title={isSelectMode ? `Sair do modo seleção (${selectedIds.size})` : "Selecionar demandas"}
          aria-label={isSelectMode ? "Sair do modo seleção" : "Selecionar demandas"}
          className={cn(
            "h-7 w-7 rounded-lg ring-1 transition-all duration-150 cursor-pointer flex items-center justify-center relative",
            isSelectMode
              ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30 hover:bg-emerald-500/30"
              : "bg-white/[0.08] text-white/70 ring-white/[0.06] hover:bg-white/[0.14] hover:text-white",
          )}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          {isSelectMode && selectedIds.size > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 text-[9px] tabular-nums font-bold rounded-full bg-emerald-400 text-neutral-900 flex items-center justify-center">
              {selectedIds.size}
            </span>
          )}
        </button>
      )}

      {/* Analisar triagem (Varredura Nível 2 — leitura profunda dos autos no PJe) */}
      <button
        onClick={() => setIsVarreduraModalOpen(true)}
        className="h-7 w-7 rounded-lg bg-white/[0.08] text-white/70 ring-1 ring-white/[0.06] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center"
        title="Analisar triagem (leitura profunda no PJe)"
        aria-label="Analisar triagem"
      >
        <ScanSearch className="w-3.5 h-3.5" />
      </button>

      {/* Importar */}
      <div className="relative">
        <button
          ref={importBtnRef}
          onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
          className="h-7 w-7 rounded-lg bg-white/[0.08] text-white/70 ring-1 ring-white/[0.06] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center justify-center"
          title="Importar"
          aria-label="Importar"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        {isImportDropdownOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsImportDropdownOpen(false)} />
            <div className="fixed z-[9999] w-60 bg-white dark:bg-neutral-900 rounded-xl shadow-xl shadow-black/[0.12] border border-neutral-200/80 dark:border-neutral-800 ring-1 ring-black/[0.04] py-1.5" style={(() => { const r = importBtnRef.current?.getBoundingClientRect(); return r ? { top: r.bottom + 4, right: window.innerWidth - r.right } : {}; })()}>
              {/* Destaque — importação automática direto do PJe */}
              <button
                onClick={() => { setIsImportDropdownOpen(false); setIsIntimacoesImportOpen(true); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 mx-1 rounded-lg text-left bg-emerald-50/80 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                style={{ width: "calc(100% - 0.5rem)" }}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <DownloadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">Intimações do PJe</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">auto</span>
                  </div>
                  <span className="block text-[10px] text-neutral-400 dark:text-neutral-500 truncate">Busca direto do Painel do Defensor</span>
                </div>
              </button>

              <div className="my-1.5 mx-3 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
              <div className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Manual</div>
              <button
                onClick={() => { setIsImportDropdownOpen(false); setIsPJeImportModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <span>PJe (copiar/colar)</span>
              </button>
              <button
                onClick={() => { setIsImportDropdownOpen(false); setIsImportModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => { setIsImportDropdownOpen(false); setIsSheetsImportModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
                <span>Google Sheets</span>
              </button>
              <button
                onClick={() => { setIsImportDropdownOpen(false); setIsSEEUImportModalOpen(true); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-[13px] cursor-pointer"
              >
                <Gavel className="w-3.5 h-3.5 text-neutral-400" />
                <span>SEEU</span>
              </button>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Nova demanda — CTA primário */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="h-7 w-7 rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center justify-center"
        title="Nova demanda"
        aria-label="Nova demanda"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );

  const headerBottomRow = (
    <div className="flex items-center justify-between gap-3">
      {headerToolbarLeft}
      {headerToolbarRight}
    </div>
  );

  // Fase 2: chips de filtro ativo + limpeza por chip / tudo (estado filtrado
  // compreensível e limpável num lance, em qualquer view).
  const GRUPO_LABELS: Record<string, string> = {
    triagem: "Triagem", preparacao: "Preparação", diligencias: "Diligências",
    saida: "Saída", acompanhar: "Acompanhar", concluida: "Concluída", arquivado: "Arquivado",
  };
  const activeFilterChips = buildActiveFilterChips(
    {
      searchTerm,
      prazo: selectedPrazoFilter,
      atribuicoes: selectedAtribuicoes,
      estadoPrisional: selectedEstadoPrisional,
      tipoAto: selectedTipoAto,
      tipoProcesso: selectedTipoProcesso,
      statusGroup: selectedStatusGroup,
      pills: PILL_CONFIG.filter((pp) => pillFilters.has(pp.key)).map((pp) => ({ key: pp.key, label: pp.label })),
    },
    { statusLabel: (g) => GRUPO_LABELS[g] ?? g },
  );
  const handleClearFilterChip = (key: string) => {
    if (key === "search") setSearchTerm("");
    else if (key === "status") setSelectedStatusGroup(null);
    else if (key.startsWith("atrib:")) {
      const v = key.slice("atrib:".length);
      if (typeof window !== "undefined") sessionStorage.removeItem(SS_EXPLICIT_ALL);
      setSelectedAtribuicoes((prev) => prev.filter((a) => a !== v));
    } else if (key === "prazo") setSelectedPrazoFilter(null);
    else if (key === "prisional") setSelectedEstadoPrisional(null);
    else if (key === "ato") setSelectedTipoAto(null);
    else if (key === "tipoProc") setSelectedTipoProcesso(null);
    else if (key.startsWith("pill:")) togglePill(key.slice("pill:".length));
  };
  const handleClearAllFilters = () => {
    setSearchTerm("");
    setSelectedStatusGroup(null);
    if (typeof window !== "undefined") sessionStorage.setItem(SS_EXPLICIT_ALL, "true");
    setSelectedAtribuicoes([]);
    setSelectedPrazoFilter(null);
    setSelectedEstadoPrisional(null);
    setSelectedTipoAto(null);
    setSelectedTipoProcesso(null);
    clearPills();
  };

  return (
    <div className="w-full min-h-screen bg-[#f5f5f5] dark:bg-[#0f0f11]">
      <HeaderSlotTitle
        icon={ListTodo}
        title="Demandas"
        accentHex={headerAccentHex}
        stats={
          <>
            <span className="text-white/85 font-semibold">
              {demandas.filter(d => !d.arquivado).length}
            </span>
            {(deadlineStats.hoje + deadlineStats.semana) > 0 && (
              <span
                className="flex items-center gap-1 text-white/55"
                title={`${deadlineStats.hoje + deadlineStats.semana} urgentes`}
              >
                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                <span className="font-medium">{deadlineStats.hoje + deadlineStats.semana}</span>
              </span>
            )}
            {deadlineStats.vencidas > 0 && (
              <span
                className="flex items-center gap-1 text-white/55"
                title={`${deadlineStats.vencidas} atrasadas`}
              >
                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                <span className="font-medium">{deadlineStats.vencidas}</span>
              </span>
            )}
          </>
        }
      />

      {/* ====== CHARCOAL HEADER ====== */}
      <CollapsiblePageHeader
        title="Demandas"
        icon={ListTodo}
        collapsedStats={
          <>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#464649] dark:bg-white/[0.10] text-white/90 tabular-nums">
              {demandas.filter(d => !d.arquivado).length} total
            </span>
          </>
        }
        collapsedPill={
          selectedAtribuicoes.length === 0 ? null : selectedAtribuicoes.length <= 3 ? (
            <div className="flex items-center gap-1">
              {selectedAtribuicoes.map((attr) => {
                const hex = ATRIBUICAO_BORDER_COLORS[attr] ?? "#71717a";
                const short = attr === "Tribunal do Júri" ? "Júri"
                  : attr === "Grupo Especial do Júri" ? "Júri Esp"
                  : attr === "Violência Doméstica" ? "VVD"
                  : attr === "Execução Penal" ? "EP"
                  : attr === "Substituição Criminal" ? "Subst"
                  : attr === "Curadoria Especial" ? "Curad"
                  : attr;
                return (
                  <span
                    key={attr}
                    className="text-[8px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${hex}33`, color: hex }}
                  >
                    {short}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              {selectedAtribuicoes.length} áreas
            </span>
          )
        }
        collapsedSearch={
          <div className="relative w-[140px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#3a3a3c] border border-[#505052] rounded-md py-1 pl-6 pr-2 text-[9px] text-white/90 placeholder:text-white/40 outline-none"
            />
          </div>
        }
        bottomRow={headerBottomRow}
        seamless
      />


      {/* Conteúdo Principal */}
      <div className="px-5 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3">
        {/* Fase 7.3: aviso de conexão/cache (offline-first) */}
        <DemandasConnectionBanner isOffline={demandasOffline} isFromCache={demandasFromCache} />
        {/* Fase 2: barra de filtros ativos (chips + limpar tudo) — visível em todas as views */}
        <ActiveFiltersBar
          chips={activeFilterChips}
          onClear={handleClearFilterChip}
          onClearAll={handleClearAllFilters}
        />
        {activeTab === "planilha" ? (
        <>
        {/* Cockpit de prazos — leitura imediata do que exige ação (Track F) */}
        {!showArchived && (
          <PrazoCockpitBar
            counts={pillCounts}
            activeFilters={pillFilters}
            onToggle={(key) => togglePill(key)}
          />
        )}

        {/* Lista de Demandas */}
        <div className="group/card relative bg-white dark:bg-neutral-900">

            {showArchived && (
              <div className="mx-4 mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      Visualizando Demandas Arquivadas
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Estas demandas estão ocultas da lista principal.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(false)}
                    className="bg-amber-200 dark:bg-amber-900/50"
                  >
                    Ver Ativos
                  </Button>
                </div>
              </div>
            )}

            <div className={`${viewMode === "table" ? "p-0" : viewMode === "cards" ? "p-4 space-y-3" : viewMode === "compact" ? "p-0" : "p-4"} ${viewMode === "compact" ? "" : "max-h-[calc(100vh-180px)] min-h-[500px] overflow-y-auto"} scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700`}>
              {viewMode === "table" ? (
                /* ========== MODO PLANILHA (PADRÃO) ========== */
                <DemandaTableView
                  demandas={demandasOrdenadas}
                  hasActiveFilters={activeFilterChips.length > 0}
                  onClearFilters={handleClearAllFilters}
                  atribuicaoIcons={atribuicaoIcons}
                  atribuicaoColors={atribuicaoColors}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEditDemanda}
                  onArchive={handleArchiveDemanda}
                  onUnarchive={handleUnarchiveDemanda}
                  onDelete={handleDeleteDemanda}
                  onDelegate={handleDelegateDirectly}
                  copyToClipboard={copyToClipboard}
                  onAtoChange={handleAtoChange}
                  onAssistidoChange={handleAssistidoChange}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ) : viewMode === "cards" ? (
                /* ========== MODO CARDS HORIZONTAIS ========== */
                <>
                  {loadingDemandas && demandasDB.length === 0 ? (
                    <DemandasListSkeleton />
                  ) : demandasOrdenadas.length === 0 ? (
                    <DemandasEmptyState
                      hasActiveFilters={activeFilterChips.length > 0}
                      showArchived={showArchived}
                      onClearFilters={handleClearAllFilters}
                    />
                  ) : (
                    visibleDemandas.map((demanda, idx) => {
                      const statusConfig = getStatusConfig(demanda.status);
                      const borderColor = STATUS_GROUPS[statusConfig.group].color;
                      const isFocused = focusedDemandaIndex === demandasOrdenadas.findIndex(d => d.id === demanda.id);

                      // Filtrar atos específicos para a atribuição da demanda
                      const atoOptionsForDemanda = getAtosPorAtribuicao(demanda.atribuicao);

                      return (
                        <div
                          key={demanda.id}
                          ref={(el) => registerFocusedCardRef(String(demanda.id), el)}
                          className={isFocused ? "ring-2 ring-emerald-500 rounded-xl" : ""}
                        >
                          <DemandaCard
                            demanda={demanda}
                            borderColor={borderColor}
                            atribuicaoIcons={atribuicaoIcons}
                            atribuicaoColors={atribuicaoColors}
                            onStatusChange={handleStatusChange}
                            onAtoChange={handleAtoChange}
                            atoOptions={atoOptionsForDemanda}
                            onEdit={handleEditDemanda}
                            onArchive={handleArchiveDemanda}
                            onUnarchive={handleUnarchiveDemanda}
                            onDelete={handleDeleteDemanda}
                            onDelegate={handleDelegateDirectly}
                            copyToClipboard={copyToClipboard}
                            onAtribuicaoChange={handleAtribuicaoChange}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(demanda.id)}
                            onToggleSelect={handleToggleSelect}
                          />
                        </div>
                      );
                    })
                  )}
                </>
              ) : viewMode === "compact" ? (
                /* ========== MODO COMPACTO - PLANILHA EDITÁVEL ========== */
                <DemandaCompactView
                  demandas={demandasOrdenadas}
                  hasActiveFilters={activeFilterChips.length > 0}
                  onClearFilters={handleClearAllFilters}
                  atribuicaoIcons={atribuicaoIcons}
                  atribuicaoColors={ATRIBUICAO_BORDER_COLORS}
                  onStatusChange={handleStatusChange}
                  onAtoChange={handleAtoChange}
                  onProvidenciasChange={handleProvidenciasChangeLegacy}
                  onPrazoChange={handlePrazoChange}
                  onAtribuicaoChange={handleAtribuicaoChange}
                  onAssistidoChange={handleAssistidoChange}
                  onProcessoChange={handleProcessoChange}
                  onAssistidoLink={handleAssistidoLink}
                  onProcessoLink={handleProcessoLink}
                  searchAssistidosFn={searchAssistidosFn}
                  searchProcessosFn={searchProcessosFn}
                  onAssistidoQueryChange={setAssistidoSearchQuery}
                  onProcessoQueryChange={setProcessoSearchQuery}
                  isLoadingAssistidoSearch={loadingAssistidoSearch}
                  isLoadingProcessoSearch={loadingProcessoSearch}
                  onEdit={handleEditDemanda}
                  onArchive={handleArchiveDemanda}
                  onUnarchive={handleUnarchiveDemanda}
                  onDelete={handleDeleteDemanda}
                  copyToClipboard={copyToClipboard}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  selectedAtribuicao={selectedAtribuicoes[0] || null}
                  onAtribuicaoFilter={(v: string | null) => setSelectedAtribuicoes(v ? [v] : [])}
                  sortStack={sortStack}
                  onColumnSort={handleColumnSort}
                  onReorder={handleReorder}
                  columnWidths={columnWidths}
                  onColumnResize={handleColumnResize}
                  columnFilters={columnFilters}
                  onColumnFilterChange={(colId: string, value: string) => setColumnFilters(prev => ({ ...prev, [colId]: value }))}
                  showColumnFilters={showColumnFilters}
                  hideAtribuicaoColor={selectedAtribuicoes.length === 1}
                  onPreview={setPreviewDemandaId}
                  previewDemandaId={previewDemandaId}
                  groupBy={groupBy}
                  collapsedGroups={collapsedGroups}
                  onToggleGroupCollapse={(group) => setCollapsedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(group)) next.delete(group); else next.add(group);
                    return next;
                  })}
                  focusedRowIndex={activeTab === "planilha" ? focusedDemandaIndex : null}
                  onRegisterRowRef={registerFocusedCardRef}
                />
              ) : (
                /* ========== MODO GRID PREMIUM ========== */
                <>
                  {loadingDemandas && demandasDB.length === 0 ? (
                    <DemandasListSkeleton />
                  ) : demandasOrdenadas.length === 0 ? (
                    <DemandasEmptyState
                      hasActiveFilters={activeFilterChips.length > 0}
                      showArchived={showArchived}
                      onClearFilters={handleClearAllFilters}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visibleDemandas.map((demanda) => {
                        const statusConfig = getStatusConfig(demanda.status);
                        const borderColor = STATUS_GROUPS[statusConfig.group].color;
                        const atoOptionsForDemanda = getAtosPorAtribuicao(demanda.atribuicao);

                        return (
                          <DemandaGridCard
                            key={demanda.id}
                            demanda={demanda}
                            statusConfig={statusConfig}
                            borderColor={borderColor}
                            atribuicaoIcons={atribuicaoIcons}
                            onStatusChange={handleStatusChange}
                            onAtoChange={handleAtoChange}
                            atoOptions={atoOptionsForDemanda}
                            onEdit={handleEditDemanda}
                            onArchive={handleArchiveDemanda}
                            onDelete={handleDeleteDemanda}
                            copyToClipboard={copyToClipboard}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(demanda.id)}
                            onToggleSelect={handleToggleSelect}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 md:px-5 py-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
              {isSelectMode ? (
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  >
                    {selectedIds.size === demandasOrdenadas.length ? "Desmarcar tudo" : "Selecionar tudo"}
                  </button>
                  <span className="text-xs text-neutral-400">
                    {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <>
                        {/* Status — todos os 22 substatus agrupados */}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBatchStatusChange(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="h-7 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
                        >
                          <option value="" disabled>Status...</option>
                          <optgroup label="Triagem">
                            {STATUS_OPTIONS_BY_COLUMN.triagem.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Em andamento">
                            {STATUS_OPTIONS_BY_COLUMN.em_andamento.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Concluída">
                            {STATUS_OPTIONS_BY_COLUMN.concluida.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Arquivo">
                            {STATUS_OPTIONS_BY_COLUMN.arquivado.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </optgroup>
                        </select>

                        {/* Atribuição */}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBatchAtribuicaoChange(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="h-7 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
                        >
                          <option value="" disabled>Atribuição...</option>
                          {atribuicaoOptions
                            .filter(o => o.value !== "Todas")
                            .map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))
                          }
                        </select>

                        {/* Ato — dinâmico baseado na atribuição atual */}
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBatchAtoChange(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="h-7 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
                        >
                          <option value="" disabled>Ato...</option>
                          {atoOptionsFiltered.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={handleBatchCopy}
                        >
                          <Copy className="w-3 h-3" />
                          Copiar ({selectedIds.size})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/20"
                          onClick={handleBatchDelegate}
                        >
                          <UserCheck className="w-3 h-3" />
                          Delegar ({selectedIds.size})
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={handleDeleteSelected}
                        >
                          <Trash2 className="w-3 h-3" />
                          Deletar ({selectedIds.size})
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-neutral-400 hover:text-neutral-600"
                      onClick={handleExitSelectMode}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Mostrando <strong>{demandasOrdenadas.length}</strong> de{" "}
                    <strong>
                      {showArchived
                        ? demandas.filter((d) => d.arquivado).length
                        : demandas.filter((d) => !d.arquivado).length}
                    </strong>{" "}
                    demandas {showArchived ? "arquivadas" : "ativas"}
                  </p>
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                    title="Selecionar demandas"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </>
        ) : activeTab === "kanban" ? (
          /* ========== TAB KANBAN PREMIUM ========== */
          <div className="space-y-3">
            {/* Toolbar — só aparece quando em modo seleção. Botão de
                entrada/saída do modo está no header. */}
            {isSelectMode && (
              <div className="flex items-center justify-end gap-1.5 -mt-1">
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 px-1">
                  {selectedIds.size === 0
                    ? "Clique nos cards pra selecionar"
                    : `${selectedIds.size} selecionada${selectedIds.size !== 1 ? "s" : ""}`}
                </span>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleBatchCopyEmail}
                      title="Copiar para colar no corpo do email"
                      className="h-7 px-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Copiar pra email
                    </button>
                    <button
                      type="button"
                      onClick={handleBatchDelegate}
                      title="Delegar selecionadas"
                      className="h-7 px-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors cursor-pointer text-[11px] font-medium flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Delegar
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Kanban Premium Board */}
            <KanbanPremium
              demandas={demandasComPills}
              onCardClick={(id) => setPreviewDemandaId(id)}
              onOpenEventsDrawer={(id) => setEventsDrawerDemandaId(id)}
              onStatusChange={handleStatusChange}
              onAtoChange={handleAtoChange}
              onAgendarAudiencia={handleAgendarAudiencia}
              onOpenRegistro={handleOpenRegistro}
              onToggleUrgent={handleToggleUrgent}
              isSelectMode={isSelectMode}
              selectedIds={selectedIds}
              onToggleSelect={(id, event) => handleToggleSelect(id, event)}
              copyToClipboard={copyToClipboard}
              selectedAtribuicoes={selectedAtribuicoes}
              showArchived={showArchived}
            />
          </div>
        ) : activeTab === "prazos" ? (
          /* ========== TAB PRAZOS (AGENDA) ========== */
          <PrazosTab
            demandas={demandasFiltradas}
            atribuicaoOptions={atribuicaoOptions}
            selectedAtribuicoes={selectedAtribuicoes}
            handleAtribuicaoToggle={handleAtribuicaoToggle}
            setSelectedAtribuicoes={setSelectedAtribuicoes}
            onClearAtribuicoes={handleClearAtribuicoes}
            atribuicaoCounts={atribuicaoCounts}
            onCardClick={(id) => setPreviewDemandaId(id)}
          />
        ) : (
          /* ========== TAB ANALYTICS ========== */
          <div className="space-y-6">

            {/* Stats KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statsData.map((stat, index) => {
                const Icon = stat.icon;
                const isAlert = stat.gradient === "rose" || stat.gradient === "amber";
                const hasValue = Number(String(stat.value).replace('%','')) > 0;
                return (
                  <div key={index} className={`flex items-center gap-3 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 ${isAlert && hasValue ? 'border-rose-200 dark:border-rose-800/50' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isAlert && hasValue ? 'bg-rose-100 dark:bg-rose-950/30' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                      <Icon className={`w-4 h-4 ${isAlert && hasValue ? 'text-rose-500' : 'text-neutral-400'}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{stat.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infográficos */}
            {selectedCharts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedCharts.map((chartKey) => {
                  const chartConfig = chartOptions.find(opt => opt.value === chartKey);
                  const Icon = chartConfig?.icon || BarChartIcon;

                  return (
                    <Card key={chartKey} className="group/chart relative p-4 border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover/chart:via-emerald-500/20 transition-all duration-300 rounded-t-xl" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 group-hover/chart:border-emerald-300/30 dark:group-hover/chart:border-emerald-700/30 group-hover/chart:bg-emerald-50 dark:group-hover/chart:bg-emerald-900/20 transition-all duration-300">
                          <Icon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover/chart:text-emerald-600 dark:group-hover/chart:text-emerald-400 transition-colors duration-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{chartConfig?.label || chartKey}</h4>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{chartConfig?.category}</p>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <DynamicChart type={chartKey} demandas={demandasFiltradas} visualizationType={chartTypes[chartKey] || "pizza"} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Timeline */}
            <HistoricoChart demandas={demandasFiltradas} />
          </div>
        )}
      </div>

      {/* Mobile FAB — floating "+" button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-neutral-900 dark:bg-neutral-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white shadow-lg shadow-neutral-900/30 dark:shadow-black/50 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
        title="Nova Demanda"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Modals */}
      <DemandaCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewDemanda}
        assistidosOptions={[]}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptionsFiltered}
        statusOptions={statusOptions}
      />

      <RecursoConfirmModal
        isOpen={recursoModal.open}
        onClose={() => setRecursoModal({ open: false, demandaId: null, tipo: null, rotulo: "", exigeNumero: false })}
        assistidoNome={recursoModal.assistidoNome}
        numeroAutosOrigem={recursoModal.numeroAutosOrigem}
        tipo={recursoModal.tipo}
        rotulo={recursoModal.rotulo}
        exigeNumero={recursoModal.exigeNumero}
        saving={createRecursoMutation.isPending}
        onConfirm={(dados: RecursoConfirmData) => {
          if (!recursoModal.demandaId || !recursoModal.tipo) return;
          const demandaDB = demandasDB.find((d: any) => d.id === recursoModal.demandaId);
          const processoOrigemId = demandaDB?.processoId;
          const assistidoId = demandaDB?.assistidoId;
          if (!processoOrigemId) {
            toast.error("Não foi possível localizar o processo de origem.");
            return;
          }
          createRecursoMutation.mutate({
            tipo: recursoModal.tipo,
            numeroRecurso: dados.numeroRecurso || undefined,
            processoOrigemId,
            assistidoId,
            dataInterposicao: dados.dataInterposicao,
            camara: dados.camara || undefined,
            turma: dados.turma || undefined,
            relatorNome: dados.relatorNome || undefined,
          });
        }}
      />

      <AudienciaConfirmModal
        isOpen={audienciaModal.open}
        onClose={() => setAudienciaModal({ open: false, demandaId: null, sources: [] })}
        assistidoNome={audienciaModal.assistidoNome}
        numeroAutos={audienciaModal.numeroAutos}
        sources={audienciaModal.sources}
        saving={createAudienciaMutation.isPending}
        onConfirm={(dados: AudienciaConfirmData) => {
          if (!audienciaModal.demandaId) return;
          const demanda = demandas.find((d) => parseInt(d.id, 10) === audienciaModal.demandaId);
          // Backend precisa do processoId real — pegar da demanda via API
          // Fazemos via updateDemanda para obter dados; aqui usamos o que temos
          // localmente através do query do demandasDB.
          const demandaDB = demandasDB.find((d: any) => d.id === audienciaModal.demandaId);
          const processoId = demandaDB?.processoId;
          const assistidoId = demandaDB?.assistidoId;
          if (!processoId) {
            toast.error("Não foi possível localizar o processo da demanda.");
            return;
          }
          const dataAudiencia = `${dados.data}T${dados.hora}:00`;
          createAudienciaMutation.mutate({
            processoId,
            assistidoId,
            dataAudiencia,
            tipo: dados.tipo,
            horario: dados.hora,
            titulo: `${dados.tipo} — ${demanda?.assistido ?? ""}`.trim(),
          });
        }}
      />

      {editingDemanda && (
        <DemandaCreateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDemanda(null);
          }}
          onSave={handleSaveEdit}
          initialData={editingDemanda}
          assistidosOptions={[]}
          atribuicaoOptions={atribuicaoOptions}
          atoOptions={atoOptionsFiltered}
          statusOptions={statusOptions}
          mode="edit"
        />
      )}

      <ConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportDemandas}
      />
      <PJeImportModal
        isOpen={isPJeImportModalOpen}
        onClose={() => setIsPJeImportModalOpen(false)}
        onImport={handleImportDemandas}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptionsFiltered}
        statusOptions={statusOptions}
        demandasExistentes={allDemandas}
        defaultAtribuicao={selectedAtribuicoes.length === 1 ? selectedAtribuicoes[0] : undefined}
      />
      <SheetsImportModal
        isOpen={isSheetsImportModalOpen}
        onClose={() => setIsSheetsImportModalOpen(false)}
        onImport={handleImportDemandas}
        onUpdate={handleUpdateDemandas}
        demandasExistentes={allDemandas}
      />
      <SEEUImportModal
        isOpen={isSEEUImportModalOpen}
        onClose={() => setIsSEEUImportModalOpen(false)}
        onImport={handleImportDemandas}
        onUpdate={handleUpdateDemandas}
        demandasExistentes={allDemandas}
      />
      <IntimacoesImportModal
        isOpen={isIntimacoesImportOpen}
        onClose={() => setIsIntimacoesImportOpen(false)}
      />
      <VarreduraTriggerModal
        isOpen={isVarreduraModalOpen}
        onClose={() => setIsVarreduraModalOpen(false)}
      />
      <ChartConfigModal
        isOpen={isChartConfigModalOpen}
        onClose={() => setIsChartConfigModalOpen(false)}
        chartTypes={chartTypes}
        onChartTypeChange={(key, type) => setChartTypes((prev) => ({ ...prev, [key]: type }))}
        selectedCharts={selectedCharts}
        onToggleChart={toggleChart}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        demandas={allDemandas}
        demandasFiltradas={demandasFiltradas}
      />
      <AdminConfigModal isOpen={isAdminConfigModalOpen} onClose={() => setIsAdminConfigModalOpen(false)} />
      <DuplicatesModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        onResolved={() => utils.demandas.list.invalidate()}
      />

      {/* Seletor de pessoa — abre ao dropar card na coluna "Delegação" */}
      {pessoaSelectorOpen && pessoaSelectorDemanda && (
        <Dialog open onOpenChange={(o) => {
          if (!o) {
            setPessoaSelectorOpen(false);
            setPessoaSelectorDemanda(null);
          }
        }}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="text-base">Para quem?</DialogTitle>
              <DialogDescription className="text-xs">
                Escolha um membro da equipe para delegar ou um colega defensor para transferir/compartilhar.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
              {(membrosEquipeQuery?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
                    Equipe — delegar
                  </p>
                  {(membrosEquipeQuery ?? []).map((m) => {
                    const initials = m.name.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
                    const roleLabel = m.role === "estagiario" ? "Estagiário(a)" : m.role === "servidor" ? "Servidor(a)" : m.role;
                    return (
                      <button
                        key={`equipe-${m.id}`}
                        type="button"
                        onClick={() => {
                          if (!pessoaSelectorDemanda) return;
                          setDelegacaoDemanda({
                            ...pessoaSelectorDemanda,
                            destinatarioNome: m.name,
                          });
                          setDelegacaoModalOpen(true);
                          setPessoaSelectorOpen(false);
                          setPessoaSelectorDemanda(null);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{m.name}</p>
                          <p className="text-[10px] text-zinc-500">{roleLabel}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {(parceirosQuery?.length ?? 0) > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">
                    Colegas defensores — transferir / compartilhar
                  </p>
                  {(parceirosQuery ?? []).map((p) => {
                    const initials = p.name.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
                    return (
                      <button
                        key={`parceiro-${p.id}`}
                        type="button"
                        onClick={() => {
                          if (!pessoaSelectorDemanda) return;
                          setColegaDropContext({
                            demandaId: pessoaSelectorDemanda.demandaId,
                            processoId: pessoaSelectorDemanda.processoId,
                            assistidoId: pessoaSelectorDemanda.assistidoId,
                            display: `${pessoaSelectorDemanda.assistidoNome} · ${pessoaSelectorDemanda.demandaAto || "Demanda"}`.trim(),
                            destinatarioId: p.id,
                            destinatarioNome: p.name,
                          });
                          setColegaModalTipo(null);
                          setPessoaSelectorOpen(false);
                          setPessoaSelectorDemanda(null);
                        }}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/30 text-left transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">Defensor</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {(membrosEquipeQuery?.length ?? 0) === 0 && (parceirosQuery?.length ?? 0) === 0 && (
                <p className="text-center text-xs text-zinc-500 py-6">
                  Nenhuma pessoa cadastrada para delegar ou transferir.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Delegação - Aparece ao selecionar status de delegação (amanda, emilly, taissa) */}
      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        demandaId={delegacaoDemanda?.demandaId}
        demandaAto={delegacaoDemanda?.demandaAto}
        assistidoId={delegacaoDemanda?.assistidoId}
        assistidoNome={delegacaoDemanda?.assistidoNome}
        processoId={delegacaoDemanda?.processoId}
        processoNumero={delegacaoDemanda?.processoNumero}
        destinatarioNome={delegacaoDemanda?.destinatarioNome}
        onDelegacaoSucesso={() => {
          setDelegacaoDemanda(null);
          utils.demandas.list.invalidate();
        }}
      />

      {/* Modal de Delegação em Lote */}
      <DelegacaoBatchModal
        open={batchDelegacaoOpen}
        onOpenChange={setBatchDelegacaoOpen}
        demandas={selectedDemandasForBatch}
        onSuccess={() => {
          setSelectedIds(new Set());
          setIsSelectMode(false);
          setBatchDelegacaoOpen(false);
          utils.demandas.list.invalidate();
        }}
      />

      {/* Mini-menu de escolha após drop em colega defensor */}
      {colegaDropContext && colegaModalTipo === null && (
        <Dialog open onOpenChange={(o) => { if (!o) setColegaDropContext(null); }}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle className="text-base">Para {colegaDropContext.destinatarioNome}</DialogTitle>
              <DialogDescription className="text-xs">
                O que você quer fazer com este caso?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <button
                type="button"
                onClick={() => setColegaModalTipo("transferir")}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Transferir caso</p>
                  <p className="text-[11px] text-zinc-500">Passa o caso definitivamente. Aguarda aceite.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setColegaModalTipo("acompanhar")}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Compartilhar</p>
                  <p className="text-[11px] text-zinc-500">Colega passa a acompanhar o caso. Sem mudar dono.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setColegaModalTipo("encaminhar")}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Send className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Dar ciência</p>
                  <p className="text-[11px] text-zinc-500">Envia uma notificação. Caso continua com você.</p>
                </div>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de encaminhamento aberto após escolha no mini-menu */}
      {colegaDropContext && colegaModalTipo !== null && (
        <NovoEncaminhamentoModal
          open
          onOpenChange={(o) => {
            if (!o) {
              setColegaDropContext(null);
              setColegaModalTipo(null);
            }
          }}
          initialTipo={colegaModalTipo}
          contexto={{
            demandaId: colegaDropContext.demandaId ?? undefined,
            processoId: colegaDropContext.processoId ?? undefined,
            assistidoId: colegaDropContext.assistidoId ?? undefined,
            display: colegaDropContext.display,
          }}
          initialDestinatarioId={colegaDropContext.destinatarioId}
        />
      )}

      {/* Quick-preview Sheet lateral */}
      <DemandaQuickPreview
        demanda={previewDemanda}
        open={!!previewDemandaId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewDemandaId(null);
            setPreviewOpensWithRegistro(false);
          }
        }}
        initialNovoRegistro={previewOpensWithRegistro}
        onStatusChange={handleStatusChange}
        onAtoChange={handleAtoChange}
        onPrazoChange={handlePrazoChange}
        onAtribuicaoChange={handleAtribuicaoChange}
        onTipoProcessoChange={handleTipoProcessoChange}
        onProcessoNumeroChange={handleProcessoChange}
        onVincularProcesso={handleProcessoLink}
        searchProcessosFn={searchProcessosFn}
        onProcessoQueryChange={setProcessoSearchQuery}
        loadingProcessoSearch={loadingProcessoSearch}
        onAssistidoNomeChange={handleAssistidoNomeChange}
        onStatusPrisionalChange={handleStatusPrisionalChange}
        onAgendarAudiencia={handleAgendarAudiencia}
        onArchive={handleArchiveDemanda}
        onDelete={handleDeleteDemanda}
        onNavigate={handlePreviewNavigate}
        copyToClipboard={copyToClipboard}
        atribuicaoIcons={atribuicaoIcons}
        currentIndex={previewIndex >= 0 ? previewIndex : undefined}
        totalCount={demandasOrdenadas.length}
      />

      {/* Drawer de eventos (timeline / pendentes / atendimentos) — Task 11 */}
      <DemandaEventsDrawer
        isOpen={eventsDrawerDemandaId !== null}
        onClose={() => setEventsDrawerDemandaId(null)}
        demandaId={eventsDrawerDemandaId}
      />
    </div>
  );
}