"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Landmark, Plus, Layers, BarChart3, Scale, Building2 } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { HeaderActionsBar, type HeaderAction } from "@/components/layouts/header/header-actions-bar";
import { TIPO_LABELS, STATUS_CONFIG, DIMENSOES, type Dimensao } from "@/components/instancia-superior/ds";
import { type EscopoModo } from "@/components/instancia-superior/logic";
import { DarkEscopoSwitch, DarkTribunalPills } from "@/components/instancia-superior/header-controls";
import { SuperiorKpiRow } from "@/components/instancia-superior/kpi-strip";
import { CarteiraActiveFilters, type FilterChipItem } from "@/components/instancia-superior/carteira-active-filters";
import { VisaoGeral } from "@/components/instancia-superior/visao-geral";
import { RecursosTab } from "@/components/instancia-superior/recursos-tab";
import { ComparativosTab } from "@/components/instancia-superior/comparativos-tab";
import { RelatoriasTab } from "@/components/instancia-superior/relatorias-tab";
import { RecursoDetailSheet } from "@/components/instancia-superior/recurso-detail-sheet";
import { DesembargadorSheet } from "@/components/instancia-superior/desembargador-sheet";
import { NewAppealDialog } from "@/components/instancia-superior/new-appeal-dialog";

// ─── Tabs ─────────────────────────────────────────────────────────────────

type Tab = "geral" | "recursos" | "relatorias" | "comparativos";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "geral", label: "Visão geral", icon: BarChart3 },
  { key: "recursos", label: "Recursos", icon: Layers },
  { key: "relatorias", label: "Relatorias", icon: Scale },
  { key: "comparativos", label: "Comparativos", icon: Building2 },
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
  // Recorte institucional vindo do Comparativo (dimensão + valor → carteira).
  const [dimFilter, setDimFilter] = useState<{ dimensao: Dimensao; valor: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDesembId, setSelectedDesembId] = useState<number | null>(null);

  const effectiveModo: EscopoModo = podeInstitucional ? escopoModo : "meus";
  const escopo = useMemo(() => ({ modo: effectiveModo }), [effectiveModo]);

  // Escopo da carteira: o recorte do Comparativo (se houver) sobrepõe o modo.
  const carteiraEscopo = useMemo(
    () => (dimFilter
      ? { modo: "institucional" as const, dimensao: dimFilter.dimensao, valor: dimFilter.valor }
      : escopo),
    [dimFilter, escopo],
  );

  const { data: stats, isLoading: statsLoading } =
    trpc.instanciaSuperior.stats.useQuery({ escopo });
  const { data: recursosData, isLoading: recursosLoading } =
    trpc.instanciaSuperior.listRecursos.useQuery({
      escopo: carteiraEscopo, tribunal, tipo: filtroTipo, status: filtroStatus, camara: filtroCamara, limit: 60,
    });

  const rows = recursosData?.rows ?? [];
  const total = recursosData?.total ?? 0;
  const hasFilters = !!(filtroTipo || filtroStatus || filtroCamara);

  const visibleTabs = TABS.filter(t => t.key !== "comparativos" || podeInstitucional);

  // ── Ponte analytics → carteira ──────────────────────────────────────────
  function pickStatus(status: string) {
    setFiltroStatus((cur) => (cur === status ? undefined : status));
    setTab("recursos");
  }
  function pickGroup(dimensao: Dimensao, valor: string) {
    setDimFilter({ dimensao, valor });
    setTab("recursos");
  }
  function changeEscopo(v: EscopoModo) {
    setEscopoModo(v);
    setDimFilter(null); // recorte institucional não faz sentido ao trocar de modo
  }
  function clearAllFilters() {
    setFiltroTipo(undefined); setFiltroStatus(undefined); setFiltroCamara(undefined);
    setTribunal(undefined); setDimFilter(null);
  }

  const carteiraChips: FilterChipItem[] = [
    tribunal && { id: "tribunal", label: `Tribunal · ${tribunal}`, onRemove: () => setTribunal(undefined) },
    filtroTipo && { id: "tipo", label: `Tipo · ${TIPO_LABELS[filtroTipo] ?? filtroTipo}`, onRemove: () => setFiltroTipo(undefined) },
    filtroStatus && { id: "status", label: `Fase · ${STATUS_CONFIG[filtroStatus]?.label ?? filtroStatus}`, onRemove: () => setFiltroStatus(undefined) },
    filtroCamara && { id: "camara", label: `Câmara · ${filtroCamara}`, onRemove: () => setFiltroCamara(undefined) },
    dimFilter && { id: "dim", label: `${DIMENSOES.find(d => d.key === dimFilter.dimensao)?.label} · ${dimFilter.valor}`, onRemove: () => setDimFilter(null) },
  ].filter(Boolean) as FilterChipItem[];

  // ── Header rico (GlassHeaderShell + HeaderActionsBar) ───────────────────
  // HeaderSlotTitle (total+pendentes+emPauta) e o badge de collapsedStats
  // (mesmo `stats.total`, formato "N recursos") duplicavam o total — mantido
  // só o formato rico do HeaderSlotTitle em `stats`. accentHex (ACCENT) não
  // tem equivalente no shell ainda — perdido/deferido ao Lote E. O subtítulo
  // descritivo (subtituloDoModo) + badge "Visão institucional/Meus recursos"
  // (headerContext, Row 1) não têm slot equivalente — removidos sem
  // substituto (mesmo padrão de perda documentado em admin/vvd na Lote C);
  // o estado do escopo já fica visível no próprio DarkEscopoSwitch abaixo.
  const headerStats = (
    <span className="flex items-center gap-2 text-[11px] ml-1.5">
      <span className="text-white/85 font-semibold tabular-nums">{stats?.total ?? 0}</span>
      {(stats?.pendentes ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-white/55" title={`${stats?.pendentes} pendentes`}>
          <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
          <span className="font-medium tabular-nums">{stats?.pendentes}</span>
        </span>
      )}
      {(stats?.emPauta ?? 0) > 0 && (
        <span className="flex items-center gap-1 text-orange-300/80" title={`${stats?.emPauta} em pauta`}>
          <span className="w-1 h-1 rounded-full bg-orange-400/50 shrink-0" />
          <span className="font-medium tabular-nums">{stats?.emPauta}</span>
        </span>
      )}
    </span>
  );

  // Tabs → HeaderAction render, priority Infinity (navegação primária, nunca colapsa).
  // Wrapped em max-w + overflow-x-auto (precedente: admin/intimacoes tabs) como rede de
  // segurança em viewports estreitos — as 4 abas não têm variante colapsada própria.
  const tabsControl = (
    <div className="max-w-[45vw] overflow-x-auto scrollbar-none">
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
    </div>
  );

  const headerActions: HeaderAction[] = [
    { id: "tabs", label: "Seções", priority: Infinity, render: tabsControl },
    ...(podeInstitucional
      ? [{ id: "escopo", label: "Escopo", priority: Infinity, render: <DarkEscopoSwitch value={escopoModo} onChange={changeEscopo} /> }]
      : []),
    { id: "novo", label: "Novo recurso", icon: Plus, priority: Infinity, variant: "primary" as const, onSelect: () => setCreateOpen(true) },
  ];

  return (
    <div className="w-full min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Instância Superior"
        icon={Landmark}
        stats={headerStats}
        filters={
          <div className="max-w-[30vw] overflow-x-auto scrollbar-none">
            <DarkTribunalPills value={tribunal} onChange={setTribunal} porTribunal={stats?.porTribunal as any[] | undefined} />
          </div>
        }
        actions={<HeaderActionsBar actions={headerActions} />}
      />

      {/* Conteúdo */}
      <div className="px-5 md:px-8 py-3 md:py-4 space-y-3">
        {/* Faixa B — KPIs principais (persistente em todas as abas) */}
        <SuperiorKpiRow stats={stats} loading={statsLoading} />

        {tab === "geral" && (
          <VisaoGeral
            escopo={escopo} stats={stats} statsLoading={statsLoading}
            onOpenRecurso={setSelectedId} onPickStatus={pickStatus} activeStatus={filtroStatus}
          />
        )}
        {tab === "recursos" && (
          <div className="space-y-2.5">
            {carteiraChips.length > 0 && (
              <CarteiraActiveFilters chips={carteiraChips} onClearAll={clearAllFilters} />
            )}
            <RecursosTab
              rows={rows} total={total} loading={recursosLoading} hasFilters={hasFilters}
              onCreate={() => setCreateOpen(true)} onOpen={setSelectedId}
              filterProps={{ filtroTipo, filtroStatus, filtroCamara, setFiltroTipo, setFiltroStatus, setFiltroCamara }}
            />
          </div>
        )}
        {tab === "relatorias" && <RelatoriasTab escopo={escopo} onOpen={setSelectedDesembId} />}
        {tab === "comparativos" && podeInstitucional && <ComparativosTab onPick={pickGroup} />}
      </div>

      <NewAppealDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RecursoDetailSheet recursoId={selectedId} onClose={() => setSelectedId(null)} />
      <DesembargadorSheet desembId={selectedDesembId} onClose={() => setSelectedDesembId(null)} />
    </div>
  );
}
