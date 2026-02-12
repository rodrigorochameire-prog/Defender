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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Microscope,
  UserCheck,
  Link2,
  Scale,
  ShieldAlert,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TestemunhaBriefingCard } from "./TestemunhaBriefingCard";
import { PerguntasSugeridas } from "./PerguntasSugeridas";
import { LaudosAnaliseCard } from "./LaudosAnaliseCard";
import { AntecedentesCard } from "./AntecedentesCard";
import type {
  LaudoAnalise,
  AntecedenteInfo,
  CorrelacaoProva,
} from "@/lib/services/python-backend";

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
  laudos: LaudoAnalise[];
  antecedentes: AntecedenteInfo[];
  correlacoes: CorrelacaoProva[];
  resumo_geral?: string;
  cenario_probatorio?: string;
  tese_principal_sugerida?: string;
  teses_subsidiarias: string[];
  estrategia_recomendada?: string;
  riscos_identificados: string[];
  oportunidades_defesa: string[];
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
  const [activeTab, setActiveTab] = useState<string>("estrategia");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    teses: true,
    riscos: true,
    oportunidades: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
          laudos: data.laudos || [],
          antecedentes: data.antecedentes || [],
          correlacoes: data.correlacoes || [],
          resumo_geral: data.resumo_geral,
          cenario_probatorio: data.cenario_probatorio,
          tese_principal_sugerida: data.tese_principal_sugerida,
          teses_subsidiarias: data.teses_subsidiarias || [],
          estrategia_recomendada: data.estrategia_recomendada,
          riscos_identificados: data.riscos_identificados || [],
          oportunidades_defesa: data.oportunidades_defesa || [],
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
        laudos: [],
        antecedentes: [],
        correlacoes: [],
        resumo_geral: undefined,
        cenario_probatorio: undefined,
        tese_principal_sugerida: undefined,
        teses_subsidiarias: [],
        estrategia_recomendada: undefined,
        riscos_identificados: [],
        oportunidades_defesa: [],
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
        laudos: briefing.laudos.length,
        antecedentes: briefing.antecedentes.filter((a) => a.possui_antecedentes).length,
        correlacoes: briefing.correlacoes.length,
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
          {/* Stats - Grid com scroll horizontal no mobile */}
          {stats && (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-max">
                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
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

                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Microscope className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.laudos}</p>
                      <p className="text-xs text-zinc-500">Laudos</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
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

                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.antecedentes}</p>
                      <p className="text-xs text-zinc-500">C/ Antecedentes</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.correlacoes}</p>
                      <p className="text-xs text-zinc-500">Correlações</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 dark:border-zinc-800 w-36">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <MessageCircleQuestion className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.perguntas}</p>
                      <p className="text-xs text-zinc-500">Perguntas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tabs com todas as seções */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="estrategia" className="gap-1 text-xs">
                <Target className="w-3.5 h-3.5" />
                Estratégia
              </TabsTrigger>
              <TabsTrigger value="testemunhas" className="gap-1 text-xs">
                <Users className="w-3.5 h-3.5" />
                Testemunhas
              </TabsTrigger>
              <TabsTrigger value="laudos" className="gap-1 text-xs">
                <Microscope className="w-3.5 h-3.5" />
                Laudos
                {briefing.laudos.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {briefing.laudos.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="antecedentes" className="gap-1 text-xs">
                <UserCheck className="w-3.5 h-3.5" />
                Antecedentes
              </TabsTrigger>
              <TabsTrigger value="correlacoes" className="gap-1 text-xs">
                <Link2 className="w-3.5 h-3.5" />
                Correlações
              </TabsTrigger>
              <TabsTrigger value="perguntas" className="gap-1 text-xs">
                <MessageCircleQuestion className="w-3.5 h-3.5" />
                Perguntas
              </TabsTrigger>
            </TabsList>

            {/* Tab: Estratégia */}
            <TabsContent value="estrategia" className="mt-4 space-y-4">
              {/* Cenário Probatório */}
              {briefing.cenario_probatorio && (
                <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSearch className="w-5 h-5 text-blue-600" />
                      Cenário Probatório
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                      {briefing.cenario_probatorio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Teses */}
              {(briefing.tese_principal_sugerida || briefing.teses_subsidiarias.length > 0) && (
                <Collapsible open={openSections.teses} onOpenChange={() => toggleSection("teses")}>
                  <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {openSections.teses ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-emerald-600" />
                          )}
                          <Scale className="w-5 h-5 text-emerald-600" />
                          Teses Defensivas
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {briefing.tese_principal_sugerida && (
                          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                              TESE PRINCIPAL
                            </p>
                            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                              {briefing.tese_principal_sugerida}
                            </p>
                          </div>
                        )}
                        {briefing.teses_subsidiarias.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-zinc-500 mb-2">
                              TESES SUBSIDIÁRIAS
                            </p>
                            <div className="space-y-2">
                              {briefing.teses_subsidiarias.map((tese, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg"
                                >
                                  <Badge variant="outline" className="mt-0.5">
                                    {idx + 1}
                                  </Badge>
                                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    {tese}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Riscos e Oportunidades lado a lado */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Riscos */}
                {briefing.riscos_identificados.length > 0 && (
                  <Collapsible open={openSections.riscos} onOpenChange={() => toggleSection("riscos")}>
                    <Card className="border-2 border-rose-200 dark:border-rose-800">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-900/20 transition-colors">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {openSections.riscos ? (
                              <ChevronDown className="w-4 h-4 text-rose-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-rose-600" />
                            )}
                            <ShieldAlert className="w-5 h-5 text-rose-600" />
                            Riscos Identificados
                            <Badge variant="destructive" className="ml-auto">
                              {briefing.riscos_identificados.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-2">
                            {briefing.riscos_identificados.map((risco, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg"
                              >
                                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-rose-900 dark:text-rose-100">
                                  {risco}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Oportunidades */}
                {briefing.oportunidades_defesa.length > 0 && (
                  <Collapsible open={openSections.oportunidades} onOpenChange={() => toggleSection("oportunidades")}>
                    <Card className="border-2 border-amber-200 dark:border-amber-800">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="pb-2 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {openSections.oportunidades ? (
                              <ChevronDown className="w-4 h-4 text-amber-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-amber-600" />
                            )}
                            <Lightbulb className="w-5 h-5 text-amber-600" />
                            Oportunidades
                            <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              {briefing.oportunidades_defesa.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="space-y-2">
                            {briefing.oportunidades_defesa.map((oportunidade, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                              >
                                <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-900 dark:text-amber-100">
                                  {oportunidade}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>

              {/* Estratégia e Ordem de Inquirição */}
              {(briefing.resumo_geral || briefing.estrategia_recomendada || briefing.ordem_inquiricao_sugerida.length > 0) && (
                <Card className="border-2 border-zinc-200 dark:border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-5 h-5 text-zinc-600" />
                      Recomendações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {briefing.resumo_geral && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-1">
                          Resumo Geral
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {briefing.resumo_geral}
                        </p>
                      </div>
                    )}
                    {briefing.estrategia_recomendada && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-1">
                          Estratégia Recomendada
                        </p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {briefing.estrategia_recomendada}
                        </p>
                      </div>
                    )}
                    {briefing.ordem_inquiricao_sugerida.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
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
            </TabsContent>

            {/* Tab: Testemunhas */}
            <TabsContent value="testemunhas" className="mt-4">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4 pr-4">
                  {briefing.testemunhas.length > 0 ? (
                    briefing.testemunhas.map((testemunha, idx) => (
                      <TestemunhaBriefingCard
                        key={idx}
                        testemunha={testemunha}
                        onPerguntaSelect={handlePerguntaSelect}
                        selectedPerguntas={selectedPerguntas}
                      />
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <Users className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500">
                          Nenhuma testemunha identificada nos documentos
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Laudos */}
            <TabsContent value="laudos" className="mt-4">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4 pr-4">
                  {briefing.laudos.length > 0 ? (
                    briefing.laudos.map((laudo, idx) => (
                      <LaudosAnaliseCard key={idx} laudo={laudo} />
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <Microscope className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500">
                          Nenhum laudo identificado nos documentos
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Antecedentes */}
            <TabsContent value="antecedentes" className="mt-4">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4 pr-4">
                  {briefing.antecedentes.length > 0 ? (
                    briefing.antecedentes.map((antecedente, idx) => (
                      <AntecedentesCard key={idx} antecedente={antecedente} />
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <UserCheck className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500">
                          Nenhuma informação de antecedentes encontrada
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Correlações */}
            <TabsContent value="correlacoes" className="mt-4">
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3 pr-4">
                  {briefing.correlacoes.length > 0 ? (
                    briefing.correlacoes.map((correlacao, idx) => (
                      <Card
                        key={idx}
                        className={cn(
                          "border-2",
                          correlacao.impacto_defesa === "favoravel"
                            ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10"
                            : correlacao.impacto_defesa === "desfavoravel"
                            ? "border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/10"
                            : "border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  correlacao.tipo === "contradiz"
                                    ? "bg-rose-100 text-rose-700 border-rose-300"
                                    : correlacao.tipo === "confirma"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                    : correlacao.tipo === "complementa"
                                    ? "bg-blue-100 text-blue-700 border-blue-300"
                                    : "bg-amber-100 text-amber-700 border-amber-300"
                                )}
                              >
                                {correlacao.tipo.charAt(0).toUpperCase() + correlacao.tipo.slice(1)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  correlacao.impacto_defesa === "favoravel"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : correlacao.impacto_defesa === "desfavoravel"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-zinc-100 text-zinc-700"
                                )}
                              >
                                {correlacao.impacto_defesa === "favoravel"
                                  ? "Favorável"
                                  : correlacao.impacto_defesa === "desfavoravel"
                                  ? "Desfavorável"
                                  : "Neutro"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm mb-3">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {correlacao.prova_1}
                            </span>
                            <Link2 className="w-4 h-4 text-zinc-400" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {correlacao.prova_2}
                            </span>
                          </div>

                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                            {correlacao.descricao}
                          </p>

                          {correlacao.perguntas_sugeridas.length > 0 && (
                            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                              <p className="text-xs font-medium text-zinc-500 mb-2">
                                Perguntas sugeridas:
                              </p>
                              <ul className="space-y-1">
                                {correlacao.perguntas_sugeridas.map((pergunta, pIdx) => (
                                  <li
                                    key={pIdx}
                                    className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                                  >
                                    <span className="text-emerald-600 font-medium">•</span>
                                    {pergunta}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <Link2 className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                        <p className="text-sm text-zinc-500">
                          Nenhuma correlação identificada entre as provas
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tab: Perguntas */}
            <TabsContent value="perguntas" className="mt-4">
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
