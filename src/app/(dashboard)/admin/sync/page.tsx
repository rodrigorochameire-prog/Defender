"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Wifi,
  WifiOff,
  Database,
  Trash2,
} from "lucide-react";
import { offlineDb, type ConflictItem, type SyncQueueItem } from "@/lib/offline/db";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ==========================================
// /admin/sync — Sync Status & Conflict Resolution
// ==========================================

// Human-readable labels for tables
const TABLE_LABELS: Record<string, string> = {
  assistidos: "Assistido",
  processos: "Processo",
  demandas: "Demanda",
  atendimentos: "Atendimento",
  casos: "Caso",
};

// Fields to skip in the diff (internal/metadata fields)
const SKIP_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "defensorId",
  "deletedAt",
]);

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Sim" : "Não";
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return new Date(val).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return val;
    }
  }
  return String(val);
}

export default function SyncPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, f] = await Promise.all([
        offlineDb.conflictQueue
          .filter((item) => !item.resolvedAt)
          .toArray(),
        offlineDb.syncQueue
          .where("status")
          .equals("pending")
          .toArray(),
        offlineDb.syncQueue
          .where("status")
          .equals("failed")
          .toArray(),
      ]);
      setConflicts(c);
      setPendingItems(p);
      setFailedItems(f);
    } catch (err) {
      console.error("[SyncPage] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadData]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Sincronização
          </h1>
          <p className="text-muted-foreground text-sm">
            Status da fila offline, conflitos pendentes e diagnóstico
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={isOnline ? "success" : "danger"}
            className="gap-1.5"
          >
            {isOnline ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isOnline ? "Online" : "Offline"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
            <p className="text-muted-foreground text-xs">
              Aguardando sincronização
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conflitos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflicts.length}</div>
            <p className="text-muted-foreground text-xs">
              Precisam de revisão manual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedItems.length}</div>
            <p className="text-muted-foreground text-xs">
              Excederam tentativas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts Section */}
      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Conflitos para Resolver
            </CardTitle>
            <CardDescription>
              Registros editados localmente e no servidor ao mesmo tempo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts.map((conflict) => (
              <ConflictCard
                key={conflict.id}
                conflict={conflict}
                onResolved={loadData}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Queue */}
      {pendingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Fila de Sincronização
            </CardTitle>
            <CardDescription>
              Operações que serão enviadas ao servidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <QueueItemRow key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Items */}
      {failedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Falhas Permanentes
            </CardTitle>
            <CardDescription>
              Operações que falharam após 3 tentativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {failedItems.map((item) => (
                <FailedItemRow
                  key={item.id}
                  item={item}
                  onRetry={loadData}
                  onDiscard={loadData}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading &&
        conflicts.length === 0 &&
        pendingItems.length === 0 &&
        failedItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-500" />
              <h3 className="text-lg font-semibold">Tudo sincronizado</h3>
              <p className="text-muted-foreground text-sm">
                Nenhum conflito ou operação pendente
              </p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

// ==========================================
// ConflictCard — Diff visual + resolution
// ==========================================

function ConflictCard({
  conflict,
  onResolved,
}: {
  conflict: ConflictItem;
  onResolved: () => void;
}) {
  const [serverData, setServerData] = useState<Record<string, unknown> | null>(
    null
  );
  const [resolving, setResolving] = useState(false);

  const getRecord = trpc.offline.getRecord.useQuery(
    {
      table: conflict.table as any,
      id: conflict.recordId,
    },
    { enabled: !!conflict.recordId }
  );

  const forceUpdate = trpc.offline.forceUpdate.useMutation();

  useEffect(() => {
    if (getRecord.data) {
      setServerData(getRecord.data as Record<string, unknown>);
    }
  }, [getRecord.data]);

  const local = conflict.localData;
  const server = serverData ?? conflict.serverData;

  // Compute diffing fields
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
  const diffFields: string[] = [];
  const sameFields: string[] = [];

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key)) continue;
    if (String(local[key] ?? "") !== String(server[key] ?? "")) {
      diffFields.push(key);
    } else {
      sameFields.push(key);
    }
  }

  const handleKeepLocal = async () => {
    setResolving(true);
    try {
      await forceUpdate.mutateAsync({
        table: conflict.table as any,
        id: conflict.recordId,
        data: local,
      });

      // Update IDB with local version
      const idbTable =
        offlineDb[
          conflict.table as
            | "assistidos"
            | "processos"
            | "demandas"
            | "atendimentos"
            | "casos"
        ];
      await idbTable.update(conflict.recordId, {
        ...local,
        updatedAt: new Date().toISOString(),
      } as any);

      // Mark conflict resolved
      await offlineDb.conflictQueue.update(conflict.id!, {
        resolvedAt: new Date().toISOString(),
        resolution: "local",
      });

      toast.success("Conflito resolvido — versão local mantida");
      onResolved();
    } catch (err) {
      toast.error("Erro ao resolver conflito");
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const handleKeepServer = async () => {
    setResolving(true);
    try {
      // Update IDB with server version
      const idbTable =
        offlineDb[
          conflict.table as
            | "assistidos"
            | "processos"
            | "demandas"
            | "atendimentos"
            | "casos"
        ];
      await idbTable.update(conflict.recordId, server as any);

      // Mark conflict resolved
      await offlineDb.conflictQueue.update(conflict.id!, {
        resolvedAt: new Date().toISOString(),
        resolution: "server",
      });

      toast.success("Conflito resolvido — versão do servidor mantida");
      onResolved();
    } catch (err) {
      toast.error("Erro ao resolver conflito");
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const tableLabel = TABLE_LABELS[conflict.table] ?? conflict.table;

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{tableLabel}</Badge>
          <span className="text-muted-foreground text-sm">
            #{conflict.recordId}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>
            Local:{" "}
            {new Date(conflict.localTimestamp).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <ArrowRight className="h-3 w-3" />
          <span>
            Servidor:{" "}
            {new Date(conflict.serverTimestamp).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Diff Table */}
      {diffFields.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-3 py-2 text-left font-medium">Campo</th>
                <th className="px-3 py-2 text-left font-medium text-blue-600">
                  Sua versão
                </th>
                <th className="px-3 py-2 text-left font-medium text-emerald-600">
                  Servidor
                </th>
              </tr>
            </thead>
            <tbody>
              {diffFields.map((key) => (
                <tr key={key} className="border-b last:border-0">
                  <td className="text-muted-foreground px-3 py-2 font-medium">
                    {formatFieldName(key)}
                  </td>
                  <td className="px-3 py-2 text-blue-700 dark:text-blue-400">
                    {formatValue(local[key])}
                  </td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400">
                    {formatValue(server[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diffFields.length === 0 && (
        <p className="text-muted-foreground mb-4 text-sm">
          Nenhuma diferença detectada nos campos — pode ter sido apenas uma
          atualização de timestamp.
        </p>
      )}

      {/* Resolution Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
          onClick={handleKeepLocal}
          disabled={resolving}
        >
          Manter minha versão
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          onClick={handleKeepServer}
          disabled={resolving}
        >
          Manter versão do servidor
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// QueueItemRow — Single pending sync item
// ==========================================

function QueueItemRow({ item }: { item: SyncQueueItem }) {
  const opLabels: Record<string, string> = {
    create: "Criar",
    update: "Atualizar",
    delete: "Excluir",
  };

  const opColors: Record<string, string> = {
    create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    update: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    delete: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {TABLE_LABELS[item.table] ?? item.table}
        </Badge>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${opColors[item.operation] ?? ""}`}
        >
          {opLabels[item.operation] ?? item.operation}
        </span>
        <span className="text-muted-foreground text-sm">
          #{item.recordId}
        </span>
      </div>
      <span className="text-muted-foreground text-xs">
        {new Date(item.createdAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

// ==========================================
// FailedItemRow — Failed sync items with retry/discard
// ==========================================

function FailedItemRow({
  item,
  onRetry,
  onDiscard,
}: {
  item: SyncQueueItem;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const handleRetry = async () => {
    await offlineDb.syncQueue.update(item.id!, {
      status: "pending",
      attempts: 0,
      lastError: undefined,
    });
    toast.info("Item reenfileirado para sincronização");
    onRetry();
  };

  const handleDiscard = async () => {
    await offlineDb.syncQueue.delete(item.id!);
    toast.success("Item descartado");
    onDiscard();
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-red-200 px-3 py-2 dark:border-red-900">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {TABLE_LABELS[item.table] ?? item.table}
          </Badge>
          <span className="text-sm font-medium">
            {item.operation} #{item.recordId}
          </span>
          <span className="text-muted-foreground text-xs">
            ({item.attempts} tentativas)
          </span>
        </div>
        {item.lastError && (
          <p className="max-w-md truncate text-xs text-red-600 dark:text-red-400">
            {item.lastError}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={handleRetry}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600 hover:text-red-700"
          onClick={handleDiscard}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Descartar
        </Button>
      </div>
    </div>
  );
}
