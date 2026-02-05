"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Gavel,
  Scale,
  Search,
  Shield,
  Clock,
  Copy,
  Check,
  Filter,
  Lightbulb,
  AlertCircle,
  BookMarked,
} from "lucide-react";
import {
  SUMULAS_VINCULANTES,
  SUMULAS_STJ,
  RESOLUCOES_CNJ,
  NORMAS_TJBA,
  LEGISLACAO_FEDERAL,
  TESES_DEFESA,
  PRAZOS_CRIMINAIS_TJBA,
  type AtoNormativo,
  type TeseDefesa,
  type PrazoProcessual,
} from "@/lib/services/tribunais/atos-normativos";

interface AtosNormativosBrowserProps {
  onSelectAto?: (ato: AtoNormativo) => void;
  onSelectTese?: (tese: TeseDefesa) => void;
}

export function AtosNormativosBrowser({
  onSelectAto,
  onSelectTese,
}: AtosNormativosBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgao, setSelectedOrgao] = useState<string>("todos");
  const [selectedTipo, setSelectedTipo] = useState<string>("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("sumulas");

  // Consolidar todos os atos
  const todosAtos = useMemo(() => [
    ...SUMULAS_VINCULANTES,
    ...SUMULAS_STJ,
    ...RESOLUCOES_CNJ,
    ...NORMAS_TJBA,
    ...LEGISLACAO_FEDERAL,
  ], []);

  // Filtrar atos
  const atosFiltrados = useMemo(() => {
    return todosAtos.filter((ato) => {
      const matchSearch =
        searchTerm === "" ||
        ato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ato.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ato.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchOrgao = selectedOrgao === "todos" || ato.orgao === selectedOrgao;
      const matchTipo = selectedTipo === "todos" || ato.tipo === selectedTipo;

      return matchSearch && matchOrgao && matchTipo;
    });
  }, [todosAtos, searchTerm, selectedOrgao, selectedTipo]);

  // Filtrar teses
  const tesesFiltradas = useMemo(() => {
    return TESES_DEFESA.filter((tese) => {
      return (
        searchTerm === "" ||
        tese.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tese.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tese.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [searchTerm]);

  // Agrupar atos por orgão
  const atosPorOrgao = useMemo(() => {
    const grupos: Record<string, AtoNormativo[]> = {};
    atosFiltrados.forEach((ato) => {
      if (!grupos[ato.orgao]) {
        grupos[ato.orgao] = [];
      }
      grupos[ato.orgao].push(ato);
    });
    return grupos;
  }, [atosFiltrados]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOrgaoIcon = (orgao: string) => {
    switch (orgao) {
      case "STF":
        return <Scale className="h-4 w-4 text-purple-600" />;
      case "STJ":
        return <Gavel className="h-4 w-4 text-blue-600" />;
      case "CNJ":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "TJBA":
        return <BookMarked className="h-4 w-4 text-amber-600" />;
      case "União":
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: AtoNormativo["tipo"]) => {
    const colors: Record<string, string> = {
      sumula: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      resolucao: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      lei: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      provimento: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      portaria: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      decreto: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
      instrucao: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    };
    return colors[tipo] || "bg-gray-100 text-gray-700";
  };

  const getTeseTipoColor = (tipo: TeseDefesa["tipo"]) => {
    const colors: Record<string, string> = {
      absolvicao: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      desclassificacao: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      atenuacao: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      nulidade: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      execucao: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[tipo] || "bg-gray-100 text-gray-700";
  };

  const renderAtoCard = (ato: AtoNormativo) => (
    <Card
      key={ato.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelectAto?.(ato)}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getOrgaoIcon(ato.orgao)}
              <span className="font-semibold text-sm">{ato.numero}</span>
              <Badge className={getTipoColor(ato.tipo)} variant="outline">
                {ato.tipo}
              </Badge>
              {ato.relevancia === "alta" && (
                <Badge variant="destructive" className="text-xs">
                  Alta Relevância
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{ato.ementa}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {ato.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {ato.tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{ato.tags.length - 4}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(ato.ementa, ato.id);
              }}
            >
              {copiedId === ato.id ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {ato.url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(ato.url, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeseCard = (tese: TeseDefesa) => (
    <Card
      key={tese.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelectTese?.(tese)}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{tese.titulo}</span>
              <Badge className={getTeseTipoColor(tese.tipo)} variant="outline">
                {tese.tipo}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{tese.descricao}</p>

            <div className="bg-muted/50 rounded-lg p-3 mb-2">
              <p className="text-xs font-medium mb-1">Fundamentação:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {tese.fundamentacao.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span>•</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-muted-foreground mr-1">Aplicável:</span>
              {tese.aplicavel.map((crime) => (
                <Badge key={crime} variant="secondary" className="text-xs">
                  {crime}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPrazosTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Prazos Processuais Criminais (TJBA)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Ato Processual</th>
                <th className="p-3 text-center font-medium">Prazo</th>
                <th className="p-3 text-center font-medium">Tipo</th>
                <th className="p-3 text-left font-medium">Fundamento</th>
              </tr>
            </thead>
            <tbody>
              {PRAZOS_CRIMINAIS_TJBA.map((prazo) => (
                <tr key={prazo.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{prazo.ato}</td>
                  <td className="p-3 text-center">
                    {prazo.prazo === 0 ? (
                      <Badge variant="outline">Sem prazo</Badge>
                    ) : (
                      <Badge variant="secondary">{prazo.prazo} dias</Badge>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={prazo.tipo === "corrido" ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {prazo.tipo === "corrido" ? "Corridos" : "Úteis"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{prazo.fundamento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <p>
            <strong>Defensoria Pública:</strong> Prazo em dobro (art. 5º, §5º, Lei 1.060/50 e art.
            128 Lei Complementar 80/94). Os prazos corridos incluem sábados, domingos e feriados.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Atos Normativos - Defesa Criminal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de pesquisa e filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar súmulas, resoluções, teses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedOrgao} onValueChange={setSelectedOrgao}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="Órgão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="STF">STF</SelectItem>
              <SelectItem value="STJ">STJ</SelectItem>
              <SelectItem value="CNJ">CNJ</SelectItem>
              <SelectItem value="TJBA">TJBA</SelectItem>
              <SelectItem value="União">União</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTipo} onValueChange={setSelectedTipo}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sumula">Súmula</SelectItem>
              <SelectItem value="resolucao">Resolução</SelectItem>
              <SelectItem value="lei">Lei</SelectItem>
              <SelectItem value="provimento">Provimento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs de conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sumulas">
              <Scale className="h-4 w-4 mr-1" />
              Súmulas
            </TabsTrigger>
            <TabsTrigger value="normas">
              <FileText className="h-4 w-4 mr-1" />
              Normas
            </TabsTrigger>
            <TabsTrigger value="teses">
              <Lightbulb className="h-4 w-4 mr-1" />
              Teses
            </TabsTrigger>
            <TabsTrigger value="prazos">
              <Clock className="h-4 w-4 mr-1" />
              Prazos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sumulas" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {/* Súmulas Vinculantes */}
                <Accordion type="single" collapsible defaultValue="stf">
                  <AccordionItem value="stf">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-purple-600" />
                        Súmulas Vinculantes (STF)
                        <Badge variant="secondary">
                          {SUMULAS_VINCULANTES.filter(
                            (s) =>
                              selectedOrgao === "todos" ||
                              selectedOrgao === "STF"
                          ).length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {SUMULAS_VINCULANTES.filter(
                          (s) =>
                            (selectedOrgao === "todos" || selectedOrgao === "STF") &&
                            (searchTerm === "" ||
                              s.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.tags.some((t) =>
                                t.toLowerCase().includes(searchTerm.toLowerCase())
                              ))
                        ).map(renderAtoCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="stj">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-blue-600" />
                        Súmulas STJ
                        <Badge variant="secondary">
                          {SUMULAS_STJ.filter(
                            (s) =>
                              selectedOrgao === "todos" ||
                              selectedOrgao === "STJ"
                          ).length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {SUMULAS_STJ.filter(
                          (s) =>
                            (selectedOrgao === "todos" || selectedOrgao === "STJ") &&
                            (searchTerm === "" ||
                              s.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.tags.some((t) =>
                                t.toLowerCase().includes(searchTerm.toLowerCase())
                              ))
                        ).map(renderAtoCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="normas" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                <Accordion type="single" collapsible defaultValue="cnj">
                  <AccordionItem value="cnj">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        Resoluções CNJ
                        <Badge variant="secondary">{RESOLUCOES_CNJ.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {RESOLUCOES_CNJ.filter(
                          (r) =>
                            searchTerm === "" ||
                            r.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.tags.some((t) =>
                              t.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                        ).map(renderAtoCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tjba">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <BookMarked className="h-4 w-4 text-amber-600" />
                        Normas TJBA
                        <Badge variant="secondary">{NORMAS_TJBA.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {NORMAS_TJBA.filter(
                          (n) =>
                            searchTerm === "" ||
                            n.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            n.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            n.tags.some((t) =>
                              t.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                        ).map(renderAtoCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="federal">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-600" />
                        Legislação Federal
                        <Badge variant="secondary">{LEGISLACAO_FEDERAL.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {LEGISLACAO_FEDERAL.filter(
                          (l) =>
                            searchTerm === "" ||
                            l.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.ementa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            l.tags.some((t) =>
                              t.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                        ).map(renderAtoCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="teses" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {tesesFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma tese encontrada para a pesquisa</p>
                  </div>
                ) : (
                  tesesFiltradas.map(renderTeseCard)
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prazos" className="mt-4">
            {renderPrazosTable()}
          </TabsContent>
        </Tabs>

        {/* Estatísticas */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <strong>{SUMULAS_VINCULANTES.length + SUMULAS_STJ.length}</strong> súmulas
            </span>
            <span>
              <strong>{RESOLUCOES_CNJ.length + NORMAS_TJBA.length}</strong> normas
            </span>
            <span>
              <strong>{LEGISLACAO_FEDERAL.length}</strong> leis
            </span>
            <span>
              <strong>{TESES_DEFESA.length}</strong> teses
            </span>
          </div>
          <span className="text-xs">Atualizado em 01/2024</span>
        </div>
      </CardContent>
    </Card>
  );
}
