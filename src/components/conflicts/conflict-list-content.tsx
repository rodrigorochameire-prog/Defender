"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Lista de conflitos de sincronização. Cada card mostra:
 *  - Campo conflitante (planilha vs banco)
 *  - Data/hora de cada alteração + destaque visual no mais recente
 *  - Botão pra aceitar uma das versões
 *
 * Compartilhado entre a página `/conflitos` e o modal do `ConflictBadge`.
 */
export function ConflictListContent({
  onResolved,
}: {
  /** Callback opcional disparado após cada resolução bem-sucedida. */
  onResolved?: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: conflicts, isLoading } = trpc.sync.conflictList.useQuery();
  const resolve = trpc.sync.resolveConflict.useMutation({
    onSuccess: () => {
      utils.sync.conflictList.invalidate();
      utils.sync.conflictCount.invalidate();
      toast.success("Conflito resolvido");
      onResolved?.();
    },
    onError: (err) => {
      toast.error("Erro ao resolver: " + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse h-32 bg-neutral-200 dark:bg-muted rounded" />
        <div className="animate-pulse h-32 bg-neutral-200 dark:bg-muted rounded" />
      </div>
    );
  }

  if (!conflicts || conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
          <p className="text-lg font-medium">Nenhum conflito pendente</p>
          <p className="text-sm mt-1">Planilha e OMBUDS estão sincronizados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conflitos ocorrem quando o mesmo campo é editado na planilha e no OMBUDS
        simultaneamente. Escolha qual valor manter — a versão mais recente está
        destacada.
      </p>

      {conflicts.map((c) => {
        const planilhaAt = c.planilhaUpdatedAt ? new Date(c.planilhaUpdatedAt) : null;
        const bancoAt = c.bancoUpdatedAt ? new Date(c.bancoUpdatedAt) : null;
        const planilhaIsNewer =
          planilhaAt && bancoAt ? planilhaAt.getTime() > bancoAt.getTime() : null;
        const bancoIsNewer =
          planilhaAt && bancoAt ? bancoAt.getTime() > planilhaAt.getTime() : null;

        return (
          <Card
            key={c.conflictId}
            className="border-orange-300/50 dark:border-orange-700/30"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{c.assistidoNome}</span>
                <span className="text-muted-foreground font-normal">—</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {c.numeroAutos}
                </span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Campo:{" "}
                <code className="bg-neutral-100 dark:bg-muted px-1.5 py-0.5 rounded text-xs">
                  {c.campo}
                </code>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ConflictSide
                  label="Planilha"
                  value={c.valorPlanilha}
                  timestamp={planilhaAt}
                  isNewer={!!planilhaIsNewer}
                  variant="planilha"
                />
                <ConflictSide
                  label="OMBUDS"
                  value={c.valorBanco}
                  timestamp={bancoAt}
                  isNewer={!!bancoIsNewer}
                  variant="banco"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30",
                    planilhaIsNewer && "ring-2 ring-emerald-400/50",
                  )}
                  onClick={() =>
                    resolve.mutate({
                      conflictId: c.conflictId,
                      resolution: "PLANILHA",
                    })
                  }
                  disabled={resolve.isPending}
                >
                  Aceitar Planilha
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(bancoIsNewer && "ring-2 ring-emerald-400/50")}
                  onClick={() =>
                    resolve.mutate({
                      conflictId: c.conflictId,
                      resolution: "BANCO",
                    })
                  }
                  disabled={resolve.isPending}
                >
                  Aceitar OMBUDS
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ConflictSide({
  label,
  value,
  timestamp,
  isNewer,
  variant,
}: {
  label: string;
  value: string | null;
  timestamp: Date | null;
  isNewer: boolean;
  variant: "planilha" | "banco";
}) {
  const base =
    variant === "planilha"
      ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20"
      : "border-neutral-200 dark:border-border bg-neutral-50/50 dark:bg-card/50";
  const labelColor =
    variant === "planilha"
      ? "text-blue-600 dark:text-blue-400"
      : "text-muted-foreground";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border relative",
        base,
        isNewer && "ring-2 ring-emerald-400/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className={cn("text-xs font-medium", labelColor)}>{label}</p>
        {isNewer && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
            Mais recente
          </span>
        )}
      </div>
      <p className="font-medium text-sm break-words">{value || "(vazio)"}</p>
      {timestamp && (
        <p className="flex items-center gap-1 text-[10.5px] text-muted-foreground mt-1.5 tabular-nums">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          {timestamp.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
