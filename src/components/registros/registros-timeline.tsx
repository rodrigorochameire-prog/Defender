"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { RegistroCard, type RegistroCardData } from "./registro-card";
import {
  REGISTRO_TIPOS,
  TIPO_KEYS,
  type TipoRegistro,
} from "./registro-tipo-config";

interface Props {
  assistidoId?: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tiposPermitidos?: TipoRegistro[];
  emptyHint?: string;
  onEdit?: (id: number) => void;
}

export function RegistrosTimeline({
  assistidoId,
  processoId,
  demandaId,
  audienciaId,
  tiposPermitidos,
  emptyHint,
  onEdit,
}: Props) {
  const [filtroTipo, setFiltroTipo] = useState<TipoRegistro | null>(null);

  const { data: registros = [], refetch } = trpc.registros.list.useQuery({
    assistidoId,
    processoId,
    demandaId,
    audienciaId,
    tipo: filtroTipo ?? undefined,
  });

  const deleteMut = trpc.registros.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const tipos = tiposPermitidos ?? TIPO_KEYS;

  const counts = useMemo(() => {
    const c = new Map<TipoRegistro, number>();
    registros.forEach((r) => {
      const t = r.tipo as TipoRegistro;
      c.set(t, (c.get(t) ?? 0) + 1);
    });
    return c;
  }, [registros]);

  return (
    <div className="space-y-3">
      {/* Filtro por tipo — neutro por padrão, accent no ativo */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setFiltroTipo(null)}
          className={cn(
            "text-[11px] px-2 py-1 rounded-md font-medium transition-colors",
            !filtroTipo
              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
          )}
        >
          Todos {registros.length > 0 && <span className="opacity-50">· {registros.length}</span>}
        </button>
        {tipos.map((t) => {
          const cfg = REGISTRO_TIPOS[t];
          const isActive = filtroTipo === t;
          const count = counts.get(t) ?? 0;
          const Icon = cfg.Icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTipo(isActive ? null : t)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1",
                isActive
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
              style={isActive ? { color: cfg.color } : undefined}
            >
              <Icon className="w-3 h-3" />
              <span className={isActive ? undefined : ""}>{cfg.shortLabel}</span>
              {count > 0 && <span className="opacity-50">· {count}</span>}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {registros.length === 0 ? (
        <p className="text-[12px] text-neutral-400 dark:text-neutral-500 px-1 py-3">
          {emptyHint ?? "Nenhum registro ainda."}
        </p>
      ) : (
        <div className="space-y-2">
          {registros.map((r) => (
            <RegistroCard
              key={r.id}
              registro={r as RegistroCardData}
              onEdit={onEdit}
              onDelete={(id) => {
                if (confirm("Excluir este registro?")) {
                  deleteMut.mutate({ id });
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
