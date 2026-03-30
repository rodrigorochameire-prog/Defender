"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart2,
  Sparkles,
  Copy,
  Download,
  FileSearch,
  FileText,
  Globe,
  Tag,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { TEMAS_PADRAO } from "@/config/noticias/classifier";
import { cn } from "@/lib/utils";

type Periodo = "7d" | "30d" | "90d";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "7d", label: "Última semana" },
  { value: "30d", label: "Último mês" },
  { value: "90d", label: "Último trimestre" },
];

const TEMAS_PENAIS = [
  "Direito Penal",
  "Processo Penal",
  "Execução Penal",
  "Tribunal do Júri",
  "Violência Doméstica",
  "Criminologia",
];

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

  const selecionarTemasPenais = () => {
    setTemasSelecionados(TEMAS_PENAIS);
  };

  const relatorio = gerarRelatorio.data;

  const buildLinhas = () => {
    if (!relatorio?.sintese) return [];
    return [
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
  };

  const copiarTudo = () => {
    if (!relatorio?.sintese) return;
    navigator.clipboard.writeText(buildLinhas().join("\n"));
    toast.success("Relatório copiado");
  };

  const baixarTxt = () => {
    if (!relatorio?.sintese) return;
    const blob = new Blob([buildLinhas().join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-juridico-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fontes = relatorio
    ? new Set(relatorio.noticias.map(n => n.fonte)).size
    : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Relatório por Tema</h2>
          <p className="text-sm text-muted-foreground">Síntese IA das notícias aprovadas no período</p>
        </div>
      </div>

      {/* Configuração */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Período — segmented control */}
        <div>
          <p className="text-sm font-medium mb-2">Período</p>
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
            {PERIODOS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer",
                  periodo === p.value
                    ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Temas — chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Temas</p>
            <button
              onClick={selecionarTemasPenais}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Selecionar temas penais
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMAS_PADRAO.map(({ nome }) => {
              const selecionado = temasSelecionados.includes(nome);
              return (
                <button
                  key={nome}
                  onClick={() => toggleTema(nome)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                    selecionado
                      ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                      : "bg-muted border-border text-muted-foreground hover:border-border"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      selecionado ? "bg-emerald-500" : "bg-muted-foreground"
                    )}
                  />
                  {nome}
                </button>
              );
            })}
          </div>
          {temasSelecionados.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">Selecione ao menos um tema</p>
          )}
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

      {/* Loading skeleton representativo */}
      {gerarRelatorio.isPending && (
        <div className="space-y-4">
          {/* Stats row skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          {/* Síntese skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          {/* Destaques skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      )}

      {/* Empty state inicial */}
      {!gerarRelatorio.isPending && !relatorio && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            Gere um relatório para visualizar a síntese IA
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione os temas e o período acima
          </p>
        </div>
      )}

      {/* Resultado */}
      {relatorio && relatorio.sintese && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header do relatório */}
          <div className="bg-muted/50 px-5 py-4 border-b flex items-center justify-between">
            <div>
              <p className="font-semibold">Relatório de Jurisprudência e Legislação</p>
              <p className="text-sm text-muted-foreground">
                {relatorio.periodoTexto} · {relatorio.noticias.length} notícias analisadas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copiarTudo}>
                <Copy className="h-4 w-4 mr-1.5" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={baixarTxt}>
                <Download className="h-4 w-4 mr-1.5" />
                Baixar .txt
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-none">{relatorio.noticias.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">notícias</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-none">{fontes}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">fontes</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-none">{temasSelecionados.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">temas</p>
                </div>
              </div>
            </div>

            {/* Síntese narrativa */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Síntese
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {relatorio.sintese.sintese}
              </p>
            </div>

            {/* Destaques com numeração e borda amber */}
            {(relatorio.sintese.destaques ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Destaques
                </p>
                <div className="space-y-3">
                  {(relatorio.sintese.destaques as { titulo: string; impacto: string }[]).map(
                    (d, i) => (
                      <div
                        key={i}
                        className="border-l-4 border-amber-400 pl-4 py-1 flex gap-3"
                      >
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {d.titulo}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 leading-snug">
                            {d.impacto}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Alertas com ícone e fundo amarelado */}
            {(relatorio.sintese.alertas ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Alertas para a Defesa
                </p>
                <div className="space-y-2">
                  {(relatorio.sintese.alertas as string[]).map((a, i) => (
                    <div
                      key={i}
                      className="flex gap-2.5 items-start px-3 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-l-2 border-amber-400 rounded-r-md"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/80">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notícias referenciadas */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Notícias Referenciadas ({relatorio.noticias.length})
              </p>
              <ol className="space-y-2">
                {relatorio.noticias.map((n, i) => {
                  const analise = n.analiseIa as { ratioDecidendi?: string } | null;
                  return (
                    <li key={n.id} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0 w-5 text-right">{i + 1}.</span>
                      <div className="min-w-0">
                        <span className="text-muted-foreground mr-1.5">
                          [{n.fonte.replace(/-/g, " ")}]
                        </span>
                        <a
                          href={n.urlOriginal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground/80 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {n.titulo}
                        </a>
                        {analise?.ratioDecidendi && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
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
        <div className="text-center py-12 text-muted-foreground">
          <p className="font-medium mb-1">Sem notícias no período</p>
          <p className="text-sm">Tente um período maior ou selecione outros temas</p>
        </div>
      )}
    </div>
  );
}
