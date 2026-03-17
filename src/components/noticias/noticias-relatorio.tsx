"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart2, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { TEMAS_PADRAO } from "@/config/noticias/classifier";
import { cn } from "@/lib/utils";

type Periodo = "7d" | "30d" | "90d";

export function NoticiasRelatorio() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [temasSelecionados, setTemasSelecionados] = useState<string[]>([
    "Direito Penal",
    "Processo Penal",
  ]);

  const gerarRelatorio = trpc.noticias.gerarRelatorio.useMutation({
    onError: () => toast.error("Erro ao gerar relatório"),
  });

  const toggleTema = (tema: string) => {
    setTemasSelecionados(prev =>
      prev.includes(tema) ? prev.filter(t => t !== tema) : [...prev, tema]
    );
  };

  const relatorio = gerarRelatorio.data;

  const copiarTudo = () => {
    if (!relatorio?.sintese) return;
    const linhas = [
      `RELATÓRIO DE JURISPRUDÊNCIA E LEGISLAÇÃO`,
      `Período: ${relatorio.periodoTexto}`,
      `Temas: ${relatorio.temasTexto}`,
      ``,
      `SÍNTESE`,
      relatorio.sintese.sintese ?? "",
      ``,
      `DESTAQUES`,
      ...(relatorio.sintese.destaques ?? []).map(
        (d: { titulo: string; impacto: string }) => `• ${d.titulo}: ${d.impacto}`
      ),
      ``,
      `ALERTAS PARA A DEFESA`,
      ...(relatorio.sintese.alertas ?? []).map((a: string) => `• ${a}`),
      ``,
      `NOTÍCIAS REFERENCIADAS (${relatorio.noticias.length})`,
      ...relatorio.noticias.map((n, i) => `${i + 1}. [${n.fonte}] ${n.titulo}`),
    ];
    navigator.clipboard.writeText(linhas.join("\n"));
    toast.success("Relatório copiado");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Relatório por Tema</h2>
          <p className="text-sm text-zinc-500">Síntese IA das notícias aprovadas no período</p>
        </div>
      </div>

      {/* Configuração */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        {/* Período */}
        <div>
          <p className="text-sm font-medium mb-2">Período</p>
          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as Periodo[]).map(p => (
              <Button
                key={p}
                variant={periodo === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodo(p)}
                className={cn(
                  periodo === p && "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                )}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
              </Button>
            ))}
          </div>
        </div>

        {/* Temas */}
        <div>
          <p className="text-sm font-medium mb-2">Temas</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMAS_PADRAO.map(({ nome }) => (
              <div key={nome} className="flex items-center gap-2">
                <Checkbox
                  id={`tema-${nome}`}
                  checked={temasSelecionados.includes(nome)}
                  onCheckedChange={() => toggleTema(nome)}
                />
                <Label htmlFor={`tema-${nome}`} className="text-sm cursor-pointer">
                  {nome}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() =>
            gerarRelatorio.mutate({ periodo, temas: temasSelecionados })
          }
          disabled={gerarRelatorio.isPending || temasSelecionados.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {gerarRelatorio.isPending ? "Gerando com IA..." : "Gerar Relatório"}
        </Button>
      </div>

      {/* Loading */}
      {gerarRelatorio.isPending && (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      )}

      {/* Resultado */}
      {relatorio && relatorio.sintese && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {/* Header do relatório */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="font-semibold">Relatório de Jurisprudência e Legislação</p>
              <p className="text-sm text-zinc-500">
                {relatorio.periodoTexto} · {relatorio.noticias.length} notícias analisadas
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={copiarTudo}>
              <Copy className="h-4 w-4 mr-1.5" />
              Copiar
            </Button>
          </div>

          <div className="p-5 space-y-5">
            {/* Síntese narrativa */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Síntese
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {relatorio.sintese.sintese}
              </p>
            </div>

            {/* Destaques */}
            {(relatorio.sintese.destaques ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Destaques
                </p>
                <div className="space-y-2">
                  {(relatorio.sintese.destaques as { titulo: string; impacto: string }[]).map(
                    (d, i) => (
                      <div
                        key={i}
                        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
                      >
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {d.titulo}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {d.impacto}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Alertas */}
            {(relatorio.sintese.alertas ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Alertas para a Defesa
                </p>
                <ul className="space-y-1">
                  {(relatorio.sintese.alertas as string[]).map((a, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 flex gap-2">
                      <span className="text-zinc-400 shrink-0">•</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notícias referenciadas */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Notícias Referenciadas ({relatorio.noticias.length})
              </p>
              <ol className="space-y-2">
                {relatorio.noticias.map((n, i) => {
                  const analise = n.analiseIa as { ratioDecidendi?: string } | null;
                  return (
                    <li key={n.id} className="flex gap-3 text-sm">
                      <span className="text-zinc-400 shrink-0 w-5 text-right">{i + 1}.</span>
                      <div className="min-w-0">
                        <span className="text-zinc-500 mr-1.5">
                          [{n.fonte.replace(/-/g, " ")}]
                        </span>
                        <a
                          href={n.urlOriginal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {n.titulo}
                        </a>
                        {analise?.ratioDecidendi && (
                          <p className="text-xs text-zinc-500 italic mt-0.5 line-clamp-1">
                            {analise.ratioDecidendi}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Empty result */}
      {relatorio && relatorio.noticias.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p className="font-medium mb-1">Sem notícias no período</p>
          <p className="text-sm">Tente um período maior ou selecione outros temas</p>
        </div>
      )}
    </div>
  );
}
