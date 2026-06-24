"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  Scale,
  Clock,
  CalendarDays,
  AlertTriangle,
  FileText,
  FolderOpen,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { FeedPorCaso } from "@/components/registros/feed-por-caso";
import { AnaliseResumoCockpit } from "./_components/analise-resumo-cockpit";
import { AgruparCasosButton } from "./_components/agrupar-casos-button";
import { WhatsappAvisoButton } from "./_components/whatsapp-aviso-button";
import { DuplicataAlert } from "./_components/duplicata-alert";
import { FichaCompletude } from "./_components/ficha-completude";
import { UltimoContato } from "./_components/ultimo-contato";
import { WhatsappCockpitCard } from "./_components/whatsapp-cockpit-card";
import { HistoricoPenalBlock } from "@/components/assistidos/historico-penal-block";
import { ImmediateAttentionPanel } from "./_components/immediate-attention-panel";
import { toSnapshot, countProcessosSemCaso } from "@/lib/assistidos/state";
/** Editor inline de nota privada (auto-contido — não depende de componente externo). */
function NotaPrivadaInline({ assistidoId, initial }: { assistidoId: number; initial?: string }) {
  const [texto, setTexto] = useState(initial ?? "");
  const [sujo, setSujo] = useState(false);
  const salvar = trpc.assistidos.salvarNotaPrivada.useMutation({
    onSuccess: () => {
      setSujo(false);
      toast.success("Nota salva");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="space-y-2">
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setSujo(true);
        }}
        rows={4}
        placeholder="Anotação privada do defensor (não compartilhada)…"
        className="w-full rounded border border-border bg-transparent px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
      />
      {sujo && (
        <button
          type="button"
          onClick={() => salvar.mutate({ id: assistidoId, notaPrivada: texto || null })}
          disabled={salvar.isPending}
          className="rounded border px-3 py-1.5 text-xs cursor-pointer transition-colors hover:border-emerald-400 disabled:opacity-50"
        >
          {salvar.isPending ? "Salvando…" : "Salvar nota"}
        </button>
      )}
    </div>
  );
}
import { statusAudienciaInfo } from "@/lib/config/design-tokens";
import { statusCasoInfo, prioridadeCasoInfo, pesoPrioridadeCaso, getAtribuicaoColors } from "@/lib/config/tipologia";

/** Demandas em aberto = qualquer status que não seja CONCLUIDO/ARQUIVADO. */
const STATUS_CONCLUIDO = new Set(["CONCLUIDO", "ARQUIVADO"]);

function diasAte(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const alvo = new Date(d).getTime();
  if (Number.isNaN(alvo)) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo - hoje.getTime()) / 86_400_000);
}

function fmtData(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDataHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Idade em anos a partir da data de nascimento. */
function idadeDe(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const nasc = new Date(d);
  if (Number.isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return anos >= 0 && anos < 130 ? anos : null;
}

/** Dias decorridos desde uma data passada (para "preso há X dias"). */
function diasDesde(d: Date | string | null | undefined): number | null {
  const n = diasAte(d);
  return n === null ? null : Math.max(0, -n);
}

const NIVEL_STYLE: Record<"red" | "amber" | "emerald", { wrap: string; dot: string; chip: string; Icon: typeof AlertTriangle }> = {
  red: {
    wrap: "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40",
    dot: "bg-rose-500",
    chip: "text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40",
    Icon: ShieldAlert,
  },
  amber: {
    wrap: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40",
    dot: "bg-amber-500",
    chip: "text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40",
    Icon: AlertTriangle,
  },
  emerald: {
    wrap: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40",
    dot: "bg-emerald-500",
    chip: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
    Icon: Sparkles,
  },
};

/* ── Primitivos de seção ─────────────────────────────────────────── */

function CardShell({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: typeof Briefcase;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className={cn(title ? "px-4 pb-4" : "p-4")}>{children}</div>
    </section>
  );
}

function KpiPill({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  href,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: typeof Briefcase;
  tone?: "neutral" | "rose" | "amber" | "emerald" | "blue";
  href?: string;
  onClick?: () => void;
}) {
  const toneCls: Record<string, string> = {
    neutral: "text-neutral-500 dark:text-neutral-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
  };
  const body = (
    <div className="flex items-center gap-2.5 rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.06] px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer min-w-0">
      <Icon className={cn("w-4 h-4 shrink-0", toneCls[tone])} />
      <div className="min-w-0">
        <div className="text-sm font-bold leading-none tabular-nums text-neutral-800 dark:text-neutral-100">
          {value}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
          {label}
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{body}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="text-left">
        {body}
      </button>
    );
  return body;
}

/**
 * Nível 1 (Assistido) — aba "Geral": COCKPIT 360°.
 * Auto-redireciona pra caso ativo único quando aplicável (preservado).
 */
export default function AssistidoHubPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const { data: assistido, isLoading: loadingAssistido } = trpc.assistidos.getById.useQuery(
    { id },
    { enabled: !isNaN(id) },
  );
  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.getCasosDoAssistido.useQuery(
    { assistidoId: id },
    { enabled: !isNaN(id) },
  );
  const { data: alertas = [] } = trpc.assistidos.getAlertasInteligencia.useQuery(
    { assistidoId: id },
    { enabled: !isNaN(id) },
  );
  const { data: medidasVigentes = [] } = trpc.assistidos.getMedidasVigentes.useQuery(
    { assistidoId: id },
    { enabled: !isNaN(id) },
  );

  const casosAtivos = useMemo(() => casos.filter((c) => c.status === "ativo"), [casos]);

  useEffect(() => {
    if (loadingCasos) return;
    if (casosAtivos.length === 1) {
      router.replace(`/admin/assistidos/${id}/caso/${casosAtivos[0].id}`);
    }
  }, [loadingCasos, casosAtivos, id, router]);

  // ── Derivações de KPI/painéis ────────────────────────────────────
  const processos = useMemo(() => assistido?.processos ?? [], [assistido?.processos]);
  // Mapa processoId → nº dos autos (rótulo de notificações/links).
  const numeroPorProcesso = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of processos) if (p.numeroAutos) m.set(p.id, p.numeroAutos);
    return m;
  }, [processos]);
  const demandas = useMemo(() => assistido?.demandas ?? [], [assistido?.demandas]);
  const audiencias = useMemo(() => assistido?.audiencias ?? [], [assistido?.audiencias]);
  const driveFiles = useMemo(() => assistido?.driveFiles ?? [], [assistido?.driveFiles]);
  const casosAgrupados = useMemo(() => assistido?.casosAgrupados ?? [], [assistido?.casosAgrupados]);

  const demandasAbertas = useMemo(
    () => demandas.filter((d) => !STATUS_CONCLUIDO.has(String(d.status ?? "").toUpperCase())),
    [demandas],
  );

  const prazoMaisProximo = useMemo(() => {
    const dias = demandasAbertas
      .map((d) => diasAte(d.prazo))
      .filter((n): n is number => n !== null && n >= 0);
    return dias.length ? Math.min(...dias) : null;
  }, [demandasAbertas]);

  const prazoUrgente = prazoMaisProximo !== null && prazoMaisProximo <= 7;

  // Próximas demandas com prazo definido (ordem por proximidade) para o card.
  const proximasDemandas = useMemo(
    () =>
      demandasAbertas
        .filter((d) => d.prazo)
        .map((d) => ({ ...d, dias: diasAte(d.prazo) }))
        .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
        .slice(0, 4),
    [demandasAbertas],
  );

  const proximaAudiencia = useMemo(() => {
    const futuras = audiencias
      .filter((a) => {
        const dias = diasAte(a.dataAudiencia);
        return dias !== null && dias >= 0;
      })
      .sort((a, b) => new Date(a.dataAudiencia).getTime() - new Date(b.dataAudiencia).getTime());
    return futuras[0] ?? null;
  }, [audiencias]);

  const arquivosRecentes = useMemo(
    () => driveFiles.filter((f) => !f.isFolder).slice(0, 5),
    [driveFiles],
  );

  // Snapshot canônico p/ a zona de Atenção Imediata (mesma lógica do preview/lista).
  const attentionSnapshot = useMemo(
    () =>
      toSnapshot(
        {
          cpf: assistido?.cpf,
          rg: assistido?.rg,
          dataNascimento: assistido?.dataNascimento ? String(assistido.dataNascimento) : null,
          nomeMae: assistido?.nomeMae,
          endereco: assistido?.endereco,
          telefone: assistido?.telefone,
          telefoneContato: assistido?.telefoneContato,
          naturalidade: assistido?.naturalidade,
          proximaAudiencia: proximaAudiencia?.dataAudiencia
            ? new Date(proximaAudiencia.dataAudiencia).toISOString()
            : null,
        },
        {
          processosSemCaso: countProcessosSemCaso(processos),
          demandaAtrasada: demandasAbertas.some((d) => {
            const dd = diasAte(d.prazo);
            return dd !== null && dd < 0;
          }),
        },
      ),
    [assistido, proximaAudiencia, processos, demandasAbertas],
  );

  // ── Loading / empty ──────────────────────────────────────────────
  if (loadingAssistido || loadingCasos) {
    return (
      <div className="p-4 sm:p-6 space-y-3">
        <div className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="h-64 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
          <div className="h-64 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!assistido) {
    return <p className="p-6 italic text-neutral-400">Assistido não encontrado.</p>;
  }

  const sp = String(assistido.statusPrisional ?? "").toUpperCase();
  const preso = /CADEIA|PENITENC|PRESO|FECHADO|SEMIABERTO|REGIME|COP|HOSPITAL/.test(sp);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Identidade + ações ficam no header persistente (layout.tsx). */}

      {/* ── ⚡ ATENÇÃO IMEDIATA (CTA contextual + sinais priorizados) ─── */}
      <ImmediateAttentionPanel assistidoId={id} snapshot={attentionSnapshot} />

      {/* ── KPI STRIP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        <KpiPill
          label={`Caso${casosAgrupados.length !== 1 ? "s" : ""}`}
          value={casosAgrupados.length || casos.length}
          icon={Briefcase}
          tone="blue"
          href={`/admin/assistidos/${id}/casos`}
        />
        <KpiPill
          label={`Processo${processos.length !== 1 ? "s" : ""}`}
          value={processos.length}
          icon={Scale}
          tone="neutral"
          href={`/admin/assistidos/${id}/casos`}
        />
        <KpiPill
          label={prazoUrgente ? "Prazos!" : "Demandas"}
          value={demandasAbertas.length}
          icon={Clock}
          tone={prazoUrgente ? "rose" : "amber"}
          href={`/admin/demandas?assistidoId=${id}`}
        />
        <KpiPill
          label="Próx. audiência"
          value={proximaAudiencia ? fmtData(proximaAudiencia.dataAudiencia) : "—"}
          icon={CalendarDays}
          tone={proximaAudiencia ? "emerald" : "neutral"}
          href={`/admin/assistidos/${id}/timeline`}
        />
        <KpiPill
          label={`Arquivo${arquivosRecentes.length !== 1 ? "s" : ""}`}
          value={driveFiles.filter((f) => !f.isFolder).length}
          icon={FolderOpen}
          tone="neutral"
        />
      </div>

      {/* ── ⚠ INTELIGÊNCIA ────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <section className="rounded-xl border bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Inteligência
            <span className="ml-1 text-[10px] font-normal normal-case text-neutral-400">
              {alertas.length} sinal{alertas.length !== 1 ? "is" : ""}
            </span>
          </div>
          <div className="px-4 pb-4 space-y-1.5">
            {alertas.map((a, i) => {
              const s = NIVEL_STYLE[a.nivel] ?? NIVEL_STYLE.amber;
              const Icon = s.Icon;
              return (
                <div
                  key={`${a.tipo}-${a.processoId ?? "geral"}-${i}`}
                  className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2", s.wrap)}
                >
                  <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", s.chip.split(" ")[0])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-neutral-700 dark:text-neutral-200">
                      {a.motivo}
                    </p>
                    {a.processoId && a.processoNumero && (
                      <Link
                        href={`/admin/processos/${a.processoId}`}
                        className={cn(
                          "inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded font-mono text-[10px] tabular-nums transition-colors cursor-pointer",
                          s.chip,
                        )}
                      >
                        {a.processoNumero}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── GRID 2 COLUNAS ────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {/* COLUNA 1 — quem é */}
        <div className="space-y-3">
          <CardShell title="Identidade" icon={FileText}>
            <DuplicataAlert duplicata={assistido.duplicataSugerida} />
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">CPF</dt>
                <dd className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">{assistido.cpf ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">RG</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{assistido.rg ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Nascimento</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">
                  {assistido.dataNascimento ? fmtData(assistido.dataNascimento) : "—"}
                  {(() => {
                    const idade = idadeDe(assistido.dataNascimento);
                    return idade !== null ? <span className="ml-1 text-[11px] text-neutral-400">· {idade}a</span> : null;
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Telefone</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{assistido.telefone ?? "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Mãe</dt>
                <dd className="text-neutral-800 dark:text-neutral-200 truncate">{assistido.nomeMae ?? "—"}</dd>
              </div>
              {assistido.nomePai && (
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Pai</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200 truncate">{assistido.nomePai}</dd>
                </div>
              )}
              {(assistido.naturalidade || assistido.nacionalidade) && (
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Naturalidade</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200 truncate">
                    {assistido.naturalidade ?? "—"}
                    {assistido.nacionalidade ? ` · ${assistido.nacionalidade}` : ""}
                  </dd>
                </div>
              )}
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Endereço</dt>
                <dd className="text-neutral-800 dark:text-neutral-200">{assistido.endereco ?? "—"}</dd>
              </div>
              {assistido.nomeContato && (
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wider text-neutral-400">Contato</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200">
                    {assistido.nomeContato}
                    {assistido.parentescoContato ? ` (${assistido.parentescoContato})` : ""}
                    {assistido.telefoneContato ? ` · ${assistido.telefoneContato}` : ""}
                  </dd>
                </div>
              )}
              {preso && (assistido.dataPrisao || assistido.localPrisao || assistido.unidadePrisional) && (
                <div className="col-span-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/15 border border-rose-200/50 dark:border-rose-900/30 px-2.5 py-1.5">
                  <dt className="text-[10px] uppercase tracking-wider text-rose-500/80 dark:text-rose-400/70">Situação prisional</dt>
                  <dd className="text-neutral-800 dark:text-neutral-200">
                    {(() => {
                      const dp = diasDesde(assistido.dataPrisao);
                      return dp !== null ? (
                        <span className="font-medium text-rose-700 dark:text-rose-300">preso há {dp}d</span>
                      ) : null;
                    })()}
                    {assistido.unidadePrisional ? `${diasDesde(assistido.dataPrisao) !== null ? " · " : ""}${assistido.unidadePrisional}` : ""}
                    {assistido.localPrisao && assistido.localPrisao !== assistido.unidadePrisional ? ` · ${assistido.localPrisao}` : ""}
                  </dd>
                </div>
              )}
            </dl>

            {/* Quick actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Link
                href={`/admin/demandas/nova?assistidoId=${id}`}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Nova demanda
              </Link>
              <UltimoContato assistidoId={id} />
            </div>

            <FichaCompletude assistidoId={id} dados={assistido as unknown as Record<string, unknown>} />
          </CardShell>

          <CardShell title="Histórico penal" icon={ShieldAlert}>
            <HistoricoPenalBlock assistidoId={id} />
          </CardShell>

          <CardShell title="Nota privada" icon={FileText}>
            <NotaPrivadaInline assistidoId={id} initial={assistido.notaPrivada ?? undefined} />
          </CardShell>
        </div>

        {/* COLUNA 2 — o que urge */}
        <div className="space-y-3">
          {/* Medidas protetivas vigentes (VVD) — só aparece quando há */}
          {medidasVigentes.length > 0 && (
            <CardShell title="Medidas protetivas vigentes" icon={ShieldAlert}>
              <div className="space-y-1.5">
                {medidasVigentes.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/15 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-rose-700 dark:text-rose-300">
                        {m.codigo}
                      </span>
                      {m.artigo && (
                        <span className="shrink-0 text-[9.5px] text-rose-600/70 dark:text-rose-400/70">{m.artigo}</span>
                      )}
                    </div>
                    {(m.distanciaMetros || m.dataVencimento || m.numeroAutos) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-5 text-[10px] text-muted-foreground">
                        {m.distanciaMetros ? <span className="tabular-nums">{m.distanciaMetros}m</span> : null}
                        {m.dataVencimento && <span>vence {fmtData(m.dataVencimento)}</span>}
                        {m.numeroAutos && <span className="font-mono">{m.numeroAutos.split(".")[0]}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardShell>
          )}

          {/* Próxima audiência */}
          <CardShell title="Próxima audiência" icon={CalendarDays}>
            {proximaAudiencia ? (
              <>
                <Link
                  href={`/admin/assistidos/${id}/timeline`}
                  className="block rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.06] px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      {fmtDataHora(proximaAudiencia.dataAudiencia)}
                    </span>
                    {(() => {
                      const st = statusAudienciaInfo(proximaAudiencia.status);
                      return <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-semibold", st.cls)}>{st.label}</span>;
                    })()}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {proximaAudiencia.tipo ?? "Audiência"}
                    {proximaAudiencia.local ? ` · ${proximaAudiencia.local}` : ""}
                  </div>
                </Link>
                <div className="mt-2 flex justify-end">
                  <WhatsappAvisoButton
                    variant="audiencia"
                    assistidoId={id}
                    nome={assistido.nome}
                    phone={assistido.telefone}
                    numeroProcesso={proximaAudiencia.processoId ? numeroPorProcesso.get(proximaAudiencia.processoId) : null}
                    dataAudiencia={new Date(proximaAudiencia.dataAudiencia).toLocaleDateString("pt-BR")}
                    horaAudiencia={new Date(proximaAudiencia.dataAudiencia).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    local={proximaAudiencia.local}
                  />
                </div>
              </>
            ) : (
              <p className="text-[12px] italic text-neutral-400">Nenhuma audiência futura agendada.</p>
            )}
          </CardShell>

          {/* Prazos próximos */}
          <CardShell
            title="Prazos"
            icon={Clock}
            action={
              <Link
                href={`/admin/demandas?assistidoId=${id}`}
                className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                ver demandas <ChevronRight className="w-3 h-3" />
              </Link>
            }
          >
            {demandasAbertas.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">
                    {demandasAbertas.length}
                  </span>
                  <span className="text-[11px] text-neutral-500">demanda{demandasAbertas.length !== 1 ? "s" : ""} em aberto</span>
                </div>
                {proximasDemandas.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    {proximasDemandas.map((d) => {
                      const dias = d.dias;
                      const venc = dias !== null && dias < 0;
                      const urge = dias !== null && dias >= 0 && dias <= 7;
                      const corPrazo = venc
                        ? "text-rose-600 dark:text-rose-400"
                        : urge
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-neutral-400";
                      const rotuloPrazo =
                        dias === null
                          ? "—"
                          : dias < 0
                            ? `${Math.abs(dias)}d atraso`
                            : dias === 0
                              ? "hoje"
                              : `${dias}d`;
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-1.5 rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.06] px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors"
                        >
                          <Link href={`/admin/demandas/${d.id}`} className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                            <span className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-700 dark:text-neutral-200">
                              {d.ato ?? "Demanda"}
                            </span>
                            <span className="shrink-0 text-[10px] tabular-nums text-neutral-400" title={fmtData(d.prazo)}>
                              {fmtData(d.prazo)}
                            </span>
                            <span className={cn("shrink-0 text-[10px] font-semibold tabular-nums", corPrazo)}>
                              {rotuloPrazo}
                            </span>
                          </Link>
                          <WhatsappAvisoButton
                            variant="prazo"
                            assistidoId={id}
                            nome={assistido.nome}
                            phone={assistido.telefone}
                            numeroProcesso={d.processoId ? numeroPorProcesso.get(d.processoId) : null}
                            dataPrazo={fmtData(d.prazo)}
                            tipoAto={d.ato ?? d.tipoAto ?? "providência"}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] italic text-neutral-400">Sem demandas em aberto.</p>
            )}
          </CardShell>

          {/* Casos */}
          <CardShell
            title="Casos"
            icon={Briefcase}
            action={
              casosAgrupados.length > 0 ? (
                <Link
                  href={`/admin/assistidos/${id}/casos`}
                  className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              ) : undefined
            }
          >
            {casosAgrupados.length > 0 ? (
              <div className="space-y-1.5">
                {[...casosAgrupados]
                  .sort((a, b) => pesoPrioridadeCaso(b.prioridade) - pesoPrioridadeCaso(a.prioridade))
                  .map((c) => {
                    const st = statusCasoInfo(c.status);
                    const pr = prioridadeCasoInfo(c.prioridade);
                    const atrib = getAtribuicaoColors(c.atribuicao);
                    return (
                      <Link
                        key={c.id}
                        href={`/admin/assistidos/${id}/caso/${c.id}`}
                        className="flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/70 dark:border-white/[0.06] px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: atrib.color }} title={atrib.label} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">
                          {c.titulo}
                        </span>
                        {c.prioridade && pesoPrioridadeCaso(c.prioridade) >= 4 && (
                          <span className={cn("shrink-0 rounded px-1.5 py-px text-[9.5px] font-medium", pr.badge)}>{pr.label}</span>
                        )}
                        <span className={cn("shrink-0 rounded px-1.5 py-px text-[9.5px] font-medium", st.badge)}>{st.label}</span>
                        <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                          {c.processos.length} proc.
                        </span>
                      </Link>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[12px] italic text-neutral-400">Nenhum caso agrupado.</p>
            )}

            {/* Agrupar processos soltos em casos (principal + associados) */}
            <AgruparCasosButton assistidoId={id} />
          </CardShell>
        </div>

        {/* COLUNA 3 — leitura assistida (análise) + arquivos */}
        <div className="space-y-3 md:col-span-2 xl:col-span-1">
          {/* Síntese das análises processuais (geradas via daemon) */}
          <AnaliseResumoCockpit assistidoId={id} casos={casosAgrupados} />

          {/* Comunicação — WhatsApp vinculado (não-lidas, última msg, registrar) */}
          <WhatsappCockpitCard assistidoId={id} telefone={assistido.telefone} />

          {/* Drive recente */}
          {arquivosRecentes.length > 0 && (
            <CardShell title="Drive recente" icon={FolderOpen}>
              <div className="space-y-1">
                {arquivosRecentes.map((f) => (
                  <a
                    key={f.id}
                    href={f.webViewLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="text-[12px] text-neutral-700 dark:text-neutral-300 truncate">{f.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-neutral-400">
                      {fmtData(f.lastModifiedTime)}
                    </span>
                  </a>
                ))}
              </div>
            </CardShell>
          )}
        </div>
      </div>

      {/* ── LINHA DO TEMPO (faixa larga, agrupada por caso) ─────────────── */}
      <CardShell title="Linha do tempo" icon={Clock}>
        <FeedPorCaso
          assistidoId={id}
          casos={casosAgrupados}
          emptyHint="Nenhuma atividade deste assistido ainda."
        />
      </CardShell>
    </div>
  );
}
