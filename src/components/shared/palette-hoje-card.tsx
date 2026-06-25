"use client";

/**
 * PaletteHojeCard — card "Hoje" do ⌘K: lista as audiências do dia, clicáveis,
 * para pular direto ao processo de qualquer lugar. Reusa `hearingsToday`.
 * Some quando não há audiência hoje. Componente burro: navegação via `onSelect`.
 */

import { CalendarClock } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { trpc } from "@/lib/trpc/client";
import { hearingsToday, type HearingLike } from "@/lib/audiencias/today-summary";

interface PaletteHojeCardProps {
  /** Chamado com o processoId ao selecionar uma audiência (o host navega + fecha). */
  onSelect: (processoId: number) => void;
}

export function PaletteHojeCard({ onSelect }: PaletteHojeCardProps) {
  const { data } = trpc.audiencias.proximas.useQuery(
    { dias: 1 },
    { refetchOnWindowFocus: false, staleTime: 60_000 },
  );

  const items = hearingsToday(data as HearingLike[] | undefined, Date.now());
  if (items.length === 0) return null;

  return (
    <CommandGroup heading="Hoje">
      {items.map((item) => (
        <CommandItem
          key={item.id}
          value={`hoje-${item.id}`}
          onSelect={() => {
            if (item.processoId != null) onSelect(item.processoId);
          }}
        >
          <div className="flex w-full items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {item.hora}
            </span>
            <span className="text-sm font-medium">{item.tipo}</span>
            {item.assistidoNome && (
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {item.assistidoNome}
              </span>
            )}
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
