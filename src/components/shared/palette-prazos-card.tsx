"use client";

/**
 * PalettePrazosCard — card "Prazos urgentes" do ⌘K: lista os prazos vencidos /
 * de hoje, clicáveis, para saltar direto ao processo de qualquer lugar. Some
 * quando não há urgência. Reusa `urgentPrazoItems` (puro).
 */

import { AlertTriangle } from "lucide-react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { urgentPrazoItems, type PrazoRowLike } from "@/lib/prazos/palette-prazos";

interface PalettePrazosCardProps {
  onSelect: (processoId: number) => void;
}

export function PalettePrazosCard({ onSelect }: PalettePrazosCardProps) {
  const { data } = trpc.prazos.prazosCriticos.useQuery(
    { diasAFrente: 1, incluirVencidos: true, limit: 20 },
    { refetchOnWindowFocus: false, staleTime: 60_000 },
  );

  const items = urgentPrazoItems(data as PrazoRowLike[] | undefined);
  if (items.length === 0) return null;

  return (
    <CommandGroup heading="Prazos urgentes">
      {items.map((item) => (
        <CommandItem
          key={item.id}
          value={`prazo-${item.id}`}
          onSelect={() => {
            if (item.processoId != null) onSelect(item.processoId);
          }}
        >
          <div className="flex w-full items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                item.tone === "danger" ? "text-rose-500" : "text-amber-500",
              )}
            />
            <span className="text-sm font-medium">{item.ato}</span>
            {item.assistidoNome && (
              <span className="truncate text-xs text-muted-foreground">
                {item.assistidoNome}
              </span>
            )}
            <span
              className={cn(
                "ml-auto shrink-0 text-[10px] font-semibold",
                item.tone === "danger" ? "text-rose-500" : "text-amber-500",
              )}
            >
              {item.quando}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
