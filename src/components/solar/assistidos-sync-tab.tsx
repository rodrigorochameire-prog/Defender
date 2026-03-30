"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────────

type SyncStatus = "exported" | "pending" | "no_cpf" | "error" | "unchecked";

interface AssistidoSync {
  id: number;
  nome: string;
  cpf: string | null;
  atribuicaoPrimaria: string | null;
  sigadId: string | null;
  sigadExportadoEm: Date | null;
  solarExportadoEm: Date | null;
  processosCount: number;
  demandasCount: number;
  statusSync: SyncStatus;
}

// ──────────────────────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SyncStatus, { label: string; color: string; icon: typeof Check }> = {
  exported: { label: "Solar", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Upload },
  no_cpf: { label: "Sem CPF", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  error: { label: "Erro", color: "bg-red-100 text-red-700 border-red-200", icon: AlertTriangle },
  unchecked: { label: "Verificar", color: "bg-muted text-muted-foreground border-border", icon: HelpCircle },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  GRUPO_JURI: "Grupo Júri",
  VVD_CAMACARI: "VVD",
  EXECUCAO_PENAL: "Exec. Penal",
  SUBSTITUICAO: "Substituição",
  SUBSTITUICAO_CIVEL: "Subst. Cível",
};

// ──────────────────────────────────────────────────────────────────────────────
// Componente Principal
// ──────────────────────────────────────────────────────────────────────────────

export function AssistidosSyncTab() {
  // State
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Query
  const { data, isLoading, refetch } = trpc.solar.dashboardAssistidosSync.useQuery({
    status: statusFilter as any,
    atribuicao: atribuicaoFilter !== "all" ? atribuicaoFilter : undefined,
    search: searchQuery || undefined,
    limit: 100,
    offset: 0,
  });

  // Mutations (reutilizando existentes)
  const exportarViaSigad = trpc.solar.exportarViaSigad.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`Exportado ao Solar com sucesso`);
      } else {
        toast.error(result.error || "Falha na exportação");
      }
      setActionInProgress(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setActionInProgress(null);
    },
  });

  const exportarBatch = trpc.solar.exportarBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`Batch: ${result.succeeded}/${result.total} exportados`);
      setSelectedIds(new Set());
      setActionInProgress(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setActionInProgress(null);
    },
  });

  const buscarNoSigad = trpc.solar.buscarNoSigad.useMutation({
    onSuccess: (result) => {
      if (result.encontrado) {
        toast.success(`Encontrado no SIGAD: ${result.nome}`);
      } else {
        toast.warning("Não encontrado no SIGAD");
      }
      setActionInProgress(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setActionInProgress(null);
    },
  });

  const sincronizarComSolar = trpc.solar.sincronizarComSolar.useMutation({
    onSuccess: (result) => {
      toast.success(`Sync: ${result.fases_criadas} fases criadas`);
      setActionInProgress(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setActionInProgress(null);
    },
  });

  // Derived
  const stats = data?.stats;
  const byAtribuicao = data?.byAtribuicao ?? [];
  const assistidosList = data?.assistidos ?? [];

  // Selection
  const exportableSelected = useMemo(() => {
    return assistidosList
      .filter(a => selectedIds.has(a.id) && a.statusSync === "pending")
      .map(a => a.id);
  }, [assistidosList, selectedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assistidosList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assistidosList.map(a => a.id)));
    }
  };

  // Actions
  const handleExportar = (assistidoId: number) => {
    setActionInProgress(assistidoId);
    exportarViaSigad.mutate({ assistidoId });
  };

  const handleBuscar = (assistidoId: number) => {
    setActionInProgress(assistidoId);
    buscarNoSigad.mutate({ assistidoId });
  };

  const handleSync = (assistidoId: number) => {
    setActionInProgress(assistidoId);
    sincronizarComSolar.mutate({ assistidoId });
  };

  const handleBatchExport = () => {
    if (exportableSelected.length === 0) {
      toast.warning("Nenhum assistido pendente selecionado");
      return;
    }
    setActionInProgress(-1);
    exportarBatch.mutate({ assistidoIds: exportableSelected });
  };

  // Helpers
  const formatDate = (d: Date | string | null) => {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando dados de sync...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assistidos × Solar</h3>
          <p className="text-sm text-muted-foreground">
            Status de sincronização dos assistidos com SIGAD e Solar
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Total"
            value={stats.total}
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <KpiCard
            label="Solar"
            value={stats.exportedSolar}
            color="emerald"
            active={statusFilter === "exported"}
            onClick={() => setStatusFilter("exported")}
          />
          <KpiCard
            label="Pendentes"
            value={stats.pending}
            color="amber"
            active={statusFilter === "pending"}
            onClick={() => setStatusFilter("pending")}
          />
          <KpiCard
            label="Sem CPF"
            value={stats.noCpf}
            color="red"
            active={statusFilter === "no_cpf"}
            onClick={() => setStatusFilter("no_cpf")}
          />
          <KpiCard
            label="Erros"
            value={stats.errors}
            color="red"
            active={statusFilter === "error"}
            onClick={() => setStatusFilter("error")}
          />
        </div>
      )}

      {/* Progress bars por atribuição */}
      {byAtribuicao.length > 0 && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Cobertura Solar por Atribuição
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {byAtribuicao.map(a => (
                <div key={a.atribuicao} className="flex items-center gap-2">
                  <span className="text-xs w-20 truncate text-muted-foreground">
                    {a.label}
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        a.percentage >= 80 ? "bg-emerald-500" :
                        a.percentage >= 50 ? "bg-amber-500" : "bg-red-400"
                      )}
                      style={{ width: `${a.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-12 text-right text-muted-foreground">
                    {a.exported}/{a.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros + Batch */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={atribuicaoFilter} onValueChange={setAtribuicaoFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Atribuição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="JURI">Júri</SelectItem>
            <SelectItem value="VVD">VVD</SelectItem>
            <SelectItem value="EXECUCAO">Exec. Penal</SelectItem>
            <SelectItem value="SUBSTITUICAO">Substituição</SelectItem>
            <SelectItem value="SUBSTITUICAO_CIVEL">Subst. Cível</SelectItem>
          </SelectContent>
        </Select>

        {exportableSelected.length > 0 && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleBatchExport}
            disabled={actionInProgress !== null}
          >
            {actionInProgress === -1 ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Exportar ({exportableSelected.length})
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={assistidosList.length > 0 && selectedIds.size === assistidosList.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Atribuição</TableHead>
              <TableHead>SIGAD</TableHead>
              <TableHead>Solar</TableHead>
              <TableHead className="text-center">Proc.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assistidosList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  Nenhum assistido encontrado com os filtros selecionados
                </TableCell>
              </TableRow>
            ) : (
              assistidosList.map(a => {
                const statusCfg = STATUS_CONFIG[a.statusSync];
                const StatusIcon = statusCfg.icon;
                const isActing = actionInProgress === a.id;

                return (
                  <TableRow key={a.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(a.id)}
                        onCheckedChange={() => toggleSelect(a.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {a.nome}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {a.cpf || <span className="text-red-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {ATRIBUICAO_LABELS[a.atribuicaoPrimaria || ""] || a.atribuicaoPrimaria || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {a.sigadId ? (
                        <span className="text-xs text-emerald-600 font-mono">#{a.sigadId}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.solarExportadoEm ? (
                        <span className="text-xs text-emerald-600">
                          ✓ {formatDate(a.solarExportadoEm)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-mono">{a.processosCount}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs gap-1", statusCfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto text-emerald-500" />
                      ) : (
                        <ActionButton
                          status={a.statusSync}
                          onExportar={() => handleExportar(a.id)}
                          onBuscar={() => handleBuscar(a.id)}
                          onSync={() => handleSync(a.id)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Footer */}
      <p className="text-xs text-center text-muted-foreground">
        {data?.total ?? 0} assistido(s) {statusFilter !== "all" ? `com filtro "${statusFilter}"` : "no total"}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color?: "emerald" | "amber" | "red";
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses = {
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-500",
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        active && "ring-2 ring-emerald-500/50 shadow-md",
      )}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4 text-center">
        <p className={cn("text-2xl font-bold", color ? colorClasses[color] : "")}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ActionButton({
  status,
  onExportar,
  onBuscar,
  onSync,
}: {
  status: SyncStatus;
  onExportar: () => void;
  onBuscar: () => void;
  onSync: () => void;
}) {
  switch (status) {
    case "exported":
      return (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onSync}>
          <UserCheck className="mr-1 h-3 w-3" />
          Sync
        </Button>
      );
    case "pending":
      return (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={onExportar}
        >
          <Upload className="mr-1 h-3 w-3" />
          Exportar
        </Button>
      );
    case "error":
      return (
        <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600" onClick={onExportar}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retentar
        </Button>
      );
    case "unchecked":
      return (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onBuscar}>
          <Search className="mr-1 h-3 w-3" />
          Verificar
        </Button>
      );
    case "no_cpf":
      return (
        <span className="text-xs text-muted-foreground" title="Sem CPF — não é possível exportar">
          Sem CPF
        </span>
      );
    default:
      return null;
  }
}
