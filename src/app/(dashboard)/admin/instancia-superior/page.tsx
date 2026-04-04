"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Landmark,
  Plus,
  Scale,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { ptBR } from "date-fns/locale";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  INTERPOSTO: { label: "Interposto", color: "text-blue-500", icon: Clock },
  DISTRIBUIDO: { label: "Distribuído", color: "text-amber-500", icon: Clock },
  CONCLUSO: { label: "Concluso", color: "text-purple-500", icon: FileText },
  PAUTADO: { label: "Pautado", color: "text-orange-500", icon: AlertTriangle },
  JULGADO: { label: "Julgado", color: "text-emerald-500", icon: CheckCircle2 },
  TRANSITADO: { label: "Transitado", color: "text-neutral-400", icon: CheckCircle2 },
};

const RESULTADO_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE: { label: "Pendente", color: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
  PROVIDO: { label: "Provido", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  PARCIALMENTE_PROVIDO: { label: "Parc. Provido", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  NAO_PROVIDO: { label: "Não Provido", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  NAO_CONHECIDO: { label: "Não Conhecido", color: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
  PREJUDICADO: { label: "Prejudicado", color: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
  CONCEDIDO: { label: "Concedido", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  PARCIALMENTE_CONCEDIDO: { label: "Parc. Concedido", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  DENEGADO: { label: "Denegado", color: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Instância Superior</h1>
              <p className="text-[13px] text-muted-foreground">Recursos criminais no TJBA</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Novo Recurso
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total"
            value={stats?.total ?? 0}
            icon={Scale}
            loading={statsLoading}
          />
          <StatCard
            label="Pendentes"
            value={stats?.pendentes ?? 0}
            icon={Clock}
            loading={statsLoading}
            highlight={Number(stats?.pendentes ?? 0) > 0}
          />
          <StatCard
            label="Câmaras"
            value={stats?.porCamara?.length ?? 0}
            icon={Gavel}
            loading={statsLoading}
          />
          <StatCard
            label="Tipos"
            value={stats?.porTipo?.length ?? 0}
            icon={FileText}
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Filters + Results */}
      <div className="px-6 flex-1 overflow-auto pb-6">
        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-4">
          <FilterDropdown
            label="Tipo"
            value={filtroTipo}
            options={Object.entries(TIPO_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            onChange={setFiltroTipo}
          />
          <FilterDropdown
            label="Status"
            value={filtroStatus}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
            onChange={setFiltroStatus}
          />
          <FilterDropdown
            label="Câmara"
            value={filtroCamara}
            options={CAMARAS.map(c => ({ value: c, label: c }))}
            onChange={setFiltroCamara}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => { setFiltroTipo(undefined); setFiltroStatus(undefined); setFiltroCamara(undefined); }}
            >
              Limpar
            </Button>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {total} {total === 1 ? "recurso" : "recursos"}
          </span>
        </div>

        {/* Results */}
        {recursosLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {hasFilters ? "Nenhum recurso encontrado com esses filtros" : "Nenhum recurso registrado"}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Registrar primeiro recurso
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <RecursoCard key={r.id} recurso={r} />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateRecursoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/60 dark:border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500">
          {label}
        </span>
        <Icon className={cn("w-4 h-4", highlight ? "text-amber-500" : "text-neutral-300 dark:text-neutral-600")} />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-12 mt-2" />
      ) : (
        <p className={cn("text-2xl font-bold mt-1", highlight ? "text-amber-600 dark:text-amber-400" : "text-neutral-800 dark:text-neutral-200")}>
          {value}
        </p>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", value && "border-emerald-500/50 text-emerald-600 dark:text-emerald-400")}>
          <Filter className="w-3 h-3" />
          {selectedLabel || label}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {value && (
          <>
            <DropdownMenuItem onClick={() => onChange(undefined)} className="text-xs text-muted-foreground">
              Todos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {options.map(o => (
          <DropdownMenuItem
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn("text-xs", o.value === value && "font-semibold text-emerald-600")}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecursoCard({ recurso: r }: { recurso: any }) {
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.INTERPOSTO;
  const resultadoCfg = RESULTADO_CONFIG[r.resultado] ?? RESULTADO_CONFIG.PENDENTE;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="bg-neutral-50 dark:bg-white/[0.04] border border-neutral-200/60 dark:border-white/[0.06] rounded-xl p-4 hover:bg-neutral-100 dark:hover:bg-white/[0.07] transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Row 1: Tipo + Número */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {TIPO_LABELS[r.tipo] ?? r.tipo}
            </span>
            {r.numeroRecurso && (
              <>
                <span className="w-px h-3.5 bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-[12px] font-mono text-neutral-500 dark:text-neutral-400">
                  {r.numeroRecurso}
                </span>
              </>
            )}
          </div>

          {/* Row 2: Assistido + Processo */}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
            {r.assistidoNome && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {r.assistidoNome}
              </span>
            )}
            {r.processoNumero && (
              <>
                <span>·</span>
                <span className="font-mono">{r.processoNumero}</span>
              </>
            )}
            {r.camara && (
              <>
                <span>·</span>
                <span>{r.camara}</span>
              </>
            )}
            {r.relatorNome && (
              <>
                <span>·</span>
                <span>Rel. {r.relatorNome}</span>
              </>
            )}
          </div>

          {/* Row 3: Teses */}
          {r.tesesInvocadas?.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {(r.tesesInvocadas as string[]).slice(0, 3).map((t: string, i: number) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-200/60 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                  {t}
                </span>
              ))}
              {r.tesesInvocadas.length > 3 && (
                <span className="text-[10px] text-neutral-400">+{r.tesesInvocadas.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Status + Resultado */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={cn("w-3.5 h-3.5", statusCfg.color)} />
            <span className={cn("text-[11px] font-medium", statusCfg.color)}>{statusCfg.label}</span>
          </div>
          {r.resultado !== "PENDENTE" && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-medium", resultadoCfg.color)}>
              {resultadoCfg.label}
            </span>
          )}
          {r.dataInterposicao && (
            <span className="text-[10px] text-neutral-400 font-mono">
              {format(new Date(r.dataInterposicao), "dd/MM/yy")}
            </span>
          )}
        </div>
      </div>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Novo Recurso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div>
            <label className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTipo(k)}
                  className={cn(
                    "text-xs px-3 py-2 rounded-lg border transition-colors text-left",
                    tipo === k
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Número */}
          <div>
            <label className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Número do recurso
            </label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
              className="font-mono text-sm"
            />
          </div>

          {/* Câmara */}
          <div>
            <label className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Câmara
            </label>
            <div className="flex gap-1.5">
              {CAMARAS.map(c => (
                <button
                  key={c}
                  onClick={() => setCamara(c)}
                  className={cn(
                    "text-xs px-3 py-2 rounded-lg border transition-colors flex-1",
                    camara === c
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
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
            <label className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-1.5 block">
              Resumo
            </label>
            <textarea
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Breve descrição do recurso..."
              className="w-full text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
          >
            {create.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
