// ─── Recursos Tab (carteira operacional) ──────────────────────────────────
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Landmark, Plus, Filter, ChevronRight, ArrowDownNarrowWide } from "lucide-react";
import { GLASS } from "@/lib/config/design-tokens";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { TIPO_LABELS, TIPO_SHORT, STATUS_CONFIG, RESULTADO_CONFIG, CAMARAS } from "./ds";
import { FilterChip, FilterGroup, Dot } from "./primitives";
import { ordenarCarteira, prioridadeRecurso } from "./logic";

export function RecursosTab({
  rows, total, loading, hasFilters, onCreate, onOpen, filterProps,
}: {
  rows: any[]; total: number; loading: boolean; hasFilters: boolean;
  onCreate: () => void; onOpen: (id: number) => void; filterProps: any;
}) {
  // Carteira priorizada: em pauta → urgente → aguardando providência → regular.
  const ordered = useMemo(() => ordenarCarteira(rows), [rows]);
  return (
    <div className="bg-white dark:bg-[#1c1c1f] rounded-xl border border-neutral-200/70 dark:border-white/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-neutral-200/60 dark:border-white/[0.04]">
        <span className="text-[11px] text-muted-foreground font-mono tabular-nums mr-auto">
          {total} {total === 1 ? "recurso" : "recursos"}
        </span>
        {ordered.length > 1 && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <ArrowDownNarrowWide className="w-3 h-3" /> prioridade
          </span>
        )}
        <FiltersButton {...filterProps} />
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}</div>
        ) : ordered.length === 0 ? (
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
          <div className="space-y-1.5">{ordered.map((r) => <RecursoRow key={r.id} recurso={r} onClick={() => onOpen(r.id)} />)}</div>
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

export function RecursoRow({ recurso: r, onClick }: { recurso: any; onClick: () => void }) {
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.INTERPOSTO;
  const resultadoCfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
  const tipoShort = TIPO_SHORT[r.tipo] ?? r.tipo;
  const emPauta = prioridadeRecurso(r) === 0; // PAUTADO ou data de pauta futura
  return (
    <button onClick={onClick} className={cn(
      GLASS.cardHover, "p-4 rounded-xl w-full text-left cursor-pointer",
      emPauta && "border-l-2 border-l-orange-400/70",
    )}>
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
            {emPauta && r.dataPauta && (
              <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 font-medium tabular-nums">
                Em pauta {format(new Date(r.dataPauta), "dd/MM")}
              </span>
            )}
            {r.assistidoNome && <span className="truncate max-w-[140px]">{r.assistidoNome}</span>}
            {r.assistidoNome && r.camara && <Dot />}
            {r.camara && <span>{r.camara}</span>}
            {r.relatorNome && <><Dot /><span>Rel. {r.relatorNome}</span></>}
            {r.dataInterposicao && <><Dot /><span className="font-mono tabular-nums">{format(new Date(r.dataInterposicao), "dd/MM/yy")}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5" title={statusCfg.label}>
            <div className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            <span className="hidden sm:inline text-[11px] text-muted-foreground">{statusCfg.label}</span>
          </div>
          {r.resultado !== "PENDENTE" && (
            <>
              <span className="hidden sm:inline w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
              <span className={cn("text-[10px] sm:text-[11px] font-semibold", resultadoCfg.color)}>{resultadoCfg.label}</span>
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
