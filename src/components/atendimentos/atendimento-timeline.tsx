"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { isToday, isYesterday, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContactRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AtendimentoCard } from "./atendimento-card";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AtendimentoItem {
  atendimento: {
    id: number;
    dataAtendimento: Date | string;
    tipo: string;
    assunto: string | null;
    resumo: string | null;
    duracao: number | null;
    status: string | null;
    interlocutor: string | null;
    pontosChave: {
      compromissos?: string[];
      informacoesRelevantes?: string[];
      duvidasPendentes?: string[];
      providenciasNecessarias?: string[];
    } | null;
    plaudRecordingId: string | null;
    audioUrl: string | null;
    audioDriveFileId: string | null;
    transcricaoStatus: string | null;
    enrichmentStatus: string | null;
    processoId: number | null;
  };
  assistido: { id: number; nome: string; cpf: string | null };
  atendidoPor: { id: number; name: string | null } | null;
}

interface AtendimentoTimelineProps {
  items: AtendimentoItem[];
  processos: Array<{ id: number; numeroAutos: string }>;
  isLoading: boolean;
  onEdit: (atendimento: any) => void;
  onDelete: (id: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AtendimentoTimeline({
  items,
  processos,
  isLoading,
  onEdit,
  onDelete,
}: AtendimentoTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, AtendimentoItem[]>();
    for (const item of items) {
      const date = new Date(item.atendimento.dataAtendimento);
      const key = format(date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).map(([key, groupItems]) => {
      const date = new Date(key);
      const label = isToday(date)
        ? "Hoje"
        : isYesterday(date)
          ? "Ontem"
          : format(date, "dd MMM", { locale: ptBR });
      const isCurrentDay = isToday(date);
      return { key, label, isCurrentDay, items: groupItems };
    });
  }, [items]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ContactRound className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Nenhum atendimento registrado
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Use o registro rápido acima para começar
        </p>
      </div>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  return (
    <div className="border-l-2 border-neutral-200 dark:border-neutral-700 pl-3.5 ml-1.5">
      {groups.map((group) => (
        <div key={group.key} className="mb-4">
          {/* Date label with dot */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full -ml-[18px] border-2 border-white dark:border-neutral-950",
                group.isCurrentDay
                  ? "bg-emerald-500"
                  : "bg-neutral-300 dark:bg-neutral-600",
              )}
            />
            <span
              className={cn(
                "text-[11px] font-semibold",
                group.isCurrentDay
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400",
              )}
            >
              {group.label}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <AtendimentoCard
                key={item.atendimento.id}
                atendimento={item.atendimento}
                processoNumero={
                  processos.find((p) => p.id === item.atendimento.processoId)
                    ?.numeroAutos
                }
                isExpanded={expandedId === item.atendimento.id}
                onToggle={() =>
                  setExpandedId(
                    expandedId === item.atendimento.id
                      ? null
                      : item.atendimento.id,
                  )
                }
                onEdit={() => onEdit(item.atendimento)}
                onDelete={() => onDelete(item.atendimento.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
