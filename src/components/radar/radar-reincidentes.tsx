"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronDown, ChevronRight, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";

const papelColors: Record<string, string> = {
  suspeito: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  preso: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  acusado: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  vitima: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  vítima: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  testemunha: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function RadarReincidentes() {
  const [minOcorrencias, setMinOcorrencias] = useState(2);
  const [dias, setDias] = useState(90);
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const { data, isLoading } = trpc.radar.reincidentes.useQuery({
    minOcorrencias,
    limit: 30,
    dias,
  });

  function toggleExpand(nome: string) {
    const next = new Set(expandedNames);
    if (next.has(nome)) next.delete(nome);
    else next.add(nome);
    setExpandedNames(next);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const reincidentes = data ?? [];

  return (
    <div className="space-y-4">
      {/* Subtítulo da aba completa */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Exploração completa — 2+ ocorrências
      </p>

      {/* Filtros: mínimo de ocorrências + período */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500">Mínimo de ocorrências:</span>
        {[2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            variant={minOcorrencias === n ? "default" : "outline"}
            size="sm"
            onClick={() => setMinOcorrencias(n)}
            className="cursor-pointer text-xs h-7 w-8"
          >
            {n}+
          </Button>
        ))}
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500">Período:</span>
          {[30, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                dias === d
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              {d === 365 ? "1a" : `${d}d`}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-400">
          {reincidentes.length} envolvido{reincidentes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {reincidentes.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Users className="h-8 w-8 text-zinc-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Nenhum reincidente encontrado
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Pessoas que aparecem em {minOcorrencias}+ notícias serão listadas aqui.
          </p>
        </div>
      )}

      {/* Lista de reincidentes */}
      <div className="space-y-2">
        {reincidentes.map((pessoa) => {
          const isExpanded = expandedNames.has(pessoa.nome);
          return (
            <Card key={`${pessoa.nome}-${pessoa.papel}`} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(pessoa.nome)}
                >
                  {/* Expand icon */}
                  <span className="text-zinc-400 shrink-0">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </span>

                  {/* Count badge */}
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0",
                    pessoa.totalNoticias >= 5
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : pessoa.totalNoticias >= 3
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  )}>
                    {pessoa.totalNoticias}
                  </span>

                  {/* Name and role */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {pessoa.nome}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {pessoa.totalNoticias} ocorrência{pessoa.totalNoticias !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Role badge */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] shrink-0",
                      papelColors[pessoa.papel?.toLowerCase()] ||
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    )}
                  >
                    {pessoa.papel || "Envolvido"}
                  </Badge>

                  {/* Warning for high count */}
                  {pessoa.totalNoticias >= 5 && (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </button>

                {/* Action footer */}
                <div className="flex items-center gap-2 px-4 pb-3 pt-0">
                  <button
                    onClick={() => {
                      window.open(
                        `/admin/radar?tab=matches&nome=${encodeURIComponent(pessoa.nome)}`,
                        "_self"
                      );
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                  >
                    Ver matches automáticos
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pessoa.nome);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Copiar nome
                  </button>
                </div>

                {/* Expanded timeline */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pb-4">
                    <div className="pt-3 space-y-2">
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">
                        Linha do tempo
                      </p>
                      {pessoa.noticias.map((noticia, i) => (
                        <div key={noticia.id} className="flex items-start gap-3">
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center shrink-0 mt-1">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              i === 0
                                ? "bg-emerald-500"
                                : "bg-zinc-300 dark:bg-zinc-600"
                            )} />
                            {i < pessoa.noticias.length - 1 && (
                              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1 h-4" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              {noticia.tipoCrime && (
                                <Badge
                                  variant="secondary"
                                  className={cn("text-[10px]", getCrimeBadgeColor(noticia.tipoCrime))}
                                >
                                  {getCrimeLabel(noticia.tipoCrime)}
                                </Badge>
                              )}
                              {noticia.dataFato && (
                                <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {format(new Date(noticia.dataFato), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              )}
                              {noticia.bairro && (
                                <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {noticia.bairro}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-1 flex-1">
                                {noticia.titulo}
                              </p>
                              <a
                                href={`/admin/radar?noticiaId=${noticia.id}`}
                                className="ml-auto text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 shrink-0"
                              >
                                Ver →
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
