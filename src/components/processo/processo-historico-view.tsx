"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { EventLine, type EventoLine } from "@/components/demanda-eventos/event-line";
import { LIST_ITEM } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

export function ProcessoHistoricoView({ processoId }: { processoId: number }) {
  const { data, isLoading, isError } = trpc.demandaEventos.historicoByProcessoId.useQuery({
    processoId,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(LIST_ITEM.container, "cursor-default")}>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3 mt-1.5" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Não foi possível carregar o histórico
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum evento registrado ainda. Adicione atendimentos, diligências ou observações pela página da demanda.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {data.map((row) => {
        const evento: EventoLine = {
          id: row.evento.id,
          tipo: row.evento.tipo,
          subtipo: row.evento.subtipo as EventoLine["subtipo"],
          status: row.evento.status as EventoLine["status"],
          resumo: row.evento.resumo,
          prazo: row.evento.prazo,
          createdAt: row.evento.createdAt,
        };
        return (
          <div key={row.evento.id} className={cn(LIST_ITEM.container, "cursor-default")}>
            <EventLine evento={evento} />
            <div className="mt-1 flex items-center gap-1.5 pl-[18px] text-[10px] text-muted-foreground">
              <Link
                href={`/admin/demandas/${row.demanda.id}`}
                className="hover:text-foreground/80 hover:underline truncate"
              >
                Demanda: {row.demanda.ato ?? "—"}
              </Link>
              {row.autor?.name && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="truncate opacity-70">{row.autor.name}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
