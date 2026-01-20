"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Highlighter, Copy, Table as TableIcon } from "lucide-react";

const depoimentos = [
  {
    id: "delegado",
    testemunha: "Delegado Silva",
    versaoDelegacia:
      "Afirmou que o acusado estava a menos de 2 metros da vítima e que houve discussão prévia.",
    versaoJuizo:
      "Relatou distância superior a 6 metros e mencionou que não presenciou discussão direta.",
    contradicoes: [
      {
        trecho: "Distância entre acusado e vítima",
        delegacia: "menos de 2 metros",
        juizo: "mais de 6 metros",
        folha: "Fls. 45",
      },
      {
        trecho: "Discussão prévia",
        delegacia: "houve discussão",
        juizo: "não presenciou",
        folha: "Fls. 52",
      },
    ],
  },
  {
    id: "testemunha",
    testemunha: "Testemunha Maria",
    versaoDelegacia:
      "Disse que o local estava iluminado e que viu o acusado com clareza.",
    versaoJuizo:
      "Reconheceu que estava escuro e que apenas ouviu a voz do acusado.",
    contradicoes: [
      {
        trecho: "Iluminação do local",
        delegacia: "local iluminado",
        juizo: "estava escuro",
        folha: "Fls. 78",
      },
    ],
  },
];

function buildMarkdown(depoimento: typeof depoimentos[0]) {
  const header = `| Testemunha | Fase Policial | Fase Judicial | Contradição |\n| --- | --- | --- | --- |\n`;
  const rows = depoimento.contradicoes
    .map(
      (c) =>
        `| ${depoimento.testemunha} | ${c.delegacia} | ${c.juizo} | ${c.trecho} (${c.folha}) |`
    )
    .join("\n");
  return `${header}${rows}`;
}

export default function ProvasJuriPage() {
  const [activeId, setActiveId] = useState(depoimentos[0].id);
  const [showExport, setShowExport] = useState(false);
  const depoimentoAtual = useMemo(
    () => depoimentos.find((item) => item.id === activeId) ?? depoimentos[0],
    [activeId]
  );

  const markdown = useMemo(() => buildMarkdown(depoimentoAtual), [depoimentoAtual]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/30">
            <Highlighter className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Matriz de Provas & Contradições</h1>
            <p className="text-sm text-muted-foreground">
              Comparador lado a lado entre fase policial e judicial.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-sky-300 text-sky-700">
          Tabela Comparativa
        </Badge>
      </div>

      <Tabs value={activeId} onValueChange={setActiveId} className="space-y-4">
        <TabsList className="bg-muted/60">
          {depoimentos.map((dep) => (
            <TabsTrigger key={dep.id} value={dep.id}>
              {dep.testemunha}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeId} className="space-y-6">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-600" />
                Comparador Lado a Lado
              </CardTitle>
              <CardDescription>Baseado nos depoimentos registrados.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Fase Policial
                </p>
                <p className="text-sm mt-2 text-slate-700 dark:text-slate-200">
                  {depoimentoAtual.versaoDelegacia}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Fase Judicial
                </p>
                <p className="text-sm mt-2 text-slate-700 dark:text-slate-200">
                  {depoimentoAtual.versaoJuizo}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-base">Highlighter de Contradições</CardTitle>
              <CardDescription>Marque o que mudou de versão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {depoimentoAtual.contradicoes.map((contradicao) => (
                <div key={contradicao.trecho} className="rounded-xl border border-rose-100 dark:border-rose-900/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="destructive">{contradicao.trecho}</Badge>
                    <span className="text-xs text-muted-foreground">{contradicao.folha}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Na delegacia: <mark className="bg-rose-200/60 text-rose-800 px-1 rounded">
                      {contradicao.delegacia}
                    </mark>
                    . Em juízo: <mark className="bg-amber-200/60 text-amber-800 px-1 rounded">
                      {contradicao.juizo}
                    </mark>
                    .
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-sky-600" />
                Exportar Tabela para Relatório
              </CardTitle>
              <CardDescription>Gere Markdown pronto para o relatório.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2 bg-sky-600 hover:bg-sky-500 text-white"
                  onClick={() => setShowExport((prev) => !prev)}
                >
                  <TableIcon className="h-4 w-4" />
                  {showExport ? "Ocultar Tabela" : "Gerar Tabela"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                  Copiar Markdown
                </Button>
              </div>
              {showExport && (
                <Textarea className="min-h-[180px]" value={markdown} readOnly />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
