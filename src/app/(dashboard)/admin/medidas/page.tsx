"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Eye,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ativa: { 
    label: "Ativa", 
    color: "text-emerald-700 dark:text-emerald-400", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30", 
    icon: CheckCircle2 
  },
  expirada: { 
    label: "Expirada", 
    color: "text-slate-600 dark:text-slate-400", 
    bg: "bg-slate-100 dark:bg-slate-900/30", 
    icon: Clock 
  },
  revogada: { 
    label: "Revogada", 
    color: "text-rose-700 dark:text-rose-400", 
    bg: "bg-rose-100 dark:bg-rose-900/30", 
    icon: AlertTriangle 
  },
};

// Dados mockados
const mockMedidas = [
  {
    id: 1,
    processo: "0001234-56.2025.8.05.0039",
    nomeVitima: "Maria da Silva",
    tipoMedida: "Afastamento do Lar",
    dataDecisao: "2026-01-10",
    dataVencimento: "2026-04-10",
    status: "ativa",
    distanciaMetros: 500,
    assistido: "João Carlos Santos",
  },
  {
    id: 2,
    processo: "0005678-90.2025.8.05.0039",
    nomeVitima: "Ana Paula Costa",
    tipoMedida: "Proibição de Contato",
    dataDecisao: "2026-01-05",
    dataVencimento: "2026-02-05",
    status: "ativa",
    distanciaMetros: null,
    assistido: "Pedro Oliveira Lima",
  },
  {
    id: 3,
    processo: "0009012-34.2024.8.05.0039",
    nomeVitima: "Carla Fernanda Souza",
    tipoMedida: "Proibição de Aproximação",
    dataDecisao: "2025-10-15",
    dataVencimento: "2026-01-15",
    status: "expirada",
    distanciaMetros: 300,
    assistido: "Roberto Almeida Silva",
  },
];

export default function MedidasProtetivasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMedidas = useMemo(() => {
    return mockMedidas.filter((m) => {
      const matchesSearch = 
        m.nomeVitima.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.processo.includes(searchTerm);
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: mockMedidas.length,
    ativas: mockMedidas.filter((m) => m.status === "ativa").length,
    vencendo: mockMedidas.filter((m) => {
      const dias = differenceInDays(parseISO(m.dataVencimento), new Date());
      return dias >= 0 && dias <= 15 && m.status === "ativa";
    }).length,
    expiradas: mockMedidas.filter((m) => m.status === "expirada").length,
  }), []);

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Design Suíço */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-violet-700 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Medidas Protetivas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Gestão de MPUs - Lei Maria da Penha
              </p>
            </div>
          </div>

          <Button className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Nova Medida</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        {/* Stats Cards - Design Suíço com borda lateral */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <SwissCard className="border-l-2 border-l-violet-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-violet-700 dark:text-violet-400">{stats.total}</p>
                  <p className="text-xs sm:text-xs text-violet-600 dark:text-violet-400">Total MPUs</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-emerald-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.ativas}</p>
                  <p className="text-xs sm:text-xs text-emerald-600 dark:text-emerald-400">Ativas</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-amber-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.vencendo}</p>
                  <p className="text-xs sm:text-xs text-amber-600 dark:text-amber-400">Vencendo</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-slate-400">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-400">{stats.expiradas}</p>
                  <p className="text-xs sm:text-xs text-slate-600 dark:text-slate-400">Expiradas</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>

        {/* Filters - Design Suíço */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar por vítima, assistido ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-950 h-9 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9 text-xs sm:text-sm flex-shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="expirada">Expiradas</SelectItem>
                <SelectItem value="revogada">Revogadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Medidas - Design Suíço */}
        <div className="space-y-3">
          {filteredMedidas.map((medida) => {
            const statusInfo = STATUS_CONFIG[medida.status] || STATUS_CONFIG.ativa;
            const diasRestantes = differenceInDays(parseISO(medida.dataVencimento), new Date());
            const StatusIcon = statusInfo.icon;
            const isActive = medida.status === "ativa";
            const isExpiring = isActive && diasRestantes <= 15 && diasRestantes >= 0;

            return (
              <SwissCard 
                key={medida.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md group",
                  "border-l-[3px]",
                  isActive && !isExpiring && "border-l-emerald-500 dark:border-l-emerald-400",
                  isExpiring && "border-l-amber-500 dark:border-l-amber-400",
                  !isActive && "border-l-slate-400 dark:border-l-slate-500"
                )}
              >
                <SwissCardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Info Principal */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                        statusInfo.bg
                      )}>
                        <Shield className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5",
                          statusInfo.color
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={cn(
                            "text-[9px] sm:text-xs px-1.5 py-0 rounded-md border-0",
                            statusInfo.bg, statusInfo.color
                          )}>
                            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                            {statusInfo.label}
                          </Badge>
                          
                          {medida.distanciaMetros && (
                            <Badge variant="outline" className="text-[9px] sm:text-xs px-1.5 py-0 rounded-md">
                              <MapPin className="w-2.5 h-2.5 mr-0.5" />
                              {medida.distanciaMetros}m
                            </Badge>
                          )}
                        </div>

                        {/* Tipo e Processo */}
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                            {medida.tipoMedida}
                          </h3>
                          <p className="text-xs sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {medida.processo}
                          </p>
                        </div>

                        {/* Vítima e Assistido */}
                        <div className="flex items-center gap-3 text-xs sm:text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Vítima: <span className="font-medium text-zinc-700 dark:text-zinc-300">{medida.nomeVitima}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Assistido: <span className="font-medium text-zinc-700 dark:text-zinc-300">{medida.assistido}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data e Ação */}
                    <div className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-2">
                      <div className="text-left sm:text-right flex-1 sm:flex-none">
                        <p className="text-[9px] sm:text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Vencimento
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {format(parseISO(medida.dataVencimento), "dd/MM/yyyy")}
                        </p>
                      </div>
                      
                      {isActive && (
                        <Badge className={cn(
                          "text-[9px] sm:text-xs px-1.5 py-0 rounded-md border-0 font-medium",
                          isExpiring
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {diasRestantes > 0 ? `${diasRestantes}d restantes` : "Vence hoje"}
                        </Badge>
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </SwissCardContent>
              </SwissCard>
            );
          })}

          {/* Empty State */}
          {filteredMedidas.length === 0 && (
            <SwissCard className="border-dashed">
              <SwissCardContent className="text-center py-16">
                <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhuma medida encontrada
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Ajuste os filtros ou cadastre uma nova medida.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Medida
                </Button>
              </SwissCardContent>
            </SwissCard>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
