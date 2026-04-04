"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

/**
 * RadarReincidentesPanel — compact sidebar card for the feed tab.
 *
 * Shows up to 8 people who appear in 2+ news articles within the dataset.
 * Each row: initials avatar · name · occurrence count · crime type badges · link.
 */
export function RadarReincidentesPanel() {
  const { data, isLoading, isError } = trpc.radar.reincidentes.useQuery({
    minOcorrencias: 4,
    limit: 5,
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          Alertas de Reincidentes
        </CardTitle>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 -mt-1">
          Envolvidos em 4+ notícias
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        {isLoading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="text-xs text-neutral-400 text-center py-3">
            Não foi possível carregar os reincidentes.
          </p>
        )}

        {!isLoading && !isError && (!data || data.length === 0) && (
          <p className="text-xs text-neutral-400 text-center py-3">
            Nenhum reincidente no período
          </p>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <div className="space-y-1.5">
            {data.map((pessoa, idx) => {
              // Collect unique crime types across occurrences
              const crimeTypes = [
                ...new Set(
                  pessoa.noticias
                    .map((n) => n.tipoCrime)
                    .filter((t): t is string => Boolean(t))
                ),
              ].slice(0, 2);

              // Initials from name (up to 2 chars)
              const initials = pessoa.nome
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");

              const countColor =
                pessoa.totalNoticias >= 5
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : pessoa.totalNoticias >= 3
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";

              return (
                <div
                  key={`${pessoa.nome}-${idx}`}
                  className="flex items-center gap-2 py-1 group"
                >
                  {/* Avatar initials */}
                  <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 select-none">
                      {initials || "?"}
                    </span>
                  </div>

                  {/* Name + crimes */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate leading-tight">
                      {pessoa.nome}
                    </p>
                    {crimeTypes.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {crimeTypes.map((tipo) => (
                          <Badge
                            key={tipo}
                            variant="secondary"
                            className={cn(
                              "text-[9px] px-1 py-0 h-3.5 leading-none",
                              getCrimeBadgeColor(tipo)
                            )}
                          >
                            {getCrimeLabel(tipo)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Count badge */}
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                      countColor
                    )}
                  >
                    {pessoa.totalNoticias}x
                  </span>

                  {/* External link (assistido profile if matched, else no link) */}
                  <NextLink
                    href={`/admin/radar?tab=reincidentes`}
                    className="text-neutral-300 dark:text-neutral-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Ver detalhes na aba Reincidentes"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </NextLink>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
