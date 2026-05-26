"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Check, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ConflitosPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: conflicts, isLoading } = trpc.sync.conflictList.useQuery();
  const resolve = trpc.sync.resolveConflict.useMutation({
    onSuccess: () => {
      utils.sync.conflictList.invalidate();
      utils.sync.conflictCount.invalidate();
      toast.success("Conflito resolvido");
    },
    onError: (err) => {
      toast.error("Erro ao resolver: " + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-muted rounded w-64" />
          <div className="h-32 bg-neutral-200 dark:bg-muted rounded" />
          <div className="h-32 bg-neutral-200 dark:bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin"))}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold">Conflitos de Sincronização</h1>
        <Badge variant="outline">{conflicts?.length ?? 0} pendentes</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Conflitos ocorrem quando o mesmo campo é editado na planilha e no OMBUDS simultaneamente.
        Escolha qual valor manter.
      </p>

      {(!conflicts || conflicts.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Check className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
            <p className="text-lg font-medium">Nenhum conflito pendente</p>
            <p className="text-sm mt-1">Planilha e OMBUDS estão sincronizados</p>
          </CardContent>
        </Card>
      )}

      {conflicts?.map((c) => (
        <Card key={c.conflictId} className="border-orange-300/50 dark:border-orange-700/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{c.assistidoNome}</span>
              <span className="text-muted-foreground font-normal">—</span>
              <span className="text-sm text-muted-foreground font-mono">{c.numeroAutos}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Campo: <code className="bg-neutral-100 dark:bg-muted px-1.5 py-0.5 rounded text-xs">{c.campo}</code>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Planilha</p>
                <p className="font-medium text-sm">{c.valorPlanilha || "(vazio)"}</p>
              </div>
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-border bg-neutral-50/50 dark:bg-card/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">OMBUDS</p>
                <p className="font-medium text-sm">{c.valorBanco || "(vazio)"}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                onClick={() => resolve.mutate({ conflictId: c.conflictId, resolution: "PLANILHA" })}
                disabled={resolve.isPending}
              >
                Aceitar Planilha
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolve.mutate({ conflictId: c.conflictId, resolution: "BANCO" })}
                disabled={resolve.isPending}
              >
                Aceitar OMBUDS
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
