"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  User,
  Link2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { toast } from "sonner";
import Link from "next/link";

export function RadarMatches() {
  const [statusFilter, setStatusFilter] = useState("todos");
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const matches = data?.items ?? [];

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
            onClick={() => setStatusFilter(opt.value)}
            className="cursor-pointer text-xs h-7"
          >
            {opt.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">
          {data?.total || 0} match{(data?.total || 0) !== 1 ? "es" : ""}
        </span>
      </div>

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
            Matches serão criados automaticamente quando notícias mencionarem assistidos da DPE.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <Card key={match.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
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
                        {match.noticiaBairro && <span>• {match.noticiaBairro}</span>}
                        {match.noticiaDataFato && (
                          <span>
                            • {format(new Date(match.noticiaDataFato), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {match.status === "possivel" && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                        onClick={() => confirmMutation.mutate({ id: match.id })}
                        disabled={confirmMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Confirmar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-zinc-500 cursor-pointer"
                        onClick={() => dismissMutation.mutate({ id: match.id })}
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
    </div>
  );
}

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
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    confirmado_manual: {
      label: "Confirmado",
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    possivel: {
      label: "Possível",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    descartado: {
      label: "Descartado",
      className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
    },
  };

  const c = config[status] || config.possivel;
  return (
    <Badge variant="secondary" className={c.className}>
      {c.label}
    </Badge>
  );
}
