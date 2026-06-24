"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, Eye, FileSignature, PenLine, CheckSquare, MapPin, BookOpen,
  Search, Microscope, Send, ArrowRightLeft, StickyNote, MessageSquare,
  Gavel, Sparkles, GitBranch, CalendarClock, ChevronRight, Scale, type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import {
  FAMILIA_CONFIG, FAMILIAS_ORDEM, iconeDoTipo,
  type Familia,
} from "@/lib/registros/tipologia";

// Resolve nome-de-ícone (string da tipologia) → componente Lucide.
const ICONES: Record<string, LucideIcon> = {
  Users, Eye, FileSignature, PenLine, CheckSquare, MapPin, BookOpen,
  Search, Microscope, Send, ArrowRightLeft, StickyNote, MessageSquare, Gavel,
};

export type ItemFeed = {
  id: string;
  origem: "registro" | "demanda-evento" | "audiencia";
  tipo: string;
  familia: Familia;
  rotulo: string;
  data: string;
  titulo: string | null;
  resumo: string | null;
  status: string | null;
  prazo: string | null;
  links: { demandaId: number | null; audienciaId: number | null; processoId: number | null };
  temDados: boolean;
  autorId: number | null;
  autorNome?: string | null;
};

const MS_DIA = 86_400_000;

/** Data compacta e relativa: "hoje", "ontem", "há 3 d", senão "23 jun" (+ano se outro). */
function dataCompacta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const agora = new Date();
  const dias = Math.floor((agora.getTime() - d.getTime()) / MS_DIA);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias > 1 && dias <= 6) return `há ${dias} d`;
  const mesmoAno = d.getFullYear() === agora.getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(mesmoAno ? {} : { year: "2-digit" }),
  }).replace(".", "");
}

function dataLonga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_COR: Record<string, string> = {
  pendente: "text-amber-600 dark:text-amber-400",
  agendado: "text-blue-600 dark:text-blue-400",
  agendada: "text-blue-600 dark:text-blue-400",
  feita: "text-emerald-600 dark:text-emerald-400",
  realizado: "text-emerald-600 dark:text-emerald-400",
  realizada: "text-emerald-600 dark:text-emerald-400",
  cancelado: "text-neutral-400 line-through",
  cancelada: "text-neutral-400 line-through",
};

const ORIGEM_LABEL: Record<ItemFeed["origem"], string> = {
  registro: "Registro",
  "demanda-evento": "Demanda",
  audiencia: "Audiência",
};

function prazoInfo(prazo: string): { label: string; cor: string } | null {
  const d = new Date(`${prazo}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dias = Math.ceil((d.getTime() - Date.now()) / MS_DIA);
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  if (dias < 0) return { label: `venceu ${data}`, cor: "text-red-600 dark:text-red-400" };
  if (dias <= 3) return { label: `vence ${data}`, cor: "text-amber-600 dark:text-amber-400" };
  return { label: `prazo ${data}`, cor: "text-muted-foreground" };
}

/** Abrevia o CNJ para a etiqueta da ação penal (ex.: "8003969-75"). */
function abreviarCNJ(numeroAutos: string): string {
  return numeroAutos.split(".")[0] || numeroAutos;
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[9px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-200/50 dark:bg-white/[0.06] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
    >
      {label}
      <ChevronRight className="w-2.5 h-2.5" />
    </Link>
  );
}

export function FeedRow({ item, procNumero }: { item: ItemFeed; procNumero?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const fam = FAMILIA_CONFIG[item.familia];
  const Icone = ICONES[iconeDoTipo(item.origem, item.tipo)] ?? StickyNote;
  const titulo = item.titulo?.trim() || item.rotulo;
  const resumo = item.resumo?.trim() || null;
  const temResumoLongo = !!resumo && resumo.length > 90;
  const statusCor = item.status ? STATUS_COR[item.status] ?? "text-muted-foreground" : null;
  const pz = item.prazo ? prazoInfo(item.prazo) : null;

  return (
    <li
      onClick={() => temResumoLongo && setAberto((v) => !v)}
      className={`group relative flex gap-2.5 rounded-lg border border-neutral-200/70 dark:border-white/[0.06] bg-neutral-100/50 dark:bg-white/[0.03] px-2.5 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-white/[0.06] ${temResumoLongo ? "cursor-pointer" : ""}`}
    >
      {/* Trilho de família + ícone */}
      <div className="flex flex-col items-center pt-0.5">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-inset ring-black/5 dark:ring-white/10"
          style={{ backgroundColor: `${fam.cor}1a`, color: fam.cor }}
          title={fam.label}
        >
          <Icone className="h-3 w-3" />
        </span>
      </div>

      {/* Corpo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[11.5px] font-medium text-foreground/90">{titulo}</span>
          {item.temDados && (
            <Sparkles className="h-3 w-3 shrink-0 text-emerald-500/80" aria-label="dados estruturados" />
          )}
          <span className="ml-auto shrink-0 text-[9.5px] tabular-nums text-muted-foreground" title={dataLonga(item.data)}>
            {dataCompacta(item.data)}
          </span>
        </div>

        {resumo && (
          <p className={`mt-0.5 text-[10.5px] leading-snug text-muted-foreground ${aberto ? "" : "line-clamp-1"}`}>
            {resumo}
          </p>
        )}

        {/* Meta: tipo · autor · status · prazo · links */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide" style={{ color: fam.cor }}>
            {item.rotulo}
          </span>
          {item.autorNome && <span className="truncate max-w-[120px]">· {item.autorNome}</span>}
          {statusCor && <span className={`font-medium ${statusCor}`}>· {item.status}</span>}
          {pz && <span className={`inline-flex items-center gap-0.5 font-medium ${pz.cor}`}><CalendarClock className="h-2.5 w-2.5" />{pz.label}</span>}

          <span className="ml-auto inline-flex items-center gap-1">
            {item.links.demandaId && <LinkChip href={`/admin/demandas/${item.links.demandaId}`} label="Demanda" />}
            {item.origem === "audiencia"
              ? <LinkChip href="/admin/audiencias" label="Audiências" />
              : item.links.audienciaId && <LinkChip href="/admin/audiencias" label="Audiência" />}
            {item.links.processoId && (
              <Link
                href={`/admin/processos/${item.links.processoId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[9px] font-medium font-mono tabular-nums text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                title={procNumero ? `Ação penal ${procNumero}` : "Abrir processo"}
              >
                <Scale className="h-2.5 w-2.5" />
                {procNumero ? abreviarCNJ(procNumero) : "Processo"}
              </Link>
            )}
          </span>
        </div>
      </div>
    </li>
  );
}

export function FeedUnificado({ assistidoId, emptyHint }: { assistidoId: number; emptyHint?: string }) {
  const [familia, setFamilia] = useState<Familia | "tudo">("tudo");
  const { data, isLoading } = trpc.registros.feedUnificado.useQuery(
    { assistidoId },
    { staleTime: 30_000 }
  );

  const itens = useMemo(() => (data ?? []) as ItemFeed[], [data]);

  // Mapa processoId → nº dos autos, para rotular cada item pela ação penal
  // (um assistido pode ter mais de um processo). getById é cacheado.
  const { data: assistido } = trpc.assistidos.getById.useQuery({ id: assistidoId });
  const procNumeros = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of assistido?.processos ?? []) if (p.numeroAutos) m.set(p.id, p.numeroAutos);
    return m;
  }, [assistido?.processos]);

  // Contagem por família (só famílias presentes viram filtro).
  const contagem = useMemo(() => {
    const c = new Map<Familia, number>();
    for (const it of itens) c.set(it.familia, (c.get(it.familia) ?? 0) + 1);
    return c;
  }, [itens]);

  const familiasPresentes = FAMILIAS_ORDEM.filter((f) => contagem.has(f));
  const filtrados = familia === "tudo" ? itens : itens.filter((i) => i.familia === familia);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
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

  return (
    <div className="space-y-2.5">
      {/* Filtros por família */}
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

      <ul className="space-y-1">
        {filtrados.map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            procNumero={item.links.processoId ? procNumeros.get(item.links.processoId) ?? null : null}
          />
        ))}
      </ul>
    </div>
  );
}

export function FiltroPill({
  ativo, onClick, cor, label, count,
}: { ativo: boolean; onClick: () => void; cor: string; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
        ativo
          ? "text-white dark:text-neutral-900"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-white/5"
      }`}
      style={ativo ? { backgroundColor: cor } : undefined}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${ativo ? "opacity-80" : "opacity-60"}`}>{count}</span>
    </button>
  );
}
