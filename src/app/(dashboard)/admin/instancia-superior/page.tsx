"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Landmark, Plus, Layers, BarChart3, Scale, Building2 } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { HeaderSlotTitle } from "@/components/layouts/header-slot-title";
import { ACCENT } from "@/components/instancia-superior/ds";
import type { EscopoModo } from "@/components/instancia-superior/logic";
import { DarkEscopoSwitch, DarkTribunalPills } from "@/components/instancia-superior/header-controls";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDesembId, setSelectedDesembId] = useState<number | null>(null);

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

  const visibleTabs = TABS.filter(t => t.key !== "comparativos" || podeInstitucional);

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
        {tab === "relatorias" && <RelatoriasTab escopo={escopo} onOpen={setSelectedDesembId} />}
        {tab === "comparativos" && podeInstitucional && <ComparativosTab />}
      </div>

      <NewAppealDialog open={createOpen} onOpenChange={setCreateOpen} />
      <RecursoDetailSheet recursoId={selectedId} onClose={() => setSelectedId(null)} />
      <DesembargadorSheet desembId={selectedDesembId} onClose={() => setSelectedDesembId(null)} />
    </div>
  );
}
