"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Scale,
  Plus,
  MoreVertical,
  TrendingUp,
  Clock,
  Gavel,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Filter,
  Loader2,
  Trash2,
  Edit3,
} from "lucide-react";

// ============================================
// CONSTANTS
// ============================================

const STATUS_CONFIG = {
  interposta: { label: "Interposta", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400", step: 0 },
  admitida: { label: "Admitida", color: "bg-sky-500", textColor: "text-sky-600 dark:text-sky-400", step: 1 },
  em_julgamento: { label: "Em julgamento", color: "bg-violet-500", textColor: "text-violet-600 dark:text-violet-400", step: 2 },
  julgada: { label: "Julgada", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400", step: 3 },
  transitada: { label: "Transitada", color: "bg-zinc-500", textColor: "text-zinc-600 dark:text-zinc-400", step: 4 },
} as const;

const RESULTADO_CONFIG = {
  provido: { label: "Provido", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  parcialmente_provido: { label: "Parc. Provido", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  improvido: { label: "Improvido", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30" },
  nao_conhecido: { label: "Não Conhecido", color: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-950/30" },
} as const;

const STEPS = ["Interposta", "Admitida", "Em Julgamento", "Julgada", "Transitada"];

// ============================================
// STATUS STEPPER
// ============================================

function StatusStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i <= currentStep ? Object.values(STATUS_CONFIG)[i].color : "bg-zinc-200 dark:bg-zinc-700"
            )}
            title={step}
          />
          {i < STEPS.length - 1 && (
            <div className={cn("w-3 h-px", i < currentStep ? "bg-zinc-400" : "bg-zinc-200 dark:bg-zinc-700")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

function StatInline({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800/80">
      <Icon className="w-4 h-4 text-zinc-400" />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

// ============================================
// NEW RECURSO DIALOG
// ============================================

function NovoRecursoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sessaoId, setSessaoId] = useState<string>("");
  const [dataInterposicao, setDataInterposicao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: sessoesCondenadas, isLoading: loadingSessoes } =
    trpc.posJuri.listSessoesCondenadas.useQuery();

  const utils = trpc.useUtils();
  const createMutation = trpc.posJuri.createRecurso.useMutation({
    onSuccess: () => {
      utils.posJuri.listRecursos.invalidate();
      utils.posJuri.statsRecursos.invalidate();
      onOpenChange(false);
      setSessaoId("");
      setDataInterposicao("");
      setObservacoes("");
    },
  });

  const handleCreate = () => {
    if (!sessaoId) return;
    createMutation.mutate({
      sessaoJuriId: Number(sessaoId),
      dataInterposicao: dataInterposicao || undefined,
      observacoes: observacoes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Nova Apelação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sessão de Júri (condenação)</Label>
            {loadingSessoes ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={sessaoId} onValueChange={setSessaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a sessão..." />
                </SelectTrigger>
                <SelectContent>
                  {sessoesCondenadas?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.assistidoNome || "Réu"} — {s.numeroAutos || "S/N"} (
                      {s.dataSessao
                        ? new Date(s.dataSessao).toLocaleDateString("pt-BR")
                        : "S/D"}
                      )
                    </SelectItem>
                  ))}
                  {(!sessoesCondenadas || sessoesCondenadas.length === 0) && (
                    <SelectItem value="_none" disabled>
                      Nenhuma sessão com condenação
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data da interposição</Label>
            <Input
              type="date"
              value={dataInterposicao}
              onChange={(e) => setDataInterposicao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre a apelação..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!sessaoId || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Registrar Apelação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// EDIT RECURSO DIALOG
// ============================================

function EditarRecursoDialog({
  recurso,
  open,
  onOpenChange,
}: {
  recurso: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState(recurso?.status || "interposta");
  const [turmaTJBA, setTurmaTJBA] = useState(recurso?.turmaTJBA || "");
  const [camaraTJBA, setCamaraTJBA] = useState(recurso?.camaraTJBA || "");
  const [relator, setRelator] = useState(recurso?.relator || "");
  const [dataAdmissao, setDataAdmissao] = useState(recurso?.dataAdmissao || "");
  const [dataJulgamento, setDataJulgamento] = useState(recurso?.dataJulgamento || "");
  const [resultadoApelacao, setResultadoApelacao] = useState(recurso?.resultadoApelacao || "");
  const [houveREsp, setHouveREsp] = useState(recurso?.houveREsp || false);
  const [resultadoREsp, setResultadoREsp] = useState(recurso?.resultadoREsp || "");
  const [houveRE, setHouveRE] = useState(recurso?.houveRE || false);
  const [resultadoRE, setResultadoRE] = useState(recurso?.resultadoRE || "");
  const [observacoes, setObservacoes] = useState(recurso?.observacoes || "");

  const utils = trpc.useUtils();
  const updateMutation = trpc.posJuri.updateRecurso.useMutation({
    onSuccess: () => {
      utils.posJuri.listRecursos.invalidate();
      utils.posJuri.statsRecursos.invalidate();
      onOpenChange(false);
    },
  });

  const handleUpdate = () => {
    if (!recurso) return;
    updateMutation.mutate({
      id: recurso.id,
      status: status as any,
      turmaTJBA: turmaTJBA || null,
      camaraTJBA: camaraTJBA || null,
      relator: relator || null,
      dataAdmissao: dataAdmissao || null,
      dataJulgamento: dataJulgamento || null,
      resultadoApelacao: resultadoApelacao ? (resultadoApelacao as any) : null,
      houveREsp,
      resultadoREsp: resultadoREsp ? (resultadoREsp as any) : null,
      houveRE,
      resultadoRE: resultadoRE ? (resultadoRE as any) : null,
      observacoes: observacoes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Editar Apelação — {recurso?.reuNome || "Réu"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* TJBA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Turma TJBA</Label>
              <Input
                placeholder="Ex: 1ª Turma"
                value={turmaTJBA}
                onChange={(e) => setTurmaTJBA(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Câmara TJBA</Label>
              <Input
                placeholder="Ex: 1ª Câm. Criminal"
                value={camaraTJBA}
                onChange={(e) => setCamaraTJBA(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Relator</Label>
            <Input
              placeholder="Nome do relator"
              value={relator}
              onChange={(e) => setRelator(e.target.value)}
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data admissão</Label>
              <Input
                type="date"
                value={dataAdmissao}
                onChange={(e) => setDataAdmissao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data julgamento</Label>
              <Input
                type="date"
                value={dataJulgamento}
                onChange={(e) => setDataJulgamento(e.target.value)}
              />
            </div>
          </div>

          {/* Resultado */}
          <div className="space-y-2">
            <Label>Resultado da apelação</Label>
            <Select value={resultadoApelacao} onValueChange={setResultadoApelacao}>
              <SelectTrigger>
                <SelectValue placeholder="Pendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provido">Provido</SelectItem>
                <SelectItem value="parcialmente_provido">Parcialmente Provido</SelectItem>
                <SelectItem value="improvido">Improvido</SelectItem>
                <SelectItem value="nao_conhecido">Não Conhecido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* REsp */}
          <div className="space-y-3 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={houveREsp}
                onChange={(e) => setHouveREsp(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Houve Recurso Especial (STJ)
              </span>
            </label>
            {houveREsp && (
              <Select value={resultadoREsp} onValueChange={setResultadoREsp}>
                <SelectTrigger>
                  <SelectValue placeholder="Resultado REsp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provido">Provido</SelectItem>
                  <SelectItem value="improvido">Improvido</SelectItem>
                  <SelectItem value="nao_conhecido">Não Conhecido</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* RE */}
          <div className="space-y-3 p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={houveRE}
                onChange={(e) => setHouveRE(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Houve Recurso Extraordinário (STF)
              </span>
            </label>
            {houveRE && (
              <Select value={resultadoRE} onValueChange={setResultadoRE}>
                <SelectTrigger>
                  <SelectValue placeholder="Resultado RE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provido">Provido</SelectItem>
                  <SelectItem value="improvido">Improvido</SelectItem>
                  <SelectItem value="nao_conhecido">Não Conhecido</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
            {updateMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// RECURSO CARD
// ============================================

function RecursoCard({
  recurso,
  onEdit,
  onDelete,
}: {
  recurso: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusCfg = STATUS_CONFIG[recurso.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.interposta;
  const resultadoCfg = recurso.resultadoApelacao
    ? RESULTADO_CONFIG[recurso.resultadoApelacao as keyof typeof RESULTADO_CONFIG]
    : null;

  return (
    <div className="group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:shadow-md hover:shadow-zinc-200/50 dark:hover:shadow-black/20 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {recurso.reuNome || "Réu não identificado"}
          </h3>
          <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
            {recurso.numeroAutos || "Processo S/N"}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-rose-600 dark:text-rose-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status stepper */}
      <div className="mb-3">
        <StatusStepper currentStep={statusCfg.step} />
        <p className={cn("text-xs font-medium mt-1", statusCfg.textColor)}>
          {statusCfg.label}
        </p>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {recurso.comarca && (
          <div>
            <span className="text-zinc-400">Comarca</span>
            <p className="text-zinc-600 dark:text-zinc-300">{recurso.comarca}</p>
          </div>
        )}
        {recurso.dataSessao && (
          <div>
            <span className="text-zinc-400">Sessão</span>
            <p className="text-zinc-600 dark:text-zinc-300">
              {new Date(recurso.dataSessao).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}
        {recurso.dataInterposicao && (
          <div>
            <span className="text-zinc-400">Interposição</span>
            <p className="text-zinc-600 dark:text-zinc-300">
              {new Date(recurso.dataInterposicao).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}
        {(recurso.turmaTJBA || recurso.camaraTJBA) && (
          <div>
            <span className="text-zinc-400">TJBA</span>
            <p className="text-zinc-600 dark:text-zinc-300">
              {[recurso.turmaTJBA, recurso.camaraTJBA].filter(Boolean).join(" / ")}
            </p>
          </div>
        )}
        {recurso.relator && (
          <div>
            <span className="text-zinc-400">Relator</span>
            <p className="text-zinc-600 dark:text-zinc-300">{recurso.relator}</p>
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultadoCfg && (
        <div className={cn("mt-3 px-2 py-1.5 rounded-lg text-xs font-medium", resultadoCfg.bg, resultadoCfg.color)}>
          Apelação: {resultadoCfg.label}
        </div>
      )}

      {/* REsp / RE badges */}
      {(recurso.houveREsp || recurso.houveRE) && (
        <div className="flex gap-2 mt-2">
          {recurso.houveREsp && (
            <Badge variant="outline" className="text-[10px]">
              REsp{recurso.resultadoREsp ? `: ${recurso.resultadoREsp}` : ""}
            </Badge>
          )}
          {recurso.houveRE && (
            <Badge variant="outline" className="text-[10px]">
              RE{recurso.resultadoRE ? `: ${recurso.resultadoRE}` : ""}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function RecursosPage() {
  const [filtroStatus, setFiltroStatus] = useState("all");
  const [dialogNovoOpen, setDialogNovoOpen] = useState(false);
  const [editingRecurso, setEditingRecurso] = useState<any>(null);

  const { data: recursos, isLoading } = trpc.posJuri.listRecursos.useQuery(
    filtroStatus !== "all" ? { status: filtroStatus } : undefined
  );

  const { data: stats } = trpc.posJuri.statsRecursos.useQuery();

  const utils = trpc.useUtils();
  const deleteMutation = trpc.posJuri.deleteRecurso.useMutation({
    onSuccess: () => {
      utils.posJuri.listRecursos.invalidate();
      utils.posJuri.statsRecursos.invalidate();
    },
  });

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Scale className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Recursos
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Acompanhamento de apelações pós-júri
              </p>
            </div>
          </div>

          <Button onClick={() => setDialogNovoOpen(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Nova Apelação
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3">
          <StatInline
            label="Ativos"
            value={stats?.ativos ?? "—"}
            icon={Clock}
          />
          <StatInline
            label="Aguardando julgamento"
            value={stats?.aguardandoJulgamento ?? "—"}
            icon={Gavel}
          />
          <StatInline
            label="Taxa de êxito"
            value={stats?.taxaExito != null ? `${stats.taxaExito}%` : "—"}
            icon={TrendingUp}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-zinc-400" />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : recursos && recursos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recursos.map((r) => (
              <RecursoCard
                key={r.id}
                recurso={r}
                onEdit={() => setEditingRecurso(r)}
                onDelete={() => {
                  if (confirm("Excluir esta apelação?")) {
                    deleteMutation.mutate({ id: r.id });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Scale className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Nenhuma apelação registrada
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Registre apelações após sessões de júri com condenação
            </p>
            <Button
              variant="outline"
              onClick={() => setDialogNovoOpen(true)}
              className="cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar primeira apelação
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <NovoRecursoDialog
          open={dialogNovoOpen}
          onOpenChange={setDialogNovoOpen}
        />

        {editingRecurso && (
          <EditarRecursoDialog
            recurso={editingRecurso}
            open={!!editingRecurso}
            onOpenChange={(open) => {
              if (!open) setEditingRecurso(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
