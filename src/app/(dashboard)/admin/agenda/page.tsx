"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EventoCard } from "@/components/agenda/evento-card";
import { EventoDetailModal } from "@/components/agenda/evento-detail-modal";
import { BuscaRegistrosModal } from "@/components/agenda/busca-registros-modal";
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
  processo: string;
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

// Opções de filtro para a agenda (sem duplicatas)
const AGENDA_FILTER_OPTIONS = [
  { key: "all", icon: CalendarIcon, ...getAtribuicaoColors("all") },
  { key: "VVD", icon: Shield, ...getAtribuicaoColors("VVD") },
  { key: "JURI", icon: Gavel, ...getAtribuicaoColors("JURI") },
  { key: "EXECUCAO", icon: Lock, ...getAtribuicaoColors("EXECUCAO") },
  { key: "SUBSTITUICAO", icon: RefreshCw, ...getAtribuicaoColors("SUBSTITUICAO") },
  { key: "SUBSTITUICAO_CIVEL", icon: Briefcase, ...getAtribuicaoColors("SUBSTITUICAO_CIVEL") },
];

// Criar config com ícones JSX para este componente
const ATRIBUICAO_CONFIG: Record<string, any> = {};
AGENDA_FILTER_OPTIONS.forEach(option => {
  const IconComponent = option.icon;
  ATRIBUICAO_CONFIG[option.key] = {
    ...option,
    icon: <IconComponent className="w-4 h-4" />,
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300",
        "border overflow-hidden",
        isActive 
          ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm"
          : "bg-white/80 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
      )}
    >
      {/* Borda lateral colorida */}
      <div className={cn(
        "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-all duration-300",
        isActive ? config.indicator : "bg-zinc-200 dark:bg-zinc-700 group-hover:bg-zinc-300 dark:group-hover:bg-zinc-600"
      )} />
      
      <span className={cn(
        "transition-all duration-300 ml-1",
        isActive ? config.text : "text-zinc-400 dark:text-zinc-500"
      )}>
        {config.icon}
      </span>
      <span className={cn(
        "transition-colors duration-300",
        isActive ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-400"
      )}>{label}</span>
      {count > 0 && (
        <span className={cn(
          "min-w-[1.25rem] px-1.5 py-0.5 rounded text-[10px] font-semibold text-center transition-all duration-300",
          isActive 
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" 
            : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("data");
  const [areaFilter, setAreaFilter] = useState("all");

  // Filtros
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string | null>(null);
  const [selectedPrioridade, setSelectedPrioridade] = useState<string | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string | null>(null);
  const [selectedDefensor, setSelectedDefensor] = useState<string | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);
  const [isGoogleConfigModalOpen, setIsGoogleConfigModalOpen] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);
  const [isICalImportModalOpen, setIsICalImportModalOpen] = useState(false);
  const [isRegistroModalOpen, setIsRegistroModalOpen] = useState(false);
  const [isEscalaModalOpen, setIsEscalaModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isBuscaRegistrosModalOpen, setIsBuscaRegistrosModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoFormData | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<any | null>(null);

  // Buscar audiências do banco via tRPC (sem limite para mostrar todos os eventos)
  const { data: audienciasData, isLoading, refetch } = trpc.audiencias.list.useQuery({
    limit: 500, // Aumentado para garantir que todos os eventos apareçam
  });
  
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

  // Transformar dados do banco para o formato de AgendaItem
  const eventos: AgendaItem[] = useMemo(() => {
    if (!audienciasData) return [];
    
    return audienciasData.map((a) => {
      // Extrair atribuição do processo
      const atribuicaoKey = mapAtribuicaoToKey(a.processo?.atribuicao, a.processo?.area);
      const atribuicaoConfig = getAtribuicaoColors(atribuicaoKey);
      
      return {
        id: a.id.toString(),
        titulo: a.titulo || `Audiência - ${a.tipo}`,
        tipo: "audiencia",
        // Usar format() ao invés de toISOString() para respeitar timezone local
        data: format(new Date(a.dataHora), "yyyy-MM-dd"),
        horarioInicio: a.horario || format(new Date(a.dataHora), "HH:mm"),
        horarioFim: "",
        local: a.local || "",
        assistido: a.assistido?.nome || "",
        assistidoId: a.assistido?.id || a.assistidoId || null,
        processo: a.processo?.numero || "",
        processoId: a.processo?.id || a.processoId || null,
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
        responsavel: "def-1",
      };
    });
  }, [audienciasData]);

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

  const handleSaveEdit = (data: EventoFormData) => {
    if (editingEvento) {
      toast.success("Evento atualizado!");
      setIsEditModalOpen(false);
      setEditingEvento(null);
    }
  };

  const handleDeleteEvento = (id: string) => {
    toast.success("Evento deletado!");
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    toast.success("Status atualizado!");
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
      const matchAreaFilter = areaFilter === "all" || evento.atribuicaoKey === areaFilter;

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

      return (
        matchSearch &&
        matchTipo &&
        matchStatus &&
        matchAtribuicao &&
        matchPrioridade &&
        matchDefensor &&
        matchPeriodo &&
        matchAreaFilter
      );
    });
  }, [
    eventos,
    searchTerm,
    areaFilter,
    selectedTipo,
    selectedStatus,
    selectedAtribuicao,
    selectedPrioridade,
    selectedDefensor,
    selectedPeriodo,
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
  const currentConfig = ATRIBUICAO_CONFIG[areaFilter] || ATRIBUICAO_CONFIG.all;

  // Número de filtros ativos
  const activeFiltersCount = [
    selectedTipo,
    selectedStatus,
    selectedAtribuicao,
    selectedPrioridade,
    selectedPeriodo,
    selectedDefensor,
  ].filter(Boolean).length;

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
      {/* SUB-HEADER - Padrão unificado */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <CalendarIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Audiências e compromissos · {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          
          <div className="flex items-center gap-0.5">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsGoogleConfigModalOpen(true)} 
              title="Configurações"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsBuscaRegistrosModalOpen(true)} 
              title="Buscar Registros"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
            </Button>
            
            {/* Dropdown de Opções */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setIsEscalaModalOpen(true)}>
                  <UserCog className="w-4 h-4 mr-2" />
                  Configurar Escalas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsPJeImportModalOpen(true)}>
                  <FileUp className="w-4 h-4 mr-2" />
                  Importar do PJe
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

            {/* Botão Principal */}
            <Button 
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-7 px-2.5 ml-1.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo
            </Button>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - 2 colunas em mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          value={stats.hoje}
          label="Hoje"
          sublabel={format(new Date(), "EEEE", { locale: ptBR })}
          icon={Clock}
          onClick={() => setSelectedPeriodo(selectedPeriodo === "hoje" ? null : "hoje")}
          isActive={selectedPeriodo === "hoje"}
        />
        <StatCard
          value={stats.amanha}
          label="Amanhã"
          sublabel={format(addDays(new Date(), 1), "dd/MM")}
          icon={CalendarDays}
          onClick={() => setSelectedPeriodo(selectedPeriodo === "amanha" ? null : "amanha")}
          isActive={selectedPeriodo === "amanha"}
        />
        <StatCard
          value={stats.semana}
          label="Esta Semana"
          sublabel="Próximos 7 dias"
          icon={CalendarRange}
          onClick={() => setSelectedPeriodo(selectedPeriodo === "semana" ? null : "semana")}
          isActive={selectedPeriodo === "semana"}
        />
        <StatCard
          value={stats.total}
          label="Total"
          sublabel="Eventos cadastrados"
          icon={CalendarCheck}
        />
      </div>

      {/* Card de Filtros e Busca */}
      <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
        {/* Header com Filtros por Atribuição */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Filtrar por Atribuição</span>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto scrollbar-hide">
              {Object.entries(ATRIBUICAO_CONFIG).map(([key, config]) => (
                <FilterPill
                  key={key}
                  label={config.shortLabel}
                  isActive={areaFilter === key}
                  count={countByArea[key] || 0}
                  config={config}
                  onClick={() => setAreaFilter(key)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Toolbar - Busca + Filtros + Views */}
        <div className="px-4 py-3 flex flex-col sm:flex-row gap-3">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar eventos, processos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros Avançados */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className={cn(
              "h-9 gap-2",
              activeFiltersCount > 0 && "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge className="h-5 px-1.5 text-xs bg-emerald-600 text-white">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isFiltersExpanded && "rotate-180"
            )} />
          </Button>

          {/* Toggle Views - Compacto */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
          <button
            onClick={() => { setViewMode("calendar"); setSelectedPeriodo(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 text-xs font-medium rounded-md transition-all",
              viewMode === "calendar" && !selectedPeriodo
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calendário</span>
          </button>
          <button
            onClick={() => { setViewMode("list"); setSelectedPeriodo(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-9 text-xs font-medium rounded-md transition-all",
              viewMode === "list" && !selectedPeriodo
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          </div>
        </div>

        {/* Painel de Filtros Expandido (dentro do Card) */}
        {isFiltersExpanded && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
            <AgendaFilters
            selectedTipo={selectedTipo}
            setSelectedTipo={setSelectedTipo}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedAtribuicao={selectedAtribuicao}
            setSelectedAtribuicao={setSelectedAtribuicao}
            selectedPrioridade={selectedPrioridade}
            setSelectedPrioridade={setSelectedPrioridade}
            selectedPeriodo={selectedPeriodo}
            setSelectedPeriodo={setSelectedPeriodo}
            selectedDefensor={selectedDefensor}
            setSelectedDefensor={setSelectedDefensor}
            isExpanded={true}
            onToggleExpand={() => {}}
          />
          </div>
        )}
      </Card>

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

      {/* Visualização padrão (calendário ou lista) */}
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
            />
          ) : (
            <Card className="border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Header da Lista */}
              <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {eventosOrdenados.length} evento{eventosOrdenados.length !== 1 && 's'}
                  </p>
                  <div className="flex gap-1">
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
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewEvento}
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
          console.log('Ver registro:', registro);
        }}
      />
      </div>
    </div>
  );
}
