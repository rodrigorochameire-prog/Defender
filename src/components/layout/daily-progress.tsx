"use client";

import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { startOfDay, endOfDay } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DailyProgress() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Query para demandas do dia
  const { data: demandasData } = trpc.demandas.list.useQuery(
    {
      limit: 100,
      // Busca demandas criadas ou modificadas hoje
    },
    {
      enabled: mounted,
      staleTime: 60000, // 1 minuto
      refetchInterval: 120000, // Atualiza a cada 2 minutos
    }
  );

  // Query para eventos do dia
  const { data: eventosData } = trpc.eventos.list.useQuery(
    {
      limit: 50,
      dataInicio: startOfDay(new Date()).toISOString(),
      dataFim: endOfDay(new Date()).toISOString(),
    },
    {
      enabled: mounted,
      staleTime: 60000,
      refetchInterval: 120000,
    }
  );

  // Calcula métricas
  const metrics = useMemo(() => {
    // Demandas
    const demandas = demandasData?.items || [];
    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);

    // Demandas concluídas hoje
    const demandasConcluidasHoje = demandas.filter((d) => {
      if (d.status !== "CONCLUIDO") return false;
      const updatedAt = new Date(d.updatedAt);
      return updatedAt >= inicioHoje;
    }).length;

    // Total de demandas para fazer hoje (urgentes ou com prazo hoje)
    const demandasParaHoje = demandas.filter((d) => {
      if (d.status === "CONCLUIDO") return false;
      if (d.prioridade === "URGENTE") return true;
      if (d.prazo) {
        const prazo = new Date(d.prazo);
        return prazo <= endOfDay(hoje);
      }
      return false;
    }).length;

    const totalDemandasHoje = demandasConcluidasHoje + demandasParaHoje;

    // Eventos
    const eventos = eventosData?.items || [];
    const eventosRealizados = eventos.filter(
      (e) => e.status === "REALIZADO" || e.status === "CONFIRMADO"
    ).length;
    const totalEventos = eventos.length;

    return {
      demandas: {
        concluidas: demandasConcluidasHoje,
        total: Math.max(totalDemandasHoje, demandasConcluidasHoje),
        percentual:
          totalDemandasHoje > 0
            ? Math.round((demandasConcluidasHoje / totalDemandasHoje) * 100)
            : 100,
      },
      eventos: {
        realizados: eventosRealizados,
        total: totalEventos,
        percentual:
          totalEventos > 0
            ? Math.round((eventosRealizados / totalEventos) * 100)
            : 100,
      },
    };
  }, [demandasData, eventosData]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-6 w-24 bg-zinc-700/30 rounded animate-pulse" />
        <div className="h-6 w-24 bg-zinc-700/30 rounded animate-pulse" />
      </div>
    );
  }

  const { demandas, eventos } = metrics;

  // Calcula progresso geral
  const progressoGeral = Math.round(
    (demandas.percentual + eventos.percentual) / 2
  );

  // Determina cor baseada no progresso
  const getProgressColor = (percentual: number) => {
    if (percentual >= 80) return "bg-emerald-500";
    if (percentual >= 50) return "bg-amber-500";
    return "bg-zinc-500";
  };

  return (
    <TooltipProvider>
      <div className="hidden md:flex items-center gap-3">
        {/* Progresso de Demandas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-700/50 transition-colors cursor-default">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-200">
                  {demandas.concluidas}/{demandas.total}
                </span>
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getProgressColor(demandas.percentual)
                    )}
                    style={{ width: `${demandas.percentual}%` }}
                  />
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-zinc-900 border-zinc-700 text-zinc-200"
          >
            <div className="text-xs">
              <p className="font-semibold">Demandas Hoje</p>
              <p className="text-zinc-400">
                {demandas.concluidas} de {demandas.total} concluídas (
                {demandas.percentual}%)
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Progresso de Eventos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:bg-zinc-700/50 transition-colors cursor-default">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-zinc-200">
                  {eventos.realizados}/{eventos.total}
                </span>
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getProgressColor(eventos.percentual)
                    )}
                    style={{ width: `${eventos.percentual}%` }}
                  />
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-zinc-900 border-zinc-700 text-zinc-200"
          >
            <div className="text-xs">
              <p className="font-semibold">Eventos Hoje</p>
              <p className="text-zinc-400">
                {eventos.realizados} de {eventos.total} realizados (
                {eventos.percentual}%)
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Indicador de progresso geral - só mostra se tiver atividade */}
        {(demandas.total > 0 || eventos.total > 0) && progressoGeral >= 80 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 border border-emerald-700/30">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400">
                  Ótimo dia!
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-zinc-900 border-zinc-700 text-zinc-200"
            >
              <p className="text-xs">Progresso geral: {progressoGeral}%</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
