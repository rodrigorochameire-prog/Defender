"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Database,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// /admin/drive-sync — Painel de Saúde do Sync com Drive
// ==========================================

type Health = "healthy" | "warning" | "critical";

function HealthBadge({ health }: { health: Health }) {
  const config = {
    healthy: {
      label: "Saudável",
      className: "bg-emerald-100 text-emerald-800",
      icon: CheckCircle2,
    },
    warning: {
      label: "Alerta",
      className: "bg-yellow-100 text-yellow-800",
      icon: AlertTriangle,
    },
    critical: {
      label: "Crítico",
      className: "bg-red-100 text-red-800",
      icon: XCircle,
    },
  }[health];

  const Icon = config.icon;

  return (
    <Badge className={`flex items-center gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function WebhookStatus({
  webhook,
}: {
  webhook: { channelId: string; expiration: Date } | null;
}) {
  if (!webhook) {
    return (
      <span className="flex items-center gap-1 text-sm text-neutral-400">
        <WifiOff className="h-3.5 w-3.5" />
        Sem webhook
      </span>
    );
  }

  const expiresIn = formatDistanceToNow(new Date(webhook.expiration), {
    locale: ptBR,
    addSuffix: true,
  });

  return (
    <span className="flex items-center gap-1 text-sm text-neutral-600">
      <Wifi className="h-3.5 w-3.5 text-emerald-500" />
      Webhook ativo · expira {expiresIn}
    </span>
  );
}

export default function DriveSyncPage() {
  const { data, isLoading, refetch } = trpc.drive.getSyncStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const forceSyncMut = trpc.drive.forceSyncFolder.useMutation({
    onSuccess: () => toast.success("Sync disparado"),
    onError: () => toast.error("Falha ao disparar sync"),
  });

  const cleanMut = trpc.drive.cleanExpiredChannels.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.cleaned} canais limpos`);
      refetch();
    },
    onError: () => toast.error("Falha ao limpar canais"),
  });

  const [forcingFolder, setForcingFolder] = useState<string | null>(null);

  async function handleForceSync(driveFolderId: string) {
    setForcingFolder(driveFolderId);
    await forceSyncMut.mutateAsync({ driveFolderId });
    setForcingFolder(null);
  }

  const global = data?.global;
  const folders = data?.folders ?? [];

  const globalHealth: Health =
    global?.status === "critical"
      ? "critical"
      : global?.status === "degraded"
      ? "warning"
      : "healthy";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Sync Google Drive</h1>
          <p className="text-sm text-neutral-500 mt-1">Status em tempo real das pastas monitoradas</p>
        </div>
        <div className="flex items-center gap-2">
          <HealthBadge health={globalHealth} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Global stats */}
      {global && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Canais ativos</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {global.expiredChannels === 0
                  ? "—"
                  : `0 / ${global.expiredChannels + (data?.folders.filter((f) => f.activeWebhook).length ?? 0)}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Canais expirados</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {global.expiredChannels}
                {global.expiredChannels > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 text-xs text-neutral-500"
                    onClick={() => cleanMut.mutate()}
                    disabled={cleanMut.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Erros (1h)</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">{global.recentErrors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Pastas críticas</p>
              <p className="text-2xl font-semibold text-neutral-900 mt-1">
                {folders.filter((f) => f.health === "critical").length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Folder cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-neutral-200 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-neutral-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-neutral-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <Card
              key={folder.id}
              className={
                folder.health === "critical"
                  ? "border-red-200"
                  : folder.health === "warning"
                  ? "border-yellow-200"
                  : "border-neutral-200"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium text-neutral-900">
                    {folder.name}
                  </CardTitle>
                  <HealthBadge health={folder.health} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Last sync */}
                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <Clock className="h-3.5 w-3.5" />
                  {folder.lastSyncAt
                    ? `Última sync: ${formatDistanceToNow(new Date(folder.lastSyncAt), { locale: ptBR, addSuffix: true })}`
                    : "Nunca sincronizado"}
                </div>

                {/* Webhook */}
                <WebhookStatus webhook={folder.activeWebhook} />

                {/* File count + sync token */}
                <div className="flex items-center gap-3 text-sm text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {folder.fileCount} arquivos
                  </span>
                  {folder.hasSyncToken ? (
                    <span className="text-emerald-600 text-xs">token ✓</span>
                  ) : (
                    <span className="text-neutral-400 text-xs">sem token</span>
                  )}
                </div>

                {/* Force sync button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleForceSync(folder.driveFolderId)}
                  disabled={forcingFolder === folder.driveFolderId}
                >
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  {forcingFolder === folder.driveFolderId ? "Disparando…" : "Forçar sync"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
