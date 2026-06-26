"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { isMarco, type VfTipo } from "@/lib/vida-funcional/tipo-cluster";

type Filtro = "marcos" | "operacional" | "tudo";

interface EventoLite {
  id: number;
  tipo: string;
  titulo: string;
  dataEvento: string;
  driveFolderId: string | null;
}

export function TrajetoriaTimeline({ eventos, isLoading }: { eventos: EventoLite[]; isLoading: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("marcos");

  const itens = useMemo(() => {
    const list = eventos
      .filter((e) => {
        const marco = isMarco(e.tipo as VfTipo);
        if (filtro === "marcos") return marco;
        if (filtro === "operacional") return !marco;
        return true;
      })
      .sort((a, b) => new Date(b.dataEvento).getTime() - new Date(a.dataEvento).getTime());
    return list;
  }, [eventos, filtro]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando trajetória…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-0.5">
        {(["marcos", "operacional", "tudo"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer",
              filtro === f ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900" : "text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento neste filtro.</p>
      ) : (
        <Timeline>
          {itens.map((e) => (
            <TimelineItem key={e.id} timestamp={e.dataEvento} completed={isMarco(e.tipo as VfTipo)}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.tipo}</p>
              <p className="font-medium">{e.titulo}</p>
              {e.driveFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${e.driveFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Abrir pasta no Drive ↗
                </a>
              )}
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </div>
  );
}
