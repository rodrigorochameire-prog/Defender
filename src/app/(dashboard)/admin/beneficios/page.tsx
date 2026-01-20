"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
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
  Award,
  Plus,
  Search,
  TrendingUp,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  Lock,
  ChevronRight,
  Eye,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  progressao: { label: "Progressão", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  livramento: { label: "Livramento", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  saida_temporaria: { label: "Saída Temp.", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  indulto: { label: "Indulto", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/30" },
  remicao: { label: "Remição", color: "text-teal-700 dark:text-teal-400", bg: "bg-teal-100 dark:bg-teal-900/30" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  elegivel: { label: "Elegível", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  aguardando: { label: "Aguardando", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  requerido: { label: "Requerido", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  deferido: { label: "Deferido", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  indeferido: { label: "Indeferido", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

// Dados mockados
const mockBeneficios = [
  {
    id: 1,
    assistido: "Roberto Silva Santos",
    processo: "0001234-56.2024.8.05.0039",
    tipo: "progressao",
    regimeAtual: "Fechado",
    regimeAlvo: "Semiaberto",
    dataElegibilidade: "2026-01-20",
    status: "elegivel",
    fracao: "1/6",
    unidadePrisional: "Conjunto Penal de Candeias",
  },
  {
    id: 2,
    assistido: "Carlos Eduardo Lima",
    processo: "0005678-90.2024.8.05.0039",
    tipo: "livramento",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Liberdade",
    dataElegibilidade: "2026-02-15",
    status: "aguardando",
    fracao: "1/3",
    unidadePrisional: "Conjunto Penal de Candeias",
  },
  {
    id: 3,
    assistido: "João Pedro Oliveira",
    processo: "0009012-34.2024.8.05.0039",
    tipo: "saida_temporaria",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Saída",
    dataElegibilidade: "2026-01-10",
    status: "requerido",
    fracao: "1/6",
    unidadePrisional: "Cadeia Pública de Camaçari",
  },
  {
    id: 4,
    assistido: "Marcos Souza Almeida",
    processo: "0003456-78.2024.8.05.0039",
    tipo: "progressao",
    regimeAtual: "Semiaberto",
    regimeAlvo: "Aberto",
    dataElegibilidade: "2025-12-20",
    status: "deferido",
    fracao: "1/6",
    unidadePrisional: "Regime Aberto",
  },
];

export default function BeneficiosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBeneficios = useMemo(() => {
    return mockBeneficios.filter((b) => {
      const matchesSearch = 
        b.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.processo.includes(searchTerm);
      const matchesTipo = tipoFilter === "all" || b.tipo === tipoFilter;
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [searchTerm, tipoFilter, statusFilter]);

  const stats = useMemo(() => ({
    elegivel: mockBeneficios.filter((b) => b.status === "elegivel").length,
    requerido: mockBeneficios.filter((b) => b.status === "requerido").length,
    aguardando: mockBeneficios.filter((b) => b.status === "aguardando").length,
    deferido: mockBeneficios.filter((b) => b.status === "deferido").length,
  }), []);

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Design Suíço */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Benefícios
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Progressões, livramentos e incidentes
              </p>
            </div>
          </div>

          <Button className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Stats Cards - Design Suíço com borda lateral */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <SwissCard className="border-l-2 border-l-emerald-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.elegivel}</p>
                  <p className="text-xs sm:text-xs text-emerald-600 dark:text-emerald-400">Elegíveis</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-blue-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.requerido}</p>
                  <p className="text-xs sm:text-xs text-blue-600 dark:text-blue-400">Requeridos</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-amber-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.aguardando}</p>
                  <p className="text-xs sm:text-xs text-amber-600 dark:text-amber-400">Aguardando</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-violet-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-violet-700 dark:text-violet-400">{stats.deferido}</p>
                  <p className="text-xs sm:text-xs text-violet-600 dark:text-violet-400">Deferidos</p>
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
                placeholder="Buscar por assistido ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-950 h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs flex-shrink-0">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="progressao">Progressão</SelectItem>
                <SelectItem value="livramento">Livramento</SelectItem>
                <SelectItem value="saida_temporaria">Saída Temp.</SelectItem>
                <SelectItem value="remicao">Remição</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs flex-shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="elegivel">Elegível</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="requerido">Requerido</SelectItem>
                <SelectItem value="deferido">Deferido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Benefícios - Design Suíço */}
        <div className="space-y-3">
          {filteredBeneficios.map((beneficio) => {
            const tipo = TIPO_CONFIG[beneficio.tipo] || TIPO_CONFIG.progressao;
            const status = STATUS_CONFIG[beneficio.status] || STATUS_CONFIG.aguardando;
            const diasRestantes = differenceInDays(parseISO(beneficio.dataElegibilidade), new Date());
            const elegivel = diasRestantes <= 0;

            return (
              <SwissCard 
                key={beneficio.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md group",
                  "border-l-[3px]",
                  elegivel 
                    ? "border-l-emerald-500 dark:border-l-emerald-400" 
                    : "border-l-amber-500 dark:border-l-amber-400"
                )}
              >
                <SwissCardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Info Principal */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                        elegivel 
                          ? "bg-emerald-100 dark:bg-emerald-900/30" 
                          : "bg-amber-100 dark:bg-amber-900/30"
                      )}>
                        <TrendingUp className={cn(
                          "w-4 h-4 sm:w-5 sm:h-5",
                          elegivel 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-amber-600 dark:text-amber-400"
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={cn(
                            "text-[9px] sm:text-xs px-1.5 py-0 rounded-md border-0",
                            tipo.bg, tipo.color
                          )}>
                            {tipo.label}
                          </Badge>
                          <Badge className={cn(
                            "text-[9px] sm:text-xs px-1.5 py-0 rounded-md border-0",
                            status.bg, status.color
                          )}>
                            {status.label}
                          </Badge>
                        </div>

                        {/* Nome e Processo */}
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                            {beneficio.assistido}
                          </h3>
                          <p className="text-xs sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
                            {beneficio.processo}
                          </p>
                        </div>

                        {/* Regime */}
                        <div className="flex items-center gap-2 text-xs sm:text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {beneficio.regimeAtual}
                          </span>
                          <ChevronRight className="w-3 h-3" />
                          <span className="flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            {beneficio.regimeAlvo}
                          </span>
                          <span className="ml-2 font-mono">
                            Fração: {beneficio.fracao}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data e Ação */}
                    <div className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-2">
                      <div className="text-left sm:text-right flex-1 sm:flex-none">
                        <p className="text-[9px] sm:text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Data-base
                        </p>
                        <p className="text-xs sm:text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {format(parseISO(beneficio.dataElegibilidade), "dd/MM/yyyy")}
                        </p>
                      </div>
                      
                      <Badge className={cn(
                        "text-[9px] sm:text-xs px-1.5 py-0 rounded-md border-0 font-medium",
                        elegivel
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : diasRestantes <= 30
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        {elegivel ? "Elegível agora" : `Em ${diasRestantes}d`}
                      </Badge>

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
          {filteredBeneficios.length === 0 && (
            <SwissCard className="border-dashed">
              <SwissCardContent className="text-center py-16">
                <div className="mx-auto w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhum benefício encontrado
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                  Ajuste os filtros ou cadastre um novo pedido.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Pedido
                </Button>
              </SwissCardContent>
            </SwissCard>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
