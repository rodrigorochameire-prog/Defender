"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatusBarProps {
  collapsed?: boolean;
}

export function StatusBar({ collapsed = false }: StatusBarProps) {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Stabilize query input — round to current minute to prevent new query key on every render
  const dataInicioStable = useMemo(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString();
  }, []); // Only computed once on mount — refetchInterval handles updates

  // Query para próximo evento
  const { data: proximosEventos } = trpc.eventos.list.useQuery(
    {
      limit: 1,
      dataInicio: dataInicioStable,
      orderBy: "data",
      orderDirection: "asc",
    },
    {
      enabled: mounted,
      refetchInterval: 60000, // Atualiza a cada minuto
      staleTime: 30000,
    }
  );

  const proximoEvento = proximosEventos?.items?.[0];

  useEffect(() => {
    setMounted(true);
    setLastSync(new Date());

    // Listener de conexão
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Atualiza sync a cada 5 minutos
    const interval = setInterval(() => {
      setLastSync(new Date());
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!mounted) return null;

  // Formata próximo evento
  const formatProximoEvento = () => {
    if (!proximoEvento) return null;

    const data = new Date(proximoEvento.data);
    let quando = "";

    if (isToday(data)) {
      quando = `Hoje, ${format(data, "HH:mm")}`;
    } else if (isTomorrow(data)) {
      quando = `Amanhã, ${format(data, "HH:mm")}`;
    } else {
      quando = format(data, "EEE, dd/MM", { locale: ptBR });
    }

    return {
      titulo: proximoEvento.titulo || "Evento",
      quando,
    };
  };

  const evento = formatProximoEvento();

  // Versão colapsada - apenas indicadores visuais
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        {/* Indicador de conexão */}
        <div className="relative">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
            )}
            title={isOnline ? "Online" : "Offline"}
          />
        </div>

        {/* Indicador de próximo evento */}
        {evento && (
          <span title={`${evento.titulo} - ${evento.quando}`}>
            <Calendar className="w-4 h-4 text-zinc-500" />
          </span>
        )}
      </div>
    );
  }

  // Versão expandida
  return (
    <div className="px-3 py-2 space-y-1.5">
      {/* Linha divisória sutil */}
      <div className="h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-zinc-700/50 to-transparent" />

      {/* Banner offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30">
          <WifiOff className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
              Modo offline
            </p>
            <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60">
              Dados em cache disponíveis
            </p>
          </div>
        </div>
      )}

      {/* Status de conexão + última sincronização (merged into one line) */}
      <div className="flex items-center gap-1.5 text-[10px]">
        {isOnline ? (
          <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
        )}
        <span className="text-zinc-500">
          {isOnline ? "Conectado" : "Offline"}
        </span>
        {lastSync && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <RefreshCw className="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
            <span className="text-zinc-400 dark:text-zinc-600 truncate">
              {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
            </span>
          </>
        )}
      </div>

      {/* Próximo evento */}
      {evento && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-200/40 dark:border-emerald-700/20">
          <div className="h-8 w-8 rounded-lg bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
              {evento.titulo}
            </p>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
              {evento.quando}
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há eventos */}
      {!evento && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/[0.03] dark:bg-zinc-800/30 border border-black/[0.04] dark:border-zinc-700/20">
          <CheckCircle2 className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Sem eventos próximos
          </span>
        </div>
      )}
    </div>
  );
}
