"use client";

/**
 * PaletteAiActions — grupo "Ações de IA" do ⌘K. Dada a entidade em foco (da URL,
 * via entityFromPathname), lista as skills do daemon aplicáveis e dispara via
 * useSkillTask (claude -p, login Max, custo zero). Isolado do palette para não
 * complicar a ordem de hooks do componente grande.
 */

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { trpc } from "@/lib/trpc/client";
import { useSkillTask } from "@/hooks/use-skill-task";
import { buildLauncherItems } from "@/lib/skills/launcher-view";
import type { Atribuicao } from "@/lib/skills/catalog";
import type { PaletteEntity } from "@/lib/skills/palette-context";

interface PaletteAiActionsProps {
  entity: PaletteEntity | null;
  /** Chamado após disparar uma skill (para fechar o palette). */
  onDone: () => void;
}

export function PaletteAiActions({ entity, onDone }: PaletteAiActionsProps) {
  const isProcesso = entity?.entity === "processo";

  // Contexto do processo (atribuição + assistido principal). Só dispara em rota
  // de processo; para assistido as skills são `ANY` e não precisam de query.
  const { data: processo } = trpc.processos.getById.useQuery(
    { id: entity?.id ?? 0 },
    { enabled: isProcesso && !!entity?.id, staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const task = useSkillTask({
    onComplete: () => toast.success("Skill concluída"),
    onError: (msg) => toast.error(`Erro: ${msg}`),
  });

  if (!entity) return null;

  let items: ReturnType<typeof buildLauncherItems> = [];
  if (entity.entity === "processo") {
    const p = processo as
      | { atribuicao?: string | null; assistidos?: { id: number; isPrincipal?: boolean | null }[] }
      | undefined;
    const principalId =
      p?.assistidos?.find((a) => a.isPrincipal)?.id ?? p?.assistidos?.[0]?.id ?? undefined;
    items = buildLauncherItems({
      entity: "processo",
      atribuicao: (p?.atribuicao ?? "") as Atribuicao,
      assistidoId: principalId,
      processoId: entity.id,
    });
  } else {
    items = buildLauncherItems({
      entity: "assistido",
      atribuicao: "" as Atribuicao,
      assistidoId: entity.id,
    });
  }

  if (items.length === 0) return null;

  return (
    <CommandGroup heading="Ações de IA">
      {items.map((item) => (
        <CommandItem
          key={item.slug}
          value={`ia-${item.slug}`}
          onSelect={() => {
            task.trigger(item.triggerInput);
            toast.success("Skill enfileirada", {
              description: "O daemon vai processar — acompanhe no histórico de IA.",
            });
            onDone();
          }}
        >
          <div className="flex w-full items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-medium">{item.label}</span>
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {item.description}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
