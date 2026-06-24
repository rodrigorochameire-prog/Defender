"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import {
  Briefcase, Plus, Gavel, CalendarDays, Clock, ChevronRight,
  Layers, FileText, Loader2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
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

/** CTA forte: cria um caso JÁ vinculado ao assistido a partir do processo órfão. */
function CriarCasoButton({
  processoId,
  assistidoId,
  tituloSugerido,
}: {
  processoId: number;
  assistidoId: number;
  tituloSugerido?: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const criar = trpc.casos.criarDeProcesso.useMutation({
    onSuccess: (caso) => {
      toast.success("Caso criado a partir do processo.");
      utils.casos.getCasosComProcessos.invalidate({ assistidoId });
      utils.assistidos.getById.invalidate({ id: assistidoId });
      router.push(`/admin/assistidos/${assistidoId}/caso/${caso.id}`);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <button
      type="button"
      disabled={criar.isPending}
      onClick={() => criar.mutate({ processoId, assistidoId, titulo: tituloSugerido })}
      className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
    >
      {criar.isPending ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
      Criar caso
    </button>
  );
}

function ProcessoRow({ p, criarCasoAssistidoId }: { p: ProcessoSist; criarCasoAssistidoId?: number }) {
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

      {criarCasoAssistidoId !== undefined && (
        <div className="flex justify-end pt-0.5">
          <CriarCasoButton
            processoId={p.id}
            assistidoId={criarCasoAssistidoId}
            tituloSugerido={p.assunto ?? undefined}
          />
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
      <div className="p-4 sm:p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
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
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 px-6 py-12 text-center">
          <Briefcase className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Nenhum caso ainda</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Casos agrupam processos relacionados do assistido para análise, teoria e estratégia
            conjuntas. Quando houver processos vinculados, você poderá organizá-los em casos aqui.
          </p>
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
        <section className="rounded-xl bg-amber-50/40 dark:bg-amber-950/10 ring-1 ring-amber-200/60 dark:ring-amber-900/30 shadow-sm overflow-hidden">
          <div className="flex items-start gap-2 px-3.5 pt-3 pb-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                <Layers className="h-3 w-3" /> Sem caso vinculado
                <span className="font-normal normal-case text-amber-600/70 dark:text-amber-500/70">
                  · {semCaso.length} processo{semCaso.length !== 1 ? "s" : ""}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-amber-700/80 dark:text-amber-300/70">
                Sem um caso, {semCaso.length === 1 ? "este processo fica" : "estes processos ficam"} fora da
                análise estrutural e da estratégia conjunta. Crie um caso para organizar a atuação.
              </p>
            </div>
          </div>
          <div className="space-y-1.5 px-3.5 pb-3">
            {(semCaso as ProcessoSist[]).map((p) => (
              <ProcessoRow key={p.id} p={p} criarCasoAssistidoId={assistidoId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
