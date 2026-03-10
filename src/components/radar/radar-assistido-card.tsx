"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { getCrimeBadgeColor, getCrimeLabel } from "@/components/radar/radar-filtros";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";

interface RadarAssistidoCardProps {
  assistidoId: number;
}

export function RadarAssistidoCard({ assistidoId }: RadarAssistidoCardProps) {
  const utils = trpc.useUtils();
  const { data: matches, isLoading } = trpc.radar.matchesByAssistido.useQuery(
    { assistidoId },
  );

  const confirmMutation = trpc.radar.confirmMatch.useMutation({
    onSuccess: () => {
      toast.success("Match confirmado");
      utils.radar.matchesByAssistido.invalidate({ assistidoId });
    },
  });

  const dismissMutation = trpc.radar.dismissMatch.useMutation({
    onSuccess: () => {
      toast.success("Match descartado");
      utils.radar.matchesByAssistido.invalidate({ assistidoId });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          <span className="ml-2 text-sm text-zinc-500">Carregando radar...</span>
        </CardContent>
      </Card>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500" />
            Radar Criminal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-zinc-400">
            <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma menção encontrada no radar criminal</p>
            <p className="text-xs mt-1">O sistema monitora notícias policiais automaticamente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confirmed = matches.filter((m) => m.status === "confirmado_manual" || m.status === "auto_confirmado");
  const possible = matches.filter((m) => m.status === "possivel");
  const dismissed = matches.filter((m) => m.status === "descartado");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            Radar Criminal
            <Badge variant="secondary" className="text-xs">
              {matches.length} {matches.length === 1 ? "menção" : "menções"}
            </Badge>
          </CardTitle>
          <Link href="/admin/radar?tab=matches" className="text-xs text-emerald-600 hover:underline">
            Ver tudo →
          </Link>
        </div>
        {/* Mini stats */}
        <div className="flex gap-3 mt-2">
          {confirmed.length > 0 && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {confirmed.length} confirmado{confirmed.length !== 1 ? "s" : ""}
            </span>
          )}
          {possible.length > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {possible.length} possíve{possible.length !== 1 ? "is" : "l"}
            </span>
          )}
          {dismissed.length > 0 && (
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> {dismissed.length} descartado{dismissed.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches
          .filter((m) => m.status !== "descartado")
          .map((match) => (
          <div
            key={match.id}
            className="border border-zinc-100 dark:border-zinc-800 rounded-lg p-3 space-y-2"
          >
            {/* Header: score + badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={cn(
                    "text-xs font-mono",
                    match.scoreConfianca >= 80
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : match.scoreConfianca >= 50
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {match.scoreConfianca}%
                </Badge>
                <Badge
                  className={cn(
                    "text-xs",
                    match.status === "confirmado_manual" || match.status === "auto_confirmado"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  {match.status === "confirmado_manual"
                    ? "Confirmado"
                    : match.status === "auto_confirmado"
                    ? "Auto-confirmado"
                    : "Possível"}
                </Badge>
                {match.noticiaTipoCrime && (
                  <Badge className={cn("text-xs", getCrimeBadgeColor(match.noticiaTipoCrime))}>
                    {getCrimeLabel(match.noticiaTipoCrime)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Notícia */}
            <div>
              <p className="text-sm font-medium leading-tight">{match.noticiaTitulo}</p>
              {match.noticiaResumo && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{match.noticiaResumo}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400">
                {match.noticiaFonte && <span>{match.noticiaFonte}</span>}
                {match.noticiaBairro && (
                  <>
                    <span>•</span>
                    <span>{match.noticiaBairro}</span>
                  </>
                )}
                {match.noticiaDataFato && (
                  <>
                    <span>•</span>
                    <span>{format(new Date(match.noticiaDataFato), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </>
                )}
              </div>
            </div>

            {/* Nome encontrado na notícia */}
            <div className="text-xs text-zinc-500">
              Nome na notícia: <span className="font-medium text-zinc-700 dark:text-zinc-300">{match.nomeEncontrado}</span>
            </div>

            {/* Actions */}
            {match.status === "possivel" && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                  onClick={() => confirmMutation.mutate({ id: match.id })}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-zinc-400 hover:text-red-500 cursor-pointer"
                  onClick={() => dismissMutation.mutate({ id: match.id })}
                  disabled={dismissMutation.isPending}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Descartar
                </Button>
                {match.noticiaUrl && (
                  <a
                    href={match.noticiaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fonte
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
