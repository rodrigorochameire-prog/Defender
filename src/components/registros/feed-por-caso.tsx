"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Scale, ChevronDown, ChevronRight, GitBranch, Briefcase,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { FAMILIA_CONFIG, FAMILIAS_ORDEM, type Familia } from "@/lib/registros/tipologia";
import { FeedRow, FiltroPill, type ItemFeed } from "./feed-unificado";
import { statusCasoInfo, pesoPrioridadeCaso, getAtribuicaoColors } from "@/lib/config/tipologia";
import { getTipoProcessoLabel } from "@/config/tipos-processo";
import { cn } from "@/lib/utils";

/** Subconjunto de `casosAgrupados` (assistidos.getById) necessário ao agrupamento. */
export type CasoAgrupado = {
  id: number;
  titulo: string;
  status: string | null;
  atribuicao: string | null;
  prioridade: string | null;
  processos: {
    id: number;
    numeroAutos: string | null;
    tipoProcesso: string | null;
    isReferencia: boolean | null;
  }[];
};

function abreviarCNJ(n: string | null): string {
  if (!n) return "";
  return n.split(".")[0] || n;
}

/** Cabeçalho de um caso: título, processo principal e siglas dos associados. */
function CasoHeader({
  caso, total, aberto, onToggle, assistidoId,
}: {
  caso: CasoAgrupado;
  total: number;
  aberto: boolean;
  onToggle: () => void;
  assistidoId: number;
}) {
  const atrib = getAtribuicaoColors(caso.atribuicao);
  const st = statusCasoInfo(caso.status);
  const principal = caso.processos.find((p) => p.isReferencia) ?? caso.processos[0];
  const associados = caso.processos.filter((p) => p.id !== principal?.id);

  return (
    <div className="flex items-center gap-2 px-2.5 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
        aria-expanded={aberto}
      >
        {aberto ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        )}
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: atrib.color }} title={atrib.label} />
        <span className="truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
          {caso.titulo}
        </span>

        {/* Processo principal */}
        {principal?.numeroAutos && (
          <span
            className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-px font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            title={`Principal · ${getTipoProcessoLabel(principal.tipoProcesso ?? "AP")}`}
          >
            <Scale className="h-2.5 w-2.5" />
            {abreviarCNJ(principal.numeroAutos)}
          </span>
        )}

        {/* Associados (siglas) */}
        {associados.length > 0 && (
          <span className="hidden md:inline-flex shrink-0 items-center gap-1">
            {associados.slice(0, 3).map((p) => (
              <span
                key={p.id}
                className="rounded bg-neutral-200/70 dark:bg-white/[0.08] px-1.5 py-px text-[9px] font-medium text-neutral-600 dark:text-neutral-300"
                title={`${getTipoProcessoLabel(p.tipoProcesso ?? "AP")}${p.numeroAutos ? ` · ${abreviarCNJ(p.numeroAutos)}` : ""}`}
              >
                {p.tipoProcesso ?? "—"}
              </span>
            ))}
            {associados.length > 3 && (
              <span className="text-[9px] text-neutral-400">+{associados.length - 3}</span>
            )}
          </span>
        )}
      </button>

      <span className={cn("shrink-0 rounded px-1.5 py-px text-[9.5px] font-medium", st.badge)}>{st.label}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">{total}</span>
      <Link
        href={`/admin/assistidos/${assistidoId}/caso/${caso.id}`}
        className="shrink-0 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
      >
        abrir
      </Link>
    </div>
  );
}

/**
 * Linha do tempo agrupada por Caso (ação penal principal + associados).
 * Consome o mesmo feed unificado, mas particiona os itens pelo caso a que o
 * processo de cada item pertence. Itens sem processo/caso vão para "Sem caso".
 */
export function FeedPorCaso({
  assistidoId,
  casos,
  emptyHint,
}: {
  assistidoId: number;
  casos: CasoAgrupado[];
  emptyHint?: string;
}) {
  const [familia, setFamilia] = useState<Familia | "tudo">("tudo");
  const [fechados, setFechados] = useState<Set<string>>(new Set());

  const { data, isLoading } = trpc.registros.feedUnificado.useQuery(
    { assistidoId },
    { staleTime: 30_000 },
  );
  const itens = useMemo(() => (data ?? []) as ItemFeed[], [data]);

  // Mapa processoId → caso, e processoId → nº autos (para rótulo da linha).
  const { procToCaso, procNumeros } = useMemo(() => {
    const pc = new Map<number, CasoAgrupado>();
    const pn = new Map<number, string>();
    for (const c of casos) {
      for (const p of c.processos) {
        pc.set(p.id, c);
        if (p.numeroAutos) pn.set(p.id, p.numeroAutos);
      }
    }
    return { procToCaso: pc, procNumeros: pn };
  }, [casos]);

  // Contagem por família (para os filtros).
  const contagem = useMemo(() => {
    const c = new Map<Familia, number>();
    for (const it of itens) c.set(it.familia, (c.get(it.familia) ?? 0) + 1);
    return c;
  }, [itens]);
  const familiasPresentes = FAMILIAS_ORDEM.filter((f) => contagem.has(f));
  const filtrados = familia === "tudo" ? itens : itens.filter((i) => i.familia === familia);

  // Particiona itens por caso (ou "sem-caso").
  const grupos = useMemo(() => {
    const porCaso = new Map<string, ItemFeed[]>();
    for (const it of filtrados) {
      const pid = it.links.processoId;
      const caso = pid != null ? procToCaso.get(pid) : undefined;
      const chave = caso ? `caso-${caso.id}` : "sem-caso";
      const arr = porCaso.get(chave) ?? [];
      arr.push(it);
      porCaso.set(chave, arr);
    }
    // Ordena casos por prioridade desc, depois por atividade mais recente.
    const ordenados = [...casos]
      .filter((c) => porCaso.has(`caso-${c.id}`))
      .sort((a, b) => {
        const pp = pesoPrioridadeCaso(b.prioridade) - pesoPrioridadeCaso(a.prioridade);
        if (pp !== 0) return pp;
        const ra = porCaso.get(`caso-${a.id}`)?.[0]?.data ?? "";
        const rb = porCaso.get(`caso-${b.id}`)?.[0]?.data ?? "";
        return rb.localeCompare(ra);
      });
    return { porCaso, ordenados, semCaso: porCaso.get("sem-caso") ?? [] };
  }, [filtrados, procToCaso, casos]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 dark:border-white/10 py-10 text-center">
        <GitBranch className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">{emptyHint ?? "Nenhuma atividade ainda."}</p>
      </div>
    );
  }

  const toggle = (k: string) =>
    setFechados((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const renderLista = (lista: ItemFeed[]) => (
    <ul className="space-y-1 px-2.5 pb-2.5">
      {lista.map((item) => (
        <FeedRow
          key={item.id}
          item={item}
          procNumero={item.links.processoId ? procNumeros.get(item.links.processoId) ?? null : null}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-3">
      {/* Filtros por família (globais) */}
      <div className="flex flex-wrap items-center gap-1">
        <FiltroPill ativo={familia === "tudo"} onClick={() => setFamilia("tudo")} cor="#10b981" label="Tudo" count={itens.length} />
        {familiasPresentes.map((f) => (
          <FiltroPill
            key={f}
            ativo={familia === f}
            onClick={() => setFamilia(f)}
            cor={FAMILIA_CONFIG[f].cor}
            label={FAMILIA_CONFIG[f].label}
            count={contagem.get(f) ?? 0}
          />
        ))}
      </div>

      {/* Grupos por caso */}
      <div className="space-y-2">
        {grupos.ordenados.map((c) => {
          const k = `caso-${c.id}`;
          const lista = grupos.porCaso.get(k) ?? [];
          const aberto = !fechados.has(k);
          return (
            <section
              key={k}
              className="rounded-xl border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/40 dark:bg-white/[0.02] overflow-hidden"
            >
              <CasoHeader caso={c} total={lista.length} aberto={aberto} onToggle={() => toggle(k)} assistidoId={assistidoId} />
              {aberto && renderLista(lista)}
            </section>
          );
        })}

        {/* Itens sem caso vinculado */}
        {grupos.semCaso.length > 0 && (
          <section className="rounded-xl border border-dashed border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/40 dark:bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button
                type="button"
                onClick={() => toggle("sem-caso")}
                className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
              >
                {fechados.has("sem-caso") ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                )}
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="text-[12.5px] font-medium text-neutral-600 dark:text-neutral-300">
                  Sem caso vinculado
                </span>
              </button>
              <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">{grupos.semCaso.length}</span>
            </div>
            {!fechados.has("sem-caso") && renderLista(grupos.semCaso)}
          </section>
        )}
      </div>
    </div>
  );
}
