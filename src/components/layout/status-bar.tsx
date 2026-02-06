"use client";

import { useState, useEffect } from "react";
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

  // Query para próximo evento
  const { data: proximosEventos } = trpc.eventos.list.useQuery(
    {
      limit: 1,
      dataInicio: new Date().toISOString(),
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
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-emerald-400" : "bg-red-400"
          )}
          title={isOnline ? "Online" : "Offline"}
        />

        {/* Indicador de próximo evento */}
        {evento && (
          <Calendar
            className="w-4 h-4 text-zinc-500"
            title={`${evento.titulo} - ${evento.quando}`}
          />
        )}
      </div>
    );
  }

  // Versão expandida
  return (
    <div className="px-3 py-2 space-y-2">
      {/* Linha divisória sutil */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* Status de conexão e última sincronização */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-emerald-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span className="text-[10px] text-zinc-500">
            {isOnline ? "Conectado" : "Offline"}
          </span>
        </div>

        {lastSync && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
            <RefreshCw className="w-2.5 h-2.5" />
            <span>
              {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        )}
      </div>

      {/* Próximo evento */}
      {evento && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
          <div className="h-8 w-8 rounded-lg bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-zinc-300 truncate">
              {evento.titulo}
            </p>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {evento.quando}
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há eventos */}
      {!evento && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/20">
          <CheckCircle2 className="w-4 h-4 text-zinc-600" />
          <span className="text-[10px] text-zinc-500">
            Sem eventos próximos
          </span>
        </div>
      )}
    </div>
  );
}
