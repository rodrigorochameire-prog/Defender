"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { CalendarDays, Scale, MapPin, CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { statusAudienciaInfo } from "@/lib/config/design-tokens";

type Audiencia = {
  id: number;
  dataAudiencia: string | Date;
  tipo: string | null;
  local: string | null;
  status: string | null;
  processoId: number | null;
};

function fmtDataHora(d: string | Date): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(".", "");
}

function diasAte(d: string | Date): number {
  const alvo = new Date(d).getTime();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje.getTime()) / 86_400_000);
}

function AudienciaRow({ a, futura }: { a: Audiencia; futura: boolean }) {
  const st = statusAudienciaInfo(a.status);
  const dias = diasAte(a.dataAudiencia);
  const proxima = futura && dias >= 0 && dias <= 7;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-2.5 py-2",
        proxima
          ? "border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/10"
          : "border-neutral-200/70 dark:border-white/[0.06] bg-neutral-50/60 dark:bg-white/[0.03]",
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarDays className={cn("h-3.5 w-3.5 shrink-0", futura ? "text-emerald-500" : "text-neutral-400")} />
        <span className="text-[12px] font-semibold text-foreground/90 tabular-nums">{fmtDataHora(a.dataAudiencia)}</span>
        {futura && dias >= 0 && (
          <span className={cn("text-[9.5px] font-medium tabular-nums", proxima ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
            {dias === 0 ? "hoje" : `em ${dias}d`}
          </span>
        )}
        <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold", st.cls)}>{st.label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5 text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground/70">{a.tipo ?? "Audiência"}</span>
        {a.local && (
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="h-2.5 w-2.5" /> {a.local}
          </span>
        )}
        {a.processoId && (
          <Link
            href={`/admin/processos/${a.processoId}`}
            className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Scale className="h-2.5 w-2.5" /> Processo
          </Link>
        )}
      </div>
    </div>
  );
}

export default function AudienciasPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { data: assistido, isLoading } = trpc.assistidos.getById.useQuery(
    { id },
    { enabled: !isNaN(id) },
  );

  const { futuras, passadas } = useMemo(() => {
    const all = (assistido?.audiencias ?? []) as Audiencia[];
    const agora = Date.now();
    const fut: Audiencia[] = [];
    const pas: Audiencia[] = [];
    for (const a of all) {
      const t = new Date(a.dataAudiencia).getTime();
      const cancelada = (a.status ?? "").toLowerCase().includes("cancel");
      if (t >= agora && !cancelada) fut.push(a);
      else pas.push(a);
    }
    fut.sort((x, y) => new Date(x.dataAudiencia).getTime() - new Date(y.dataAudiencia).getTime());
    pas.sort((x, y) => new Date(y.dataAudiencia).getTime() - new Date(x.dataAudiencia).getTime());
    return { futuras: fut, passadas: pas };
  }, [assistido?.audiencias]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  const total = futuras.length + passadas.length;

  return (
    <div className="p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <CalendarDays className="h-4 w-4 text-neutral-500" />
        Audiências
        <span className="text-[11px] font-normal text-neutral-400">
          {futuras.length} futura{futuras.length !== 1 ? "s" : ""} · {total} no total
        </span>
      </h2>

      {total === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 py-12 text-center">
          <CalendarClock className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Nenhuma audiência registrada.</p>
        </div>
      )}

      {futuras.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Próximas</p>
          {futuras.map((a) => <AudienciaRow key={a.id} a={a} futura />)}
        </div>
      )}

      {passadas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Realizadas / anteriores</p>
          {passadas.map((a) => <AudienciaRow key={a.id} a={a} futura={false} />)}
        </div>
      )}
    </div>
  );
}
