"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  Landmark,
  Plus,
  Scale,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Filter,
  ChevronDown,
  Users,
  Gavel,
} from "lucide-react";
import { HEADER_STYLE, GLASS, LIST_ITEM } from "@/lib/config/design-tokens";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────

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

const CAMARAS = ["1ª Câmara Criminal", "2ª Câmara Criminal", "Seção Criminal"];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function InstanciaSuperiorPage() {
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroStatus, setFiltroStatus] = useState<string | undefined>();
  const [filtroCamara, setFiltroCamara] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.instanciaSuperior.stats.useQuery();
  const { data: recursosData, isLoading: recursosLoading } = trpc.instanciaSuperior.listRecursos.useQuery({
    tipo: filtroTipo,
    status: filtroStatus,
    camara: filtroCamara,
    limit: 50,
  });

  const rows = recursosData?.rows ?? [];
  const total = recursosData?.total ?? 0;
  const hasFilters = filtroTipo || filtroStatus || filtroCamara;

  // Derive stats
  const providos = stats?.porResultado?.filter(
    (r: any) => r.resultado === "PROVIDO" || r.resultado === "CONCEDIDO"
  ).reduce((s: number, r: any) => s + Number(r.total), 0) ?? 0;
  const julgados = stats?.porResultado?.reduce((s: number, r: any) => s + Number(r.total), 0) ?? 0;
  const taxaProvimento = julgados > 0 ? ((providos / julgados) * 100).toFixed(0) : "—";

  return (
    <div className="flex flex-col h-full">
      {/* ── Header: dark gradient (Padrão Defender v3) ── */}
      <div className={cn(HEADER_STYLE.container, "mx-4 lg:mx-6 mt-3 px-5 pt-5 pb-1")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4a4a52] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white/90" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-semibold tracking-tight text-white">
                Instância Superior
              </h1>
              <p className="text-[11px] text-white/70 mt-0.5">
                Recursos criminais · TJBA
              </p>
            </div>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Recurso
          </Button>
        </div>

        {/* Stats row — inside header */}
        <div className={cn("grid grid-cols-4 gap-3 mx-3 mt-3 mb-2.5", HEADER_STYLE.bottomRow)}>
          <HeaderStat label="Total" value={stats?.total ?? 0} loading={statsLoading} />
          <HeaderStat label="Pendentes" value={stats?.pendentes ?? 0} loading={statsLoading} highlight />
          <HeaderStat label="Julgados" value={julgados} loading={statsLoading} />
          <HeaderStat label="Taxa provimento" value={`${taxaProvimento}%`} loading={statsLoading} accent />
        </div>
      </div>

      {/* ── Content card ── */}
      <div className="mx-4 lg:mx-6 mt-2 bg-white dark:bg-neutral-900/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/40 overflow-hidden flex-1 flex flex-col min-h-0">

        {/* Filter Bar */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-neutral-200/60 dark:border-neutral-800/40">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {total} {total === 1 ? "recurso" : "recursos"}
          </span>
          <FiltersButton
            filtroTipo={filtroTipo}
            filtroStatus={filtroStatus}
            filtroCamara={filtroCamara}
            setFiltroTipo={setFiltroTipo}
            setFiltroStatus={setFiltroStatus}
            setFiltroCamara={setFiltroCamara}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {recursosLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <Landmark className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
              </div>
              <p className="text-[13px] text-muted-foreground">
                {hasFilters ? "Nenhum recurso com esses filtros" : "Nenhum recurso registrado"}
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Registre apelações, habeas corpus e outros recursos no TJBA
              </p>
              <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                Registrar primeiro recurso
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((r: any) => (
                <RecursoRow key={r.id} recurso={r} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <CreateRecursoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Header Stat ──────────────────────────────────────────────────────────

function HeaderStat({
  label,
  value,
  loading,
  highlight,
  accent,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg px-3.5 py-2.5 bg-[#56565e]">
      <span className="text-[9px] uppercase tracking-widest text-white/70 font-medium block">
        {label}
      </span>
      {loading ? (
        <div className="h-6 w-10 rounded bg-[#4a4a52] animate-pulse mt-1" />
      ) : (
        <span className={cn(
          "text-xl font-bold tabular-nums block mt-0.5",
          accent ? "text-emerald-400" : highlight ? "text-amber-400" : "text-white/90"
        )}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────

function FiltersButton({
  filtroTipo,
  filtroStatus,
  filtroCamara,
  setFiltroTipo,
  setFiltroStatus,
  setFiltroCamara,
}: {
  filtroTipo: string | undefined;
  filtroStatus: string | undefined;
  filtroCamara: string | undefined;
  setFiltroTipo: (v: string | undefined) => void;
  setFiltroStatus: (v: string | undefined) => void;
  setFiltroCamara: (v: string | undefined) => void;
}) {
  const activeCount = [filtroTipo, filtroStatus, filtroCamara].filter(Boolean).length;
  const hasFilters = activeCount > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs h-8 rounded-lg",
            hasFilters && "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
          )}
        >
          <Filter className="w-3 h-3" />
          Filtros
          {hasFilters && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-4">
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">Tipo</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFiltroTipo(filtroTipo === k ? undefined : k)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border transition-colors",
                    filtroTipo === k
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">Status</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFiltroStatus(filtroStatus === k ? undefined : k)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1",
                    filtroStatus === k
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", v.dot)} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Câmara */}
          <div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">Câmara</span>
            <div className="flex flex-wrap gap-1">
              {CAMARAS.map(c => (
                <button
                  key={c}
                  onClick={() => setFiltroCamara(filtroCamara === c ? undefined : c)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border transition-colors",
                    filtroCamara === c
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Limpar */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground h-8"
              onClick={() => { setFiltroTipo(undefined); setFiltroStatus(undefined); setFiltroCamara(undefined); }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Recurso Row ──────────────────────────────────────────────────────────

function RecursoRow({ recurso: r }: { recurso: any }) {
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.INTERPOSTO;
  const resultadoCfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
  const tipoShort = TIPO_SHORT[r.tipo] ?? r.tipo;

  return (
    <div className={cn(GLASS.cardHover, "p-4 rounded-xl")}>
      <div className="flex items-center gap-4">
        {/* Badge tipo */}
        <div className="w-10 h-10 rounded-lg bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-white tracking-wider">{tipoShort}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Title */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/90 truncate">
              {TIPO_LABELS[r.tipo] ?? r.tipo}
            </span>
            {r.numeroRecurso && (
              <>
                <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-[12px] font-mono text-muted-foreground tracking-wide">
                  {r.numeroRecurso}
                </span>
              </>
            )}
          </div>

          {/* Row 2: Meta */}
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            {r.assistidoNome && (
              <span className="truncate max-w-[140px]">{r.assistidoNome}</span>
            )}
            {r.assistidoNome && r.camara && <span className="text-neutral-300 dark:text-neutral-600">·</span>}
            {r.camara && <span>{r.camara}</span>}
            {r.relatorNome && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span>Rel. {r.relatorNome}</span>
              </>
            )}
            {r.dataInterposicao && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="font-mono tabular-nums">
                  {format(new Date(r.dataInterposicao), "dd/MM/yy")}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Status + Resultado */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
            <span className="text-[11px] text-muted-foreground">{statusCfg.label}</span>
          </div>

          {/* Resultado */}
          {r.resultado !== "PENDENTE" && (
            <>
              <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
              <span className={cn("text-[11px] font-semibold", resultadoCfg.color)}>
                {resultadoCfg.label}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Teses row */}
      {r.tesesInvocadas?.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 ml-14 flex-wrap">
          {(r.tesesInvocadas as string[]).slice(0, 4).map((t: string, i: number) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/[0.06] text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {r.tesesInvocadas.length > 4 && (
            <span className="text-[10px] text-muted-foreground/50">+{r.tesesInvocadas.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Dialog ────────────────────────────────────────────────────────

function CreateRecursoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tipo, setTipo] = useState("APELACAO");
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
      setNumero("");
      setResumo("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Landmark className="w-4 h-4" />
            Novo Recurso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Tipo */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-2 block">
              Tipo de recurso
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTipo(k)}
                  className={cn(
                    "text-[13px] px-3 py-2.5 rounded-lg border transition-all text-left",
                    tipo === k
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm shadow-emerald-500/10"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}
                >
                  <span className="text-[9px] font-mono font-bold text-neutral-400 mr-1.5">{TIPO_SHORT[k]}</span>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Número */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Número do recurso
            </label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
              className="font-mono text-[13px] h-10"
            />
          </div>

          {/* Câmara */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Câmara criminal
            </label>
            <div className="flex gap-1.5">
              {CAMARAS.map(c => (
                <button
                  key={c}
                  onClick={() => setCamara(camara === c ? "" : c)}
                  className={cn(
                    "text-[13px] px-3 py-2.5 rounded-lg border transition-all flex-1",
                    camara === c
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm shadow-emerald-500/10"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}
                >
                  {c.replace(" Criminal", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Resumo
            </label>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Breve descrição do recurso ou pedido..."
              className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[88px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
            Cancelar
          </Button>
          <Button
            onClick={() => create.mutate({
              tipo,
              numeroRecurso: numero || undefined,
              camara: camara || undefined,
              resumo: resumo || undefined,
            })}
            disabled={create.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
          >
            {create.isPending ? "Salvando..." : "Registrar recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
