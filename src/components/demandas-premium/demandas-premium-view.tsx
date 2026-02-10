// @ts-nocheck
"use client";

import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
import { ConfigModal } from "@/components/demandas-premium/config-modal";
import { DynamicChart } from "@/components/demandas-premium/dynamic-charts";
import { HistoricoChart } from "@/components/demandas-premium/historico-chart";
import { FilterSectionsCompact } from "@/components/demandas-premium/filter-sections-compact";
import { InfographicSelector } from "@/components/demandas-premium/infographic-selector";
import { ChartConfigModal } from "@/components/demandas-premium/chart-config-modal";
import { ImportModal } from "@/components/demandas-premium/import-modal";
import { PJeImportModal } from "@/components/demandas-premium/pje-import-modal";
import { ExportModal } from "@/components/demandas-premium/export-modal";
import { AdminConfigModal } from "@/components/demandas-premium/admin-config-modal";
import { ImportDropdown } from "@/components/demandas-premium/import-dropdown";
import { SheetsImportModal } from "@/components/demandas-premium/sheets-import-modal";
import { SEEUImportModal } from "@/components/demandas-premium/seeu-import-modal";
import { DelegacaoModal } from "@/components/demandas/delegacao-modal";
import { getStatusConfig, STATUS_GROUPS, type StatusGroup } from "@/config/demanda-status";
import { getAtosPorAtribuicao, getTodosAtosUnicos, ATOS_POR_ATRIBUICAO } from "@/config/atos-por-atribuicao";
import { copyToClipboard } from "@/lib/clipboard";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/demandas-premium/PageHeader";
import { DemandaCard } from "@/components/demandas-premium/DemandaCard";
import { DemandaTableView } from "@/components/demandas-premium/DemandaTableView";
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
  Zap,
  XCircle,
  MessageSquare,
  ScrollText,
  FileUp,
  Send,
  Clock,
  Users,
  Clipboard,
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
  UserCheck,
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
  { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri", icon: Target },
  { value: "Violência Doméstica", label: "Violência Doméstica", icon: Home },
  { value: "Execução Penal", label: "Execução Penal", icon: Lock },
  { value: "Substituição Criminal", label: "Substituição Criminal", icon: RefreshCw },
  { value: "Curadoria Especial", label: "Curadoria Especial", icon: Shield },
];

const statusOptions = [
  { value: "urgente", label: "Urgente", icon: AlertTriangle },
  { value: "analisar", label: "Analisar", icon: Search },
  { value: "elaborar", label: "Elaborar", icon: FileEdit },
  { value: "elaborando", label: "Elaborando", icon: FileEdit },
  { value: "revisar", label: "Revisar", icon: FileCheck },
  { value: "protocolar", label: "Protocolar", icon: Upload },
  { value: "fila", label: "Fila", icon: ListTodo },
  { value: "protocolado", label: "Protocolado", icon: CheckCircle2 },
  { value: "monitorar", label: "Monitorar", icon: CheckCircle2 },
  { value: "resolvido", label: "Resolvido", icon: CheckCircle2 },
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
    <div className="group relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* BORDA LATERAL ESQUERDA - COR DA ATRIBUIÇÃO (sempre visível) */}
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ backgroundColor: atribuicaoBorderColor }}
      />

      {/* Gradiente de fundo sutil baseado na atribuição - no hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none rounded-xl transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom right, ${atribuicaoBorderColor}10 0%, ${atribuicaoBorderColor}05 30%, transparent 60%)`
        }}
      />

      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className="absolute inset-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-200"
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
            <button
              onClick={() => { onEdit(demanda); setShowQuickActions(false); }}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="text-[9px]">Ver/Editar</span>
            </button>
            <button
              onClick={() => { copyToClipboard(demanda.processos?.[0]?.numero || "", "Processo copiado!"); setShowQuickActions(false); }}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            >
              <FileText className="w-4 h-4" />
              <span className="text-[9px]">Copiar Nº</span>
            </button>
            <button
              onClick={() => { onArchive(demanda.id); setShowQuickActions(false); }}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all"
            >
              <Archive className="w-4 h-4" />
              <span className="text-[9px]">Arquivar</span>
            </button>
            <button
              onClick={() => { onDelete(demanda.id); setShowQuickActions(false); }}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-white/5 hover:bg-rose-500/30 text-white/80 hover:text-rose-300 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[9px]">Excluir</span>
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

      {/* Conteúdo do Card */}
      <div className="pl-4 pr-3 py-3 space-y-2.5 relative z-10">
        {/* Header: Status PROEMINENTE + Prazo + Quick Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* STATUS - Maior e mais visível */}
          <div
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{demanda.substatus || statusConfig.label}</span>
          </div>

          <div className="flex items-center gap-1">
            {prazoInfo && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                prazoInfo.urgent
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}>
                {prazoInfo.text}
              </span>
            )}
            {/* Botão Quick Actions */}
            <button
              onClick={() => setShowQuickActions(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Assistido + Indicador de Preso */}
        <div className="flex items-center gap-2">
          {isPreso && (
            <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
            {demanda.assistido}
          </p>
        </div>

        {/* Ato - com ícone mas cores neutras */}
        <AtoWithIcon ato={demanda.ato} />

        {/* Footer: Atribuição colorida + Processo */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: atribuicaoBorderColor }}
          >
            <AtribuicaoIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{demanda.atribuicao}</span>
          </div>

          {/* Número do Processo */}
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
  const [sortBy, setSortBy] = useState("status");
  const [demandas, setDemandas] = useState<any[]>([]);
  const [selectedPrazoFilter, setSelectedPrazoFilter] = useState<string | null>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string | null>(null);
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
  const [showArchived, setShowArchived] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDemanda, setEditingDemanda] = useState<DemandaFormData | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isInfographicsExpanded, setIsInfographicsExpanded] = useState(false);
  const [isAdminConfigModalOpen, setIsAdminConfigModalOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const [viewMode, setViewMode] = useState<"table" | "cards" | "grid" | "compact">(() => {
    if (typeof window !== "undefined") {
      // Padrão é "grid" (modo grid premium) - melhor visualização de cards
      return (localStorage.getItem("defender_demandas_view_mode") as "table" | "cards" | "grid" | "compact") || "grid";
    }
    return "grid";
  });

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================
  const { data: demandasDB = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    limit: 100,
  });

  const utils = trpc.useUtils();
  
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

  // Mutation para atualizar demanda
  const updateDemandaMutation = trpc.demandas.update.useMutation({
    onSuccess: () => {
      toast.success("Demanda atualizada!");
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Mutation para deletar demanda (soft delete)
  const deleteDemandaMutation = trpc.demandas.delete.useMutation({
    onSuccess: () => {
      toast.success("Demanda deletada!");
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar: " + error.message);
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
      status: d.substatus || DB_STATUS_TO_UI[d.status] || d.status?.toLowerCase().replace(/_/g, " ") || "fila",
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
      estadoPrisional: d.reuPreso ? "preso" : (d.assistido?.statusPrisional || "solto"),
      prioridade: d.prioridade || "normal",
      arquivado: d.status === "ARQUIVADO",
      reuPreso: d.reuPreso || false,
      substatus: d.substatus || null,
    }));
  }, [demandasDB]);

  // Sincronizar demandas mapeadas com o estado
  useEffect(() => {
    setDemandas(mappedDemandas);
  }, [mappedDemandas]);

  // Gerar lista de atos dinamicamente baseado na atribuição selecionada
  const atoOptionsFiltered = useMemo(() => {
    // Se não houver atribuição selecionada ou for "Todas", retorna todos os atos
    if (!selectedAtribuicao || selectedAtribuicao === "Todas") {
      return getTodosAtosUnicos();
    }
    
    // Retorna atos específicos da atribuição
    return getAtosPorAtribuicao(selectedAtribuicao);
  }, [selectedAtribuicao]);

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
    "monitorar": "4_MONITORAR",
    "protocolar": "5_FILA",
    "protocolado": "7_PROTOCOLADO",
    "ciencia": "7_CIENCIA",
    "sem_atuacao": "7_SEM_ATUACAO",
    "urgente": "URGENTE",
    "resolvido": "CONCLUIDO",
    "arquivado": "ARQUIVADO",
  };

  // Status que disparam o modal de delegação
  const DELEGATION_STATUSES = ["amanda", "emilly", "taissa"];

  const handleStatusChange = (demandaId: string, newStatus: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus } : d))
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  const handleExitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const importFromSheetsMutation = trpc.demandas.importFromSheets.useMutation({
    onSuccess: (result) => {
      utils.demandas.list.invalidate();
      utils.demandas.stats.invalidate();
      const messages: string[] = [];
      if (result.imported > 0) messages.push(`${result.imported} importadas`);
      if (result.skipped > 0) messages.push(`${result.skipped} ignoradas (duplicatas)`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} erros`);
      toast.success(`Importação concluída: ${messages.join(", ")}`);
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
    },
    onError: (error) => {
      toast.error("Erro na importação: " + error.message);
    },
  });

  const handleImportDemandas = async (importedData: any[], atualizarExistentes?: boolean) => {
    // Mapear dados do modal para o formato esperado pela mutation
    const rows = importedData.map((data) => ({
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
    }));

    // Por padrão, sempre atualizar existentes para evitar duplicatas
    // A verificação de duplicata é feita apenas por processoId (sem validar ato)
    importFromSheetsMutation.mutate({ rows, atualizarExistentes: atualizarExistentes ?? true });
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
      const matchPrazoFilter =
        !selectedPrazoFilter ||
        (selectedPrazoFilter === "prazo" && demanda.prazo) ||
        (selectedPrazoFilter === "sem-prazo" && !demanda.prazo);
      const matchAtribuicao =
        !selectedAtribuicao || demanda.atribuicao === selectedAtribuicao;
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
  }, [demandas, searchTerm, selectedPrazoFilter, selectedAtribuicao, selectedEstadoPrisional, selectedTipoAto, selectedStatusGroup, showArchived]);

  // Ordenar demandas
  const demandasOrdenadas = useMemo(() => {
    const sorted = [...demandasFiltradas];
    
    if (sortBy === "prazo") {
      return sorted.sort((a, b) => {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });
    } else if (sortBy === "assistido") {
      return sorted.sort((a, b) => a.assistido.localeCompare(b.assistido));
    } else if (sortBy === "data") {
      return sorted.sort((a, b) => {
        if (!a.data) return 1;
        if (!b.data) return -1;
        return b.data.localeCompare(a.data);
      });
    } else if (sortBy === "recentes") {
      // Ordenar por data de importação (recentes primeiro)
      // Quando timestamps são iguais, usa o ID para manter a ordem da lista importada
      return sorted.sort((a, b) => {
        const dateA = a.dataInclusao || a.data || "";
        const dateB = b.dataInclusao || b.data || "";
        const dateCompare = dateB.localeCompare(dateA);
        if (dateCompare !== 0) return dateCompare;
        // Se timestamps iguais, ordenar por ID (maior ID = mais recente/última posição na lista)
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });
    } else if (sortBy === "status") {
      return sorted.sort((a, b) => {
        const statusA = getStatusConfig(a.status);
        const statusB = getStatusConfig(b.status);
        const groupOrder = ["urgente", "preparacao", "delegacao", "monitoramento", "fila", "diligencias", "concluida"];
        const indexA = groupOrder.indexOf(statusA.group);
        const indexB = groupOrder.indexOf(statusB.group);
        return indexA - indexB;
      });
    } else if (sortBy === "ato") {
      return sorted.sort((a, b) => a.ato.localeCompare(b.ato));
    }
    
    return sorted;
  }, [demandasFiltradas, sortBy]);

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
        label: "Em Preparação",
        value: emPreparacao.toString(),
        icon: FileEdit,
        change: `${Math.round((emPreparacao / demandasAtivas.length) * 100)}%`,
        changeLabel: "do total",
      },
      {
        label: "Prazos Críticos",
        value: prazosCriticos.toString(),
        icon: AlertTriangle,
        change: `${Math.round((prazosCriticos / demandasAtivas.length) * 100)}%`,
        changeLabel: "do total",
      },
      {
        label: "Rus Presos",
        value: `${percentualPresos}%`,
        icon: Lock,
        change: `${reusPresos}`,
        changeLabel: `de ${totalComEstadoPrisional} réus`,
      },
      {
        label: "Cautelares Diversas",
        value: comCautelar.toString(),
        icon: ShieldCheck,
        change: `${Math.round((comCautelar / totalComEstadoPrisional) * 100) || 0}%`,
        changeLabel: "do total",
      },
    ];
  }, [demandas]);

  return (
    <div className="w-full min-h-screen bg-zinc-100 dark:bg-[#0f0f11] overflow-x-hidden">
      {/* Header */}
      <PageHeader
        title="Demandas"
        subtitle="Gerenciamento de prazos e solicitações"
        actions={
          <div className="flex items-center gap-0.5">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsAdminConfigModalOpen(true)} 
              title="Configurações"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsChartConfigModalOpen(true)} 
              title="Infográficos"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BarChartIcon className="w-3.5 h-3.5" />
            </Button>
            <ImportDropdown
              onImportExcel={() => setIsImportModalOpen(true)}
              onImportPJe={() => setIsPJeImportModalOpen(true)}
              onImportSheets={() => setIsSheetsImportModalOpen(true)}
              onImportSEEU={() => setIsSEEUImportModalOpen(true)}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExportModalOpen(true)} 
              title="Exportar"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button 
              size="sm"
              onClick={() => setIsCreateModalOpen(true)} 
              title="Nova Demanda"
              className="h-7 px-2.5 ml-1.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova
            </Button>
          </div>
        }
      />

      {/* Conteúdo Principal */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - 2 colunas em mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]"
              >
                {/* Linha superior sutil no hover */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
                
                <div className="flex items-start justify-between gap-2 md:gap-3">
                  <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                      {stat.label}
                    </p>
                    <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                      {stat.value}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                        {stat.change}
                      </span>{" "}
                      {stat.changeLabel}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtros e Infográficos */}
        <div className="space-y-4">
          {/* Filtros Rápidos */}
          <Card className="group/card relative border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
            <FilterSectionsCompact
              selectedPrazoFilter={selectedPrazoFilter}
              setSelectedPrazoFilter={setSelectedPrazoFilter}
              selectedAtribuicao={selectedAtribuicao}
              setSelectedAtribuicao={setSelectedAtribuicao}
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
              isExpanded={isFiltersExpanded}
              onToggleExpand={() => setIsFiltersExpanded(!isFiltersExpanded)}
            />
          </Card>

          {/* Lista de Demandas */}
          <Card className="group/card relative border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
            <div className="px-3 md:px-5 py-3 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent dark:from-emerald-500/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                <div className="flex-1 min-w-0 relative">
                  <Search className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Buscar assistido, processo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 md:pl-10 h-9 md:h-10 text-xs md:text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded p-1 transition-colors"
                    >
                      <XCircle className="w-3.5 md:w-4 h-3.5 md:h-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {["status", "prazo", "assistido", "ato", "recentes"].map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all whitespace-nowrap ${
                        sortBy === sort
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {sort === "recentes" && <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 inline mr-0.5 md:mr-1" />}
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Toggle de Visualização: Grid / Lista / Cards - Mobile e Desktop */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => {
                      setViewMode("grid");
                      localStorage.setItem("defender_demandas_view_mode", "grid");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "grid"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Grid Premium (Padrão)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("table");
                      localStorage.setItem("defender_demandas_view_mode", "table");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "table"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Lista"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("cards");
                      localStorage.setItem("defender_demandas_view_mode", "cards");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "cards"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Cards Horizontais"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("compact");
                      localStorage.setItem("defender_demandas_view_mode", "compact");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "compact"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Tabela Compacta (para comparação)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${
                    showArchived
                      ? "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <Archive className="w-2.5 md:w-3 h-2.5 md:h-3 inline mr-0.5 md:mr-1" />
                  {showArchived ? "Ativos" : "Arquivados"}
                </button>
              </div>
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

            <div className={`${viewMode === "table" ? "p-0" : viewMode === "cards" ? "p-4 space-y-3" : viewMode === "compact" ? "p-2" : "p-4"} max-h-[calc(100vh-180px)] min-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-900`}>
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
                  copyToClipboard={copyToClipboard}
                  onAtoChange={handleAtoChange}
                  onProvidenciasChange={handleProvidenciasChange}
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
                    demandasOrdenadas.map((demanda) => {
                      const statusConfig = getStatusConfig(demanda.status);
                      const borderColor = STATUS_GROUPS[statusConfig.group].color;

                      // Filtrar atos específicos para a atribuição da demanda
                      const atoOptionsForDemanda = getAtosPorAtribuicao(demanda.atribuicao);

                      return (
                        <DemandaCard
                          key={demanda.id}
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
                          copyToClipboard={copyToClipboard}
                          onProvidenciasChange={handleProvidenciasChange}
                          isSelectMode={isSelectMode}
                          isSelected={selectedIds.has(demanda.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      );
                    })
                  )}
                </>
              ) : viewMode === "compact" ? (
                /* ========== MODO COMPACTO - TABELA PARA COMPARAÇÃO ========== */
                <div className="overflow-x-auto">
                  <div className="mb-3 px-2 py-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      <Eye className="w-3 h-3 inline mr-1" />
                      <strong>Modo Comparação:</strong> Visualização compacta para conferir com planilhas/PJe/SEEU. Copie linhas ou compare dados facilmente.
                    </p>
                  </div>
                  {demandasOrdenadas.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-sm text-zinc-500">Nenhuma demanda encontrada</p>
                    </div>
                  ) : (
                    <table className="w-full text-[11px] border-collapse">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">#</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Assistido</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Processo</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Ato</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Prazo</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Status</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Atribuição</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">Providências</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demandasOrdenadas.map((demanda, index) => {
                          const statusConfig = getStatusConfig(demanda.status);
                          const atribuicaoColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";
                          const AtribuicaoIconComp = atribuicaoIcons[demanda.atribuicao] || Scale;
                          return (
                            <tr
                              key={demanda.id}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer border-b border-zinc-100 dark:border-zinc-800"
                              onClick={() => {
                                // Copiar linha para clipboard
                                const linha = `${demanda.assistido}\t${demanda.processos?.[0]?.numero || '-'}\t${demanda.ato}\t${demanda.prazo || '-'}\t${demanda.substatus || demanda.status}\t${demanda.atribuicao}`;
                                copyToClipboard(linha, "Linha copiada!");
                              }}
                              title="Clique para copiar linha"
                            >
                              {/* Indicador de cor da atribuição */}
                              <td className="px-2 py-1.5 text-zinc-400 font-mono relative">
                                <span
                                  className="absolute left-0 inset-y-0 w-0.5"
                                  style={{ backgroundColor: atribuicaoColor }}
                                />
                                {index + 1}
                              </td>
                              <td className="px-2 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 max-w-[150px] truncate">{demanda.assistido}</td>
                              <td className="px-2 py-1.5 font-mono text-zinc-600 dark:text-zinc-400 max-w-[180px] truncate">{demanda.processos?.[0]?.numero || '-'}</td>
                              <td className="px-2 py-1.5">
                                <AtoWithIcon ato={demanda.ato} />
                              </td>
                              <td className="px-2 py-1.5 text-zinc-600 dark:text-zinc-400">{demanda.prazo ? new Date(demanda.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                              <td className="px-2 py-1.5">
                                <StatusWithIcon status={demanda.substatus || demanda.status} statusConfig={statusConfig} />
                              </td>
                              <td className="px-2 py-1.5">
                                <div
                                  className="inline-flex items-center gap-1 text-[10px] font-medium"
                                  style={{ color: atribuicaoColor }}
                                >
                                  <AtribuicaoIconComp className="w-3 h-3" />
                                  <span className="truncate max-w-[100px]">{demanda.atribuicao}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-zinc-500 dark:text-zinc-500 max-w-[200px] truncate">{demanda.providencias || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
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
                      {demandasOrdenadas.map((demanda) => {
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

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between">
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
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="w-3 h-3" />
                        Deletar ({selectedIds.size})
                      </Button>
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
          </Card>

          {/* Infográficos */}
          {selectedCharts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Infográficos</h3>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Visualização de dados e estatísticas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedCharts.map((chartKey) => {
                  const chartConfig = chartOptions.find(opt => opt.value === chartKey);
                  const Icon = chartConfig?.icon || BarChartIcon;
                  
                  return (
                    <Card key={chartKey} className="group/chart relative p-4 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
                      {/* Linha superior sutil no hover */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover/chart:via-emerald-500/20 transition-all duration-300 rounded-t-xl" />
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover/chart:border-emerald-300/30 dark:group-hover/chart:border-emerald-700/30 group-hover/chart:bg-emerald-50 dark:group-hover/chart:bg-emerald-900/20 transition-all duration-300">
                          <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover/chart:text-emerald-600 dark:group-hover/chart:text-emerald-400 transition-colors duration-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 group-hover/chart:text-zinc-800 dark:group-hover/chart:text-zinc-200 transition-colors">
                            {chartConfig?.label || chartKey}
                          </h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {chartConfig?.category}
                          </p>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <DynamicChart
                          type={chartKey}
                          demandas={demandasFiltradas}
                          visualizationType={chartTypes[chartKey] || "pizza"}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <HistoricoChart demandas={demandasFiltradas} />
        </div>
      </div>

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
        onDelegacaoSucesso={() => {
          setDelegacaoDemanda(null);
          toast.success(
            `Tarefa delegada para ${delegacaoDemanda?.destinatarioNome}!`,
            { description: "As instruções foram enviadas com sucesso." }
          );
          utils.demandas.list.invalidate();
        }}
      />
    </div>
  );
}