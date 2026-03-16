"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgendaFilters } from "@/components/agenda/agenda-filters";
import { EventoCreateModal } from "@/components/agenda/evento-create-modal";
import { AgendaExportModal } from "@/components/agenda/agenda-export-modal";
import { PJeAgendaImportModal } from "@/components/agenda/pje-agenda-import-modal";
import { GoogleCalendarConfigModal } from "@/components/agenda/google-calendar-config-modal";
import { GoogleCalendarSyncModal } from "@/components/agenda/google-calendar-sync-modal";
import { ICalImportModal } from "@/components/agenda/ical-import-modal";
import { RegistroAudienciaModal, RegistroAudienciaData } from "@/components/agenda/registro-audiencia-modal-simples";
import { EscalaConfigModal } from "@/components/agenda/escala-config-modal";
import { CalendarMonthView } from "@/components/agenda/calendar-month-view";
import { CalendarWeekView } from "@/components/agenda/calendar-week-view";
import { EventoCard } from "@/components/agenda/evento-card";
import { EventoDetailModal } from "@/components/agenda/evento-detail-modal";
import { BuscaRegistrosModal } from "@/components/agenda/busca-registros-modal";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Clock,
  Plus,
  Search,
  Download,
  Upload,
  Gavel,
  Users,
  AlertTriangle,
  XCircle,
  Grid3x3,
  List,
  UserCog,
  Database,
  Lock,
  Shield,
  Scale,
  MoreHorizontal,
  Filter,
  ChevronDown,
  Zap,
  FileUp,
  FileDown,
  Settings,
  RefreshCw,
  Briefcase,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import {
  isToday,
  isTomorrow,
  startOfMonth,
  endOfMonth,
  addMonths,
  addDays,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface AgendaItem {
  id: string;
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  assistido: string;
  assistidoId?: number | null;
  processo: string;
  processoId?: number | null;
  atribuicao: string;
  atribuicaoKey?: string;
  status: string;
  descricao: string;
  prioridade: string;
  recorrencia: string;
  lembretes: string[];
  tags: string[];
  participantes: string[];
  vinculoDemanda?: string;
  observacoes: string;
  documentos: string[];
  dataInclusao: string;
  responsavel?: string;
  registro?: RegistroAudienciaData;
  fonte?: "audiencias" | "calendar"; // Indica de qual tabela veio
}

interface EventoFormData {
  id?: string;
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  assistido: string;
  processo: string;
  atribuicao: string;
  status: string;
  descricao: string;
  prioridade: string;
  recorrencia: string;
  lembretes: string[];
  tags: string[];
  participantes: string[];
  vinculoDemanda?: string;
  observacoes: string;
  documentos: string[];
}

import { 
  ATRIBUICAO_COLORS, 
  getAtribuicaoColors, 
  ATRIBUICAO_OPTIONS as ATRIBUICAO_FILTER_OPTIONS,
  normalizeAreaToFilter,
  areaMatchesFilter
} from "@/lib/config/atribuicoes";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO PREMIUM
// ==========================================

// Cores HEX por chave de filtro
const FILTER_HEX: Record<string, string> = {
  all: "#71717a",
  VVD: "#f59e0b",
  JURI: "#10b981",
  EXECUCAO: "#3b82f6",
  SUBSTITUICAO: "#f43f5e",
  SUBSTITUICAO_CIVEL: "#f97316",
};

// Opções de filtro para a agenda (sem duplicatas)
const AGENDA_FILTER_OPTIONS = [
  { key: "all", icon: CalendarIcon, hex: FILTER_HEX.all, ...getAtribuicaoColors("all") },
  { key: "VVD", icon: Shield, hex: FILTER_HEX.VVD, ...getAtribuicaoColors("VVD") },
  { key: "JURI", icon: Gavel, hex: FILTER_HEX.JURI, ...getAtribuicaoColors("JURI") },
  { key: "EXECUCAO", icon: Lock, hex: FILTER_HEX.EXECUCAO, ...getAtribuicaoColors("EXECUCAO") },
  { key: "SUBSTITUICAO", icon: RefreshCw, hex: FILTER_HEX.SUBSTITUICAO, ...getAtribuicaoColors("SUBSTITUICAO") },
  { key: "SUBSTITUICAO_CIVEL", icon: Briefcase, hex: FILTER_HEX.SUBSTITUICAO_CIVEL, ...getAtribuicaoColors("SUBSTITUICAO_CIVEL") },
];

// Criar config com ícones JSX para este componente
const ATRIBUICAO_CONFIG: Record<string, any> = {};
AGENDA_FILTER_OPTIONS.forEach(option => {
  const IconComponent = option.icon;
  ATRIBUICAO_CONFIG[option.key] = {
    ...option,
    icon: <IconComponent className="w-3.5 h-3.5" />,
  };
});

// Função para gerar escalas padrão
function generateDefaultEscalas() {
  const today = new Date();
  const items = [];

  for (let i = 0; i < 12; i++) {
    const mes = format(addMonths(today, i), "yyyy-MM");
    const isEven = i % 2 === 0;

    items.push({
      mes,
      atribuicoes: {
        "tribunal-do-juri": isEven ? "def-1" : "def-2",
        "violencia-domestica": isEven ? "def-2" : "def-1",
        "execucao-penal": isEven ? "def-1" : "def-2",
        "criminal-geral": "def-1",
      },
    });
  }

  return items;
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function StatCard({ 
  value, 
  label, 
  sublabel,
  icon: Icon,
  onClick,
  isActive,
}: { 
  value: number; 
  label: string; 
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative text-left p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-300",
        isActive 
          ? "border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-200/50 dark:ring-emerald-800/30 shadow-md shadow-emerald-500/10" 
          : "border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
        onClick && "cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]"
      )}
    >
      {/* Indicador de ativo */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 rounded-t-xl" />
      )}
      
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
          <p className={cn(
            "text-[10px] font-medium truncate uppercase tracking-wide transition-colors duration-300",
            isActive 
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70"
          )}>
            {label}
          </p>
          <p className={cn(
            "text-lg md:text-xl font-semibold",
            isActive 
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-zinc-700 dark:text-zinc-300"
          )}>
            {value}
          </p>
          {sublabel && (
            <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
              {sublabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-300",
            isActive
              ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800"
              : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20"
          )}>
            <Icon className={cn(
              "w-3.5 h-3.5 md:w-4 md:h-4 transition-colors duration-300",
              isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
            )} />
          </div>
        )}
      </div>
    </button>
  );
}

// Componente de Evento Detalhado (para lista detalhada)
function EventoDetalhado({ 
  evento, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onClick 
}: { 
  evento: AgendaItem;
  onEdit: (evento: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onClick: (evento: AgendaItem) => void;
}) {
  const atribuicaoConfig = getAtribuicaoColors(evento.atribuicaoKey || "SUBSTITUICAO");
  const solidColor = (atribuicaoConfig as any).color || "#71717a";
  
  return (
    <div 
      onClick={() => onClick(evento)}
      className="group relative flex items-stretch gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer hover:shadow-md"
    >
      {/* Barra lateral colorida */}
      <div 
        className="w-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: solidColor }}
      />
      
      {/* Horário */}
      <div className="flex flex-col items-center justify-center w-14 flex-shrink-0">
        <span className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{evento.horarioInicio}</span>
        {evento.horarioFim && (
          <span className="text-[10px] text-zinc-400">até {evento.horarioFim}</span>
        )}
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 line-clamp-1">
            {evento.titulo}
          </h4>
          <Badge 
            className="flex-shrink-0 text-[10px] px-1.5 py-0.5 border-0"
            style={{ 
              backgroundColor: `${solidColor}20`, 
              color: solidColor 
            }}
          >
            {atribuicaoConfig.shortLabel}
          </Badge>
        </div>
        
        {evento.descricao && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {evento.descricao}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          {evento.local && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {evento.local}
            </span>
          )}
          {evento.processo && (
            <span className="flex items-center gap-1 font-mono">
              <Scale className="w-3 h-3" />
              {evento.processo.slice(-12)}
            </span>
          )}
          {evento.assistido && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {evento.assistido}
            </span>
          )}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="flex flex-col items-center justify-center gap-1.5">
        {evento.status === "confirmada" && (
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Confirmada" />
        )}
        {evento.status === "pendente" && (
          <div className="w-2 h-2 rounded-full bg-amber-500" title="Pendente" />
        )}
        {evento.status === "realizada" && (
          <div className="w-2 h-2 rounded-full bg-blue-500" title="Realizada" />
        )}
        {evento.status === "cancelada" && (
          <div className="w-2 h-2 rounded-full bg-red-500" title="Cancelada" />
        )}
      </div>
    </div>
  );
}

// Componente de visualização semanal compacta
function SemanaView({ 
  eventos, 
  onEventClick 
}: { 
  eventos: AgendaItem[];
  onEventClick: (evento: AgendaItem) => void;
}) {
  const hoje = new Date();
  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(hoje, i));
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {diasSemana.map((dia) => {
        const eventosDoDia = eventos.filter(e => {
          // Adicionar T12:00:00 para evitar problemas de timezone
          const eventDate = new Date(e.data + "T12:00:00");
          return eventDate.toDateString() === dia.toDateString();
        });
        
        const isHoje = isToday(dia);
        
        return (
          <div 
            key={dia.toISOString()} 
            className={cn(
              "p-2 rounded-lg border min-h-[120px] transition-all",
              isHoje 
                ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" 
                : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
            )}
          >
            <div className="text-center mb-2">
              <p className="text-[10px] uppercase text-zinc-400 dark:text-zinc-500">
                {format(dia, "EEE", { locale: ptBR })}
              </p>
              <p className={cn(
                "text-lg font-bold",
                isHoje ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"
              )}>
                {format(dia, "dd")}
              </p>
            </div>
            
            <div className="space-y-1">
              {eventosDoDia.slice(0, 3).map((evento) => {
                const config = getAtribuicaoColors(evento.atribuicaoKey || "SUBSTITUICAO");
                const solidColor = (config as any).color || "#71717a";
                return (
                  <div 
                    key={evento.id}
                    onClick={() => onEventClick(evento)}
                    className="flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div 
                      className="w-1 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: solidColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {evento.horarioInicio}
                      </p>
                      <p className="text-[9px] text-zinc-500 truncate">
                        {evento.titulo.slice(0, 20)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {eventosDoDia.length > 3 && (
                <p className="text-[9px] text-center text-zinc-400">
                  +{eventosDoDia.length - 3} mais
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilterPill({
  label,
  isActive,
  count,
  config,
  onClick
}: {
  label: string;
  isActive: boolean;
  count: number;
  config: typeof ATRIBUICAO_CONFIG[string];
  onClick: () => void;
}) {
  const color = config.hex || "#71717a";
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex items-center gap-1.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all duration-200 border cursor-pointer",
        isActive ? "px-2.5 shadow-sm" : "px-1.5 hover:shadow-sm"
      )}
      style={
        isActive
          ? { backgroundColor: `${color}12`, borderColor: `${color}50`, color }
          : { backgroundColor: "transparent", borderColor: "transparent", color: `${color}99` }
      }
    >
      <span className="flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{config.icon}</span>
      {/* Label visible only when selected */}
      {isActive && <span>{label}</span>}
      {count > 0 && (
        <span className="text-[9px] font-mono tabular-nums opacity-50">{count}</span>
      )}
    </button>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "week" | "list">("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortBy, setSortBy] = useState("data");
  const [areaFilters, setAreaFilters] = useState<Set<string>>(new Set(["all"]));

  // Filtros
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string | null>(null);
  const [selectedPrioridade, setSelectedPrioridade] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [selectedDefensor, setSelectedDefensor] = useState<string | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  // Filtro para mostrar/esconder eventos cancelados e redesignados
  const [showCanceladosRedesignados, setShowCanceladosRedesignados] = useState(true);
  // Filtro para mostrar eventos passados no modo lista (padrão: não mostra)
  const [showPastEventsInList, setShowPastEventsInList] = useState(false);

  // Handler para multi-select de atribuição
  const handleAreaFilterToggle = (key: string) => {
    setAreaFilters(prev => {
      const next = new Set(prev);
      if (key === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(key);
      }
      const allSpecificKeys = Object.keys(ATRIBUICAO_CONFIG).filter(k => k !== "all");
      if (allSpecificKeys.every(k => next.has(k))) {
        return new Set(["all"]);
      }
      return next;
    });
  };

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);
  const [isSEEUImportModalOpen, setIsSEEUImportModalOpen] = useState(false);
  const [isGoogleConfigModalOpen, setIsGoogleConfigModalOpen] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [isICalImportModalOpen, setIsICalImportModalOpen] = useState(false);
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBuscaRegistrosModalOpen, setIsBuscaRegistrosModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoFormData | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null);
  // Quick-create: pre-filled date/time from clicking an empty slot
  const [quickCreateData, setQuickCreateData] = useState<{ data?: string; horarioInicio?: string } | null>(null);

  // Buscar audiências do banco via tRPC (sem limite para mostrar todos os eventos)
  const { data: audienciasData, isLoading: isLoadingAudiencias, refetch } = trpc.audiencias.list.useQuery();

  // Buscar eventos do calendário (calendarEvents) - período amplo para pegar todos
  const hoje = new Date();
  const inicioAno = new Date(hoje.getFullYear() - 1, 0, 1); // 1 ano atrás
  const fimAno = new Date(hoje.getFullYear() + 2, 11, 31); // 2 anos à frente
  const { data: calendarData, isLoading: isLoadingCalendar } = trpc.calendar.list.useQuery({
    start: inicioAno.toISOString(),
    end: fimAno.toISOString(),
  });

  // Loading combinado
  const isLoading = isLoadingAudiencias || isLoadingCalendar;

  // Utils para invalidar queries após mutações
  const utils = trpc.useUtils();

  // Configurações
  const [googleConfig, setGoogleConfig] = useState<any>({
    connected: false,
    email: "",
    calendars: [],
    syncInterval: "15min",
    autoImport: true,
    twoWaySync: true,
    lastSync: null,
  });

  // Carregar escalas do banco
  const hoje2 = new Date();
  const { data: escalasDB } = trpc.profissionais.getEscalaPorPeriodo.useQuery({
    mesInicio: hoje2.getMonth() + 1,
    anoInicio: hoje2.getFullYear(),
    mesFim: ((hoje2.getMonth() + 12) % 12) + 1,
    anoFim: hoje2.getFullYear() + 1,
  });

  // Mapeamento profissionalId → defId do frontend
  const PROF_TO_DEF: Record<number, string> = { 1: "def-1", 2: "def-2" };

  // Converter escalas do banco para formato do frontend
  const escalasFromDB = useMemo(() => {
    if (!escalasDB || escalasDB.length === 0) return null;

    // Agrupar por mes-ano
    const grouped: Record<string, Record<string, string>> = {};
    for (const e of escalasDB) {
      const mesKey = `${e.ano}-${String(e.mes).padStart(2, "0")}`;
      if (!grouped[mesKey]) grouped[mesKey] = {};
      grouped[mesKey][e.atribuicao] = PROF_TO_DEF[e.profissionalId!] || "def-1";
    }

    return Object.entries(grouped)
      .map(([mes, atribuicoes]) => ({ mes, atribuicoes }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [escalasDB]);

  const [escalaConfig, setEscalaConfig] = useState<any>({
    defensores: [
      {
        id: "def-1",
        nome: "Dr. Rodrigo",
        email: "rodrigo@defensoria.ba.gov.br",
        cor: "#3B82F6",
      },
      {
        id: "def-2",
        nome: "Dra. Juliane",
        email: "juliane@defensoria.ba.gov.br",
        cor: "#10B981",
      },
    ],
    escalas: generateDefaultEscalas(),
  });

  // Atualizar escalaConfig quando dados do banco chegarem
  useEffect(() => {
    if (escalasFromDB && escalasFromDB.length > 0) {
      setEscalaConfig((prev: any) => ({
        ...prev,
        escalas: escalasFromDB,
      }));
    }
  }, [escalasFromDB]);

  // Mapear atribuição do banco para key do filtro (usa função centralizada)
  const mapAtribuicaoToKey = (atribuicao: string | null | undefined, area: string | null | undefined): string => {
    // Primeiro tentar pelo valor exato
    const exactMatch = normalizeAreaToFilter(atribuicao) || normalizeAreaToFilter(area);
    if (exactMatch && exactMatch !== "all") return exactMatch;
    
    // Fallback para busca por padrão
    if (!atribuicao && !area) return "SUBSTITUICAO";
    
    const atrib = (atribuicao || area || "").toUpperCase();
    
    if (atrib.includes("VVD") || atrib.includes("VIOLENCIA") || atrib.includes("DOMESTICA")) return "VVD";
    if (atrib.includes("JURI") || atrib.includes("JÚRI")) return "JURI";
    if (atrib.includes("EXECU")) return "EXECUCAO";
    if (atrib.includes("CIVEL") || atrib.includes("FAMILIA") || atrib.includes("FAZENDA")) return "SUBSTITUICAO_CIVEL";
    if (atrib.includes("SUBSTITU") || atrib.includes("CRIMINAL")) return "SUBSTITUICAO";
    
    return "SUBSTITUICAO";
  };

  // Helper: resolve o responsável pela escala de revezamento (atribuição + mês do evento)
  // Fallback: defensorId/createdById se não houver escala configurada
  const resolverResponsavelPorEscala = (atribuicaoKey: string, dataEvento: string, fallbackDefensorId?: number | null) => {
    const mesEvento = dataEvento.substring(0, 7); // "yyyy-MM"
    const escala = escalaConfig.escalas.find((e: any) => e.mes === mesEvento);
    if (escala) {
      const escalaKey = atribuicaoKey
        .toLowerCase()
        .replace(/_/g, "-")
        .replace(/juri/i, "tribunal-do-juri")
        .replace(/^vvd$/i, "violencia-domestica")
        .replace(/^execucao$/i, "execucao-penal")
        .replace(/^substituicao.*$/i, "criminal-geral");
      const responsavel = escala.atribuicoes[escalaKey];
      if (responsavel) return responsavel;
    }
    // Fallback: usar defensorId do banco
    return fallbackDefensorId === 4 ? "def-2" : "def-1";
  };

  // Transformar dados do banco para o formato de AgendaItem (mesclando audiencias + calendarEvents)
  const eventos: AgendaItem[] = useMemo(() => {
    const items: AgendaItem[] = [];

    // 1. Processar audiências (tabela audiencias)
    if (audienciasData) {
      audienciasData.forEach((a) => {
        const atribuicaoKey = mapAtribuicaoToKey(a.processo?.atribuicao, a.processo?.area);
        const atribuicaoConfig = getAtribuicaoColors(atribuicaoKey);
        const dataFormatada = format(new Date(a.dataHora), "yyyy-MM-dd");

        items.push({
          id: `audiencia-${a.id}`,
          titulo: a.titulo || `Audiência - ${a.tipo}`,
          tipo: "audiencia",
          data: dataFormatada,
          horarioInicio: a.horario || format(new Date(a.dataHora), "HH:mm"),
          horarioFim: "",
          local: a.local || "",
          assistido: a.assistido?.nome || "",
          assistidoId: a.assistido?.id ?? a.assistidoId ?? undefined,
          processo: a.processo?.numero || "",
          processoId: a.processo?.id ?? a.processoId ?? undefined,
          atribuicao: atribuicaoConfig.label,
          atribuicaoKey: atribuicaoKey,
          status: a.status || "confirmado",
          descricao: a.descricao || "",
          prioridade: "media",
          recorrencia: "nenhuma",
          lembretes: [],
          tags: [],
          participantes: [],
          observacoes: "",
          documentos: [],
          dataInclusao: new Date().toISOString(),
          responsavel: resolverResponsavelPorEscala(atribuicaoKey, dataFormatada, a.defensorId),
          fonte: "audiencias" as const,
        });
      });
    }

    // 2. Processar eventos do calendário (tabela calendarEvents)
    if (calendarData) {
      calendarData.forEach((e) => {
        const tipoEvento = e.eventType || "custom";
        // Usar atribuição do processo vinculado quando disponível
        const atribuicaoKey = e.processo?.atribuicao
          ? mapAtribuicaoToKey(e.processo.atribuicao, e.processo.area)
          : tipoEvento === "audiencia" ? "JURI" :
            tipoEvento === "juri" ? "JURI" :
            "SUBSTITUICAO";
        const atribuicaoConfig = getAtribuicaoColors(atribuicaoKey);
        const dataFormatada = format(new Date(e.eventDate), "yyyy-MM-dd");

        items.push({
          id: `calendar-${e.id}`,
          titulo: e.title || `Evento - ${tipoEvento}`,
          tipo: tipoEvento,
          data: dataFormatada,
          horarioInicio: e.isAllDay ? "" : format(new Date(e.eventDate), "HH:mm"),
          horarioFim: e.endDate ? format(new Date(e.endDate), "HH:mm") : "",
          local: e.location || "",
          assistido: e.assistido?.nome || "",
          assistidoId: e.assistido?.id ?? e.assistidoId ?? undefined,
          processo: e.processo?.numeroAutos || "",
          processoId: e.processo?.id ?? e.processoId ?? undefined,
          atribuicao: atribuicaoConfig.label,
          atribuicaoKey: atribuicaoKey,
          status: e.status || "scheduled",
          descricao: e.description || "",
          prioridade: e.priority || "normal",
          recorrencia: e.isRecurring ? (e.recurrenceType || "nenhuma") : "nenhuma",
          lembretes: e.reminderMinutes ? [`${e.reminderMinutes}min antes`] : [],
          tags: [],
          participantes: [],
          observacoes: e.notes || "",
          documentos: [],
          dataInclusao: new Date().toISOString(),
          responsavel: resolverResponsavelPorEscala(atribuicaoKey, dataFormatada, e.createdById),
          fonte: "calendar" as const,
        });
      });
    }

    // 3. Ordenar por data
    return items.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [audienciasData, calendarData, escalaConfig]);

  // Navegar automaticamente para o mês do primeiro evento se não houver eventos no mês atual
  useEffect(() => {
    if (eventos.length > 0) {
      const hoje = new Date();
      const mesAtual = format(hoje, "yyyy-MM");
      const eventosNoMesAtual = eventos.filter(e => e.data.startsWith(mesAtual));
      
      // Se não há eventos no mês atual, navegar para o mês do primeiro evento
      if (eventosNoMesAtual.length === 0) {
        const primeiroEvento = eventos[0];
        if (primeiroEvento) {
          // Adicionar T12:00:00 para evitar problemas de timezone
          const dataEvento = new Date(primeiroEvento.data + "T12:00:00");
          setCurrentDate(dataEvento);
        }
      }
    }
  }, [eventos]);

  // Handlers
  const handleSaveNewEvento = (eventoData: EventoFormData) => {
    const mesAtual = format(new Date(), "yyyy-MM");
    const escalaAtual = escalaConfig.escalas.find((e: any) => e.mes === mesAtual);
    let responsavel = "def-1";

    if (escalaAtual) {
      const atribuicaoKey = eventoData.atribuicao
        .toLowerCase()
        .replace(/ /g, "-")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      responsavel = escalaAtual.atribuicoes[atribuicaoKey] || "def-1";
    }

    toast.success("Evento criado com sucesso!");
  };

  const handleEditEvento = (evento: any) => {
    setEditingEvento(evento);
    setIsEditModalOpen(true);
  };

  // Mutation para atualizar evento
  const updateEvento = trpc.audiencias.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      setIsEditModalOpen(false);
      setEditingEvento(null);
      utils.audiencias.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar evento", { description: error.message });
    },
  });

  // Mutation para deletar evento (audiencias)
  const deleteEvento = trpc.audiencias.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento deletado com sucesso!");
      utils.audiencias.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar evento", { description: error.message });
    },
  });

  // Mutations para calendar events
  const updateCalendarEvent = trpc.calendar.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      setIsEditModalOpen(false);
      setEditingEvento(null);
      utils.calendar.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar evento", { description: error.message });
    },
  });

  const deleteCalendarEvent = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      toast.success("Evento deletado com sucesso!");
      utils.calendar.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar evento", { description: error.message });
    },
  });

  const handleSaveEdit = (data: EventoFormData) => {
    if (editingEvento && editingEvento.id) {
      // Extrair ID numérico e fonte do ID composto (ex: "audiencia-123" ou "calendar-456")
      const idParts = editingEvento.id.split("-");
      const fonte = idParts[0]; // "audiencia" ou "calendar"
      const numericId = parseInt(idParts.slice(1).join("-")); // Pegar número após o prefixo

      // Converter data para formato ISO com horário
      const dataStr = data.data || format(new Date(), "yyyy-MM-dd");
      const dataHora = `${dataStr}T${data.horarioInicio || "09:00"}:00`;

      // Por enquanto, só atualiza eventos da tabela audiencias
      if (fonte === "audiencia") {
        updateEvento.mutate({
          id: numericId,
          dataAudiencia: dataHora,
          tipo: data.tipo,
          local: data.local,
          titulo: data.titulo,
          descricao: data.descricao,
          horario: data.horarioInicio,
          status: data.status,
        });
      } else if (fonte === "calendar") {
        updateCalendarEvent.mutate({
          id: numericId,
          title: data.titulo,
          description: data.descricao,
          eventDate: dataHora,
          eventType: data.tipo,
          location: data.local,
          ...(data.status && { status: data.status as "scheduled" | "completed" | "cancelled" }),
        });
      }
    }
  };

  const handleDeleteEvento = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este evento?")) {
      // Extrair ID numérico e fonte do ID composto
      const idParts = id.split("-");
      const fonte = idParts[0];
      const numericId = parseInt(idParts.slice(1).join("-"));

      if (fonte === "audiencia") {
        deleteEvento.mutate({ id: numericId });
      } else if (fonte === "calendar") {
        deleteCalendarEvent.mutate({ id: numericId });
      }
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateEvento.mutate({
      id: parseInt(id),
      status: newStatus,
    });
  };

  const importBatch = trpc.audiencias.importBatch.useMutation({
    onSuccess: (result) => {
      let mensagem = `${result.importados} novo(s) evento(s) importado(s)`;

      if (result.atualizados > 0) {
        mensagem += `, ${result.atualizados} evento(s) atualizado(s)`;
      }

      if (result.assistidosCriados > 0) {
        mensagem += `, ${result.assistidosCriados} assistido(s) criado(s)`;
      }

      if (result.atualizados > 0 && result.importados === 0) {
        // Apenas atualizações = sucesso também
        toast.success(mensagem + "!");
      } else if (result.duplicados > 0 && result.atualizados === 0) {
        // Duplicados não atualizados = warning (mantém comportamento anterior por segurança)
        mensagem += `. ${result.duplicados} duplicado(s) encontrado(s)`;
        toast.warning(mensagem);
      } else {
        toast.success(mensagem + " com sucesso!");
      }

      // Recarregar a lista de audiências
      utils.audiencias.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const handleImportPJe = async (importedEventos: any[]) => {
    if (importedEventos.length === 0) {
      toast.warning("Nenhum evento para importar.");
      return;
    }
    
    toast.loading("Importando eventos...", { id: "import-pje" });
    
    try {
      await importBatch.mutateAsync({ eventos: importedEventos });
      toast.dismiss("import-pje");
    } catch (error) {
      toast.dismiss("import-pje");
      toast.error("Erro ao importar eventos.");
    }
  };

  const handleSaveRegistro = (registro: RegistroAudienciaData) => {
    toast.success("Registro salvo!");
  };

  const handleCriarNovoEvento = (evento: any) => {};

  // Quick-create: open modal pre-filled with clicked date (month view)
  const handleMonthQuickCreate = (date: Date) => {
    setQuickCreateData({ data: format(date, "yyyy-MM-dd") });
    setIsCreateModalOpen(true);
  };

  // Quick-create: open modal pre-filled with clicked date + hour (week view)
  const handleWeekQuickCreate = (date: Date, hour: number) => {
    setQuickCreateData({
      data: format(date, "yyyy-MM-dd"),
      horarioInicio: `${String(hour).padStart(2, "0")}:00`,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenRegistro = (evento: any) => {
    setSelectedEvento(evento);
    setIsRegistroModalOpen(true);
  };

  const handleEventClick = (evento: any) => {
    if (evento.tipo === "audiencia" || evento.tipo === "reuniao") {
      handleOpenRegistro(evento);
    } else {
      handleEditEvento(evento);
    }
  };

  // Filtros e ordenação
  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      const matchSearch =
        evento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.assistido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.processo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTipo = !selectedTipo || evento.tipo === selectedTipo;
      const matchStatus = !selectedStatus || evento.status === selectedStatus;
      const matchAtribuicao =
        !selectedAtribuicao || evento.atribuicao === selectedAtribuicao;
      const matchPrioridade =
        !selectedPrioridade || evento.prioridade === selectedPrioridade;
      const matchDefensor =
        !selectedDefensor || evento.responsavel === selectedDefensor;
      
      // Filtro por área (tabs de atribuição)
      const matchAreaFilter = areaFilters.has("all") || (evento.atribuicaoKey != null && areaFilters.has(evento.atribuicaoKey));

      // Filtro para esconder eventos cancelados/redesignados
      const isCanceladoOuRedesignado =
        evento.status === "cancelado" ||
        evento.status === "remarcado" ||
        evento.status === "redesignado";
      const matchCancelados = showCanceladosRedesignados || !isCanceladoOuRedesignado;

      let matchPeriodo = true;
      if (selectedPeriodo) {
        // Adicionar T12:00:00 para evitar problemas de timezone
        const eventoDate = new Date(evento.data + "T12:00:00");
        const today = new Date();

        if (selectedPeriodo === "hoje") {
          matchPeriodo = isToday(eventoDate);
        } else if (selectedPeriodo === "amanha") {
          matchPeriodo = isTomorrow(eventoDate);
        } else if (selectedPeriodo === "mes-atual") {
          matchPeriodo =
            eventoDate >= startOfMonth(today) && eventoDate <= endOfMonth(today);
        }
      }

      // Filtro para modo lista: mostrar apenas eventos de hoje em diante (a menos que showPastEventsInList esteja ativo)
      let matchFutureOnly = true;
      if (viewMode === "list" && !showPastEventsInList && !selectedPeriodo) {
        const eventoDate = new Date(evento.data + "T12:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        matchFutureOnly = eventoDate >= today;
      }

      return (
        matchSearch &&
        matchTipo &&
        matchStatus &&
        matchAtribuicao &&
        matchPrioridade &&
        matchDefensor &&
        matchPeriodo &&
        matchAreaFilter &&
        matchCancelados &&
        matchFutureOnly
      );
    });
  }, [
    eventos,
    searchTerm,
    areaFilters,
    selectedTipo,
    selectedStatus,
    selectedAtribuicao,
    selectedPrioridade,
    showCanceladosRedesignados,
    selectedDefensor,
    selectedPeriodo,
    viewMode,
    showPastEventsInList,
  ]);

  const eventosOrdenados = useMemo(() => {
    const sorted = [...eventosFiltrados];

    if (sortBy === "data") {
      return sorted.sort((a, b) => {
        const dateCompare = a.data.localeCompare(b.data);
        if (dateCompare !== 0) return dateCompare;
        return a.horarioInicio.localeCompare(b.horarioInicio);
      });
    } else if (sortBy === "prioridade") {
      const prioridadeOrder = ["urgente", "alta", "media", "baixa"];
      return sorted.sort((a, b) => {
        const indexA = prioridadeOrder.indexOf(a.prioridade);
        const indexB = prioridadeOrder.indexOf(b.prioridade);
        return indexA - indexB;
      });
    }

    return sorted;
  }, [eventosFiltrados, sortBy]);

  // Estatísticas
  const stats = useMemo(() => {
    // Adicionar T12:00:00 para evitar problemas de timezone
    const hoje = eventos.filter((e) => isToday(new Date(e.data + "T12:00:00"))).length;
    const amanha = eventos.filter((e) => isTomorrow(new Date(e.data + "T12:00:00"))).length;
    const semana = eventos.filter((e) => {
      const eventDate = new Date(e.data + "T12:00:00");
      const today = new Date();
      const weekEnd = addDays(today, 7);
      return eventDate >= today && eventDate <= weekEnd;
    }).length;
    const prazosUrgentes = eventos.filter(
      (e) => e.tipo === "prazo" && e.prioridade === "urgente" && e.status === "pendente"
    ).length;
    const total = eventos.length;
    return { hoje, amanha, semana, prazosUrgentes, total };
  }, [eventos]);

  // Contadores por atribuição
  const countByArea = useMemo(() => {
    const counts: Record<string, number> = { all: eventos.length };
    Object.keys(ATRIBUICAO_CONFIG).forEach((key) => {
      if (key !== "all") {
        counts[key] = eventos.filter((e) => e.atribuicaoKey === key).length;
      }
    });
    return counts;
  }, [eventos]);

  // Configuração visual da atribuição selecionada
  const currentConfig = areaFilters.size === 1 && !areaFilters.has("all")
    ? ATRIBUICAO_CONFIG[Array.from(areaFilters)[0]] || ATRIBUICAO_CONFIG.all
    : ATRIBUICAO_CONFIG.all;

  // Número de filtros ativos
  const activeFiltersCount = [
    selectedTipo,
    selectedStatus,
    selectedAtribuicao,
    selectedPrioridade,
    selectedPeriodo,
    selectedDefensor,
  ].filter(Boolean).length;

  // Escala do mês exibido no calendário — quais defensores estão atuando
  const escalaDoMes = useMemo(() => {
    const mesKey = format(currentDate, "yyyy-MM");
    const escalaMes = escalaConfig.escalas.find((e: any) => e.mes === mesKey);
    if (!escalaMes) return null;

    // Agrupar atribuições por defensor
    const defMap: Record<string, string[]> = {};
    const atribLabels: Record<string, string> = {
      "tribunal-do-juri": "Júri",
      "violencia-domestica": "VVD",
      "execucao-penal": "EP",
      "criminal-geral": "Criminal",
    };

    for (const [atribKey, defId] of Object.entries(escalaMes.atribuicoes)) {
      const id = defId as string;
      if (!defMap[id]) defMap[id] = [];
      defMap[id].push(atribLabels[atribKey] || atribKey);
    }

    return escalaConfig.defensores.map((d: any) => ({
      ...d,
      atribuicoes: defMap[d.id] || [],
    }));
  }, [currentDate, escalaConfig]);

  // G/R/J defensor avatars — dados
  const defensorAvatars: { id: string | null; label: string; tooltip: string }[] = [
    { id: null, label: "G", tooltip: "Geral (todos)" },
    ...escalaConfig.defensores.map((d: any) => ({
      id: d.id,
      label: d.nome.replace(/^(Dr\.|Dra\.|Dr |Dra )/i, "").trim().charAt(0).toUpperCase(),
      tooltip: d.nome + (escalaDoMes?.find((e: any) => e.id === d.id)?.atribuicoes?.length ? ` — ${escalaDoMes.find((e: any) => e.id === d.id)!.atribuicoes.join(", ")}` : ""),
    })),
  ];

  // Portal: renderiza G/R/J no header-slot do breadcrumb
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("header-slot"));
    return () => {
      // Limpa o slot ao desmontar
      const slot = document.getElementById("header-slot");
      if (slot) slot.innerHTML = "";
    };
  }, []);

  // Stats compactos para o header do calendário (sem G/R/J)
  const calendarHeaderRight = (
    <div className="flex items-center gap-1.5">
      {[
        { value: stats.hoje, label: format(new Date(), "EEE", { locale: ptBR }), periodo: "hoje" as const },
        { value: stats.amanha, label: "amanhã", periodo: "amanha" as const },
        { value: stats.semana, label: "sem", periodo: "semana" as const },
      ].map((s) => (
        <button
          key={s.periodo}
          onClick={() => setSelectedPeriodo(selectedPeriodo === s.periodo ? null : s.periodo)}
          className={cn(
            "flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] transition-colors cursor-pointer shrink-0 whitespace-nowrap",
            selectedPeriodo === s.periodo
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
        >
          <span className="font-bold tabular-nums">{s.value}</span>
          <span className="font-medium">{s.label}</span>
        </button>
      ))}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-full" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* G/R/J avatars — portal no header breadcrumb */}
      {headerSlot && createPortal(
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            {defensorAvatars.map((av) => (
              <Tooltip key={av.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSelectedDefensor(selectedDefensor === av.id ? null : av.id)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-200 cursor-pointer shrink-0",
                      selectedDefensor === av.id
                        ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 ring-2 ring-zinc-400 dark:ring-zinc-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 scale-110"
                        : "bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300 opacity-60 hover:opacity-100 hover:scale-105"
                    )}
                  >
                    {av.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {av.tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>,
        headerSlot
      )}
      {/* Header unificado — stats + atribuição + busca + filtros + view + ações */}
      <div className="px-3 md:px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {/* Mobile: Atribuição dropdown button */}
          <div className="flex sm:hidden shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                    areaFilters.has("all")
                      ? "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900"
                      : "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {areaFilters.has("all") ? "Todos" : `${areaFilters.size}`}
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 p-1.5">
                {Object.entries(ATRIBUICAO_CONFIG).map(([key, config]) => {
                  const isActive = areaFilters.has(key);
                  const color = config.hex || "#71717a";
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={(e) => { e.preventDefault(); handleAreaFilterToggle(key); }}
                      className="flex items-center gap-2 px-2.5 py-2 cursor-pointer"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 [&>svg]:w-3 [&>svg]:h-3"
                        style={{ backgroundColor: isActive ? `${color}18` : "transparent", color }}
                      >
                        {config.icon}
                      </span>
                      <span className="flex-1 text-xs font-medium">{config.shortLabel}</span>
                      <span className="text-[10px] font-mono tabular-nums text-zinc-400">{countByArea[key] || 0}</span>
                      {isActive && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop: Atribuição pills (icon-only, text when selected) */}
          <div className="hidden sm:flex items-center gap-1.5">
            {Object.entries(ATRIBUICAO_CONFIG).map(([key, config]) => (
              <FilterPill
                key={key}
                label={config.shortLabel}
                isActive={areaFilters.has(key)}
                count={countByArea[key] || 0}
                config={config}
                onClick={() => handleAreaFilterToggle(key)}
              />
            ))}
          </div>

          {/* Flexible space */}
          <div className="flex-1 min-w-2" />

          {/* Search toggle — icon that expands to input */}
          {isSearchOpen ? (
            <div className="relative shrink-0 animate-in slide-in-from-right-2 duration-200">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                ref={searchInputRef}
                autoFocus
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={() => { if (!searchTerm) setIsSearchOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchTerm(""); setIsSearchOpen(false); } }}
                className="pl-8 pr-7 h-7 w-40 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200/80 dark:border-zinc-700/80 rounded-md"
              />
              <button
                onClick={() => { setSearchTerm(""); setIsSearchOpen(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              className={cn(
                "h-7 w-7 p-0 flex items-center justify-center rounded-md transition-colors cursor-pointer shrink-0",
                searchTerm
                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Buscar"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Filter dropdown — defensor + tipo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "relative h-7 w-7 p-0 flex items-center justify-center rounded-md transition-colors cursor-pointer shrink-0",
                  (selectedTipo || selectedDefensor)
                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
                title="Filtros"
              >
                <Filter className="w-3.5 h-3.5" />
                {(selectedTipo || selectedDefensor) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-2">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Defensor</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { value: "def-1", label: "Dr. Rodrigo" },
                      { value: "def-2", label: "Dra. Juliane" },
                    ].map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDefensor(selectedDefensor === d.value ? null : d.value)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                          selectedDefensor === d.value
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[
                      { value: "audiencia", label: "Audiência" },
                      { value: "reuniao", label: "Reunião" },
                      { value: "prazo", label: "Prazo" },
                      { value: "compromisso", label: "Compromisso" },
                      { value: "diligencia", label: "Diligência" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setSelectedTipo(selectedTipo === t.value ? null : t.value)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                          selectedTipo === t.value
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(selectedTipo || selectedDefensor) && (
                  <button
                    onClick={() => { setSelectedTipo(null); setSelectedDefensor(null); }}
                    className="w-full text-center text-[11px] text-zinc-400 hover:text-rose-500 py-1 cursor-pointer transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode — single cycling button */}
          <button
            onClick={() => {
              const modes = ["calendar", "week", "list"] as const;
              const currentIdx = modes.indexOf(viewMode as any);
              const nextMode = modes[(currentIdx + 1) % modes.length];
              setViewMode(nextMode);
              setSelectedPeriodo(null);
            }}
            className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title={viewMode === "calendar" ? "Mês (clique para Semana)" : viewMode === "week" ? "Semana (clique para Lista)" : "Lista (clique para Mês)"}
          >
            {viewMode === "calendar" ? <Grid3x3 className="w-3.5 h-3.5" /> : viewMode === "week" ? <CalendarDays className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          </button>

          {/* Overflow menu — settings + imports/exports */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsGoogleConfigModalOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBuscaRegistrosModalOpen(true)}>
                <Database className="w-4 h-4 mr-2" />
                Buscar Registros
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEscalaModalOpen(true)}>
                <UserCog className="w-4 h-4 mr-2" />
                Configurar Escalas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsPJeImportModalOpen(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Importar do PJe
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSEEUImportModalOpen(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Importar do SEEU
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsICalImportModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Importar iCal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsGoogleSyncModalOpen(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Google
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsExportModalOpen(true)}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar Agenda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New event — icon only */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-7 w-7 p-0 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white transition-colors cursor-pointer shrink-0"
            title="Novo evento"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-3 md:p-4 space-y-3">

      {/* ==========================================
          VISUALIZAÇÃO PRINCIPAL
          ========================================== */}
      
      {/* Visualização detalhada de Hoje/Amanhã */}
      {(selectedPeriodo === "hoje" || selectedPeriodo === "amanha") && (
        <div className="space-y-4">
          {/* Header do período */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                {selectedPeriodo === "hoje" ? (
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedPeriodo === "hoje" ? "Hoje" : "Amanhã"} - {format(
                    selectedPeriodo === "hoje" ? new Date() : addDays(new Date(), 1),
                    "EEEE, dd 'de' MMMM",
                    { locale: ptBR }
                  )}
                </h3>
                <p className="text-xs text-zinc-500">
                  {eventosOrdenados.length} evento{eventosOrdenados.length !== 1 ? 's' : ''} programado{eventosOrdenados.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPeriodo(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Limpar seleção
            </Button>
          </div>
          
          {/* Lista detalhada de eventos */}
          <div className="space-y-3">
            {eventosOrdenados.length === 0 ? (
              <Card className="p-8 text-center border-zinc-200 dark:border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-3 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Nenhum evento para {selectedPeriodo === "hoje" ? "hoje" : "amanhã"}
                </p>
              </Card>
            ) : (
              eventosOrdenados.map((evento) => (
                <EventoDetalhado
                  key={evento.id}
                  evento={evento}
                  onEdit={handleEditEvento}
                  onDelete={handleDeleteEvento}
                  onStatusChange={handleStatusChange}
                  onClick={(e) => {
                    setSelectedEvento(e);
                    setIsDetailModalOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Visualização semanal */}
      {selectedPeriodo === "semana" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CalendarRange className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                  Próximos 7 dias
                </h3>
                <p className="text-xs text-zinc-500">
                  {stats.semana} evento{stats.semana !== 1 ? 's' : ''} na semana
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPeriodo(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Limpar seleção
            </Button>
          </div>
          
          <SemanaView 
            eventos={eventos} 
            onEventClick={(evento) => {
              setSelectedEvento(evento);
              setIsDetailModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Visualização padrão (calendário, semana ou lista) */}
      {!selectedPeriodo && (
        <>
          {viewMode === "calendar" ? (
            <CalendarMonthView
              eventos={eventosFiltrados}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onEventClick={handleEventClick}
              onDateClick={(date) => {
                setCurrentDate(date);
                setViewMode("list");
              }}
              onCreateClick={handleMonthQuickCreate}
              onEditEvento={handleEditEvento}
              onDeleteEvento={handleDeleteEvento}
              onStatusChange={handleStatusChange}
              headerRight={calendarHeaderRight}
            />
          ) : viewMode === "week" ? (
            <CalendarWeekView
              eventos={eventosFiltrados}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onEventClick={handleEventClick}
              onDateClick={(date) => {
                setCurrentDate(date);
                setViewMode("list");
              }}
              onCreateClick={handleWeekQuickCreate}
              onEditEvento={handleEditEvento}
              onDeleteEvento={handleDeleteEvento}
              headerRight={calendarHeaderRight}
            />
          ) : (
            <Card className="border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Header da Lista */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {eventosOrdenados.length} evento{eventosOrdenados.length !== 1 && 's'}
                    </p>
                    {!showPastEventsInList && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                        A partir de hoje
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => setShowPastEventsInList(!showPastEventsInList)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                        showPastEventsInList
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600"
                      )}
                    >
                      {showPastEventsInList ? "Ocultando Passados" : "Ver Passados"}
                    </button>
                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                    {["data", "prioridade"].map((sort) => (
                      <button
                        key={sort}
                        onClick={() => setSortBy(sort)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                          sortBy === sort
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        {sort === "data" ? "Por Data" : "Por Prioridade"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de Eventos Agrupada por Dia */}
              <div className="max-h-[600px] overflow-y-auto">
                {eventosOrdenados.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
                      <CalendarIcon className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="text-base font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Nenhum evento encontrado
                    </p>
                    <p className="text-sm text-zinc-500">
                      Ajuste os filtros ou crie um novo evento
                    </p>
                  </div>
                ) : (
                  (() => {
                    // Agrupar eventos por data
                    const eventosPorDia = eventosOrdenados.reduce((acc, evento) => {
                      const dataKey = evento.data;
                      if (!acc[dataKey]) acc[dataKey] = [];
                      acc[dataKey].push(evento);
                      return acc;
                    }, {} as Record<string, typeof eventosOrdenados>);

                    const datasOrdenadas = Object.keys(eventosPorDia).sort();

                    return datasOrdenadas.map((dataKey) => {
                      const eventosDodia = eventosPorDia[dataKey];
                      const dataObj = new Date(dataKey + "T12:00:00");
                      const isHoje = isToday(dataObj);
                      const isAmanha = isTomorrow(dataObj);
                      
                      const dataLabel = isHoje 
                        ? "Hoje" 
                        : isAmanha 
                          ? "Amanhã" 
                          : format(dataObj, "EEEE, dd 'de' MMMM", { locale: ptBR });

                      return (
                        <div key={dataKey}>
                          {/* Separador de Dia */}
                          <div className={cn(
                            "sticky top-0 z-10 px-4 py-2 flex items-center gap-3 border-b",
                            isHoje 
                              ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50"
                              : isAmanha
                                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50"
                                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex flex-col items-center justify-center",
                              isHoje 
                                ? "bg-rose-500 text-white"
                                : isAmanha
                                  ? "bg-amber-500 text-white"
                                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                            )}>
                              <span className={cn(
                                "text-[10px] font-semibold uppercase leading-none",
                                !isHoje && !isAmanha && "text-zinc-400"
                              )}>
                                {format(dataObj, "MMM", { locale: ptBR })}
                              </span>
                              <span className={cn(
                                "text-lg font-bold leading-none",
                                !isHoje && !isAmanha && "text-zinc-700 dark:text-zinc-300"
                              )}>
                                {format(dataObj, "dd")}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-sm font-semibold capitalize",
                                isHoje 
                                  ? "text-rose-700 dark:text-rose-400"
                                  : isAmanha
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-zinc-700 dark:text-zinc-300"
                              )}>
                                {dataLabel}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {eventosDodia.length} evento{eventosDodia.length !== 1 && 's'}
                              </p>
                            </div>
                          </div>

                          {/* Eventos do Dia */}
                          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {eventosDodia.map((evento) => (
                              <EventoCard
                                key={evento.id}
                                evento={evento}
                                onEdit={handleEditEvento}
                                onDelete={handleDeleteEvento}
                                onStatusChange={handleStatusChange}
                                onClick={(e) => handleEventClick(e)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ==========================================
          MODAIS
          ========================================== */}
      <EventoCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setQuickCreateData(null);
        }}
        onSave={handleSaveNewEvento}
        defaultData={quickCreateData}
      />

      <EventoCreateModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEvento(null);
        }}
        onSave={handleSaveEdit}
        editData={editingEvento}
      />

      <AgendaExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        eventos={eventos}
      />

      <PJeAgendaImportModal
        isOpen={isPJeImportModalOpen}
        onClose={() => setIsPJeImportModalOpen(false)}
        onImport={handleImportPJe}
      />

      <PJeAgendaImportModal
        isOpen={isSEEUImportModalOpen}
        onClose={() => setIsSEEUImportModalOpen(false)}
        onImport={handleImportPJe}
        title="Importar Pauta do SEEU"
        description="Cole o texto da pauta de audiências do SEEU (Execução Penal). O sistema detecta automaticamente admonitórias, justificações e demais tipos."
        defaultAtribuicao="Execução Penal"
      />

      <GoogleCalendarConfigModal
        isOpen={isGoogleConfigModalOpen}
        onClose={() => setIsGoogleConfigModalOpen(false)}
        onSave={(config) => {
          setGoogleConfig(config);
          toast.success("Configurações atualizadas!");
        }}
        currentConfig={googleConfig}
      />

      <GoogleCalendarSyncModal
        isOpen={isGoogleSyncModalOpen}
        onClose={() => setIsGoogleSyncModalOpen(false)}
        onImportEvents={handleImportPJe}
      />

      <ICalImportModal
        isOpen={isICalImportModalOpen}
        onClose={() => setIsICalImportModalOpen(false)}
        onImport={handleImportPJe}
      />

      {selectedEvento && (
        <RegistroAudienciaModal
          isOpen={isRegistroModalOpen}
          onClose={() => {
            setIsRegistroModalOpen(false);
            setSelectedEvento(null);
          }}
          onSave={handleSaveRegistro}
          evento={selectedEvento}
          onCriarNovoEvento={handleCriarNovoEvento}
        />
      )}

      <EscalaConfigModal
        isOpen={isEscalaModalOpen}
        onClose={() => setIsEscalaModalOpen(false)}
        onSave={(config) => {
          setEscalaConfig(config);
          toast.success("Escalas configuradas!");
        }}
        currentConfig={escalaConfig}
      />

      {selectedEvento && (
        <EventoDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setSelectedEvento(null);
            setIsDetailModalOpen(false);
          }}
          evento={selectedEvento}
        />
      )}

      <BuscaRegistrosModal
        isOpen={isBuscaRegistrosModalOpen}
        onClose={() => setIsBuscaRegistrosModalOpen(false)}
        onViewRegistro={(registro) => {
          setIsBuscaRegistrosModalOpen(false);
          // Localizar o evento na agenda pelo ID original
          const evento = eventos.find((e) => e.id === registro.eventoOriginalId);
          if (evento) {
            handleOpenRegistro(evento);
          } else {
            toast.info("Audiência não encontrada na agenda atual — pode ter sido reagendada.");
          }
        }}
      />
      </div>
    </div>
  );
}
