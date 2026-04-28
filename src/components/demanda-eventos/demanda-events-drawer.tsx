"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { EventLine, type EventoLine } from "@/components/demanda-eventos/event-line";

type Tab = "timeline" | "pendentes" | "atendimentos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  demandaId: number | null;
}

function toEventoLine(evento: any): EventoLine {
  return {
    id: evento.id,
    tipo: evento.tipo,
    subtipo: evento.subtipo ?? null,
    status: evento.status ?? null,
    resumo: evento.resumo,
    prazo: evento.prazo ?? null,
    createdAt: evento.createdAt ?? evento.created_at,
  };
}

export function DemandaEventsDrawer({ isOpen, onClose, demandaId }: Props) {
  const [tab, setTab] = useState<Tab>("timeline");

  const enabled = isOpen && demandaId !== null;

  const { data: lista, isLoading } = trpc.demandaEventos.list.useQuery(
    { demandaId: demandaId ?? 0, limit: 100 },
    { enabled, staleTime: 5_000 },
  );

  // Header context — getById returns a flat object with `processo` (singular)
  // and `assistido.nome`. There is no `nomeAdotado` on this query.
  const { data: demanda } = trpc.demandas.getById.useQuery(
    { id: demandaId ?? 0 },
    { enabled },
  );

  if (!isOpen) return null;

  const items = lista?.items ?? [];
  const filteredItems =
    tab === "timeline"
      ? items
      : tab === "pendentes"
        ? items.filter(
            (i: any) => i.evento.tipo === "diligencia" && i.evento.status === "pendente",
          )
        : items.filter((i: any) => i.evento.tipo === "atendimento");

  const assistidoNome =
    (demanda as any)?.assistido?.nomeAdotado ??
    (demanda as any)?.assistido?.nome ??
    (demandaId ? `Demanda #${demandaId}` : "Carregando…");
  const processoNumero =
    (demanda as any)?.processo?.numeroAutos ??
    (demanda as any)?.processos?.[0]?.numero ??
    "—";
  const atoLabel = (demanda as any)?.ato ?? "—";

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 99990,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "480px",
          zIndex: 99991,
        }}
        className="bg-white dark:bg-neutral-900 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-foreground tracking-tight truncate">
              {assistidoNome}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {processoNumero} · {atoLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-2 border-b border-neutral-200/60 dark:border-neutral-800/60 flex gap-1">
          {(["timeline", "pendentes", "atendimentos"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-t-md transition-colors ${
                tab === t
                  ? "text-emerald-600 border-b-2 border-emerald-600 -mb-[1px]"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
              }`}
            >
              {t === "timeline"
                ? "Timeline"
                : t === "pendentes"
                  ? "Pendentes"
                  : "Atendimentos"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="text-[11px] text-muted-foreground text-center py-8">
              Carregando…
            </div>
          )}
          {!isLoading && filteredItems.length === 0 && (
            <div className="text-[11px] text-muted-foreground text-center py-8">
              {tab === "timeline"
                ? "Sem eventos ainda. Use o botão + abaixo."
                : tab === "pendentes"
                  ? "Sem diligências pendentes."
                  : "Sem atendimentos vinculados."}
            </div>
          )}
          {filteredItems.map(({ evento, autor }: any) => (
            <div
              key={evento.id}
              className="p-2.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 transition-all"
            >
              <EventLine
                evento={toEventoLine(evento)}
                variant={
                  evento.tipo === "diligencia" && evento.status === "pendente"
                    ? "pendente"
                    : "default"
                }
              />
              {evento.descricao && (
                <p className="mt-1 text-[10px] text-muted-foreground pl-5 break-words">
                  {evento.descricao}
                </p>
              )}
              {autor?.name && (
                <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5 pl-5 tabular-nums">
                  por {autor.name}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FAB stub — Task 12 will replace with full menu */}
        <button
          type="button"
          onClick={() => {
            // TODO Task 12: open registration menu
            alert("Registrar novo evento — implementação na Task 12");
          }}
          aria-label="Registrar novo evento"
          className="absolute bottom-6 right-6 size-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center text-2xl leading-none"
        >
          +
        </button>
      </div>
    </>
  );
}
