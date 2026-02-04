"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Radar,
  Search,
  FileText,
  Globe,
  User,
  Scale,
  Loader2,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  Target,
  ArrowRight,
} from "lucide-react";
import { DiligenciasPanel } from "@/components/diligencias";
import { cn } from "@/lib/utils";

// ==========================================
// FONTES OSINT
// ==========================================

const osintSources = [
  { label: "Jusbrasil", base: "https://www.jusbrasil.com.br/busca?q=", icon: "⚖️" },
  { label: "Escavador", base: "https://www.escavador.com/busca?q=", icon: "🔍" },
  { label: "Facebook", base: "https://www.facebook.com/search/top/?q=", icon: "📘" },
  { label: "Instagram", base: "https://www.instagram.com/explore/tags/", icon: "📷" },
  { label: "LinkedIn", base: "https://www.linkedin.com/search/results/all/?keywords=", icon: "💼" },
  { label: "Portal Transparência", base: "https://portaldatransparencia.gov.br/busca?termo=", icon: "🏛️" },
  { label: "Diário Oficial", base: "https://www.jusbrasil.com.br/diarios/busca?q=", icon: "📰" },
  { label: "Google", base: "https://www.google.com/search?q=", icon: "🔎" },
];

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function DiligenciasPage() {
  const searchParams = useSearchParams();
  const [osintQuery, setOsintQuery] = useState("");
  const [selectedAssistidoId, setSelectedAssistidoId] = useState<number | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-selecionar baseado em query params
  useEffect(() => {
    const processoIdParam = searchParams.get("processoId");
    const assistidoIdParam = searchParams.get("assistidoId");

    if (processoIdParam) {
      setSelectedProcessoId(parseInt(processoIdParam, 10));
    } else if (assistidoIdParam) {
      setSelectedAssistidoId(parseInt(assistidoIdParam, 10));
    }
  }, [searchParams]);

  // Queries
  const { data: assistidos, isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({
    search: searchTerm || undefined,
    limit: 50,
  });

  const { data: processos, isLoading: loadingProcessos } = trpc.processos.list.useQuery({
    search: searchTerm || undefined,
    limit: 50,
  });

  // Dados do assistido selecionado
  const { data: assistidoDetails } = trpc.assistidos.getById.useQuery(
    { id: selectedAssistidoId! },
    { enabled: !!selectedAssistidoId }
  );

  // Dados do processo selecionado
  const { data: processoDetails } = trpc.processos.getById.useQuery(
    { id: selectedProcessoId! },
    { enabled: !!selectedProcessoId }
  );

  // Links OSINT gerados
  const osintLinks = useMemo(() => {
    if (!osintQuery.trim()) return [];
    return osintSources.map((source) => ({
      ...source,
      href: `${source.base}${encodeURIComponent(osintQuery.trim())}`,
    }));
  }, [osintQuery]);

  // Auto-preencher OSINT query com nome do assistido
  const handleSelectAssistido = (id: number) => {
    setSelectedAssistidoId(id);
    setSelectedProcessoId(null);
    const assistido = assistidos?.find(a => a.id === id);
    if (assistido) {
      setOsintQuery(assistido.nome);
    }
  };

  const handleSelectProcesso = (id: number) => {
    setSelectedProcessoId(id);
    const processo = processos?.find(p => p.id === id);
    if (processo?.assistido?.nome) {
      setOsintQuery(processo.assistido.nome);
      setSelectedAssistidoId(processo.assistidoId || null);
    }
  };

  const clearSelection = () => {
    setSelectedAssistidoId(null);
    setSelectedProcessoId(null);
    setOsintQuery("");
  };

  // Determinar contexto atual
  const hasSelection = selectedAssistidoId || selectedProcessoId;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Central de Investigação
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Diligências investigativas e pesquisa OSINT
              </p>
            </div>
          </div>
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpar Seleção
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* SELETOR DE CONTEXTO */}
        {!hasSelection ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Selecione um Caso para Investigar
              </CardTitle>
              <CardDescription>
                Escolha um assistido ou processo para ver sugestões de diligências e iniciar a investigação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do assistido ou número do processo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Lista de Assistidos */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Assistidos Recentes
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {loadingAssistidos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : assistidos && assistidos.length > 0 ? (
                      assistidos.slice(0, 15).map((assistido) => (
                        <button
                          key={assistido.id}
                          onClick={() => handleSelectAssistido(assistido.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-sm">
                            {assistido.nome.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{assistido.nome}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {assistido.statusPrisional && assistido.statusPrisional !== "SOLTO" && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Preso
                                </Badge>
                              )}
                              {assistido.cpf && <span>{assistido.cpf}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum assistido encontrado
                      </p>
                    )}
                  </div>
                </div>

                {/* Lista de Processos */}
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-purple-600" />
                    Processos Recentes
                  </h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {loadingProcessos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : processos && processos.length > 0 ? (
                      processos.slice(0, 15).map((processo) => (
                        <button
                          key={processo.id}
                          onClick={() => handleSelectProcesso(processo.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs truncate">{processo.numeroAutos}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {processo.isJuri && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-700">
                                  Júri
                                </Badge>
                              )}
                              {processo.assistido?.nome && (
                                <span className="truncate">{processo.assistido.nome}</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum processo encontrado
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* CONTEXTO SELECIONADO */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedProcessoId ? (
                      <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Scale className="h-6 w-6 text-purple-600" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-700 text-lg">
                        {assistidoDetails?.nome?.charAt(0) || "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Investigando
                      </p>
                      <p className="font-semibold text-lg">
                        {selectedProcessoId
                          ? processoDetails?.numeroAutos
                          : assistidoDetails?.nome}
                      </p>
                      {selectedProcessoId && processoDetails?.assistido && (
                        <p className="text-sm text-muted-foreground">
                          Assistido: {(processoDetails as any).assistido?.nome || assistidoDetails?.nome}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProcessoId && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/processos/${selectedProcessoId}`}>
                          <FileText className="h-4 w-4 mr-1" />
                          Ver Processo
                        </Link>
                      </Button>
                    )}
                    {selectedAssistidoId && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/assistidos/${selectedAssistidoId}`}>
                          <User className="h-4 w-4 mr-1" />
                          Ver Assistido
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RADAR OSINT */}
            <Card className="border-emerald-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Radar OSINT
                </CardTitle>
                <CardDescription>
                  Pesquise informações em fontes abertas sobre pessoas envolvidas no caso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    value={osintQuery}
                    onChange={(e) => setOsintQuery(e.target.value)}
                    placeholder="Nome da pessoa a pesquisar..."
                    className="md:flex-1"
                  />
                  <Button
                    className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                    disabled={!osintQuery.trim()}
                  >
                    <Search className="h-4 w-4" />
                    Gerar Links
                  </Button>
                </div>

                {osintLinks.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-4">
                    {osintLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <span>{link.icon}</span>
                        <span>{link.label}</span>
                        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PAINEL DE DILIGÊNCIAS */}
            <DiligenciasPanel
              processoId={selectedProcessoId || undefined}
              assistidoId={selectedAssistidoId || undefined}
              casoId={processoDetails?.casoId || assistidoDetails?.casoId || undefined}
              area={processoDetails?.area || undefined}
            />
          </>
        )}

        {/* DICAS QUANDO NÃO HÁ SELEÇÃO */}
        {!hasSelection && (
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                    Dicas para Investigação Eficiente
                  </h3>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Selecione um processo ou assistido para ver sugestões automáticas de diligências
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Use o Radar OSINT para pesquisar testemunhas, vítimas e envolvidos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Documente todos os resultados para referência futura
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Aceite sugestões automáticas para não esquecer nenhuma diligência importante
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
