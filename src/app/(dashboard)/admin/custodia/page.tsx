"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Calendar,
  Scale,
  Gavel,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// Dados mockados
const mockCustodias = [
  {
    id: 1,
    assistido: "Carlos Eduardo Lima",
    processo: "0001234-56.2026.8.05.0039",
    dataAudiencia: "2026-01-17T09:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 129 §9º CP",
    resultado: null,
    status: "agendada",
  },
  {
    id: 2,
    assistido: "Pedro Henrique Santos",
    processo: "0005678-90.2026.8.05.0039",
    dataAudiencia: "2026-01-17T14:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 147 CP",
    resultado: null,
    status: "agendada",
  },
  {
    id: 3,
    assistido: "João Paulo Oliveira",
    processo: "0009012-34.2026.8.05.0039",
    dataAudiencia: "2026-01-16T10:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 129 §9º CP",
    resultado: "liberdade_provisoria",
    status: "realizada",
  },
  {
    id: 4,
    assistido: "Roberto Silva",
    processo: "0003456-78.2026.8.05.0039",
    dataAudiencia: "2026-01-16T15:00:00",
    local: "CEAC Camaçari",
    crime: "Art. 213 CP",
    resultado: "prisao_preventiva",
    status: "realizada",
  },
];

const resultadoConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  liberdade_provisoria: { label: "Liberdade Provisória", color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
  prisao_preventiva: { label: "Prisão Preventiva", color: "text-rose-700", bg: "bg-rose-100", icon: XCircle },
  relaxamento: { label: "Relaxamento", color: "text-blue-700", bg: "bg-blue-100", icon: CheckCircle2 },
};

export default function CustodiaPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustodias = mockCustodias.filter(
    (c) =>
      c.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.processo.includes(searchTerm)
  );

  const hoje = filteredCustodias.filter((c) => c.status === "agendada");
  const realizadas = filteredCustodias.filter((c) => c.status === "realizada");

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header - Padrão Swiss */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Audiências de Custódia</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Flagrantes e análise de prisões
            </p>
          </div>
        </div>
        <Button className="gap-2 h-9">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Registrar Custódia</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
      </div>

      {/* Stats - Padrão Swiss */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <SwissCard className="border-l-[3px] border-l-amber-500 dark:border-l-amber-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{hoje.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Agendadas Hoje</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {realizadas.filter((c) => c.resultado === "liberdade_provisoria").length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Liberdades</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-rose-500 dark:border-l-rose-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {realizadas.filter((c) => c.resultado === "prisao_preventiva").length}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Preventivas</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-violet-500 dark:border-l-violet-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{mockCustodias.length}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total Mês</p>
              </div>
              <div className="hidden sm:flex h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 items-center justify-center">
                <Gavel className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Search - Padrão Swiss */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assistido ou processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Button variant="outline" className="gap-2 h-9">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtrar</span>
        </Button>
      </div>

      {/* Custódias de Hoje - Padrão Swiss */}
      {hoje.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            Audiências de Hoje
          </h2>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {hoje.map((custodia) => (
              <SwissCard key={custodia.id} className="border-l-[3px] border-l-amber-400 hover:shadow-md transition-shadow">
                <SwissCardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{custodia.assistido}</h3>
                      <p className="text-[10px] sm:text-xs font-mono text-muted-foreground mt-0.5 truncate">
                        {custodia.processo}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="text-[10px] sm:text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0">{custodia.crime}</Badge>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold font-mono text-amber-600">
                        {format(parseISO(custodia.dataAudiencia), "HH:mm")}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{custodia.local}</p>
                    </div>
                  </div>
                </SwissCardContent>
              </SwissCard>
            ))}
          </div>
        </div>
      )}

      {/* Histórico - Padrão Swiss */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold">Histórico Recente</h2>
        <div className="space-y-2 sm:space-y-3">
          {realizadas.map((custodia) => {
            const resultado = custodia.resultado
              ? resultadoConfig[custodia.resultado]
              : null;
            const ResultadoIcon = resultado?.icon || Scale;

            return (
              <SwissCard
                key={custodia.id}
                className={cn(
                  "hover:shadow-md transition-shadow",
                  "border-l-[3px]",
                  resultado?.color === "text-emerald-700" && "border-l-emerald-500",
                  resultado?.color === "text-rose-700" && "border-l-rose-500",
                  resultado?.color === "text-blue-700" && "border-l-blue-500"
                )}
              >
                <SwissCardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm sm:text-base truncate">{custodia.assistido}</h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                          {format(parseISO(custodia.dataAudiencia), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                    {resultado && (
                      <Badge className={cn("text-[10px] sm:text-xs border-0 flex-shrink-0", resultado.bg, resultado.color)}>
                        <ResultadoIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                        <span className="hidden sm:inline">{resultado.label}</span>
                        <span className="sm:hidden">{resultado.label.split(' ')[0]}</span>
                      </Badge>
                    )}
                  </div>
                </SwissCardContent>
              </SwissCard>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredCustodias.length === 0 && (
        <SwissCard className="border-dashed">
          <SwissCardContent className="text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma audiência de custódia encontrada</p>
          </SwissCardContent>
        </SwissCard>
      )}
    </div>
  );
}
