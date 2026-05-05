"use client";

import { useMemo, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [busca, setBusca] = useState("");

  const { data: registrosRaw = [], refetch } = trpc.registros.list.useQuery({
    assistidoId,
    processoId,
    demandaId,
    audienciaId,
    tipo: filtroTipo ?? undefined,
  });

  // Filtragem textual client-side (rápida — registros por demanda raramente >50).
  // Faz match case-insensitive em título + conteúdo. Quando vazio, retorna tudo.
  const registros = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return registrosRaw;
    return registrosRaw.filter((r: any) =>
      ((r.titulo || "") + " " + (r.conteudo || "")).toLowerCase().includes(q)
    );
  }, [registrosRaw, busca]);

  const deleteMut = trpc.registros.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const tiposEscopo = tiposPermitidos ?? TIPO_KEYS;

  // Para mostrar contagens reais, sempre listamos *todos* os registros do
  // contexto sem filtro, e dividimos em chips de tipos com count > 0.
  const { data: registrosTodos = [] } = trpc.registros.list.useQuery({
    assistidoId,
    processoId,
    demandaId,
    audienciaId,
  });

  const counts = useMemo(() => {
    const c = new Map<TipoRegistro, number>();
    registrosTodos.forEach((r) => {
      const t = r.tipo as TipoRegistro;
      c.set(t, (c.get(t) ?? 0) + 1);
    });
    return c;
  }, [registrosTodos]);

  const tiposUsados = tiposEscopo.filter((t) => (counts.get(t) ?? 0) > 0);
  const tiposExtras = tiposEscopo.filter((t) => (counts.get(t) ?? 0) === 0);
  const filtroAtivoEhExtra = filtroTipo && !tiposUsados.includes(filtroTipo);

  return (
    <div className="space-y-3">
      {/* Busca textual — filtra por título/conteúdo. Atalho Cmd/Ctrl+K
          foca este campo de qualquer lugar do sheet (data-registros-search). */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nos registros…"
          data-registros-search="true"
          className={cn(
            "w-full bg-neutral-50 dark:bg-neutral-800/40",
            "border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700",
            "rounded-md text-[12px] pl-7 pr-7 py-1.5 outline-none",
            "placeholder:text-neutral-400 transition-colors",
          )}
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Filtro em linha única — Todos + tipos com registros + dropdown "+" para os demais */}
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
          Todos {registrosTodos.length > 0 && <span className="opacity-50">· {registrosTodos.length}</span>}
        </button>
        {tiposUsados.map((t) => {
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
              <span>{cfg.shortLabel}</span>
              <span className="opacity-50">· {count}</span>
            </button>
          );
        })}
        {/* Chip do filtro atual quando o tipo não tem registros (raro, mas mantemos visível) */}
        {filtroAtivoEhExtra && filtroTipo && (
          <button
            type="button"
            onClick={() => setFiltroTipo(null)}
            className="text-[11px] px-2 py-1 rounded-md font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex items-center gap-1"
            style={{ color: REGISTRO_TIPOS[filtroTipo].color }}
          >
            {(() => {
              const Icon = REGISTRO_TIPOS[filtroTipo].Icon;
              return <Icon className="w-3 h-3" />;
            })()}
            <span>{REGISTRO_TIPOS[filtroTipo].shortLabel}</span>
            <span className="opacity-50">· 0</span>
          </button>
        )}
        {tiposExtras.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-[11px] px-1.5 py-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Filtrar por outros tipos"
                aria-label="Mais filtros"
              >
                <ListFilter className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              {tiposExtras.map((t) => {
                const cfg = REGISTRO_TIPOS[t];
                const Icon = cfg.Icon;
                return (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => setFiltroTipo(t)}
                    className="text-[12px] gap-2"
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    <span>{cfg.label}</span>
                    <span className="ml-auto text-neutral-400">0</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Lista */}
      {registros.length === 0 ? (
        <p className="text-[12px] text-neutral-400 dark:text-neutral-500 px-1 py-3">
          {busca
            ? `Nenhum registro com "${busca}".`
            : (emptyHint ?? "Nenhum registro ainda.")}
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
