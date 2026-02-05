"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  File,
  Link,
  LinkOff,
  Scale,
  User,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DriveLinkStatsProps {
  className?: string;
}

export function DriveLinkStats({ className }: DriveLinkStatsProps) {
  const { data: stats, isLoading, refetch } = trpc.drive.linkStats.useQuery();
  const { data: driveStats } = trpc.drive.stats.useQuery();

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total de Arquivos",
      value: stats?.totalFiles || 0,
      icon: File,
      color: "blue",
      description: "Arquivos sincronizados",
    },
    {
      label: "Vinculados a Processos",
      value: stats?.linkedToProcesso || 0,
      icon: Scale,
      color: "green",
      description: "Com processo associado",
    },
    {
      label: "Vinculados a Assistidos",
      value: stats?.linkedToAssistido || 0,
      icon: User,
      color: "purple",
      description: "Com assistido associado",
    },
    {
      label: "Não Vinculados",
      value: stats?.unlinked || 0,
      icon: LinkOff,
      color: "amber",
      description: "Sem vinculação",
    },
  ];

  const linkPercentage = stats?.totalFiles
    ? Math.round(((stats.linkedToProcesso || 0) / stats.totalFiles) * 100)
    : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </CardTitle>
                <Icon
                  className={cn(
                    "h-4 w-4",
                    card.color === "blue" && "text-blue-500",
                    card.color === "green" && "text-green-500",
                    card.color === "purple" && "text-purple-500",
                    card.color === "amber" && "text-amber-500"
                  )}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {card.value}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link className="h-4 w-4" />
              Taxa de Vinculação
            </CardTitle>
            <Badge
              variant={linkPercentage >= 80 ? "default" : "secondary"}
              className={cn(
                linkPercentage >= 80 && "bg-green-500 hover:bg-green-600"
              )}
            >
              {linkPercentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all",
                linkPercentage >= 80 && "bg-green-500",
                linkPercentage >= 50 && linkPercentage < 80 && "bg-amber-500",
                linkPercentage < 50 && "bg-red-500"
              )}
              style={{ width: `${linkPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>
              {stats?.linkedToProcesso || 0} arquivos vinculados a processos
            </span>
            <span>{stats?.unlinked || 0} aguardando vinculação</span>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      {driveStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                Pastas Sincronizadas
              </CardTitle>
              <FolderOpen className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {driveStats.syncedFolders}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                Pendentes de Sync
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{driveStats.pendingSync}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">
                Última Sincronização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {driveStats.lastSyncAt
                  ? new Date(driveStats.lastSyncAt).toLocaleString("pt-BR")
                  : "Nunca"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
