"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { EncaminhamentoListItem, type EncaminhamentoListItemData } from "./EncaminhamentoListItem";
import { EncaminhamentoDetalhe } from "./EncaminhamentoDetalhe";
import { cn } from "@/lib/utils";
import type { EncaminhamentoTipo } from "./tipo-colors";

type Filtro = "recebidos" | "enviados" | "arquivados";

export function EncaminhamentosInbox() {
  const [filtro, setFiltro] = useState<Filtro>("recebidos");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = trpc.encaminhamentos.listar.useQuery({ filtro });

  const items: EncaminhamentoListItemData[] = (data?.items ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo as EncaminhamentoTipo,
    remetenteName: r.remetenteName ?? "Colega",
    titulo: r.titulo,
    mensagemPreview: (r.mensagem ?? "").slice(0, 160),
    createdAt: r.createdAt,
    status: r.status,
    urgencia: r.urgencia as "normal" | "urgente",
    unread: r.status === "pendente",
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-3 min-h-[560px]">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm shadow-black/[0.04] overflow-hidden flex flex-col">
        <div className="p-3 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <div className="inline-flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-[11px]">
            {(["recebidos", "enviados", "arquivados"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-all",
                  filtro === f
                    ? "bg-white dark:bg-neutral-900 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "recebidos" ? "Recebidos" : f === "enviados" ? "Enviados" : "Arquivados"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
          {!isLoading && items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Nada por aqui ainda.</div>
          )}
          {items.map((it) => (
            <EncaminhamentoListItem
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              onClick={() => setSelectedId(it.id)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm shadow-black/[0.04] overflow-hidden">
        {selectedId ? (
          <EncaminhamentoDetalhe id={selectedId} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Selecione um encaminhamento
          </div>
        )}
      </div>
    </div>
  );
}
