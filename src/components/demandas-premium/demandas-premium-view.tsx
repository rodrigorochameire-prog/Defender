// @ts-nocheck
"use client";

import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
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
const DuplicatesModal = dynamic(() => import("@/components/demandas-premium/duplicates-modal").then(m => ({ default: m.DuplicatesModal })), { ssr: false });
const DelegacaoModal = dynamic(() => import("@/components/demandas/delegacao-modal").then(m => ({ default: m.DelegacaoModal })), { ssr: false });
const DelegacaoBatchModal = dynamic(() => import("@/components/demandas/delegacao-batch-modal").then(m => ({ default: m.DelegacaoBatchModal })), { ssr: false });
import { DemandaQuickPreview } from "@/components/demandas-premium/DemandaQuickPreview";
import { KanbanPremium } from "@/components/demandas-premium/kanban-premium";
import { PrazosTab } from "@/components/demandas-premium/prazos-tab";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, UI_STATUS_TO_DB, STATUS_OPTIONS_BY_COLUMN, type StatusGroup } from "@/config/demanda-status";
import { getAtosPorAtribuicao, getTodosAtosUnicos, ATOS_POR_ATRIBUICAO, ATO_PRIORITY } from "@/config/atos-por-atribuicao";
import { copyToClipboard } from "@/lib/clipboard";
import React, { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { useOfflineMutation } from "@/hooks/use-offline-mutation";
import { useProgressiveList } from "@/hooks/use-progressive-list";
import { useColumnWidths } from "@/hooks/use-column-widths";
import { getOfflineDemandas } from "@/lib/offline/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/demandas-premium/PageHeader";
import { DemandaCard } from "@/components/demandas-premium/DemandaCard";
import { DemandaTableView } from "@/components/demandas-premium/DemandaTableView";
import { DemandaCompactView } from "@/components/demandas-premium/DemandaCompactView";
import { AtribuicaoPills } from "@/components/demandas-premium/AtribuicaoPills";
import { arrayMove } from "@dnd-kit/sortable";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
};

// Stable empty array to prevent useEffect infinite loop from inline `= []` default
const EMPTY_DEMANDAS: any[] = [];

// Mapeamento de status do banco (enum) para status da UI
const DB_STATUS_TO_UI: Record<string, string> = {
  "2_ATENDER": "atender",
  "4_MONITORAR": "monitorar",
  "5_FILA": "fila",
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
};

const atribuicaoColors: Record<string, string> = {
  "Tribunal do Júri": "text-green-600 dark:text-green-500",
  "Grupo Especial do Júri": "text-orange-600 dark:text-orange-500",
  "Violência Doméstica": "text-amber-600 dark:text-amber-500",
  "Execução Penal": "text-blue-600 dark:text-blue-500",
  "Substituição Criminal": "text-purple-600 dark:text-purple-500",
  "Curadoria Especial": "text-gray-600 dark:text-gray-400",
};

// Cores HEX para bordas de atribuição (usadas nos cards)
const ATRIBUICAO_BORDER_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",        // Verde
  "Grupo Especial do Júri": "#f97316",  // Laranja
  "Violência Doméstica": "#f59e0b",     // Âmbar/Amarelo
  "Execução Penal": "#3b82f6",          // Azul
  "Substituição Criminal": "#8b5cf6",   // Roxo
  "Curadoria Especial": "#71717a",      // Cinza
};

// Background suave para atribuição
const ATRIBUICAO_BG_COLORS: Record<string, string> = {
  "Tribunal do Júri": "bg-green-50 dark:bg-green-950/20",
  "Grupo Especial do Júri": "bg-orange-50 dark:bg-orange-950/20",
  "Violência Doméstica": "bg-amber-50 dark:bg-amber-950/20",
  "Execução Penal": "bg-blue-50 dark:bg-blue-950/20",
  "Substituição Criminal": "bg-purple-50 dark:bg-purple-950/20",
  "Curadoria Especial": "bg-zinc-50 dark:bg-zinc-800/30",
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
  // Desaforamento
  if (atoLower.includes("desaforamento")) return Target;
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
      <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
      <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate max-w-[180px]">{ato}</span>
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
  if (statusLower.includes("fila")) return ListTodo;
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
];

const statusOptions = [
  // Triagem
  { value: "fila", label: "Fila", icon: ListTodo },
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
  onEdit: (demanda: any) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (text: string, message?: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function DemandaGridCard({
  demanda,
  statusConfig,
  borderColor,
  atribuicaoIcons,
  onStatusChange,
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
  const calcularPrazo = (prazoStr: string) => {
    if (!prazoStr) return null;
    try {
      const [dia, mes, ano] = prazoStr.split('/').map(Number);
      const prazo = new Date(2000 + ano, mes - 1, dia);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      prazo.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { text: "Vencido", urgent: true };
      if (diffDays === 0) return { text: "Hoje", urgent: true };
      if (diffDays === 1) return { text: "Amanhã", urgent: true };
      if (diffDays <= 3) return { text: `${diffDays}d`, urgent: true };
      return { text: `${diffDays}d`, urgent: false };
    } catch {
      return null;
    }
  };

  const prazoInfo = calcularPrazo(demanda.prazo);
  const isPreso = demanda.estadoPrisional && demanda.estadoPrisional !== "Solto";

  return (
    <div className="group relative bg-white dark:bg-zinc-900/95 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-black/30 hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5">
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
          className="absolute inset-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl animate-in fade-in duration-200"
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
            onClick={() => onToggleSelect?.(demanda.id)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-400"
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
              <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                {demanda.assistido}
              </p>
            </div>
            <AtoWithIcon ato={demanda.ato} />
          </div>
          <button
            onClick={() => setShowQuickActions(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100"
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
                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            }`}>
              {prazoInfo.text}
            </span>
          )}
        </div>

        {/* Footer: Atribuição + Processo */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
              className="text-[9px] font-mono text-zinc-400 hover:text-emerald-600 transition-colors truncate max-w-[120px]"
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
  const [searchTerm, setSearchTerm] = useState("");
  // Ordenação multi-coluna empilhada (click-to-stack)
  type SortCriterion = { column: string; direction: "asc" | "desc" };
  const [sortStack, setSortStack] = useState<SortCriterion[]>([
    { column: "recentes", direction: "asc" }
  ]);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [selectedPrazoFilter, setSelectedPrazoFilter] = useState<string | null>(null);
  const [selectedAtribuicoes, setSelectedAtribuicoes] = useState<string[]>([]);
  const [selectedEstadoPrisional, setSelectedEstadoPrisional] = useState<string | null>(null);
  const [selectedTipoAto, setSelectedTipoAto] = useState<string | null>(null);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<StatusGroup | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["atribuicoes", "status", "atos", "situacao-prisional"]);
  const [chartTypes, setChartTypes] = useState<Record<string, string>>({
    atribuicoes: "pizza",
    status: "pizza",
    atos: "barras",
    "situacao-prisional": "pizza",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isChartConfigModalOpen, setIsChartConfigModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);
  const [isSheetsImportModalOpen, setIsSheetsImportModalOpen] = useState(false);
  const [isSEEUImportModalOpen, setIsSEEUImportModalOpen] = useState(false);
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
  const lastSelectedIndex = useRef<number | null>(null);
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
  const demandasQuery = trpc.demandas.list.useQuery({ limit: 100 });
  const { data: demandasDB = EMPTY_DEMANDAS, isLoading: loadingDemandas } = useOfflineQuery(
    demandasQuery,
    getOfflineDemandas,
  );

  const utils = trpc.useUtils();

  // Search queries para autocomplete de vinculação
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");
  const [processoSearchQuery, setProcessoSearchQuery] = useState("");

  const { data: assistidoSearchResults = [], isLoading: loadingAssistidoSearch } = trpc.demandas.searchAssistidos.useQuery(
    { search: assistidoSearchQuery },
    { enabled: assistidoSearchQuery.length >= 2 }
  );

  const { data: processoSearchResults = [], isLoading: loadingProcessoSearch } = trpc.demandas.searchProcessos.useQuery(
    { search: processoSearchQuery },
    { enabled: processoSearchQuery.length >= 2 }
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
      // Usar substatus granular quando disponível, senão mapear do status coarse do DB
      status: d.substatus || DB_STATUS_TO_UI[d.status] || d.status?.toLowerCase().replace(/_/g, " ") || "fila", // "fila" is a valid substatus key in DEMANDA_STATUS
      prazo: d.prazo ? new Date(d.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "",
      data: d.dataEntrada ? new Date(d.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : new Date(d.createdAt).toLocaleDateString("pt-BR"),
      // dataInclusao: timestamp ISO para ordenação por recentes (usado na importação do PJe)
      dataInclusao: d.createdAt ? new Date(d.createdAt).toISOString() : new Date().toISOString(),
      processos: d.processo?.numeroAutos
        ? [{ tipo: "", numero: d.processo.numeroAutos }]
        : [],
      ato: d.ato || d.titulo || "",
      providencias: d.providencias || "",
      atribuicao: ATRIBUICAO_ENUM_TO_LABEL[d.processo?.atribuicao] || d.atribuicao || "Substituição Criminal",
      atribuicaoEnum: d.processo?.atribuicao || null,
      estadoPrisional: d.reuPreso ? "preso" : (d.assistido?.statusPrisional || "solto"),
      prioridade: d.prioridade || "normal",
      arquivado: d.status === "ARQUIVADO",
      reuPreso: d.reuPreso || false,
      substatus: d.substatus || null,
      photoUrl: d.assistido?.photoUrl || null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
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
    "fila": "5_FILA",
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
    "protocolar": "5_FILA",
    "protocolado": "7_PROTOCOLADO",
    "ciencia": "7_CIENCIA",
    "sem_atuacao": "7_SEM_ATUACAO",
    "constituiu_advogado": "CONCLUIDO",
    "urgente": "URGENTE",
    "resolvido": "CONCLUIDO",
    "arquivado": "ARQUIVADO",
  };

  // Status que disparam o modal de delegação
  const DELEGATION_STATUSES = ["amanda", "emilly", "taissa"];

  const handleStatusChange = (demandaId: string, newStatus: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus, substatus: newStatus } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      const dbStatus = UI_STATUS_TO_DB[newStatus] || newStatus.toUpperCase().replace(/ /g, "_");
      updateDemandaMutation.mutate({
        id: numericId,
        status: dbStatus as any,
        substatus: newStatus, // Salvar o status granular
      });
    }

    // Se o status é de delegação, abrir o modal para adicionar instruções
    if (DELEGATION_STATUSES.includes(newStatus.toLowerCase())) {
      const demanda = demandas.find((d) => d.id === demandaId);
      if (demanda) {
        // Mapear o nome do status para o nome do destinatário
        const destinatarioMap: Record<string, string> = {
          amanda: "Amanda",
          emilly: "Emilly",
          taissa: "Taíssa",
        };

        setDelegacaoDemanda({
          demandaId: parseInt(demandaId, 10) || null,
          demandaAto: demanda.ato || "",
          assistidoId: demanda.assistidoId || null,
          assistidoNome: demanda.assistido || "",
          processoId: demanda.processoId || null,
          processoNumero: demanda.processos?.[0]?.numero || "",
          destinatarioNome: destinatarioMap[newStatus.toLowerCase()] || newStatus,
        });
        setDelegacaoModalOpen(true);
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
  };

  const handleProvidenciasChange = (demandaId: string, providencias: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, providencias } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({
        id: numericId,
        providencias,
      });
    }

    toast.success("Providências atualizadas!");
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
    // Optimistic update local
    setDemandas((prev) =>
      prev.map((d) =>
        d.id === demandaId
          ? { ...d, processos: d.processos?.length ? [{ ...d.processos[0], numero }] : [{ tipo: "", numero }] }
          : d
      )
    );

    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, processoNumero: numero });
    }

    toast.success("Numero do processo atualizado!");
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

  const handleSaveNewDemanda = (demandaData: DemandaFormData) => {
    // Por enquanto usar dados locais (mock) até o modal estar preparado
    // para selecionar assistidos e processos do banco de dados
    const newDemanda = {
      id: `new-${Date.now()}`,
      status: demandaData.status || "fila",
      prazo: demandaData.prazo,
      data: demandaData.data || new Date().toLocaleDateString("pt-BR"),
      assistido: demandaData.assistido,
      avatar: "",
      processos: demandaData.processos,
      ato: demandaData.ato,
      providencias: demandaData.providencias,
      atribuicao: demandaData.atribuicao,
      tipoAto: demandaData.ato,
      estadoPrisional: demandaData.estadoPrisional || "solto",
      dataInclusao: new Date().toISOString(),
      arquivado: false,
    };
    
    setDemandas((prev) => [newDemanda, ...prev]);
    toast.success("Demanda criada com sucesso!");
    setIsCreateModalOpen(false);
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
      updateDemandaMutation.mutate({ id: numericId, status: "5_FILA" });
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
    const currentIndex = demandasOrdenadas.findIndex(d => d.id === id);

    if (event?.shiftKey && lastSelectedIndex.current !== null) {
      // Range selection: select all between lastSelectedIndex and currentIndex
      const start = Math.min(lastSelectedIndex.current, currentIndex);
      const end = Math.max(lastSelectedIndex.current, currentIndex);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          next.add(demandasOrdenadas[i].id);
        }
        return next;
      });
      // Update lastSelectedIndex so subsequent shift+clicks extend from here
      lastSelectedIndex.current = currentIndex;
    } else {
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
      lastSelectedIndex.current = currentIndex;
    }

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

  const handleExitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
    lastSelectedIndex.current = null;
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
      status: data.status || "fila",
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

      // 5 - Fila
      'fila': 'Fila',

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

          const statusNormalizado = data.status?.toLowerCase?.() || 'fila';
          // Busca no mapa, se não encontrar usa o status original (capitalizado)
          const substatusValido = statusMap[statusNormalizado] || data.status || 'Fila';

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
      const matchStatusGroup =
        !selectedStatusGroup ||
        selectedStatusGroup.includes(getStatusConfig(demanda.status).group);

      return (
        matchArchived &&
        matchSearch &&
        matchPrazoFilter &&
        matchAtribuicao &&
        matchStatusGroup &&
        matchEstadoPrisional &&
        matchTipoAto
      );
    });
  }, [demandas, searchTerm, selectedPrazoFilter, selectedAtribuicoes, selectedEstadoPrisional, selectedTipoAto, selectedStatusGroup, showArchived]);

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
  const STATUS_GROUP_ORDER = ["triagem", "preparacao", "diligencias", "saida", "concluida", "arquivado"];

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
        const ga = STATUS_GROUP_ORDER.indexOf(getStatusConfig(a.status).group);
        const gb = STATUS_GROUP_ORDER.indexOf(getStatusConfig(b.status).group);
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

  const handleAtribuicaoToggle = (value: string) => {
    setSelectedAtribuicoes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Single-select: always replaces (for kanban/planilha)
  const handleSingleAtribuicaoSelect = useCallback((value: string) => {
    setSelectedAtribuicoes([value]);
  }, []);

  // Auto-select first atribuição in kanban/planilha if none selected
  useEffect(() => {
    if ((activeTab === "kanban" || activeTab === "planilha") && selectedAtribuicoes.length === 0) {
      const firstOpt = atribuicaoOptions.find(o => o.value !== "Todas");
      if (firstOpt) setSelectedAtribuicoes([firstOpt.value]);
    }
  }, [activeTab, selectedAtribuicoes.length]);

  // When switching TO kanban/planilha from multi-select, narrow to first selection
  useEffect(() => {
    if ((activeTab === "kanban" || activeTab === "planilha") && selectedAtribuicoes.length > 1) {
      setSelectedAtribuicoes([selectedAtribuicoes[0]]);
    }
  }, [activeTab]);

  // Quick-preview sheet
  const [previewDemandaId, setPreviewDemandaId] = useState<string | null>(null);
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

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 overflow-x-hidden">
      {/* Compact Header — Single-line with Tabs + Toolbar */}
      <div className="px-3 sm:px-5 md:px-8 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Left: Tabs (icon-only, label when active) */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 shrink-0">
            {[
              { key: "kanban" as const, label: "Kanban", icon: Layers },
              { key: "planilha" as const, label: "Planilha", icon: Table2 },
              { key: "prazos" as const, label: "Prazos", icon: Clock },
              { key: "analytics" as const, label: "Analytics", icon: BarChartIcon },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    // Planilha tab always opens in compact mode
                    if (tab.key === "planilha" && viewMode === "cards") {
                      setViewMode("compact");
                      localStorage.setItem("defender_demandas_view_mode", "compact");
                    }
                  }}
                  title={tab.label}
                  className={`relative flex items-center gap-1.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "px-2.5 text-white bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 shadow-sm rounded-lg"
                      : "px-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 rounded-lg"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {isActive && (
                    <>
                      <span>{tab.label}</span>
                      <span className="text-[9px] font-semibold tabular-nums bg-white/20 px-1.5 py-0.5 rounded-full">
                        {demandas.filter(d => !d.arquivado).length}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {/* Counters — badges compactos com Lucide icons (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-1.5 whitespace-nowrap shrink-0">
            {(() => {
              const urgentes = demandas.filter(d => !d.arquivado && (d.prioridade === "URGENTE" || d.prioridade === "REU_PRESO")).length;
              const presos = demandas.filter(d => !d.arquivado && d.estadoPrisional === "preso").length;
              return (
                <>
                  {urgentes > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded-md">
                      <AlertTriangle className="w-3 h-3" />
                      {urgentes}
                    </span>
                  )}
                  {presos > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-md">
                      <Lock className="w-3 h-3" />
                      {presos}
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Right: 4 Toolbar buttons only — Search, Filtros, Settings, Nova */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 1. Search — expandable */}
            {isMobileSearchOpen ? (
              <div className="flex-1 min-w-0 relative animate-in slide-in-from-right-2 duration-200">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <Input
                  ref={mobileSearchRef}
                  placeholder="Buscar assistido, processo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onBlur={() => { if (!searchTerm) setIsMobileSearchOpen(false); }}
                  autoFocus
                  className="pl-8 pr-7 h-7 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700/80 focus:border-emerald-400 rounded-lg w-48 sm:w-56"
                />
                <button onClick={() => { setSearchTerm(""); setIsMobileSearchOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
                  <X className="w-3 h-3 text-zinc-400 hover:text-zinc-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsMobileSearchOpen(true); setTimeout(() => mobileSearchRef.current?.focus(), 100); }}
                className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  searchTerm ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* 2. Filtros — unified dropdown with Sort, Group, View, Column Filters, Preso, Archive */}
            <div className="relative">
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer relative ${
                  isFiltersExpanded || selectedStatusGroup || selectedEstadoPrisional || selectedTipoAto || groupBy || showColumnFilters || showArchived
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                title="Filtros e opções de visualização"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {(() => {
                  const count = [selectedStatusGroup, selectedEstadoPrisional, selectedTipoAto, groupBy, showColumnFilters, showArchived].filter(Boolean).length;
                  return count > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center">{count}</span>
                  ) : null;
                })()}
              </button>
              {isFiltersExpanded && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFiltersExpanded(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white/95 dark:bg-[#141416]/95 backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/40 py-1.5 min-w-[220px] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                    {/* Sort */}
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Ordenar</span>
                    </div>
                    {[
                      { key: "recentes", label: "Importação ↓" },
                      { key: "status", label: "Status" },
                      { key: "prazo", label: "Prazo" },
                      { key: "assistido", label: "Assistido (A-Z)" },
                      { key: "ato", label: "Ato" },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => setSortStack([{ column: opt.key, direction: "asc" }])}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${sortStack[0]?.column === opt.key ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                      >
                        {sortStack[0]?.column === opt.key && <span className="text-emerald-500">✓</span>}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
                    {/* Group By */}
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Agrupar</span>
                    </div>
                    {[
                      { key: null as "status" | "atribuicao" | null, label: "Sem agrupamento" },
                      { key: "status" as const, label: "Por Status" },
                      { key: "atribuicao" as const, label: "Por Atribuição" },
                    ].map(opt => (
                      <button key={opt.key ?? "none"} onClick={() => { setGroupBy(opt.key); setCollapsedGroups(new Set()); if (opt.key) localStorage.setItem("defender_demandas_groupby", opt.key); else localStorage.removeItem("defender_demandas_groupby"); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${groupBy === opt.key ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                      >
                        {groupBy === opt.key && <span className="text-emerald-500">✓</span>}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
                    {/* View Mode */}
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Vista</span>
                    </div>
                    {[
                      { mode: "compact" as const, label: "Planilha", icon: Rows3 },
                      { mode: "grid" as const, label: "Grid", icon: LayoutGrid },
                      { mode: "cards" as const, label: "Cards", icon: LayoutList },
                    ].map(({ mode, label, icon: Icon }) => (
                      <button key={mode} onClick={() => { setViewMode(mode); localStorage.setItem("defender_demandas_view_mode", mode); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${viewMode === mode ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                        {viewMode === mode && <span className="ml-auto text-emerald-500">✓</span>}
                      </button>
                    ))}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
                    {/* Toggle options */}
                    <button onClick={() => setShowColumnFilters(!showColumnFilters)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${showColumnFilters ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Filtros por coluna</span>
                      {showColumnFilters && <span className="ml-auto text-emerald-500">✓</span>}
                    </button>
                    <button onClick={() => setSelectedEstadoPrisional(selectedEstadoPrisional === "preso" ? null : "preso")}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${selectedEstadoPrisional === "preso" ? "text-rose-700 dark:text-rose-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Apenas presos</span>
                      {selectedEstadoPrisional === "preso" && <span className="ml-auto text-rose-500">✓</span>}
                    </button>
                    <button onClick={() => setShowArchived(!showArchived)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${showArchived ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Ver arquivados</span>
                      {showArchived && <span className="ml-auto text-amber-500">✓</span>}
                    </button>
                    {/* Advanced filters section */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1.5" />
                    <div className="px-2 py-1">
                      <FilterSectionsCompact
                        selectedPrazoFilter={selectedPrazoFilter}
                        setSelectedPrazoFilter={setSelectedPrazoFilter}
                        selectedAtribuicao={selectedAtribuicoes[0] || null}
                        setSelectedAtribuicao={(v: string | null) => setSelectedAtribuicoes(v ? [v] : [])}
                        selectedEstadoPrisional={selectedEstadoPrisional}
                        setSelectedEstadoPrisional={setSelectedEstadoPrisional}
                        selectedTipoAto={selectedTipoAto}
                        setSelectedTipoAto={setSelectedTipoAto}
                        selectedStatusGroup={selectedStatusGroup}
                        setSelectedStatusGroup={setSelectedStatusGroup}
                        atribuicaoOptions={atribuicaoOptions}
                        atribuicaoIcons={atribuicaoIcons}
                        atribuicaoColors={atribuicaoColors}
                        atoOptions={atoOptionsFiltered}
                        isExpanded={true}
                        onToggleExpand={() => {}}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. Settings — Import, Export, Infográficos, Duplicatas, Config */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Configurações e importação"
              >
                <Settings className="w-4 h-4" />
              </button>
              {isSettingsDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSettingsDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg py-1 min-w-[180px]">
                    <button onClick={() => { setIsAdminConfigModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Settings className="w-3.5 h-3.5 text-zinc-400" /> Configurações
                    </button>
                    <button onClick={() => { setIsChartConfigModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <BarChartIcon className="w-3.5 h-3.5 text-zinc-400" /> Infográficos
                    </button>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                    <button onClick={() => { setIsImportModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> Importar Excel
                    </button>
                    <button onClick={() => { setIsPJeImportModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> Importar PJe
                    </button>
                    <button onClick={() => { setIsSheetsImportModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> Importar Sheets
                    </button>
                    <button onClick={() => { setIsSEEUImportModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> Importar SEEU
                    </button>
                    <button onClick={() => { setIsExportModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-zinc-400" /> Exportar
                    </button>
                    <button onClick={handleExportSheets} disabled={exportToSheetsMutation.isPending} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      {exportToSheetsMutation.isPending ? (
                        <><Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" /> Exportando...</>
                      ) : (
                        <><Table2 className="w-3.5 h-3.5 text-emerald-600" /> Exportar para Google Sheets</>
                      )}
                    </button>
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                    <button onClick={() => { setIsDuplicatesModalOpen(true); setIsSettingsDropdownOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Copy className="w-3.5 h-3.5 text-amber-500" /> Encontrar Duplicatas
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* 4. Nova Demanda — primary action */}
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              title="Nova Demanda"
              className="h-7 px-2.5 ml-0.5 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-[11px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Nova</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-2 md:p-4 space-y-2 md:space-y-3">
        {activeTab === "planilha" ? (
        <>

        {/* Lista de Demandas */}
        <div className="group/card relative bg-white dark:bg-zinc-900">
            <div className="px-3 md:px-4 py-2">
              {/* Atribuição pills + Deadline stats */}
              <AtribuicaoPills
                options={atribuicaoOptions}
                selectedValues={selectedAtribuicoes}
                onToggle={handleSingleAtribuicaoSelect}
                onClear={() => {}}
                counts={atribuicaoCounts}
                singleSelect
                className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5"
              >
                {/* Deadline stats — right-aligned */}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                    {deadlineStats.vencidas > 0 && (
                      <button onClick={() => setSelectedPrazoFilter(selectedPrazoFilter === "vencidos" ? null : "vencidos")}
                        className={`font-semibold px-1.5 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer ${selectedPrazoFilter === "vencidos" ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400" : "text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"}`}
                      >
                        {deadlineStats.vencidas} venc.
                      </button>
                    )}
                    {deadlineStats.hoje > 0 && (
                      <button onClick={() => setSelectedPrazoFilter(selectedPrazoFilter === "hoje" ? null : "hoje")}
                        className={`font-semibold px-1.5 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer ${selectedPrazoFilter === "hoje" ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400" : "text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"}`}
                      >
                        {deadlineStats.hoje} hoje
                      </button>
                    )}
                    {deadlineStats.semana > 0 && (
                      <button onClick={() => setSelectedPrazoFilter(selectedPrazoFilter === "semana" ? null : "semana")}
                        className={`font-medium px-1.5 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer ${selectedPrazoFilter === "semana" ? "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400" : "text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"}`}
                      >
                        {deadlineStats.semana} sem.
                      </button>
                    )}
                    {(() => {
                      const presoCount = demandas.filter(d => !d.arquivado && d.estadoPrisional === "preso").length;
                      if (presoCount === 0) return null;
                      const isActive = selectedEstadoPrisional === "preso";
                      return (
                        <button
                          onClick={() => setSelectedEstadoPrisional(isActive ? null : "preso")}
                          className={`flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer ${isActive ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400" : "text-rose-400 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"}`}
                          title="Filtrar apenas presos"
                        >
                          <Lock className="w-2.5 h-2.5" />
                          {presoCount}
                        </button>
                      );
                    })()}
                  </div>
              </AtribuicaoPills>

              {/* Secondary Filters now inside the unified Filtros dropdown in the header */}
            </div>

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

            <div className={`${viewMode === "table" ? "p-0" : viewMode === "cards" ? "p-4 space-y-3" : viewMode === "compact" ? "p-0" : "p-4"} ${viewMode === "compact" ? "" : "max-h-[calc(100vh-180px)] min-h-[500px] overflow-y-auto"} scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700`}>
              {viewMode === "table" ? (
                /* ========== MODO PLANILHA (PADRÃO) ========== */
                <DemandaTableView
                  demandas={demandasOrdenadas}
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
                  onProvidenciasChange={handleProvidenciasChange}
                  onAssistidoChange={handleAssistidoChange}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ) : viewMode === "cards" ? (
                /* ========== MODO CARDS HORIZONTAIS ========== */
                <>
                  {demandasOrdenadas.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-5 flex items-center justify-center">
                        <ListTodo className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
                      </div>
                      <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Nenhuma demanda encontrada
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {showArchived
                          ? "Não há demandas arquivadas no momento"
                          : "Ajuste os filtros ou crie uma nova demanda"}
                      </p>
                    </div>
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
                            onProvidenciasChange={handleProvidenciasChange}
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
                  atribuicaoIcons={atribuicaoIcons}
                  atribuicaoColors={ATRIBUICAO_BORDER_COLORS}
                  onStatusChange={handleStatusChange}
                  onAtoChange={handleAtoChange}
                  onProvidenciasChange={handleProvidenciasChange}
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
                  {demandasOrdenadas.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-5 flex items-center justify-center">
                        <ListTodo className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
                      </div>
                      <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Nenhuma demanda encontrada
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {showArchived
                          ? "Não há demandas arquivadas no momento"
                          : "Ajuste os filtros ou crie uma nova demanda"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {visibleDemandas.map((demanda) => {
                        const statusConfig = getStatusConfig(demanda.status);
                        const borderColor = STATUS_GROUPS[statusConfig.group].color;

                        return (
                          <DemandaGridCard
                            key={demanda.id}
                            demanda={demanda}
                            statusConfig={statusConfig}
                            borderColor={borderColor}
                            atribuicaoIcons={atribuicaoIcons}
                            onStatusChange={handleStatusChange}
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

            <div className="px-4 md:px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
              {isSelectMode ? (
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    {selectedIds.size === demandasOrdenadas.length ? "Desmarcar tudo" : "Selecionar tudo"}
                  </button>
                  <span className="text-xs text-zinc-400">
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
                          className="h-7 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
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
                          className="h-7 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
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
                          className="h-7 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 cursor-pointer focus:ring-1 focus:ring-emerald-400/50 focus:outline-none"
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
                      className="h-7 text-xs text-zinc-400 hover:text-zinc-600"
                      onClick={handleExitSelectMode}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
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
                    className="text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
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
            {/* Atribuição pills */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2">
              <AtribuicaoPills
                options={atribuicaoOptions}
                selectedValues={selectedAtribuicoes}
                onToggle={handleSingleAtribuicaoSelect}
                onClear={() => {}}
                counts={atribuicaoCounts}
                singleSelect
              />
            </div>

            {/* Kanban Premium Board */}
            <KanbanPremium
              demandas={demandasFiltradas}
              onCardClick={(id) => setPreviewDemandaId(id)}
              onStatusChange={handleStatusChange}
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
            atribuicaoCounts={atribuicaoCounts}
            onCardClick={(id) => setPreviewDemandaId(id)}
          />
        ) : (
          /* ========== TAB ANALYTICS ========== */
          <div className="space-y-6">
            {/* Filtro por atribuição no Analytics */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2">
              <AtribuicaoPills
                options={atribuicaoOptions}
                selectedValues={selectedAtribuicoes}
                onToggle={handleAtribuicaoToggle}
                onClear={() => setSelectedAtribuicoes([])}
                counts={atribuicaoCounts}
              />
            </div>

            {/* Stats KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statsData.map((stat, index) => {
                const Icon = stat.icon;
                const isAlert = stat.gradient === "rose" || stat.gradient === "amber";
                const hasValue = Number(String(stat.value).replace('%','')) > 0;
                return (
                  <div key={index} className={`flex items-center gap-3 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 ${isAlert && hasValue ? 'border-rose-200 dark:border-rose-800/50' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isAlert && hasValue ? 'bg-rose-100 dark:bg-rose-950/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <Icon className={`w-4 h-4 ${isAlert && hasValue ? 'text-rose-500' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{stat.title}</p>
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
                    <Card key={chartKey} className="group/chart relative p-4 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover/chart:via-emerald-500/20 transition-all duration-300 rounded-t-xl" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover/chart:border-emerald-300/30 dark:group-hover/chart:border-emerald-700/30 group-hover/chart:bg-emerald-50 dark:group-hover/chart:bg-emerald-900/20 transition-all duration-300">
                          <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover/chart:text-emerald-600 dark:group-hover/chart:text-emerald-400 transition-colors duration-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{chartConfig?.label || chartKey}</h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{chartConfig?.category}</p>
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
        className="sm:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white shadow-lg shadow-zinc-900/30 dark:shadow-black/50 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
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

      {/* Quick-preview Sheet lateral */}
      <DemandaQuickPreview
        demanda={previewDemanda}
        open={!!previewDemandaId}
        onOpenChange={(open) => { if (!open) setPreviewDemandaId(null); }}
        onStatusChange={handleStatusChange}
        onAtoChange={handleAtoChange}
        onProvidenciasChange={handleProvidenciasChange}
        onPrazoChange={handlePrazoChange}
        onAtribuicaoChange={handleAtribuicaoChange}
        onArchive={handleArchiveDemanda}
        onDelete={handleDeleteDemanda}
        onNavigate={handlePreviewNavigate}
        copyToClipboard={copyToClipboard}
        atribuicaoIcons={atribuicaoIcons}
        currentIndex={previewIndex >= 0 ? previewIndex : undefined}
        totalCount={demandasOrdenadas.length}
      />
    </div>
  );
}