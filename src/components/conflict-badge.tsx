"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConflictListContent } from "@/components/conflicts/conflict-list-content";

/**
 * Indicador de conflitos de sincronização — apenas quando há pelo menos 1
 * pendente. Pequeno e neutro: ícone + número. Clicar abre um modal com a
 * lista de conflitos (mesmo conteúdo da página `/conflitos`), permitindo
 * resolver sem sair da página atual.
 */
export function ConflictBadge() {
  const [open, setOpen] = useState(false);
  const { data: count } = trpc.sync.conflictCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (!count || count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title={`${count} conflito${count > 1 ? "s" : ""} de sincronização`}
        >
          <AlertTriangle className="h-3 w-3 text-orange-500/80" />
          <span className="tabular-nums">{count}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Conflitos de Sincronização
            <Badge variant="outline" className="ml-1 tabular-nums">
              {count} pendente{count > 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Resolva sem sair da página. A versão mais recente fica destacada.
          </DialogDescription>
        </DialogHeader>
        <ConflictListContent />
      </DialogContent>
    </Dialog>
  );
}
