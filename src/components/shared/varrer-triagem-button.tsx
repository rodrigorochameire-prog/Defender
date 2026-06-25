"use client";

/**
 * VarrerTriagemButton — dispara a varredura de triagem (lane browser) pela
 * interface, no lugar de rodar `varredura_triagem.py` no Claude Code. Enfileira
 * uma task self-contained pelo daemon do navegador; acompanhe em /admin/daemon.
 */

import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface VarrerTriagemButtonProps {
  /** Atribuição a varrer; ausente = varre tudo. */
  atribuicao?: string;
  /** Renderiza só o ícone (para barras de cabeçalho compactas). */
  iconOnly?: boolean;
  className?: string;
}

export function VarrerTriagemButton({
  atribuicao,
  iconOnly,
  className,
}: VarrerTriagemButtonProps) {
  const enqueue = trpc.analise.enqueueVarredura.useMutation({
    onSuccess: (r) => {
      if (r.existing) toast.info("Já há uma varredura em andamento");
      else
        toast.success("Varredura de triagem enfileirada", {
          description: "O daemon do navegador vai processar — acompanhe em /admin/daemon.",
        });
    },
    onError: (e) => toast.error(`Não deu para enfileirar: ${e.message}`),
  });

  const onClick = () => enqueue.mutate(atribuicao ? { atribuicao } : {});
  const Icon = enqueue.isPending ? Loader2 : ScanLine;

  if (iconOnly) {
    return (
      <button
        type="button"
        aria-label="Varrer triagem"
        title="Varrer triagem (PJe)"
        disabled={enqueue.isPending}
        onClick={onClick}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-white/70 ring-1 ring-white/[0.06] transition-all duration-150 hover:bg-white/[0.14] hover:text-white disabled:opacity-50",
          className,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", enqueue.isPending && "animate-spin")} />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={enqueue.isPending}
      onClick={onClick}
      className={cn("h-8 gap-1.5 text-xs cursor-pointer", className)}
    >
      <Icon className={cn("h-3.5 w-3.5", enqueue.isPending && "animate-spin")} />
      Varrer triagem
    </Button>
  );
}
