"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileSearch,
  ExternalLink,
  Scale,
  Users,
  FileText,
  StickyNote,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const ENTITY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; href: (id: number) => string }> = {
  documento: {
    label: "Documento",
    icon: <FileText className="h-3.5 w-3.5" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    href: (id) => `/admin/documentos/${id}`,
  },
  anotacao: {
    label: "Anotacao",
    icon: <StickyNote className="h-3.5 w-3.5" />,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    href: (id) => `/admin/anotacoes/${id}`,
  },
  movimentacao: {
    label: "Movimentacao",
    icon: <ArrowRight className="h-3.5 w-3.5" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    href: (id) => `/admin/movimentacoes/${id}`,
  },
  case_fact: {
    label: "Fato do Caso",
    icon: <Scale className="h-3.5 w-3.5" />,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    href: (id) => `/admin/casos/fatos/${id}`,
  },
};

export default function BuscaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [activeTab, setActiveTab] = useState("semantic");

  // Semantic search (pgvector)
  const semanticSearch = trpc.search.semantic.useQuery(
    { query: activeQuery, limit: 20 },
    { enabled: !!activeQuery && activeTab === "semantic" }
  );

  // Local database search
  const localSearch = trpc.search.local.useQuery(
    { query: activeQuery, limit: 20 },
    { enabled: !!activeQuery && activeTab === "local" }
  );

  const handleSearch = useCallback(() => {
    if (searchTerm.trim().length >= 2) {
      setActiveQuery(searchTerm.trim());
    }
  }, [searchTerm]);

  const isLoading = (activeTab === "semantic" && semanticSearch.isLoading) ||
                    (activeTab === "local" && localSearch.isLoading);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
          <FileSearch className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Busca Global</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pesquisa semantica em documentos, anotacoes, movimentacoes e fatos
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Busque por qualquer termo: ex. 'sentenca condenatoria', 'audiencia do Joao', 'laudo pericial'..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading || searchTerm.trim().length < 2} className="h-10 gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="semantic" className="text-xs gap-1.5">
                <Sparkles className="h-3 w-3" />
                Semantica (IA)
              </TabsTrigger>
              <TabsTrigger value="local" className="text-xs gap-1.5">
                <Search className="h-3 w-3" />
                Local (DB)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {activeQuery && (
        <div className="space-y-4">
          {activeTab === "semantic" && (
            <>
              {semanticSearch.isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Buscando com IA...</span>
                </div>
              )}

              {semanticSearch.data && semanticSearch.data.results.length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum resultado encontrado para &ldquo;{activeQuery}&rdquo;</p>
                    <p className="text-xs mt-1">Tente outros termos ou verifique se os documentos foram indexados</p>
                  </CardContent>
                </Card>
              )}

              {semanticSearch.data && semanticSearch.data.results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {semanticSearch.data.total} resultado(s) para &ldquo;{activeQuery}&rdquo;
                  </p>
                  {semanticSearch.data.results.map((result, idx) => {
                    const entity = ENTITY_LABELS[result.entity_type] || {
                      label: result.entity_type,
                      icon: <FileText className="h-3.5 w-3.5" />,
                      color: "bg-neutral-100 text-neutral-700",
                      href: () => "#",
                    };
                    const scorePercent = Math.round(result.score * 100);

                    return (
                      <Card key={`${result.entity_type}-${result.entity_id}-${idx}`} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Badge variant="secondary" className={`text-xs gap-1 ${entity.color}`}>
                                  {entity.icon}
                                  {entity.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {scorePercent}% relevancia
                                </Badge>
                                {result.chunk_index > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Trecho {result.chunk_index + 1}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground line-clamp-3 whitespace-pre-line">
                                {result.content_text}
                              </p>
                            </div>
                            <Link href={entity.href(result.entity_id)}>
                              <Button variant="ghost" size="sm" className="shrink-0">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "local" && (
            <>
              {localSearch.isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Buscando no banco...</span>
                </div>
              )}

              {localSearch.data && (
                <div className="space-y-4">
                  {/* Assistidos */}
                  {localSearch.data.assistidos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                        Assistidos ({localSearch.data.assistidos.length})
                      </h3>
                      {localSearch.data.assistidos.map((a) => (
                        <Link key={a.id} href={`/admin/assistidos/${a.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{a.nome}</p>
                                {a.cpf && <p className="text-xs text-muted-foreground font-mono">{a.cpf}</p>}
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Processos */}
                  {localSearch.data.processos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Scale className="h-4 w-4 text-blue-600" />
                        Processos ({localSearch.data.processos.length})
                      </h3>
                      {localSearch.data.processos.map((p) => (
                        <Link key={p.id} href={`/admin/processos/${p.id}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium font-mono">{p.numeroAutos}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.classeProcessual} {p.vara ? `\u2022 ${p.vara}` : ""}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}

                  {localSearch.data.assistidos.length === 0 && localSearch.data.processos.length === 0 && (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum resultado encontrado para &ldquo;{activeQuery}&rdquo;</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* External Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Consultas Externas</CardTitle>
          <CardDescription>
            Acesse os sistemas dos tribunais para consulta
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <a href="https://esaj.tjba.jus.br/esaj/portal.do?servico=740000" target="_blank" rel="noopener noreferrer">
              <Card className="cursor-pointer hover:shadow-md transition-shadow group">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">E-SAJ TJBA</p>
                      <p className="text-xs text-muted-foreground">Tribunal de Justica da Bahia</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardContent>
              </Card>
            </a>
            <a href="https://pje.tjba.jus.br/pje/login.seam" target="_blank" rel="noopener noreferrer">
              <Card className="cursor-pointer hover:shadow-md transition-shadow group">
                <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Scale className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">PJe TJBA</p>
                      <p className="text-xs text-muted-foreground">Processo Judicial Eletronico</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardContent>
              </Card>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
