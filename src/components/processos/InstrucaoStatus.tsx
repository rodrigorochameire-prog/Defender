"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MapPin,
  Send,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface InstrucaoStatusProps {
  processoId: number;
}

export function InstrucaoStatus({ processoId }: InstrucaoStatusProps) {
  const { data, isLoading } = trpc.processos.instrucaoStatus.useQuery(
    { processoId },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando status...</span>
      </div>
    );
  }

  if (!data || (data.testemunhas.total === 0 && data.audiencias.total === 0)) {
    return null; // Don't show the card if there's no data
  }

  const { testemunhas: t, audiencias: a, intercorrencias } = data;
  const progressPercent = t.total > 0 ? Math.round((t.ouvidas.length / t.total) * 100) : 0;

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Status da Instrucao
          </h3>
          {t.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progressPercent === 100
                      ? "bg-emerald-500"
                      : progressPercent >= 50
                      ? "bg-cyan-500"
                      : "bg-amber-500"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                {t.ouvidas.length}/{t.total}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Testemunhas ouvidas */}
        {t.ouvidas.length > 0 && (
          <StatusSection
            icon={CheckCircle2}
            iconColor="text-emerald-500"
            label="Ouvidos"
            items={t.ouvidas.map(x => ({ name: x.nome, badge: x.tipo }))}
          />
        )}

        {/* Testemunhas pendentes */}
        {t.pendentes.length > 0 && (
          <StatusSection
            icon={Clock}
            iconColor="text-amber-500"
            label="Pendentes"
            items={t.pendentes.map(x => ({
              name: x.nome,
              badge: x.tipo,
              statusBadge: x.status === "INTIMADA" ? "intimada" : "arrolada",
            }))}
          />
        )}

        {/* Desistencias */}
        {t.desistidas.length > 0 && (
          <StatusSection
            icon={XCircle}
            iconColor="text-red-500"
            label="Desistencias"
            items={t.desistidas.map(x => ({ name: x.nome, badge: x.tipo }))}
          />
        )}

        {/* Nao localizadas */}
        {t.naoLocalizadas.length > 0 && (
          <StatusSection
            icon={MapPin}
            iconColor="text-zinc-400"
            label="Nao localizadas"
            items={t.naoLocalizadas.map(x => ({ name: x.nome, badge: x.tipo }))}
          />
        )}

        {/* Carta precatoria */}
        {t.cartaPrecatoria.length > 0 && (
          <StatusSection
            icon={Send}
            iconColor="text-blue-500"
            label="Carta precatoria"
            items={t.cartaPrecatoria.map(x => ({ name: x.nome, badge: x.tipo }))}
          />
        )}

        {/* Audiências summary */}
        {a.total > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {a.realizadas} audiencia{a.realizadas !== 1 ? "s" : ""} realizada{a.realizadas !== 1 ? "s" : ""}
            </span>
            {a.adiadas > 0 && (
              <span className="text-amber-600">
                {a.adiadas} adiada{a.adiadas !== 1 ? "s" : ""}
              </span>
            )}
            {a.proxima && (
              <span className="text-cyan-600 ml-auto">
                Proxima: {new Date(a.proxima.dataAudiencia).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
            )}
          </div>
        )}

        {/* Intercorrencias */}
        {intercorrencias.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Intercorrencias ({intercorrencias.length})
            </p>
            {intercorrencias.map((ic, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span className="text-zinc-400 shrink-0 tabular-nums">
                  {new Date(ic.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-4 shrink-0",
                    ic.tipo === "adiamento" && "text-amber-600 border-amber-200",
                    ic.tipo === "cancelamento" && "text-red-600 border-red-200",
                    ic.tipo === "intercorrencia" && "text-orange-600 border-orange-200",
                  )}
                >
                  {ic.tipo}
                </Badge>
                <span className="text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {ic.descricao}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Status Section
// ============================================================

function StatusSection({
  icon: Icon,
  iconColor,
  label,
  items,
}: {
  icon: typeof CheckCircle2;
  iconColor: string;
  label: string;
  items: { name: string; badge: string; statusBadge?: string }[];
}) {
  const TIPO_LABELS: Record<string, string> = {
    DEFESA: "defesa",
    ACUSACAO: "acusacao",
    COMUM: "comum",
    INFORMANTE: "informante",
    PERITO: "perito",
    VITIMA: "vitima",
  };

  const TIPO_COLORS: Record<string, string> = {
    DEFESA: "text-emerald-600 border-emerald-200",
    ACUSACAO: "text-red-600 border-red-200",
    COMUM: "text-zinc-500 border-zinc-200",
    INFORMANTE: "text-blue-600 border-blue-200",
    PERITO: "text-purple-600 border-purple-200",
    VITIMA: "text-amber-600 border-amber-200",
  };

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
        <Icon className={cn("h-3 w-3", iconColor)} />
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-1.5 ml-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
              {item.name}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[9px] h-4", TIPO_COLORS[item.badge] || "text-zinc-400 border-zinc-200")}
            >
              {TIPO_LABELS[item.badge] || item.badge}
            </Badge>
            {item.statusBadge && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] h-4",
                  item.statusBadge === "intimada"
                    ? "text-cyan-600 border-cyan-200"
                    : "text-zinc-400 border-zinc-200",
                )}
              >
                {item.statusBadge}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
