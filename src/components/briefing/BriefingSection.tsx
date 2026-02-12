"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  RefreshCw,
  Save,
  FileText,
  Users,
  MessageCircleQuestion,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Target,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TestemunhaBriefingCard } from "./TestemunhaBriefingCard";
import { PerguntasSugeridas } from "./PerguntasSugeridas";

interface TestemunhaBriefing {
  nome: string;
  tipo: string;
  arquivos_encontrados: Array<{ nome: string; tipo: string }>;
  versao_delegacia?: string;
  versao_juizo?: string;
  contradicoes: string[];
  pontos_fortes: string[];
  pontos_fracos: string[];
  perguntas_sugeridas: string[];
  credibilidade_score?: number;
  credibilidade_justificativa?: string;
}

interface BriefingData {
  testemunhas: TestemunhaBriefing[];
  resumo_geral?: string;
  estrategia_recomendada?: string;
  ordem_inquiricao_sugerida: string[];
}

interface BriefingSectionProps {
  audienciaId?: number;
  processoId?: number;
  casoId?: number;
  evento?: any;
  onSaveBriefing?: (briefing: BriefingData) => void;
  className?: string;
}

export function BriefingSection({
  audienciaId,
  processoId,
  casoId,
  evento,
  onSaveBriefing,
  className,
}: BriefingSectionProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [selectedPerguntas, setSelectedPerguntas] = useState<Set<string>>(
    new Set()
  );
  const [activeView, setActiveView] = useState<"testemunhas" | "consolidado">(
    "testemunhas"
  );

  const utils = trpc.useUtils();

  // Buscar briefing existente
  const { data: existingBriefing, isLoading: isLoadingExisting } =
    trpc.briefing.getForAudiencia.useQuery(
      { audienciaId: audienciaId! },
      { enabled: !!audienciaId }
    );

  // Mutation para gerar briefing
  const generateMutation = trpc.briefing.generateForAudiencia.useMutation({
    onSuccess: (data) => {
      if (data.success && data.testemunhas) {
        setBriefing({
          testemunhas: data.testemunhas,
          resumo_geral: data.resumo_geral,
          estrategia_recomendada: data.estrategia_recomendada,
          ordem_inquiricao_sugerida: data.ordem_inquiricao_sugerida || [],
        });
        toast.success("Briefing gerado com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar briefing");
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutation para salvar briefing
  const saveMutation = trpc.briefing.saveBriefing.useMutation({
    onSuccess: () => {
      toast.success("Briefing salvo com sucesso!");
      if (audienciaId) {
        utils.briefing.getForAudiencia.invalidate({ audienciaId });
      }
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Carregar briefing existente
  useEffect(() => {
    if (existingBriefing && existingBriefing.length > 0) {
      // Converter do formato do banco para o formato do componente
      const testemunhas: TestemunhaBriefing[] = existingBriefing.map((t: any) => ({
        nome: t.nome || t.testemunhaNome || "",
        tipo: t.tipo || "ACUSACAO",
        arquivos_encontrados: [],
        versao_delegacia: t.versaoDelegacia,
        versao_juizo: t.versaoJuizo,
        contradicoes: t.contradicoesIdentificadas
          ? t.contradicoesIdentificadas.split("\n").filter(Boolean)
          : [],
        pontos_fortes: t.pontosFortes
          ? t.pontosFortes.split("\n").filter(Boolean)
          : [],
        pontos_fracos: t.pontosFracos
          ? t.pontosFracos.split("\n").filter(Boolean)
          : [],
        perguntas_sugeridas: t.estrategiaInquiricao
          ? t.estrategiaInquiricao.split("\n").filter(Boolean)
          : [],
        credibilidade_score: undefined,
        credibilidade_justificativa: undefined,
      }));

      setBriefing({
        testemunhas,
        resumo_geral: undefined,
        estrategia_recomendada: undefined,
        ordem_inquiricao_sugerida: [],
      });
    }
  }, [existingBriefing]);

  const handleGenerate = () => {
    if (!processoId) {
      toast.error("Processo não identificado");
      return;
    }

    generateMutation.mutate({
      audienciaId: audienciaId || 0,
      processoId,
      casoId,
    });
  };

  const handleSave = () => {
    if (!briefing || !casoId) {
      toast.error("Briefing ou caso não identificado");
      return;
    }

    saveMutation.mutate({
      casoId,
      testemunhas: briefing.testemunhas.map((t) => ({
        nome: t.nome,
        versaoDelegacia: t.versao_delegacia,
        versaoJuizo: t.versao_juizo,
        contradicoes: t.contradicoes.join("\n"),
        pontosFortes: t.pontos_fortes.join("\n"),
        pontosFracos: t.pontos_fracos.join("\n"),
        estrategiaInquiricao: t.perguntas_sugeridas.join("\n"),
      })),
    });

    if (onSaveBriefing) {
      onSaveBriefing(briefing);
    }
  };

  const handlePerguntaSelect = (pergunta: string, selected: boolean) => {
    setSelectedPerguntas((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(pergunta);
      } else {
        newSet.delete(pergunta);
      }
      return newSet;
    });
  };

  // Consolidar todas as perguntas
  const todasPerguntas = briefing
    ? briefing.testemunhas.flatMap((t) =>
        t.perguntas_sugeridas.map((p) => ({
          testemunha: t.nome,
          tipo: t.tipo,
          pergunta: p,
        }))
      )
    : [];

  // Estatísticas
  const stats = briefing
    ? {
        totalTestemunhas: briefing.testemunhas.length,
        comDepoimento: briefing.testemunhas.filter(
          (t) => t.versao_delegacia || t.versao_juizo
        ).length,
        contradicoes: briefing.testemunhas.reduce(
          (acc, t) => acc + t.contradicoes.length,
          0
        ),
        perguntas: todasPerguntas.length,
      }
    : null;

  const isLoading = generateMutation.isPending;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Briefing Inteligente</h3>
            <p className="text-sm text-zinc-500">
              Análise automática de depoimentos e sugestões de inquirição
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {briefing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-1"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !processoId}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {briefing ? "Regenerar" : "Gerar Briefing"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="border-2 border-emerald-200 dark:border-emerald-800">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-800" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Analisando documentos...
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Identificando testemunhas, extraindo depoimentos e gerando
                  análise estratégica
                </p>
              </div>
              <Progress value={33} className="w-64 mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !briefing && !isLoadingExisting && (
        <Card className="border-2 border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FileText className="w-8 h-8 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Nenhum briefing gerado
                </p>
                <p className="text-sm text-zinc-500 mt-1">
                  Clique em &quot;Gerar Briefing&quot; para analisar os
                  documentos do processo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Briefing Content */}
      {!isLoading && briefing && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.totalTestemunhas}
                    </p>
                    <p className="text-xs text-zinc-500">Testemunhas</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.comDepoimento}</p>
                    <p className="text-xs text-zinc-500">Com depoimento</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.contradicoes}</p>
                    <p className="text-xs text-zinc-500">Contradições</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <MessageCircleQuestion className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.perguntas}</p>
                    <p className="text-xs text-zinc-500">Perguntas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Estratégia Geral */}
          {(briefing.resumo_geral || briefing.estrategia_recomendada) && (
            <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Estratégia Geral
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefing.resumo_geral && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      Resumo
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {briefing.resumo_geral}
                    </p>
                  </div>
                )}
                {briefing.estrategia_recomendada && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      Recomendação
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {briefing.estrategia_recomendada}
                    </p>
                  </div>
                )}
                {briefing.ordem_inquiricao_sugerida.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1">
                      <ListOrdered className="w-3 h-3" />
                      Ordem de Inquirição Sugerida
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {briefing.ordem_inquiricao_sugerida.map((nome, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="gap-1"
                        >
                          <span className="font-bold">{idx + 1}.</span>
                          {nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tabs: Por Testemunha / Consolidado */}
          <Tabs
            value={activeView}
            onValueChange={(v) =>
              setActiveView(v as "testemunhas" | "consolidado")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="testemunhas" className="gap-1">
                <Users className="w-4 h-4" />
                Por Testemunha
              </TabsTrigger>
              <TabsTrigger value="consolidado" className="gap-1">
                <MessageCircleQuestion className="w-4 h-4" />
                Perguntas Consolidadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="testemunhas" className="mt-4">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4 pr-4">
                  {briefing.testemunhas.map((testemunha, idx) => (
                    <TestemunhaBriefingCard
                      key={idx}
                      testemunha={testemunha}
                      onPerguntaSelect={handlePerguntaSelect}
                      selectedPerguntas={selectedPerguntas}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="consolidado" className="mt-4">
              <PerguntasSugeridas
                perguntas={todasPerguntas}
                selectedPerguntas={selectedPerguntas}
                onPerguntaSelect={handlePerguntaSelect}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
