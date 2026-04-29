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
      {/* Filtro por tipo */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setFiltroTipo(null)}
          className={cn(
            "text-[11px] px-2 py-1 rounded-md font-medium transition-colors",
            !filtroTipo
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800",
          )}
        >
          Todos ({registros.length})
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
                  ? "ring-2 ring-offset-1 dark:ring-offset-neutral-900"
                  : "opacity-70 hover:opacity-100",
                cfg.bg,
                cfg.text,
              )}
              style={
                isActive
                  ? ({ ["--tw-ring-color"]: cfg.color } as React.CSSProperties)
                  : undefined
              }
            >
              <Icon className="w-3 h-3" />
              {cfg.shortLabel}
              {count > 0 && <span className="opacity-60">·{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {registros.length === 0 ? (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-500 italic px-1 py-4">
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
