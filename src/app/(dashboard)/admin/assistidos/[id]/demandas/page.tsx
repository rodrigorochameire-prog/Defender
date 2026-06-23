"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { ClipboardList, Scale, Clock, Plus, User } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Demanda = {
  id: number;
  ato: string | null;
  tipoAto: string | null;
  status: string | null;
  prazo: string | null;
  processoId: number | null;
  defensorNome: string | null;
};

const STATUS_CONCLUIDO = new Set(["CONCLUIDO", "ARQUIVADO"]);
const MS_DIA = 86_400_000;

function diasAte(prazo: string): number {
  const d = new Date(`${prazo}T12:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoje.getTime()) / MS_DIA);
}

function fmtPrazo(prazo: string): string {
  const d = new Date(`${prazo}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function DemandaRow({ d, aberta }: { d: Demanda; aberta: boolean }) {
  const dias = d.prazo ? diasAte(d.prazo) : null;
  const venc = dias !== null && dias < 0;
  const urge = dias !== null && dias >= 0 && dias <= 7;
  const corPrazo = !aberta
    ? "text-muted-foreground"
    : venc
      ? "text-rose-600 dark:text-rose-400"
      : urge
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";

  return (
    <Link
      href={`/admin/demandas/${d.id}`}
      className="flex flex-col gap-1 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03] px-2.5 py-2 hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", aberta ? "bg-amber-500" : "bg-neutral-300 dark:bg-neutral-600")} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground/90">{d.ato ?? "Demanda"}</span>
        {d.status && (
          <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{d.status}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4 text-[9.5px] text-muted-foreground">
        {d.prazo && (
          <span className={cn("inline-flex items-center gap-1 font-medium", corPrazo)}>
            <Clock className="h-2.5 w-2.5" />
            {fmtPrazo(d.prazo)}
            {aberta && dias !== null ? (venc ? ` · ${Math.abs(dias)}d atraso` : dias === 0 ? " · hoje" : ` · ${dias}d`) : ""}
          </span>
        )}
        {d.defensorNome && (
          <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
            <User className="h-2.5 w-2.5" /> {d.defensorNome}
          </span>
        )}
        {d.processoId && (
          <span className="inline-flex items-center gap-1">
            <Scale className="h-2.5 w-2.5" /> Processo
          </span>
        )}
      </div>
    </Link>
  );
}

export default function DemandasPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data: assistido, isLoading } = trpc.assistidos.getById.useQuery(
    { id },
    { enabled: !isNaN(id) },
  );

  const { abertas, concluidas } = useMemo(() => {
    const all = (assistido?.demandas ?? []) as Demanda[];
    const ab: Demanda[] = [];
    const co: Demanda[] = [];
    for (const d of all) {
      if (STATUS_CONCLUIDO.has(String(d.status ?? "").toUpperCase())) co.push(d);
      else ab.push(d);
    }
    // Abertas por prazo mais próximo; sem prazo ao final.
    ab.sort((a, b) => {
      const da = a.prazo ? diasAte(a.prazo) : 99999;
      const db = b.prazo ? diasAte(b.prazo) : 99999;
      return da - db;
    });
    return { abertas: ab, concluidas: co };
  }, [assistido?.demandas]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  const total = abertas.length + concluidas.length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <ClipboardList className="h-4 w-4 text-neutral-500" />
          Demandas
          <span className="text-[11px] font-normal text-neutral-400">
            {abertas.length} em aberto · {total} no total
          </span>
        </h2>
        <Link
          href={`/admin/demandas/nova?assistidoId=${id}`}
          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Plus className="h-3 w-3" /> Nova demanda
        </Link>
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <ClipboardList className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Nenhuma demanda registrada.</p>
        </div>
      )}

      {abertas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Em aberto</p>
          {abertas.map((d) => <DemandaRow key={d.id} d={d} aberta />)}
        </div>
      )}

      {concluidas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Concluídas / arquivadas</p>
          {concluidas.map((d) => <DemandaRow key={d.id} d={d} aberta={false} />)}
        </div>
      )}
    </div>
  );
}
