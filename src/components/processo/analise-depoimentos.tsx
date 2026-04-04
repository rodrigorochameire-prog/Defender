// src/components/processo/analise-depoimentos.tsx
"use client";

import { useState } from "react";
import { AlertTriangle, MessageSquare, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Contradicao {
  delegacia?: string;
  juizo?: string;
  contradicao?: string;
  descricao?: string;
}

interface Depoimento {
  nome: string;
  tipo: string; // testemunha, familiar, perito, vitima, policial
  resumo: string;
  favoravel_defesa: boolean | null;
  contradicoes: (string | Contradicao)[];
  perguntas_sugeridas?: string[];
  // Rich fields (from full Cowork analysis)
  fase_policial?: string;
  fase_judicial?: string;
  impacto_acusacao?: string;
  impacto_defesa?: string;
  credibilidade?: string;
  trechos_relevantes?: string[];
}

interface AnaliseDepoimentosProps {
  depoimentos: Depoimento[];
}

function tipoBadgeVariant(tipo: string): string {
  const map: Record<string, string> = {
    testemunha: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    familiar: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    perito: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    vitima: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    policial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return map[tipo.toLowerCase()] ?? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
}

function resolveContradicaoTexto(c: string | Contradicao): string {
  if (typeof c === "string") return c;
  return c.descricao ?? c.contradicao ?? "";
}

function DepoimentoCard({ dep }: { dep: Depoimento }) {
  const [perguntasOpen, setPerguntasOpen] = useState(false);

  const hasComparacao = !!(dep.fase_policial && dep.fase_judicial);
  const totalContradicoes = dep.contradicoes.length;

  return (
    <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/50 p-5 space-y-4 bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {dep.nome}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tipoBadgeVariant(dep.tipo)}`}
          >
            {dep.tipo}
          </span>
          {dep.favoravel_defesa === true && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Favorável à defesa
            </span>
          )}
          {dep.favoravel_defesa === false && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Desfavorável à defesa
            </span>
          )}
          {dep.favoravel_defesa === null && (
            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Neutro
            </span>
          )}
        </div>
        {totalContradicoes > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {totalContradicoes} contradição{totalContradicoes > 1 ? "ões" : ""}
          </span>
        )}
      </div>

      {/* Credibilidade */}
      {dep.credibilidade && (
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Credibilidade:{" "}
          <span className="normal-case font-normal text-neutral-500 dark:text-neutral-400">
            {dep.credibilidade}
          </span>
        </p>
      )}

      {/* Comparação Fase Policial vs Fase Judicial */}
      {hasComparacao ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Depoimentos Comparados
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/30 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Fase Policial
              </p>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {dep.fase_policial}
              </p>
            </div>
            <div className="rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/30 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Fase Judicial
              </p>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {dep.fase_judicial}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Resumo</p>
          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{dep.resumo}</p>
        </div>
      )}

      {/* Trechos Relevantes */}
      {dep.trechos_relevantes && dep.trechos_relevantes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Trechos Relevantes
          </p>
          <ul className="space-y-1.5">
            {dep.trechos_relevantes.map((trecho, i) => (
              <li
                key={i}
                className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 italic"
              >
                &ldquo;{trecho}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contradições */}
      {dep.contradicoes.length > 0 && (
        <div className="rounded-xl p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Contradições
            </span>
          </div>
          <ul className="space-y-2">
            {dep.contradicoes.map((c, j) => {
              const isRich = typeof c !== "string" && (c.delegacia ?? c.juizo);
              const texto = resolveContradicaoTexto(c);
              return (
                <li key={j} className="space-y-1">
                  {texto && (
                    <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                      &bull; {texto}
                    </p>
                  )}
                  {isRich && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3">
                      {(c as Contradicao).delegacia && (
                        <div className="rounded-md p-2 bg-amber-100/50 dark:bg-amber-900/10">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-0.5">
                            Delegacia
                          </p>
                          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                            {(c as Contradicao).delegacia}
                          </p>
                        </div>
                      )}
                      {(c as Contradicao).juizo && (
                        <div className="rounded-md p-2 bg-amber-100/50 dark:bg-amber-900/10">
                          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-0.5">
                            Juízo
                          </p>
                          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                            {(c as Contradicao).juizo}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Impacto */}
      {(dep.impacto_acusacao ?? dep.impacto_defesa) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dep.impacto_acusacao && (
            <div className="rounded-lg p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-200/30 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Impacto Acusação
              </p>
              <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">
                {dep.impacto_acusacao}
              </p>
            </div>
          )}
          {dep.impacto_defesa && (
            <div className="rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/30 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Impacto Defesa
              </p>
              <p className="text-sm leading-relaxed text-emerald-700 dark:text-emerald-300">
                {dep.impacto_defesa}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Perguntas Sugeridas (expandable) */}
      {dep.perguntas_sugeridas && dep.perguntas_sugeridas.length > 0 && (
        <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setPerguntasOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Perguntas Sugeridas ({dep.perguntas_sugeridas.length})
              </span>
            </div>
            {perguntasOpen ? (
              <ChevronUp className="h-4 w-4 text-blue-400 flex-shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-400 flex-shrink-0" />
            )}
          </button>
          {perguntasOpen && (
            <ol className="px-4 pb-4 space-y-2 list-none">
              {dep.perguntas_sugeridas.map((q, j) => (
                <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                  <span className="flex-shrink-0 font-semibold text-blue-400 w-5 text-right">
                    {j + 1}.
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

export function AnaliseDepoimentos({ depoimentos }: AnaliseDepoimentosProps) {
  if (depoimentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Users className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum depoimento analisado. Execute uma análise para extrair depoimentos.
        </p>
      </div>
    );
  }

  const totalContradicoes = depoimentos.reduce((acc, d) => acc + d.contradicoes.length, 0);
  const totalFavoraveis = depoimentos.filter((d) => d.favoravel_defesa === true).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{depoimentos.length}</span>{" "}
          depoimento{depoimentos.length > 1 ? "s" : ""} analisado{depoimentos.length > 1 ? "s" : ""}
        </span>
        <span className="text-neutral-200 dark:text-neutral-700 select-none">&middot;</span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-amber-600 dark:text-amber-400">{totalContradicoes}</span>{" "}
          contradição{totalContradicoes !== 1 ? "ões" : ""}
        </span>
        <span className="text-neutral-200 dark:text-neutral-700 select-none">&middot;</span>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalFavoraveis}</span>{" "}
          favoráve{totalFavoraveis !== 1 ? "is" : "l"} à defesa
        </span>
      </div>

      {/* Cards */}
      {depoimentos.map((dep, i) => (
        <DepoimentoCard key={i} dep={dep} />
      ))}
    </div>
  );
}
