"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Landmark,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  Gavel,
  Building2,
  CalendarClock,
  Layers,
  ChevronRight,
  BarChart3,
  Users,
  X,
  Pencil,
  Sparkles,
  Loader2,
} from "lucide-react";
import { GLASS } from "@/lib/config/design-tokens";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { HeaderSlotTitle } from "@/components/layouts/header-slot-title";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────

const ACCENT = "#7c8aa0"; // tom institucional (azul-acinzentado de tribunal)

const TIPO_LABELS: Record<string, string> = {
  APELACAO: "Apelação",
  RESE: "RESE",
  AGRAVO_EXECUCAO: "Agravo em Execução",
  AGRAVO_INSTRUMENTO: "Agravo de Instrumento",
  EMBARGOS_INFRINGENTES: "Embargos Infringentes",
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  HABEAS_CORPUS: "Habeas Corpus",
  REVISAO_CRIMINAL: "Revisão Criminal",
};

const TIPO_SHORT: Record<string, string> = {
  APELACAO: "APL",
  RESE: "RESE",
  AGRAVO_EXECUCAO: "AGR",
  AGRAVO_INSTRUMENTO: "AGI",
  EMBARGOS_INFRINGENTES: "EI",
  EMBARGOS_DECLARACAO: "ED",
  HABEAS_CORPUS: "HC",
  REVISAO_CRIMINAL: "RC",
};

const STATUS_ORDER = [
  "INTERPOSTO", "DISTRIBUIDO", "CONCLUSO", "PAUTADO", "JULGADO", "TRANSITADO",
] as const;

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  INTERPOSTO: { label: "Interposto", dot: "bg-blue-500" },
  DISTRIBUIDO: { label: "Distribuído", dot: "bg-amber-500" },
  CONCLUSO: { label: "Concluso", dot: "bg-purple-500" },
  PAUTADO: { label: "Pautado", dot: "bg-orange-500" },
  JULGADO: { label: "Julgado", dot: "bg-emerald-500" },
  TRANSITADO: { label: "Transitado", dot: "bg-neutral-400" },
};

const RESULTADO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "text-neutral-400" },
  PROVIDO: { label: "Provido", color: "text-emerald-500" },
  PARCIALMENTE_PROVIDO: { label: "Parc. Provido", color: "text-amber-500" },
  NAO_PROVIDO: { label: "Não Provido", color: "text-red-500" },
  NAO_CONHECIDO: { label: "Não Conhecido", color: "text-neutral-400" },
  PREJUDICADO: { label: "Prejudicado", color: "text-neutral-400" },
  CONCEDIDO: { label: "Concedido", color: "text-emerald-500" },
  PARCIALMENTE_CONCEDIDO: { label: "Parc. Concedido", color: "text-amber-500" },
  DENEGADO: { label: "Denegado", color: "text-red-500" },
};

const TRIBUNAIS = [
  { key: "TJBA", label: "TJBA", full: "Tribunal de Justiça da Bahia" },
  { key: "STJ", label: "STJ", full: "Superior Tribunal de Justiça" },
  { key: "STF", label: "STF", full: "Supremo Tribunal Federal" },
] as const;

const CAMARAS = ["1ª Câmara Criminal", "2ª Câmara Criminal", "Seção Criminal"];

const DIMENSOES = [
  { key: "comarca", label: "Comarca" },
  { key: "unidade", label: "Unidade" },
  { key: "especialidade", label: "Especialidade" },
  { key: "area", label: "Área" },
  { key: "localizacao", label: "Localização" },
] as const;

type EscopoModo = "meus" | "todos";
type Tab = "geral" | "recursos" | "institucional";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "geral", label: "Visão geral", icon: BarChart3 },
  { key: "recursos", label: "Recursos", icon: Layers },
  { key: "institucional", label: "Institucional", icon: Building2 },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function InstanciaSuperiorPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const podeInstitucional = me?.role === "admin" || me?.role === "servidor";

  const [escopoModo, setEscopoModo] = useState<EscopoModo>("meus");
  const [tribunal, setTribunal] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("geral");
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>();
  const [filtroCamara, setFiltroCamara] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const effectiveModo: EscopoModo = podeInstitucional ? escopoModo : "meus";
  const escopo = useMemo(() => ({ modo: effectiveModo }), [effectiveModo]);

  const { data: stats, isLoading: statsLoading } =
    trpc.instanciaSuperior.stats.useQuery({ escopo });
  const { data: recursosData, isLoading: recursosLoading } =
    trpc.instanciaSuperior.listRecursos.useQuery({
      escopo, tribunal, tipo: filtroTipo, status: filtroStatus, camara: filtroCamara, limit: 60,
    });

  const rows = recursosData?.rows ?? [];
  const total = recursosData?.total ?? 0;
  const hasFilters = !!(filtroTipo || filtroStatus || filtroCamara);

  const visibleTabs = TABS.filter(t => t.key !== "institucional" || podeInstitucional);

  // ── Toolbar (vive no bottomRow do charcoal header — padrão Demandas) ──
  const headerBottomRow = (
    <div className="flex items-center justify-between gap-3">
      {/* Left: tabs + tribunal */}
      <div className="flex items-center gap-2 min-w-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0.5 shrink-0">
          {visibleTabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer shrink-0",
                tab === t.key ? "bg-white/90 text-neutral-800 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              )}
            >
              <t.icon className="w-3 h-3" />
              {t.label}
              {t.key === "recursos" && (
                <span className={cn("tabular-nums text-[10px]", tab === t.key ? "text-neutral-500" : "text-white/40")}>{total}</span>
              )}
            </button>
          ))}
        </div>

        <span className="h-4 w-px bg-white/[0.10] shrink-0" aria-hidden />

        <DarkTribunalPills value={tribunal} onChange={setTribunal} porTribunal={stats?.porTribunal as any[] | undefined} />
      </div>

      {/* Right: escopo + novo */}
      <div className="flex items-center gap-1.5 shrink-0">
        {podeInstitucional && <DarkEscopoSwitch value={escopoModo} onChange={setEscopoModo} />}
        <button
          onClick={() => setCreateOpen(true)}
          title="Novo recurso"
          className="h-7 pl-2 pr-2.5 rounded-lg bg-white/90 text-neutral-700 shadow-sm hover:bg-white transition-all duration-150 cursor-pointer flex items-center gap-1 text-[11px] font-medium shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#f5f5f5] dark:bg-[#0f0f11]">
      <HeaderSlotTitle
        icon={Landmark}
        title="Instância Superior"
        accentHex={ACCENT}
        stats={
          <>
            <span className="text-white/85 font-semibold">{stats?.total ?? 0}</span>
            {(stats?.pendentes ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-white/55" title={`${stats?.pendentes} pendentes`}>
                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                <span className="font-medium">{stats?.pendentes}</span>
              </span>
            )}
            {(stats?.emPauta ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-orange-300/80" title={`${stats?.emPauta} em pauta`}>
                <span className="w-1 h-1 rounded-full bg-orange-400/50 shrink-0" />
                <span className="font-medium">{stats?.emPauta}</span>
              </span>
            )}
          </>
        }
      />

      <CollapsiblePageHeader
        title="Instância Superior"
        icon={Landmark}
        collapsedStats={
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#464649] dark:bg-white/[0.10] text-white/90 tabular-nums">
            {stats?.total ?? 0} recursos
          </span>
        }
        bottomRow={headerBottomRow}
        seamless
      />

      {/* Conteúdo */}
      <div className="px-5 md:px-8 py-3 md:py-4 space-y-2 md:space-y-3">
        {tab === "geral" && (
          <VisaoGeral escopo={escopo} stats={stats} statsLoading={statsLoading} onOpenRecurso={setSelectedId} />
        )}
        {tab === "recursos" && (
          <RecursosTab
            rows={rows} total={total} loading={recursosLoading} hasFilters={hasFilters}
            onCreate={() => setCreateOpen(true)} onOpen={setSelectedId}
            filterProps={{ filtroTipo, filtroStatus, filtroCamara, setFiltroTipo, setFiltroStatus, setFiltroCamara }}
          />
        )}
        {tab === "institucional" && podeInstitucional && <InstitucionalTab />}
      </div>

      <CreateRecursoDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RecursoDetailSheet recursoId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

// ─── Dark header controls (padrão Demandas) ───────────────────────────────

function DarkEscopoSwitch({ value, onChange }: { value: EscopoModo; onChange: (v: EscopoModo) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.05] p-0.5 shrink-0">
      {([{ k: "meus", label: "Meus" }, { k: "todos", label: "Institucional" }] as const).map(o => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "text-[10.5px] px-2 py-1 rounded-md transition-all cursor-pointer font-medium",
            value === o.k ? "bg-white/90 text-neutral-800 shadow-sm" : "text-white/60 hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DarkTribunalPills({
  value, onChange, porTribunal,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  porTribunal?: { tribunal: string; total: number }[];
}) {
  const countOf = (k: string) => porTribunal?.find(t => t.tribunal === k)?.total ?? 0;
  return (
    <div className="flex items-center gap-1 shrink-0">
      {TRIBUNAIS.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(active ? undefined : t.key)}
            title={t.full}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer ring-1 ring-inset shrink-0",
              active ? "bg-white/[0.14] text-white ring-white/20" : "ring-white/[0.06] text-white/55 hover:text-white hover:bg-white/[0.06]"
            )}
          >
            <span>{t.label}</span>
            <span className={cn("tabular-nums font-semibold", active ? "text-white/80" : "text-white/35")}>{countOf(t.key)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, action }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200/50 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-muted-foreground/70 leading-relaxed py-4 text-center">{children}</p>;
}

// ─── KPI strip ────────────────────────────────────────────────────────────

function KpiStrip({ stats }: { stats: any }) {
  const items = [
    { label: "Recursos", value: stats?.total ?? 0, icon: Layers, tone: "text-foreground" },
    { label: "Pendentes", value: stats?.pendentes ?? 0, icon: Clock, tone: "text-amber-500" },
    { label: "Em pauta", value: stats?.emPauta ?? 0, icon: CalendarClock, tone: "text-orange-500" },
    { label: "Julgados", value: stats?.julgados ?? 0, icon: Gavel, tone: "text-foreground" },
    { label: "Provimento", value: stats?.taxaProvimento != null ? `${stats.taxaProvimento}%` : "—", icon: CheckCircle2, tone: "text-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {items.map(it => (
        <div key={it.label} className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-1 mb-1">
            <it.icon className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">{it.label}</span>
          </div>
          <span className={cn("text-xl font-bold tabular-nums tracking-tight", it.tone)}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Visão Geral ──────────────────────────────────────────────────────────

function VisaoGeral({
  escopo, stats, statsLoading, onOpenRecurso,
}: {
  escopo: { modo: EscopoModo };
  stats: any;
  statsLoading: boolean;
  onOpenRecurso: (id: number) => void;
}) {
  const { data: mapa, isLoading: mapaLoading } = trpc.instanciaSuperior.mapaPorAssunto.useQuery({ escopo, limit: 12 });
  const { data: agenda, isLoading: agendaLoading } = trpc.instanciaSuperior.agendaPauta.useQuery({ escopo, limit: 12 });

  if (statsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <KpiStrip stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Mapa por assunto" icon={Layers}>
          {mapaLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)}</div>
          ) : !mapa?.length ? (
            <EmptyHint>Sem tipos penais classificados ainda. Aparecem aqui conforme você adiciona crimes/temas aos recursos.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {mapa.map((m: any) => {
                const taxa = m.julgados > 0 ? Math.round((m.providos / m.julgados) * 100) : null;
                const max = Math.max(...mapa.map((x: any) => x.total));
                return (
                  <div key={m.assunto}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-foreground/85 truncate max-w-[60%]">{m.assunto}</span>
                      <span className="text-muted-foreground tabular-nums flex items-center gap-2">
                        <span>{m.total}</span>
                        {taxa != null && <span className={cn(taxa >= 50 ? "text-emerald-500" : "text-amber-500")}>{taxa}%</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(m.total / max) * 100}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Agenda de julgamentos" icon={CalendarClock}>
          {agendaLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 rounded" />)}</div>
          ) : !agenda?.length ? (
            <EmptyHint>Nenhum recurso com data de pauta futura. Defina a data de pauta para acompanhar aqui.</EmptyHint>
          ) : (
            <div className="space-y-1">
              {agenda.map((a: any) => (
                <button key={a.id} onClick={() => onOpenRecurso(a.id)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-left">
                  <span className="text-[10px] font-bold text-orange-500 tabular-nums w-10 text-center shrink-0">
                    {a.dataPauta ? format(new Date(a.dataPauta), "dd/MM") : "—"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 w-9">{TIPO_SHORT[a.tipo] ?? a.tipo}</span>
                  <span className="text-[12px] text-foreground/85 truncate flex-1">{a.assistidoNome ?? "—"}</span>
                  {a.camara && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{a.camara}</span>}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Ciclo dos recursos" icon={Gavel}>
          <DistribuicaoStatus porStatus={stats?.porStatus} total={stats?.total ?? 0} />
        </Card>

        <Card title="Resultados dos julgados" icon={CheckCircle2}>
          {!stats?.porResultado?.length ? (
            <EmptyHint>Nenhum recurso julgado ainda.</EmptyHint>
          ) : (
            <div className="space-y-2">
              {stats.porResultado.map((r: any) => {
                const cfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
                const maxR = Math.max(...stats.porResultado.map((x: any) => Number(x.total)));
                return (
                  <div key={r.resultado}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className={cn("font-medium", cfg.color)}>{cfg.label}</span>
                      <span className="text-muted-foreground tabular-nums">{r.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className={cn("h-full rounded-full", cfg.color.replace("text-", "bg-"))} style={{ width: `${(Number(r.total) / maxR) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DistribuicaoStatus({ porStatus, total }: { porStatus?: { status: string; total: number }[]; total: number }) {
  if (!porStatus?.length || total === 0) return <EmptyHint>Sem recursos no escopo atual.</EmptyHint>;
  const map = new Map(porStatus.map(s => [s.status, Number(s.total)]));
  return (
    <div className="space-y-3">
      <div className="flex h-2.5 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        {STATUS_ORDER.map(s => {
          const v = map.get(s) ?? 0;
          if (!v) return null;
          return <div key={s} className={cn("h-full", STATUS_CONFIG[s].dot)} style={{ width: `${(v / total) * 100}%` }} title={`${STATUS_CONFIG[s].label}: ${v}`} />;
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map(s => {
          const v = map.get(s) ?? 0;
          return (
            <div key={s} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[s].dot)} />
                {STATUS_CONFIG[s].label}
              </span>
              <span className="tabular-nums font-medium text-foreground/80">{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recursos Tab ─────────────────────────────────────────────────────────

function RecursosTab({
  rows, total, loading, hasFilters, onCreate, onOpen, filterProps,
}: {
  rows: any[]; total: number; loading: boolean; hasFilters: boolean;
  onCreate: () => void; onOpen: (id: number) => void; filterProps: any;
}) {
  return (
    <div className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-neutral-200/60 dark:border-white/[0.04]">
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums mr-auto">
          {total} {total === 1 ? "recurso" : "recursos"}
        </span>
        <FiltersButton {...filterProps} />
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Landmark className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
            </div>
            <p className="text-[13px] text-muted-foreground">{hasFilters ? "Nenhum recurso com esses filtros" : "Nenhum recurso no escopo atual"}</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onCreate}>
              <Plus className="w-3.5 h-3.5" /> Registrar recurso
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">{rows.map((r) => <RecursoRow key={r.id} recurso={r} onClick={() => onOpen(r.id)} />)}</div>
        )}
      </div>
    </div>
  );
}

function FiltersButton({ filtroTipo, filtroStatus, filtroCamara, setFiltroTipo, setFiltroStatus, setFiltroCamara }: any) {
  const activeCount = [filtroTipo, filtroStatus, filtroCamara].filter(Boolean).length;
  const hasFilters = activeCount > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-8 rounded-lg", hasFilters && "border-emerald-500/50 text-emerald-600 dark:text-emerald-400")}>
          <Filter className="w-3 h-3" /> Filtros
          {hasFilters && <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">{activeCount}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-4">
        <div className="space-y-4">
          <FilterGroup label="Tipo">
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <FilterChip key={k} active={filtroTipo === k} onClick={() => setFiltroTipo(filtroTipo === k ? undefined : k)}>{v}</FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Status">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <FilterChip key={k} active={filtroStatus === k} onClick={() => setFiltroStatus(filtroStatus === k ? undefined : k)}>
                <div className={cn("w-1.5 h-1.5 rounded-full", v.dot)} />{v.label}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Câmara">
            {CAMARAS.map(c => (
              <FilterChip key={c} active={filtroCamara === c} onClick={() => setFiltroCamara(filtroCamara === c ? undefined : c)}>{c}</FilterChip>
            ))}
          </FilterGroup>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8"
              onClick={() => { setFiltroTipo(undefined); setFiltroStatus(undefined); setFiltroCamara(undefined); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      "text-[11px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1",
      active ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
        : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
    )}>{children}</button>
  );
}

function RecursoRow({ recurso: r, onClick }: { recurso: any; onClick: () => void }) {
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.INTERPOSTO;
  const resultadoCfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
  const tipoShort = TIPO_SHORT[r.tipo] ?? r.tipo;
  return (
    <button onClick={onClick} className={cn(GLASS.cardHover, "p-4 rounded-xl w-full text-left cursor-pointer")}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-white tracking-wider leading-none">{tipoShort}</span>
          {r.tribunal && r.tribunal !== "TJBA" && <span className="text-[7px] font-semibold text-white/60 mt-0.5">{r.tribunal}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/90 truncate">{TIPO_LABELS[r.tipo] ?? r.tipo}</span>
            {r.numeroRecurso && (
              <>
                <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-[12px] font-mono text-muted-foreground tracking-wide">{r.numeroRecurso}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            {r.assistidoNome && <span className="truncate max-w-[140px]">{r.assistidoNome}</span>}
            {r.assistidoNome && r.camara && <Dot />}
            {r.camara && <span>{r.camara}</span>}
            {r.relatorNome && <><Dot /><span>Rel. {r.relatorNome}</span></>}
            {r.dataInterposicao && <><Dot /><span className="font-mono tabular-nums">{format(new Date(r.dataInterposicao), "dd/MM/yy")}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            <span className="text-[11px] text-muted-foreground">{statusCfg.label}</span>
          </div>
          {r.resultado !== "PENDENTE" && (
            <>
              <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
              <span className={cn("text-[11px] font-semibold", resultadoCfg.color)}>{resultadoCfg.label}</span>
            </>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
        </div>
      </div>
      {r.tesesInvocadas?.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 ml-14 flex-wrap">
          {(r.tesesInvocadas as string[]).slice(0, 4).map((t, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/[0.06] text-muted-foreground">{t}</span>
          ))}
          {r.tesesInvocadas.length > 4 && <span className="text-[10px] text-muted-foreground/50">+{r.tesesInvocadas.length - 4}</span>}
        </div>
      )}
    </button>
  );
}

function Dot() { return <span className="text-neutral-300 dark:text-neutral-600">·</span>; }

// ─── Institucional Tab ────────────────────────────────────────────────────

function InstitucionalTab() {
  const [dimensao, setDimensao] = useState<(typeof DIMENSOES)[number]["key"]>("comarca");
  const { data, isLoading } = trpc.instanciaSuperior.institucional.useQuery({ dimensao, limit: 30 });
  const maxTotal = data?.length ? Math.max(...data.map((d: any) => d.total)) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-muted-foreground mr-1">Agrupar por:</span>
        {DIMENSOES.map(d => (
          <button key={d.key} onClick={() => setDimensao(d.key)} className={cn(
            "text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer",
            dimensao === d.key ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
              : "border-neutral-200 dark:border-neutral-700 text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}>{d.label}</button>
        ))}
      </div>

      <Card title={`Comparativo por ${DIMENSOES.find(d => d.key === dimensao)?.label.toLowerCase()}`} icon={Building2}>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}</div>
        ) : !data?.length ? (
          <EmptyHint>Sem dados institucionais ainda.</EmptyHint>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 text-[9px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">
              <span>{DIMENSOES.find(d => d.key === dimensao)?.label}</span>
              <span className="text-right w-12">Total</span>
              <span className="text-right w-14">Pend.</span>
              <span className="text-right w-14">Julg.</span>
              <span className="text-right w-16">Provim.</span>
            </div>
            {data.map((row: any) => {
              const taxa = row.julgados > 0 ? Math.round((row.providos / row.julgados) * 100) : null;
              return (
                <div key={row.grupo} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-1">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-foreground/85 truncate">{row.grupo}</span>
                      {row.defensores > 0 && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ml-2 shrink-0">
                          <Users className="w-2.5 h-2.5" />{row.defensores}
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(row.total / maxTotal) * 100}%`, backgroundColor: ACCENT }} />
                    </div>
                  </div>
                  <span className="text-[12px] tabular-nums text-right w-12 font-medium">{row.total}</span>
                  <span className="text-[12px] tabular-nums text-right w-14 text-amber-500">{row.pendentes}</span>
                  <span className="text-[12px] tabular-nums text-right w-14 text-muted-foreground">{row.julgados}</span>
                  <span className={cn("text-[12px] tabular-nums text-right w-16 font-semibold", taxa == null ? "text-muted-foreground/40" : taxa >= 50 ? "text-emerald-500" : "text-amber-500")}>
                    {taxa != null ? `${taxa}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Recurso Detail Sheet ─────────────────────────────────────────────────

function RecursoDetailSheet({ recursoId, onClose }: { recursoId: number | null; onClose: () => void }) {
  const { data: r, isLoading } = trpc.instanciaSuperior.getRecurso.useQuery({ id: recursoId! }, { enabled: recursoId != null });
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Sheet open={recursoId != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
        {isLoading || !r ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3 rounded" /><Skeleton className="h-24 rounded" /><Skeleton className="h-40 rounded" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-[#414144] dark:bg-neutral-900 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold tracking-wider leading-none">{TIPO_SHORT[r.tipo] ?? r.tipo}</span>
                    <span className="text-[7px] text-white/60 mt-0.5">{r.tribunal}</span>
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold leading-tight">{TIPO_LABELS[r.tipo] ?? r.tipo}</h2>
                    <p className="text-[11px] text-white/60 font-mono mt-0.5">{r.numeroRecurso ?? "sem número"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditOpen(true)} title="Editar recurso" className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {r.assistido?.nome && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-white/80">
                  <Users className="w-3.5 h-3.5 text-white/50" />{r.assistido.nome}
                  {r.processoOrigem?.numeroAutos && <span className="text-white/40 font-mono text-[11px]">· {r.processoOrigem.numeroAutos}</span>}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <Timeline recurso={r} />
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Câmara" value={r.camara} />
                <InfoField label="Relator" value={r.relator?.nome} />
                <InfoField label="Defensor origem" value={r.defensorOrigem?.nome} />
                <InfoField label="Defensor destino" value={r.defensorDestino?.nome} />
              </div>

              {((r.tesesInvocadas?.length ?? 0) > 0 || (r.tiposPenais?.length ?? 0) > 0) && (
                <div className="space-y-3">
                  {(r.tiposPenais?.length ?? 0) > 0 && <TagRow label="Tipos penais" tags={r.tiposPenais ?? []} />}
                  {(r.tesesInvocadas?.length ?? 0) > 0 && <TagRow label="Teses invocadas" tags={r.tesesInvocadas ?? []} />}
                </div>
              )}

              {r.resumo && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">Resumo</span>
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{r.resumo}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                    Acórdãos {r.acordaos?.length > 0 && `(${r.acordaos.length})`}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setAnexarOpen(true)}>
                    <Plus className="w-3 h-3" /> Juntar acórdão
                  </Button>
                </div>
                {!r.acordaos?.length ? (
                  <p className="text-[12px] text-muted-foreground/60 py-3 text-center">Nenhum acórdão juntado.</p>
                ) : (
                  <div className="space-y-2">{r.acordaos.map((a: any) => <AcordaoCard key={a.id} acordao={a} />)}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
      {r && <AnexarAcordaoDialog open={anexarOpen} onOpenChange={setAnexarOpen} recursoId={r.id} relatorNome={r.relator?.nome} />}
      {r && <EditRecursoDialog open={editOpen} onOpenChange={setEditOpen} recurso={r} />}
    </Sheet>
  );
}

// ─── Editar Recurso Dialog ────────────────────────────────────────────────

function EditRecursoDialog({ open, onOpenChange, recurso: r }: {
  open: boolean; onOpenChange: (v: boolean) => void; recurso: any;
}) {
  const [status, setStatus] = useState<string>(r.status);
  const [resultado, setResultado] = useState<string>(r.resultado);
  const [tribunal, setTribunal] = useState<string>(r.tribunal ?? "TJBA");
  const [dataDistribuicao, setDataDist] = useState<string>(r.dataDistribuicao ?? "");
  const [dataPauta, setDataPauta] = useState<string>(r.dataPauta ?? "");
  const [dataJulgamento, setDataJulg] = useState<string>(r.dataJulgamento ?? "");
  const [dataTransito, setDataTrans] = useState<string>(r.dataTransito ?? "");
  const [tiposPenais, setTiposPenais] = useState<string>((r.tiposPenais ?? []).join(", "));
  const [teses, setTeses] = useState<string>((r.tesesInvocadas ?? []).join(", "));
  const [resumo, setResumo] = useState<string>(r.resumo ?? "");
  const [observacoes, setObs] = useState<string>(r.observacoes ?? "");

  const utils = trpc.useUtils();
  const update = trpc.instanciaSuperior.updateRecurso.useMutation({
    onSuccess: () => {
      toast.success("Recurso atualizado");
      utils.instanciaSuperior.getRecurso.invalidate({ id: r.id });
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      utils.instanciaSuperior.mapaPorAssunto.invalidate();
      utils.instanciaSuperior.agendaPauta.invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const splitTags = (s: string) => s.split(",").map(t => t.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Editar recurso</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Lbl>Fase / status</Lbl>
            <div className="flex flex-wrap gap-1">
              {STATUS_ORDER.map(s => (
                <button key={s} onClick={() => setStatus(s)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1",
                  status === s ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[s].dot)} />{STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Tribunal</Lbl>
            <div className="flex gap-1.5">
              {TRIBUNAIS.map(t => (
                <button key={t.key} onClick={() => setTribunal(t.key)} className={cn(
                  "text-[12px] px-3 py-1.5 rounded-lg border transition-all flex-1",
                  tribunal === t.key ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                )}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Distribuição</Lbl><Input type="date" value={dataDistribuicao} onChange={(e) => setDataDist(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Pauta</Lbl><Input type="date" value={dataPauta} onChange={(e) => setDataPauta(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Julgamento</Lbl><Input type="date" value={dataJulgamento} onChange={(e) => setDataJulg(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Trânsito</Lbl><Input type="date" value={dataTransito} onChange={(e) => setDataTrans(e.target.value)} className="text-[13px] h-9" /></div>
          </div>

          <div>
            <Lbl>Resultado</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(RESULTADO_CONFIG).map(k => (
                <button key={k} onClick={() => setResultado(k)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  resultado === k ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>{RESULTADO_CONFIG[k].label}</button>
              ))}
            </div>
          </div>

          <div><Lbl>Tipos penais (vírgula)</Lbl><Input value={tiposPenais} onChange={(e) => setTiposPenais(e.target.value)} placeholder="Roubo majorado, Tráfico…" className="text-[13px] h-9" /></div>
          <div><Lbl>Teses invocadas (vírgula)</Lbl><Input value={teses} onChange={(e) => setTeses(e.target.value)} placeholder="Insuficiência probatória, Nulidade…" className="text-[13px] h-9" /></div>
          <div>
            <Lbl>Resumo</Lbl>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
          <div>
            <Lbl>Observações</Lbl>
            <textarea value={observacoes} onChange={(e) => setObs(e.target.value)} className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => update.mutate({
              id: r.id,
              tribunal: tribunal as "TJBA" | "STJ" | "STF",
              status, resultado,
              dataDistribuicao: dataDistribuicao || null,
              dataPauta: dataPauta || null,
              dataJulgamento: dataJulgamento || null,
              dataTransito: dataTransito || null,
              tiposPenais: splitTags(tiposPenais),
              tesesInvocadas: splitTags(teses),
              resumo: resumo || null,
              observacoes: observacoes || null,
            })}
            disabled={update.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {update.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Timeline({ recurso: r }: { recurso: any }) {
  const currentIdx = STATUS_ORDER.indexOf(r.status);
  const dateFor: Record<string, string | null> = {
    INTERPOSTO: r.dataInterposicao, DISTRIBUIDO: r.dataDistribuicao, CONCLUSO: null,
    PAUTADO: r.dataPauta, JULGADO: r.dataJulgamento, TRANSITADO: r.dataTransito,
  };
  return (
    <div className="flex items-start justify-between">
      {STATUS_ORDER.map((s, i) => {
        const done = i <= currentIdx;
        const d = dateFor[s];
        return (
          <div key={s} className="flex flex-col items-center flex-1 relative">
            {i < STATUS_ORDER.length - 1 && (
              <div className={cn("absolute top-[7px] left-1/2 w-full h-0.5", i < currentIdx ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-700")} />
            )}
            <div className={cn("w-3.5 h-3.5 rounded-full z-10 border-2", done ? "bg-emerald-500 border-emerald-500" : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600")} />
            <span className={cn("text-[8px] mt-1.5 text-center leading-tight", done ? "text-foreground/70 font-medium" : "text-muted-foreground/50")}>{STATUS_CONFIG[s].label}</span>
            {d && <span className="text-[8px] text-muted-foreground/60 tabular-nums mt-0.5">{format(new Date(d), "dd/MM/yy")}</span>}
          </div>
        );
      })}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-widest font-semibold text-neutral-400 block">{label}</span>
      <span className="text-[13px] text-foreground/85">{value || "—"}</span>
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1">
        {tags.map((t, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/[0.06] text-foreground/70">{t}</span>)}
      </div>
    </div>
  );
}

function AcordaoCard({ acordao: a }: { acordao: any }) {
  const cfg = RESULTADO_CONFIG[a.resultado] ?? null;
  const utils = trpc.useUtils();
  const [taskId, setTaskId] = useState<number | null>(null);

  const analisar = trpc.instanciaSuperior.analisarAcordaoIA.useMutation({
    onSuccess: (res) => { setTaskId(res.taskId); toast.message("Análise enfileirada no daemon…"); },
    onError: (e) => toast.error(e.message),
  });

  const poll = trpc.instanciaSuperior.pollAnaliseAcordao.useQuery(
    { acordaoId: a.id, taskId: taskId ?? 0 },
    { enabled: taskId != null, refetchInterval: 3000 }
  );

  useEffect(() => {
    const s = poll.data?.status;
    if (s === "CONCLUIDO" || s === "ERRO") {
      setTaskId(null);
      utils.instanciaSuperior.getRecurso.invalidate();
      if (s === "ERRO") toast.error("Falha na análise do acórdão");
      else toast.success("Análise concluída");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.data?.status]);

  const analise = (poll.data?.analiseIa as any) ?? (a.analiseIa as any) ?? null;
  const analisando = analisar.isPending || taskId != null || a.analiseStatus === "ANALISANDO";

  return (
    <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium">{a.numeroAcordao || "Acórdão"}</span>
          {a.dataJulgamento && <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{format(new Date(a.dataJulgamento), "dd/MM/yy")}</span>}
        </div>
        {cfg && <span className={cn("text-[11px] font-semibold", cfg.color)}>{cfg.label}</span>}
      </div>
      {a.votacao && <p className="text-[11px] text-muted-foreground mt-1">{a.votacao}</p>}
      {a.ementa && <p className="text-[11px] text-foreground/70 mt-2 leading-relaxed line-clamp-4">{a.ementa}</p>}
      {a.votos?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {a.votos.map((v: any, i: number) => (
            <span key={i} className={cn("text-[9px] px-1.5 py-0.5 rounded",
              v.voto === "DIVERGENTE" ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "bg-neutral-100 dark:bg-white/[0.06] text-muted-foreground")}>
              {v.nome.split(" ")[0]}: {v.voto === "ACOMPANHA_RELATOR" ? "✓" : v.voto === "DIVERGENTE" ? "✗" : "—"}
            </span>
          ))}
        </div>
      )}

      {/* Análise IA (daemon / Claude Code) */}
      <div className="mt-3 pt-3 border-t border-neutral-200/50 dark:border-white/[0.04]">
        {analise ? (
          <AnaliseAcordaoView analise={analise} />
        ) : analisando ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
            Analisando no daemon… (Claude Code)
          </div>
        ) : (
          <button
            onClick={() => analisar.mutate({ acordaoId: a.id })}
            disabled={!a.ementa}
            title={!a.ementa ? "Cole a ementa do acórdão para analisar" : "Analisar com IA via daemon"}
            className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisar acórdão com IA
          </button>
        )}
      </div>
    </div>
  );
}

function AnaliseAcordaoView({ analise }: { analise: any }) {
  const blocks: { label: string; items?: string[]; text?: string; tone: string }[] = [
    { label: "Teses acolhidas", items: analise.tesesAcolhidas, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Teses rejeitadas", items: analise.tesesRejeitadas, tone: "text-red-600 dark:text-red-400" },
    { label: "Fundamentos-chave", items: analise.fundamentosChave, tone: "text-foreground/75" },
    { label: "Precedentes citados", items: analise.precedentesCitados, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Observações", items: analise.observacoesRelevantes, tone: "text-amber-600 dark:text-amber-400" },
  ];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-violet-500" />
        <span className="text-[9px] uppercase tracking-widest font-semibold text-violet-500">Análise IA</span>
      </div>
      {blocks.filter(b => (b.items?.length ?? 0) > 0).map(b => (
        <div key={b.label}>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 block mb-0.5">{b.label}</span>
          <ul className="space-y-0.5">
            {b.items!.map((it, i) => (
              <li key={i} className={cn("text-[11px] leading-snug flex gap-1.5", b.tone)}>
                <span className="text-muted-foreground/40 shrink-0">›</span>{it}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {analise.impactoParaDefesa && (
        <div className="rounded-md bg-violet-50/60 dark:bg-violet-500/[0.06] px-2.5 py-2">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-violet-500 block mb-0.5">Impacto para a defesa</span>
          <p className="text-[11px] text-foreground/80 leading-snug">{analise.impactoParaDefesa}</p>
        </div>
      )}
      {analise.recomendacaoProxPasso && (
        <div className="flex items-start gap-1.5 text-[11px] text-foreground/75">
          <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-px" />
          <span><span className="font-medium">Próximo passo:</span> {analise.recomendacaoProxPasso}</span>
        </div>
      )}
    </div>
  );
}

// ─── Anexar Acórdão Dialog ────────────────────────────────────────────────

function AnexarAcordaoDialog({ open, onOpenChange, recursoId, relatorNome }: {
  open: boolean; onOpenChange: (v: boolean) => void; recursoId: number; relatorNome?: string;
}) {
  const [numero, setNumero] = useState("");
  const [data, setData] = useState("");
  const [resultado, setResultado] = useState("PROVIDO");
  const [votacao, setVotacao] = useState("");
  const [ementa, setEmenta] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.instanciaSuperior.createAcordao.useMutation({
    onSuccess: () => {
      toast.success("Acórdão juntado");
      utils.instanciaSuperior.getRecurso.invalidate({ id: recursoId });
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      onOpenChange(false);
      setNumero(""); setData(""); setVotacao(""); setEmenta("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="w-4 h-4" /> Juntar acórdão</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Número</Lbl><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº acórdão" className="font-mono text-[13px] h-9" /></div>
            <div><Lbl>Data julgamento</Lbl><Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="text-[13px] h-9" /></div>
          </div>
          <div>
            <Lbl>Resultado</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {["PROVIDO", "PARCIALMENTE_PROVIDO", "NAO_PROVIDO", "NAO_CONHECIDO", "CONCEDIDO", "DENEGADO"].map(k => (
                <button key={k} onClick={() => setResultado(k)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  resultado === k ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>{RESULTADO_CONFIG[k]?.label ?? k}</button>
              ))}
            </div>
          </div>
          <div><Lbl>Votação</Lbl><Input value={votacao} onChange={(e) => setVotacao(e.target.value)} placeholder="unanimidade / maioria 2x1" className="text-[13px] h-9" /></div>
          <div>
            <Lbl>Ementa</Lbl>
            <textarea value={ementa} onChange={(e) => setEmenta(e.target.value)} placeholder="Cole a ementa do acórdão..."
              className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate({ recursoId, numeroAcordao: numero || undefined, dataJulgamento: data || undefined, resultado, votacao: votacao || undefined, ementa: ementa || undefined, relator: relatorNome })}
            disabled={create.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? "Salvando..." : "Juntar acórdão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">{children}</label>;
}

// ─── Create Dialog ────────────────────────────────────────────────────────

function CreateRecursoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tipo, setTipo] = useState("APELACAO");
  const [tribunal, setTribunal] = useState<"TJBA" | "STJ" | "STF">("TJBA");
  const [numero, setNumero] = useState("");
  const [camara, setCamara] = useState("");
  const [resumo, setResumo] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.instanciaSuperior.createRecurso.useMutation({
    onSuccess: () => {
      toast.success("Recurso registrado");
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      onOpenChange(false);
      setNumero(""); setResumo("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2 font-serif"><Landmark className="w-4 h-4" /> Novo Recurso</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Lbl>Tribunal</Lbl>
            <div className="flex gap-1.5">
              {TRIBUNAIS.map(t => (
                <button key={t.key} onClick={() => setTribunal(t.key as any)} title={t.full} className={cn(
                  "text-[13px] px-3 py-2 rounded-lg border transition-all flex-1",
                  tribunal === t.key ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>Tipo de recurso</Lbl>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setTipo(k)} className={cn(
                  "text-[13px] px-3 py-2.5 rounded-lg border transition-all text-left",
                  tipo === k ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm shadow-emerald-500/10" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}>
                  <span className="text-[9px] font-mono font-bold text-neutral-400 mr-1.5">{TIPO_SHORT[k]}</span>{v}
                </button>
              ))}
            </div>
          </div>
          <div><Lbl>Número do recurso</Lbl><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="font-mono text-[13px] h-10" /></div>
          {tribunal === "TJBA" && (
            <div>
              <Lbl>Câmara criminal</Lbl>
              <div className="flex gap-1.5">
                {CAMARAS.map(c => (
                  <button key={c} onClick={() => setCamara(camara === c ? "" : c)} className={cn(
                    "text-[13px] px-3 py-2.5 rounded-lg border transition-all flex-1",
                    camara === c ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}>{c.replace(" Criminal", "")}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Lbl>Resumo</Lbl>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Breve descrição do recurso ou pedido..."
              className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[88px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
          <Button onClick={() => create.mutate({ tipo, tribunal, numeroRecurso: numero || undefined, camara: camara || undefined, resumo: resumo || undefined })}
            disabled={create.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
            {create.isPending ? "Salvando..." : "Registrar recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
