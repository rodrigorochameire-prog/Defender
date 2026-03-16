"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  XCircle,
  User,
  Link2,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function RadarMatches() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [actionDialog, setActionDialog] = useState<{
    type: "confirm" | "dismiss";
    ids: number[];
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.radar.matchesList.useQuery({
    status: statusFilter !== "todos" ? statusFilter : undefined,
    limit: 50,
  });

  const confirmMutation = trpc.radar.confirmMatch.useMutation({
    onSuccess: () => {
      toast.success("Match confirmado");
      utils.radar.matchesList.invalidate();
    },
  });

  const dismissMutation = trpc.radar.dismissMatch.useMutation({
    onSuccess: () => {
      toast.success("Match descartado");
      utils.radar.matchesList.invalidate();
    },
  });

  const bulkConfirmMutation = trpc.radar.bulkConfirmMatches.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.confirmed} matches confirmados`);
      utils.radar.matchesList.invalidate();
    },
  });

  const bulkDismissMutation = trpc.radar.bulkDismissMatches.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.dismissed} matches descartados`);
      utils.radar.matchesList.invalidate();
    },
  });

  const matches = data?.items ?? [];
  const possivelMatches = matches.filter((m) => m.status === "possivel");

  function handleBulkConfirm() {
    setActionDialog({ type: "confirm", ids: Array.from(selectedIds) });
  }

  function handleBulkDismiss() {
    setActionDialog({ type: "dismiss", ids: Array.from(selectedIds) });
  }

  function executeAction() {
    if (!actionDialog) return;
    const { type, ids } = actionDialog;
    const notes = actionNotes.trim() || undefined;

    if (ids.length === 1) {
      if (type === "confirm") {
        confirmMutation.mutate({ id: ids[0], notes });
      } else {
        dismissMutation.mutate({ id: ids[0], notes });
      }
    } else {
      if (type === "confirm") {
        bulkConfirmMutation.mutate({ ids, notes });
      } else {
        bulkDismissMutation.mutate({ ids, notes });
      }
    }
    setActionDialog(null);
    setActionNotes("");
    setSelectedIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros de status */}
      <div className="flex items-center gap-2">
        {[
          { value: "todos", label: "Todos" },
          { value: "possivel", label: "Possíveis" },
          { value: "auto_confirmado", label: "Auto-confirmados" },
          { value: "confirmado_manual", label: "Confirmados" },
          { value: "descartado", label: "Descartados" },
        ].map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setSelectedIds(new Set());
            }}
            className="cursor-pointer text-xs h-7"
          >
            {opt.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">
          {data?.total || 0} match{(data?.total || 0) !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Select All */}
      {possivelMatches.length > 0 && statusFilter === "possivel" && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={
              selectedIds.size === possivelMatches.length &&
              possivelMatches.length > 0
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedIds(new Set(possivelMatches.map((m) => m.id)));
              } else {
                setSelectedIds(new Set());
              }
            }}
            className="cursor-pointer"
          />
          <span className="text-xs text-zinc-500">
            Selecionar todos ({possivelMatches.length})
          </span>
        </div>
      )}

      {/* Lista */}
      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Link2 className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Nenhum match encontrado
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Matches serão criados automaticamente quando notícias mencionarem
            assistidos da DPE.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox for possivel */}
                  {match.status === "possivel" && (
                    <Checkbox
                      checked={selectedIds.has(match.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                        if (checked) next.add(match.id);
                        else next.delete(match.id);
                        setSelectedIds(next);
                      }}
                      className="mt-1 cursor-pointer"
                    />
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <ScoreBadge score={match.scoreConfianca} />
                      <StatusBadge status={match.status} />
                      <Badge
                        variant="secondary"
                        className={getCrimeBadgeColor(match.noticiaTipoCrime)}
                      >
                        {getCrimeLabel(match.noticiaTipoCrime)}
                      </Badge>
                    </div>

                    {/* Nome encontrado */}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {match.nomeEncontrado}
                      </span>
                      {match.assistidoNome && match.assistidoId && (
                        <Link
                          href={`/admin/assistidos/${match.assistidoId}`}
                          className="text-xs text-emerald-600 hover:underline cursor-pointer"
                        >
                          → {match.assistidoNome}
                        </Link>
                      )}
                    </div>

                    {/* Notícia */}
                    <div className="pl-6 space-y-1">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1">
                        {match.noticiaTitulo}
                      </p>
                      {match.noticiaResumo && (
                        <p className="text-xs text-zinc-500 line-clamp-2">
                          {match.noticiaResumo}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>{match.noticiaFonte}</span>
                        {match.noticiaBairro && (
                          <span>• {match.noticiaBairro}</span>
                        )}
                        {match.noticiaDataFato && (
                          <span>
                            •{" "}
                            {format(
                              new Date(match.noticiaDataFato),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <ScoreBreakdown dadosExtraidos={match.dadosExtraidos} />

                    {/* Notes (for already-processed matches) */}
                    {match.notes && (
                      <div className="mt-2 pl-6 flex items-start gap-1.5">
                        <MessageSquare className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-zinc-500 italic">
                          {match.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions column - only for possivel */}
                  {match.status === "possivel" && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                        onClick={() =>
                          setActionDialog({
                            type: "confirm",
                            ids: [match.id],
                          })
                        }
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Confirmar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-zinc-500 cursor-pointer"
                        onClick={() =>
                          setActionDialog({
                            type: "dismiss",
                            ids: [match.id],
                          })
                        }
                        disabled={dismissMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Descartar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
          <span className="text-sm">
            {selectedIds.size} selecionado(s)
          </span>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            onClick={() => handleBulkConfirm()}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-white border-zinc-600 hover:bg-zinc-800 cursor-pointer"
            onClick={() => handleBulkDismiss()}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Descartar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-400 cursor-pointer"
            onClick={() => setSelectedIds(new Set())}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Action Dialog (Confirm/Dismiss with Notes) */}
      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-semibold">
                {actionDialog.type === "confirm" ? "Confirmar" : "Descartar"}{" "}
                {actionDialog.ids.length} match
                {actionDialog.ids.length > 1 ? "es" : ""}
              </h3>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">
                  Observações (opcional)
                </Label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Ex: Confirmado pois é o mesmo João do processo 123..."
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionDialog(null);
                    setActionNotes("");
                  }}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "cursor-pointer",
                    actionDialog.type === "confirm"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : ""
                  )}
                  onClick={() => executeAction()}
                >
                  {actionDialog.type === "confirm" ? "Confirmar" : "Descartar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SCORE BREAKDOWN
// ==========================================

function ScoreBreakdown({ dadosExtraidos }: { dadosExtraidos: unknown }) {
  if (!dadosExtraidos) return null;

  let dados: Record<string, unknown>;
  try {
    dados =
      typeof dadosExtraidos === "string"
        ? JSON.parse(dadosExtraidos)
        : (dadosExtraidos as Record<string, unknown>);
  } catch {
    return null;
  }

  const bars = [
    { key: "nome_score", label: "Nome", max: 40, color: "bg-blue-500" },
    { key: "location_score", label: "Local", max: 20, color: "bg-emerald-500" },
    { key: "crime_score", label: "Crime", max: 20, color: "bg-purple-500" },
    { key: "temporal_score", label: "Temporal", max: 20, color: "bg-amber-500" },
  ];

  const hasBreakdown = bars.some((b) => dados[b.key] !== undefined);
  if (!hasBreakdown) return null;

  return (
    <div className="space-y-1.5 mt-2 pl-6">
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        Score Breakdown
      </p>
      {bars.map((bar) => {
        const value = Number(dados[bar.key] || 0);
        const pct = Math.min((value / bar.max) * 100, 100);
        return (
          <div key={bar.key} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 w-14">{bar.label}</span>
            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", bar.color)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-400 w-8 text-right">
              {value}/{bar.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// HELPER BADGES
// ==========================================

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : score >= 50
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <Badge variant="secondary" className={color}>
      {score}%
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    auto_confirmado: {
      label: "Auto",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    confirmado_manual: {
      label: "Confirmado",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    possivel: {
      label: "Possível",
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    descartado: {
      label: "Descartado",
      className:
        "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
    },
  };

  const c = config[status] || config.possivel;
  return (
    <Badge variant="secondary" className={c.className}>
      {c.label}
    </Badge>
  );
}
