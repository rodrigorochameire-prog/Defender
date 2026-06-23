"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import {
  Briefcase, Plus, Gavel, CalendarDays, Clock, ChevronRight,
  Layers, FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  statusCasoInfo, prioridadeCasoInfo, pesoPrioridadeCaso,
  situacaoProcessoInfo, getAtribuicaoColors,
} from "@/lib/config/tipologia";

type ProcessoSist = {
  id: number;
  numeroAutos: string;
  area: string;
  atribuicao: string | null;
  situacao: string | null;
  fase: string | null;
  isJuri: boolean | null;
  vara: string | null;
  comarca: string | null;
  assunto: string | null;
  classeProcessual: string | null;
  proximaAudiencia: { data: string | Date; tipo: string | null } | null;
  proximoPrazo: { data: string; ato: string | null } | null;
};

const MS_DIA = 86_400_000;

function diasAte(d: string | Date): number {
  const alvo = new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00` : d);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / MS_DIA);
}

function fmtCurta(d: string | Date): string {
  const dt = new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function Badge({ info, className }: { info: { label: string; badge: string }; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-px text-[9.5px] font-medium", info.badge, className)}>
      {info.label}
    </span>
  );
}

function ProcessoRow({ p }: { p: ProcessoSist }) {
  const atrib = getAtribuicaoColors(p.atribuicao ?? p.area);
  const sit = situacaoProcessoInfo(p.situacao);
  const pz = p.proximoPrazo ? diasAte(p.proximoPrazo.data) : null;
  const pzCor = pz === null ? "" : pz <= 3 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: atrib.color }} title={atrib.label} />
        <Link
          href={`/admin/processos/${p.id}`}
          className="font-mono text-[11px] tabular-nums text-foreground/90 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
        >
          {p.numeroAutos}
        </Link>
        {p.isJuri && <Gavel className="h-3 w-3 shrink-0 text-emerald-500" aria-label="Júri" />}
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 text-[9.5px] font-medium" style={{ color: atrib.color }}>
            {atrib.shortLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", sit.dot)} />
            <span className="text-[9.5px] text-muted-foreground">{sit.label}</span>
          </span>
        </span>
      </div>

      {p.assunto && (
        <p className="truncate text-[10.5px] text-muted-foreground">{p.assunto}</p>
      )}

      {(p.proximaAudiencia || p.proximoPrazo || p.vara) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-muted-foreground">
          {p.proximaAudiencia && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="h-2.5 w-2.5" />
              {p.proximaAudiencia.tipo ?? "Audiência"} · {fmtCurta(p.proximaAudiencia.data)}
            </span>
          )}
          {p.proximoPrazo && (
            <span className={cn("inline-flex items-center gap-1", pzCor)}>
              <Clock className="h-2.5 w-2.5" />
              {p.proximoPrazo.ato ? `${p.proximoPrazo.ato} · ` : "Prazo "}
              {fmtCurta(p.proximoPrazo.data)}
              {pz !== null && pz <= 3 ? ` (${pz}d)` : ""}
            </span>
          )}
          {p.vara && <span className="truncate">{p.vara}</span>}
        </div>
      )}
    </div>
  );
}

export default function CasosListPage() {
  const params = useParams();
  const assistidoId = Number(params?.id);
  const { data, isLoading } = trpc.casos.getCasosComProcessos.useQuery(
    { assistidoId },
    { enabled: !isNaN(assistidoId) },
  );

  const casos = useMemo(() => {
    const list = data?.casos ?? [];
    // Ordena por urgência da prioridade, depois por atualização (já vem desc).
    return [...list].sort((a, b) => pesoPrioridadeCaso(b.prioridade) - pesoPrioridadeCaso(a.prioridade));
  }, [data?.casos]);
  const semCaso = data?.semCaso ?? [];
  const totalProcessos = casos.reduce((n, c) => n + c.processos.length, 0) + semCaso.length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <Briefcase className="h-4 w-4 text-neutral-500" />
          Casos
          <span className="text-[11px] font-normal text-neutral-400">
            {casos.length} caso{casos.length !== 1 ? "s" : ""} · {totalProcessos} processo{totalProcessos !== 1 ? "s" : ""}
          </span>
        </h2>
        <Link
          href={`/admin/assistidos/${assistidoId}/casos/novo`}
          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Plus className="h-3 w-3" /> Novo caso
        </Link>
      </div>

      {casos.length === 0 && semCaso.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <Briefcase className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Nenhum caso cadastrado.</p>
        </div>
      )}

      {casos.map((c) => {
        const st = statusCasoInfo(c.status);
        const pr = prioridadeCasoInfo(c.prioridade);
        const atrib = getAtribuicaoColors(c.atribuicao);
        return (
          <section
            key={c.id}
            className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 border-l-2 px-3.5 pt-3 pb-2.5" style={{ borderColor: atrib.color }}>
              <Link
                href={`/admin/assistidos/${assistidoId}/caso/${c.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 group"
              >
                <span className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {c.titulo}
                </span>
                {c.codigo && (
                  <span className="shrink-0 font-mono text-[10px] text-neutral-400">{c.codigo}</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-emerald-500 transition-colors" />
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {c.prioridade && pesoPrioridadeCaso(c.prioridade) >= 4 && <Badge info={pr} />}
                <Badge info={st} />
              </div>
            </div>

            <div className="space-y-1.5 px-3.5 pb-3">
              {c.processos.length > 0 ? (
                c.processos.map((p) => <ProcessoRow key={p.id} p={p as ProcessoSist} />)
              ) : (
                <p className="flex items-center gap-1.5 py-1 text-[11px] italic text-neutral-400">
                  <FileText className="h-3 w-3" /> Sem processo vinculado a este caso.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {semCaso.length > 0 && (
        <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1.5 px-3.5 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            <Layers className="h-3 w-3" /> Sem caso vinculado
            <span className="font-normal normal-case text-neutral-400">· {semCaso.length}</span>
          </div>
          <div className="space-y-1.5 px-3.5 pb-3">
            {(semCaso as ProcessoSist[]).map((p) => <ProcessoRow key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
