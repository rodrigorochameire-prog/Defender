"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scale,
  FileText,
  Users,
  Zap,
  Lightbulb,
  GitCompare,
  Target,
  Shield,
  Swords,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// Tipos de contradições/inconsistências
const TIPOS_CONTRADICAO = [
  { id: "temporal", label: "Temporal", descricao: "Inconsistências de tempo/cronologia", icon: "clock" },
  { id: "espacial", label: "Espacial", descricao: "Contradições de local/posição", icon: "map" },
  { id: "testemunhal", label: "Testemunhal", descricao: "Divergências entre depoimentos", icon: "users" },
  { id: "documental", label: "Documental", descricao: "Conflitos com documentos/laudos", icon: "file" },
  { id: "fisica", label: "Física", descricao: "Impossibilidades físicas", icon: "zap" },
  { id: "logica", label: "Lógica", descricao: "Falhas de lógica/raciocínio", icon: "brain" },
] as const;

// Tipos de teses
const TIPOS_TESE = [
  { id: "principal", label: "Tese Principal", cor: "emerald" },
  { id: "subsidiaria", label: "Tese Subsidiária", cor: "blue" },
  { id: "alternativa", label: "Tese Alternativa", cor: "amber" },
] as const;

interface Contradicao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  fonteA: string;
  fonteB: string;
  impacto: "alto" | "medio" | "baixo";
  status: "identificada" | "analisada" | "explorada";
}

interface Argumento {
  id: string;
  tipo: "ataque" | "defesa";
  titulo: string;
  fundamentacao: string;
  evidencias: string[];
  contraArgumentos?: string[];
}

interface Tese {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  argumentos: Argumento[];
  probabilidadeAceite: number;
}

export default function LogicaArgumentacaoPage() {
  const [selectedCasoId, setSelectedCasoId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"contradicoes" | "teses" | "argumentos">("contradicoes");
  const [contradicoes, setContradicoes] = useState<Contradicao[]>([]);
  const [teses, setTeses] = useState<Tese[]>([]);
  const [novaContradicao, setNovaContradicao] = useState({
    tipo: "",
    titulo: "",
    descricao: "",
    fonteA: "",
    fonteB: "",
    impacto: "medio" as const,
  });

  // Query para listar casos
  const { data: casos } = trpc.casos.list.useQuery({
    status: "ativo",
    limit: 100,
  });

  const handleAddContradicao = () => {
    if (!novaContradicao.titulo.trim()) return;

    const nova: Contradicao = {
      id: `cont-${Date.now()}`,
      ...novaContradicao,
      status: "identificada",
    };

    setContradicoes([...contradicoes, nova]);
    setNovaContradicao({
      tipo: "",
      titulo: "",
      descricao: "",
      fonteA: "",
      fonteB: "",
      impacto: "medio",
    });
  };

  const getImpactoBadge = (impacto: string) => {
    switch (impacto) {
      case "alto":
        return <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Alto Impacto</Badge>;
      case "medio":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Médio Impacto</Badge>;
      case "baixo":
        return <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">Baixo Impacto</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Lógica e Argumentação
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Análise de contradições e construção de teses
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
          >
            Beta
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Seleção de Caso */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1 min-w-0">
                <Label htmlFor="caso" className="text-xs text-zinc-500 mb-1 block">
                  Selecione o Caso
                </Label>
                <Select value={selectedCasoId} onValueChange={setSelectedCasoId}>
                  <SelectTrigger className="w-full md:w-[400px]">
                    <SelectValue placeholder="Selecione um caso para análise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {casos?.items?.map((caso) => (
                      <SelectItem key={caso.id} value={caso.id.toString()}>
                        {caso.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCasoId && (
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" />
                    {contradicoes.length} contradições
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Scale className="w-3 h-3" />
                    {teses.length} teses
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Conteúdo */}
        {selectedCasoId ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-muted w-full md:w-auto">
              <TabsTrigger value="contradicoes" className="gap-2 flex-1 md:flex-none">
                <GitCompare className="w-4 h-4" /> Contradições
              </TabsTrigger>
              <TabsTrigger value="teses" className="gap-2 flex-1 md:flex-none">
                <Target className="w-4 h-4" /> Teses
              </TabsTrigger>
              <TabsTrigger value="argumentos" className="gap-2 flex-1 md:flex-none">
                <Swords className="w-4 h-4" /> Argumentação
              </TabsTrigger>
            </TabsList>

            {/* Tab: Contradições */}
            <TabsContent value="contradicoes" className="mt-6 space-y-6">
              {/* Formulário para adicionar contradição */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Identificar Nova Contradição
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registre inconsistências encontradas nos autos para análise
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Contradição</Label>
                      <Select
                        value={novaContradicao.tipo}
                        onValueChange={(v) => setNovaContradicao({ ...novaContradicao, tipo: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CONTRADICAO.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              <div className="flex flex-col">
                                <span>{tipo.label}</span>
                                <span className="text-xs text-zinc-500">{tipo.descricao}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Impacto</Label>
                      <Select
                        value={novaContradicao.impacto}
                        onValueChange={(v) => setNovaContradicao({ ...novaContradicao, impacto: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alto">Alto - Pode mudar o resultado</SelectItem>
                          <SelectItem value="medio">Médio - Relevante para a tese</SelectItem>
                          <SelectItem value="baixo">Baixo - Auxilia na argumentação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Título/Resumo</Label>
                    <Input
                      value={novaContradicao.titulo}
                      onChange={(e) => setNovaContradicao({ ...novaContradicao, titulo: e.target.value })}
                      placeholder="Ex: Testemunha afirma ter visto o réu às 22h, mas laudo indica morte às 20h"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fonte A (Versão 1)</Label>
                      <Textarea
                        value={novaContradicao.fonteA}
                        onChange={(e) => setNovaContradicao({ ...novaContradicao, fonteA: e.target.value })}
                        placeholder="Ex: Depoimento de Maria Silva (fls. 45)"
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fonte B (Versão 2)</Label>
                      <Textarea
                        value={novaContradicao.fonteB}
                        onChange={(e) => setNovaContradicao({ ...novaContradicao, fonteB: e.target.value })}
                        placeholder="Ex: Laudo pericial de fls. 78"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Análise da Contradição</Label>
                    <Textarea
                      value={novaContradicao.descricao}
                      onChange={(e) => setNovaContradicao({ ...novaContradicao, descricao: e.target.value })}
                      placeholder="Descreva a contradição e sua relevância para a defesa..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button onClick={handleAddContradicao} className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Contradição
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de Contradições */}
              {contradicoes.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Contradições Identificadas ({contradicoes.length})
                  </h3>
                  <Accordion type="single" collapsible className="space-y-2">
                    {contradicoes.map((cont, idx) => (
                      <AccordionItem
                        key={cont.id}
                        value={cont.id}
                        className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900"
                      >
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <div className="flex items-center gap-3 text-left flex-1">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {cont.titulo}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {TIPOS_CONTRADICAO.find(t => t.id === cont.tipo)?.label || cont.tipo}
                              </p>
                            </div>
                            {getImpactoBadge(cont.impacto)}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30">
                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">
                                  Versão A
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {cont.fonteA}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                                  Versão B
                                </p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {cont.fonteB}
                                </p>
                              </div>
                            </div>
                            {cont.descricao && (
                              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                                <p className="text-xs font-semibold text-zinc-500 mb-1">Análise</p>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">{cont.descricao}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="gap-1">
                                <Lightbulb className="w-3 h-3" /> Sugerir Uso
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1">
                                <BookOpen className="w-3 h-3" /> Ver nos Autos
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <AlertTriangle className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nenhuma contradição identificada
                    </h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Analise os autos e registre inconsistências que possam favorecer a defesa
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Teses */}
            <TabsContent value="teses" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {TIPOS_TESE.map((tipo) => (
                  <Card key={tipo.id} className={cn(
                    "border-2",
                    tipo.cor === "emerald" && "border-emerald-200 dark:border-emerald-800/30",
                    tipo.cor === "blue" && "border-blue-200 dark:border-blue-800/30",
                    tipo.cor === "amber" && "border-amber-200 dark:border-amber-800/30"
                  )}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {tipo.id === "principal" && <Shield className="w-4 h-4 text-emerald-500" />}
                        {tipo.id === "subsidiaria" && <Scale className="w-4 h-4 text-blue-500" />}
                        {tipo.id === "alternativa" && <Target className="w-4 h-4 text-amber-500" />}
                        {tipo.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-dashed"
                        onClick={() => {/* TODO: Abrir modal de criação */}}
                      >
                        <Plus className="w-4 h-4" /> Adicionar Tese
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {teses.length === 0 && (
                <Card className="border-dashed mt-6">
                  <CardContent className="py-12 text-center">
                    <Scale className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nenhuma tese cadastrada
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Construa suas teses defensivas baseadas nas contradições identificadas
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab: Argumentação */}
            <TabsContent value="argumentos" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Argumentos de Ataque */}
                <Card className="border-rose-200 dark:border-rose-800/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Swords className="w-4 h-4 text-rose-500" />
                      Pontos de Ataque
                      <Badge variant="outline" className="ml-auto text-rose-500 border-rose-300">
                        Acusação
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Fragilidades da acusação a serem exploradas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full gap-2 border-dashed">
                      <Plus className="w-4 h-4" /> Adicionar Ponto de Ataque
                    </Button>
                  </CardContent>
                </Card>

                {/* Argumentos de Defesa */}
                <Card className="border-emerald-200 dark:border-emerald-800/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Pontos de Defesa
                      <Badge variant="outline" className="ml-auto text-emerald-500 border-emerald-300">
                        Defesa
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Argumentos que fortalecem a tese defensiva
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full gap-2 border-dashed">
                      <Plus className="w-4 h-4" /> Adicionar Ponto de Defesa
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Fluxo de Argumentação */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Fluxo de Argumentação
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Organize a sequência lógica dos seus argumentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-sm text-zinc-500">
                    Adicione argumentos para visualizar o fluxo lógico
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Brain className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
              <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Selecione um Caso
              </h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Escolha um caso para começar a análise de contradições e construção de teses defensivas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
