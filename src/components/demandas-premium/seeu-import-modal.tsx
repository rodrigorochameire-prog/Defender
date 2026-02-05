"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Upload,
  Download,
  User,
  Scale,
  ArrowRight,
  Sparkles,
  Info,
  AlertTriangle,
  ChevronDown,
  Gavel,
  Clock,
  Calendar,
  Building,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  parseSEEUIntimacoes,
  intimacaoSEEUToDemanda,
  type IntimacaoSEEU,
  type ResultadoParserSEEU,
} from "@/lib/pje-parser";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface SEEUImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[]) => void;
  demandasExistentes?: any[];
}

export function SEEUImportModal({
  isOpen,
  onClose,
  onImport,
  demandasExistentes = [],
}: SEEUImportModalProps) {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoParserSEEU | null>(null);
  const [etapa, setEtapa] = useState<"colar" | "revisar">("colar");
  const [isImporting, setIsImporting] = useState(false);

  // Tipo de manifestação selecionada
  const [tipoManifestacao, setTipoManifestacao] = useState<"manifestacao" | "ciencia">("manifestacao");

  const handleParsear = () => {
    if (!texto.trim()) {
      toast.error("Cole o texto das intimações do SEEU");
      return;
    }

    try {
      const resultadoParser = parseSEEUIntimacoes(texto);

      if (resultadoParser.intimacoes.length === 0) {
        toast.error("Nenhuma intimação encontrada. Verifique se o texto foi copiado corretamente do SEEU.");
        return;
      }

      // Verificar duplicatas
      const processosExistentes = new Set(
        demandasExistentes.map((d) => d.processoNumero || d.processos?.[0]?.numero).filter(Boolean)
      );

      const intimacoesNovas = resultadoParser.intimacoes.filter(
        (i) => !processosExistentes.has(i.numeroProcesso)
      );

      const duplicadas = resultadoParser.intimacoes.length - intimacoesNovas.length;

      if (duplicadas > 0) {
        toast.warning(`${duplicadas} intimação(ões) já cadastrada(s) foram ignoradas`);
      }

      setResultado({
        ...resultadoParser,
        intimacoes: intimacoesNovas,
        totalEncontradas: intimacoesNovas.length,
      });
      setEtapa("revisar");

      toast.success(`${intimacoesNovas.length} intimações identificadas do SEEU`);
    } catch (error) {
      console.error("Erro ao processar:", error);
      toast.error("Erro ao processar o texto. Verifique o formato.");
    }
  };

  const handleImportar = () => {
    if (!resultado || resultado.intimacoes.length === 0) {
      toast.error("Nenhuma intimação para importar");
      return;
    }

    setIsImporting(true);

    try {
      const demandas = resultado.intimacoes.map((intimacao) => {
        const demanda = intimacaoSEEUToDemanda(intimacao);
        // Sobrescrever tipo de manifestação se usuário escolheu diferente
        if (tipoManifestacao !== intimacao.tipoManifestacao) {
          demanda.tipoIntimacao = tipoManifestacao === "ciencia" ? "CIENCIA" : "PETICIONAR";
          demanda.status = tipoManifestacao === "ciencia" ? "7_CIENCIA" : "2_ATENDER";
        }
        return demanda;
      });

      onImport(demandas);
      toast.success(`${demandas.length} demandas importadas do SEEU!`);
      resetModal();
      onClose();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar demandas");
    } finally {
      setIsImporting(false);
    }
  };

  const resetModal = () => {
    setTexto("");
    setResultado(null);
    setEtapa("colar");
    setIsImporting(false);
    setTipoManifestacao("manifestacao");
  };

  const handleVoltar = () => {
    if (etapa === "revisar") {
      setEtapa("colar");
    }
  };

  const handleFechar = () => {
    onClose();
    setTimeout(resetModal, 300);
  };

  // Estatísticas do resultado
  const stats = useMemo(() => {
    if (!resultado) return null;

    const porAssunto: Record<string, number> = {};
    const porClasse: Record<string, number> = {};

    resultado.intimacoes.forEach((i) => {
      if (i.assuntoPrincipal) {
        porAssunto[i.assuntoPrincipal] = (porAssunto[i.assuntoPrincipal] || 0) + 1;
      }
      if (i.classeProcessual) {
        porClasse[i.classeProcessual] = (porClasse[i.classeProcessual] || 0) + 1;
      }
    });

    return { porAssunto, porClasse };
  }, [resultado]);

  // Badge para tipo de assunto
  const getAssuntoBadge = (assunto: string | undefined) => {
    if (!assunto) return null;

    if (assunto.includes("Acordo de Não Persecução")) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">ANPP</Badge>;
    }
    if (assunto.includes("Pena Privativa")) {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">PPL</Badge>;
    }
    if (assunto.includes("Pena Restritiva")) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">PRD</Badge>;
    }
    return <Badge variant="outline">{assunto}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleFechar}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto w-[96vw] md:w-full bg-white dark:bg-zinc-900">
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Gavel className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Importar do SEEU
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                Sistema Eletrônico de Execução Unificada - Execução Penal
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Etapa 1: Colar texto */}
        {etapa === "colar" && (
          <div className="space-y-5 py-4">
            {/* Seletor de tipo de manifestação */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Tipo de Intimação
                <span className="text-red-500 text-xs">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoManifestacao("manifestacao")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    tipoManifestacao === "manifestacao"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={cn(
                      "w-5 h-5",
                      tipoManifestacao === "manifestacao" ? "text-amber-600" : "text-zinc-400"
                    )} />
                    <span className="font-semibold text-sm">Manifestação</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Intimações que exigem manifestação nos autos. Prazo para resposta.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoManifestacao("ciencia")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    tipoManifestacao === "ciencia"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className={cn(
                      "w-5 h-5",
                      tipoManifestacao === "ciencia" ? "text-blue-600" : "text-zinc-400"
                    )} />
                    <span className="font-semibold text-sm">Mera Ciência</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Intimações apenas para ciência. Não exigem resposta.
                  </p>
                </button>
              </div>
            </div>

            {/* Área de texto */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Cole o texto da Mesa do Defensor
              </Label>
              <div className="relative">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={`Cole aqui o conteúdo da "Mesa do Defensor" do SEEU...

Exemplo:
1406  2000193-09.2024.8.05.0039  Execução da Pena
(Acordo de Não Persecução Penal)
Autoridade: Ministério Público do Estado da Bahia
Executado: NEMIAS DOS SANTOS JESUS
27/01/2026
06/02/2026  6 dias corridos  Livre  [ Analisar ]`}
                  className="w-full h-[250px] p-4 text-sm font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                {texto && (
                  <button
                    onClick={() => setTexto("")}
                    className="absolute top-2 right-2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  >
                    <AlertCircle className="w-4 h-4 text-zinc-400" />
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Copie toda a tabela da Mesa do Defensor incluindo cabecalhos
              </p>
            </div>

            {/* Instruções */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Gavel className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-amber-900 dark:text-amber-100 mb-1">
                    Como usar
                  </p>
                  <ol className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                    <li>Acesse o SEEU e va para Mesa do Defensor</li>
                    <li>Selecione a aba (Manifestacao ou Ciencia)</li>
                    <li>Selecione e copie toda a tabela (Ctrl+A, Ctrl+C)</li>
                    <li>Cole aqui e clique em Processar</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="outline" onClick={handleFechar}>
                Cancelar
              </Button>
              <Button
                onClick={handleParsear}
                disabled={!texto.trim()}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Processar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Revisar */}
        {etapa === "revisar" && resultado && (
          <div className="space-y-5 py-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-2xl font-bold">{resultado.totalEncontradas}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats && Object.entries(stats.porAssunto).slice(0, 3).map(([assunto, count]) => (
                <Card key={assunto}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={assunto}>
                          {assunto.includes("Acordo") ? "ANPP" :
                           assunto.includes("Privativa") ? "PPL" :
                           assunto.includes("Restritiva") ? "PRD" : assunto}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Banner de info */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Importação de Execução Penal
                </p>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                As demandas serao criadas com atribuicao Execucao Penal e tipo {tipoManifestacao === "ciencia" ? "Ciencia" : "Manifestacao"}.
              </p>
            </div>

            {/* Lista de intimações */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Intimações para Importar ({resultado.intimacoes.length})
                </h3>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2 pr-4">
                  {resultado.intimacoes.map((intimacao, index) => (
                    <Card key={index} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-amber-600" />
                              <span className="font-semibold text-sm">{intimacao.assistido}</span>
                              {intimacao.seq && (
                                <Badge variant="outline" className="text-[10px]">
                                  #{intimacao.seq}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                {intimacao.numeroProcesso}
                              </code>
                              {getAssuntoBadge(intimacao.assuntoPrincipal)}
                            </div>
                            {intimacao.classeProcessual && (
                              <p className="text-xs text-zinc-500 mt-1">
                                {intimacao.classeProcessual}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {intimacao.ultimoDia && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>Prazo: {intimacao.ultimoDia}</span>
                              </div>
                            )}
                            {intimacao.prazo && (
                              <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{intimacao.prazo} dias</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="outline" onClick={handleVoltar} disabled={isImporting}>
                Voltar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={isImporting || resultado.intimacoes.length === 0}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importar {resultado.intimacoes.length} Demandas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
