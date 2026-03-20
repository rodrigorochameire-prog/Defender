"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import { FileText, AlertCircle, CheckCircle2, Upload, Download, Settings, User, Scale, ArrowRight, Sparkles, Info, Edit3, AlertTriangle, ChevronDown, Shield, MessageCircle, RefreshCw, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  parsePJeIntimacoesCompleto,
  parsePJeIntimacoesVVD,
  separarIntimacoesVVD,
  intimacaoToDemanda,
  formatarResumoImportacao,
  verificarDuplicatas,
  formatarResumoComDuplicatas,
  type IntimacaoPJeSimples,
  type ResultadoVerificacaoDuplicatas,
  type ResultadoParserVVD,
} from "@/lib/pje-parser";
import { suggestAto } from "@/lib/ato-suggestion";
import { calcularPrazoPorAto } from "@/lib/prazo-calculator";
import { PjeReviewTable, type PjeReviewRow } from "./pje-review-table";

interface PJeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[], atualizarExistentes?: boolean) => Promise<{ imported: number; updated: number; skipped: number; errors: string[]; assistidosSemSolar: number }> | void;
  atribuicaoOptions: Array<{ value: string; label: string; icon?: any }>;
  atoOptions: Array<{ value: string; label: string; icon?: any }>;
  statusOptions: Array<{ value: string; label: string; icon?: any }>;
  demandasExistentes?: any[]; // Lista de demandas já cadastradas
  onVVDImportComplete?: () => void; // Callback para atualizar página VVD após importação
  defaultAtribuicao?: string; // Atribuição pré-selecionada na view (filtro ativo)
}

export function PJeImportModal({
  isOpen,
  onClose,
  onImport,
  atribuicaoOptions,
  demandasExistentes = [],
  onVVDImportComplete,
  defaultAtribuicao,
}: PJeImportModalProps) {
  const [texto, setTexto] = useState("");
  const [intimacoes, setIntimacoes] = useState<IntimacaoPJeSimples[]>([]);
  const [resultadoVerificacao, setResultadoVerificacao] = useState<ResultadoVerificacaoDuplicatas | null>(null);
  const [etapa, setEtapa] = useState<"configurar" | "colar" | "revisar" | "resultado">("configurar");
  const [isImporting, setIsImporting] = useState(false);

  // Configurações globais - APENAS ATRIBUIÇÃO
  // Prioridade: defaultAtribuicao (filtro da view) > primeira opção válida > fallback
  const [atribuicao, setAtribuicao] = useState(() => {
    if (defaultAtribuicao && defaultAtribuicao !== "Todas") return defaultAtribuicao;
    const first = atribuicaoOptions.find(o => o.value !== "Todas");
    return first?.value || "Tribunal do Júri";
  });

  // Quando o modal é aberto, atualizar atribuição se defaultAtribuicao mudou
  useEffect(() => {
    if (isOpen && defaultAtribuicao && defaultAtribuicao !== "Todas" && etapa === "configurar") {
      setAtribuicao(defaultAtribuicao);
    }
  }, [isOpen, defaultAtribuicao]); // eslint-disable-line react-hooks/exhaustive-deps

  // Para VVD - separação de MPU e demandas gerais
  const [intimacoesMPU, setIntimacoesMPU] = useState<IntimacaoPJeSimples[]>([]);
  const [intimacoesGerais, setIntimacoesGerais] = useState<IntimacaoPJeSimples[]>([]);
  const [tipoIntimacaoVVD, setTipoIntimacaoVVD] = useState<"CIENCIA" | "PETICIONAR">("CIENCIA");

  // Opção para atualizar duplicatas existentes
  const [atualizarDuplicatas, setAtualizarDuplicatas] = useState(false);

  // Resultado da importação
  const [importResult, setImportResult] = useState<{
    enviadas: number;
    excluidas: number;
    duplicatas: number;
    atribuicao: string;
    // Server-confirmed results
    serverConfirmed: boolean;
    importadas?: number;
    atualizadas?: number;
    ignoradas?: number;
    erros?: string[];
  } | null>(null);

  // PJe Import v2 — review table rows
  const [reviewRows, setReviewRows] = useState<PjeReviewRow[]>([]);

  // Mutation para importação VVD
  const importarVVDMutation = trpc.vvd.importarIntimacoesPJe.useMutation({
    onSuccess: (resultado) => {
      toast.success(
        `Importação VVD concluída: ${resultado.processosNovos} processos, ${resultado.partesNovas} partes, ${resultado.intimacoesNovas} intimações`,
        { duration: 5000 }
      );
      if (onVVDImportComplete) {
        onVVDImportComplete();
      }
      onClose();
      resetModal();
    },
    onError: (error) => {
      toast.error(`Erro na importação VVD: ${error.message}`);
      setIsImporting(false);
    },
  });

  // Batch match de assistidos (PJe Import v2)
  const nomesParaMatch = useMemo(
    () => intimacoes.map((i) => i.assistido),
    [intimacoes]
  );
  const matchQuery = trpc.demandas.batchMatchAssistidos.useQuery(
    { nomes: nomesParaMatch },
    { enabled: nomesParaMatch.length > 0 && etapa === "revisar" }
  );

  // Merge match results into review rows
  useEffect(() => {
    if (matchQuery.data && reviewRows.length > 0) {
      const matchMap = new Map(matchQuery.data.map((m) => [m.nome, m.match]));
      setReviewRows((prev) =>
        prev.map((row) => {
          const match = matchMap.get(row.assistidoNome);
          if (!match) return row;

          const updates: Partial<PjeReviewRow> = {
            assistidoMatch: match,
          };

          // Se assistido encontrado estiver preso, auto-setar estado prisional
          if (
            match.statusPrisional &&
            (match.statusPrisional === "CADEIA_PUBLICA" ||
              match.statusPrisional === "PRESO" ||
              match.statusPrisional === "CUSTODIA")
          ) {
            updates.estadoPrisional = "preso";
          } else if (match.statusPrisional === "MONITORADO") {
            updates.estadoPrisional = "monitorado";
          }

          return { ...row, ...updates };
        })
      );
    }
  }, [matchQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verificar se é importação VVD
  const isVVD = atribuicao === "Violência Doméstica";

  const handleAvancarParaColar = () => {
    if (!atribuicao) {
      alert("Selecione a atribuição");
      return;
    }
    setEtapa("colar");
  };

  const handleParsear = () => {
    if (!texto.trim()) {
      alert("Cole o texto das intimações do PJe");
      return;
    }

    try {
      const resultadoParser = parsePJeIntimacoesCompleto(texto);

      if (resultadoParser.intimacoes.length === 0) {
        alert("Nenhuma intimação foi encontrada no texto. Verifique o formato.");
        return;
      }

      // Se a atribuição foi detectada automaticamente e difere da selecionada,
      // INFORMAR o usuário em vez de sobrescrever silenciosamente
      if (resultadoParser.atribuicaoDetectada && resultadoParser.atribuicaoDetectada !== atribuicao) {
        toast.info(
          `Vara detectada: ${resultadoParser.atribuicaoDetectada}. Sua seleção (${atribuicao}) será mantida. Altere na etapa anterior se necessário.`,
          { duration: 6000 }
        );
      }

      // Verificar duplicatas com as demandas existentes
      const verificacao = verificarDuplicatas(resultadoParser.intimacoes, demandasExistentes);

      // Adicionar informações detectadas ao resultado
      verificacao.atribuicaoDetectada = resultadoParser.atribuicaoDetectada;
      verificacao.varaDetectada = resultadoParser.varaDetectada;

      setResultadoVerificacao(verificacao);

      // Armazenar APENAS as intimações novas (não duplicadas)
      setIntimacoes(verificacao.novas);

      // Para VVD: separar MPUs das demais
      if (resultadoParser.atribuicaoDetectada === "Violência Doméstica" || atribuicao === "Violência Doméstica") {
        const separadas = separarIntimacoesVVD(verificacao.novas);
        setIntimacoesMPU(separadas.intimacoesMPU);
        setIntimacoesGerais(separadas.intimacoesGerais);
      }

      // PJe Import v2: Construir review rows com ato sugerido e prazo auto
      const atribuicaoFinal = resultadoParser.atribuicaoDetectada || atribuicao;
      const rows: PjeReviewRow[] = verificacao.novas.map((intimacao, index) => {
        const suggestion = suggestAto(
          intimacao.tipoDocumento,
          intimacao.tipoProcesso,
          atribuicaoFinal
        );

        // Calcular prazo automático baseado no ato sugerido
        let prazoCalculado = "";
        if (suggestion.ato && intimacao.dataExpedicao) {
          try {
            const parts = intimacao.dataExpedicao.split(/[\s/]/);
            const dia = parseInt(parts[0]);
            const mes = parseInt(parts[1]) - 1;
            const ano = parseInt(parts[2]);
            const fullYear = ano < 100 ? 2000 + ano : ano;
            const dataExp = new Date(fullYear, mes, dia);
            if (!isNaN(dataExp.getTime())) {
              const resultado = calcularPrazoPorAto(dataExp, suggestion.ato);
              if (resultado) {
                prazoCalculado = resultado;
              }
            }
          } catch {
            // Prazo não calculado
          }
        }

        return {
          assistidoNome: intimacao.assistido,
          numeroProcesso: intimacao.numeroProcesso,
          dataExpedicao: intimacao.dataExpedicao,
          tipoDocumento: intimacao.tipoDocumento,
          tipoProcesso: intimacao.tipoProcesso,
          crime: intimacao.crime,
          ordemOriginal: intimacao.ordemOriginal ?? index,
          ato: suggestion.ato,
          atoConfidence: suggestion.confidence,
          status: "analisar",
          prazo: prazoCalculado,
          estadoPrisional: "Solto",
          excluded: false,
          prazoManual: false,
          providencias: "",
          assistidoMatch: { type: "new" }, // Será atualizado pelo matchQuery
        };
      });

      setReviewRows(rows);
      setEtapa("revisar");
    } catch (error) {
      console.error("Erro ao processar:", error);
      alert("Erro ao processar o texto. Verifique o formato.");
    }
  };

  const resetModal = () => {
    setTexto("");
    setIntimacoes([]);
    setIntimacoesMPU([]);
    setIntimacoesGerais([]);
    setEtapa("configurar");
    setAtribuicao(
      (defaultAtribuicao && defaultAtribuicao !== "Todas") ? defaultAtribuicao
        : atribuicaoOptions.find(o => o.value !== "Todas")?.value || "Tribunal do Júri"
    );
    setTipoIntimacaoVVD("CIENCIA");
    setResultadoVerificacao(null);
    setIsImporting(false);
    setAtualizarDuplicatas(false);
    setReviewRows([]);
    setImportResult(null);
  };

  const handleImportar = async () => {
    if (isVVD) {
      // Importação VVD com separação:
      // - MPUMPCrim vai para página especial de MPUs
      // - Demais classes vão para demandas gerais com atribuição VVD
      // AGORA USA reviewRows para respeitar edições e exclusões do usuário
      setIsImporting(true);

      // Filtrar rows não excluídas e separar por tipo
      const includedRows = reviewRows.filter((r) => !r.excluded);
      const mpuRows = includedRows.filter((r) => r.tipoProcesso === "MPUMPCrim");
      const geraisRows = includedRows.filter((r) => r.tipoProcesso !== "MPUMPCrim");

      // 1. Importar MPUs para tabela especial
      if (mpuRows.length > 0) {
        const intimacoesParaVVD = mpuRows.map((row, index) => {
          const intimacao = intimacoes.find(
            (i) => (i.ordemOriginal ?? 0) === row.ordemOriginal
          );
          return {
            assistido: row.assistidoNome,
            numeroProcesso: row.numeroProcesso,
            dataExpedicao: row.dataExpedicao,
            prazo: intimacao?.prazo,
            tipoProcesso: row.tipoProcesso,
            crime: row.crime,
            pjeDocumentoId: intimacao?.idDocumento,
            pjeTipoDocumento: row.tipoDocumento,
            tipoIntimacao: "CIENCIA" as const,
            ordemOriginal: row.ordemOriginal ?? index,
          };
        });

        importarVVDMutation.mutate({ intimacoes: intimacoesParaVVD });
      }

      // 2. Importar demandas gerais (não-MPU) com overrides da review table
      if (geraisRows.length > 0) {
        const demandasGerais = geraisRows.map((row) => {
          const intimacao = intimacoes.find(
            (i) => (i.ordemOriginal ?? 0) === row.ordemOriginal
          );
          if (!intimacao) return null;
          return intimacaoToDemanda(intimacao, "Violência Doméstica", {
            ato: row.ato,
            status: row.status,
            prazo: row.prazo,
            estadoPrisional: row.estadoPrisional,
            assistidoMatchId: row.assistidoMatch.matchedId,
            providencias: row.providencias,
          });
        }).filter(Boolean);

        if (demandasGerais.length > 0) {
          onImport(demandasGerais);
          toast.success(
            `${demandasGerais.length} demandas VVD importadas para a lista geral`,
            { duration: 3000 }
          );
        }
      }

      // Se não tem MPUs, só fecha
      if (mpuRows.length === 0) {
        onClose();
        resetModal();
      }
    } else {
      // Importação regular - vai para demandas
      // PJe Import v2: usa reviewRows para gerar demandas com overrides
      const rowsToImport = reviewRows.filter((r) => !r.excluded);

      // Se atualizarDuplicatas está ativo, incluir também as duplicadas (com defaults)
      const demandasFromRows = rowsToImport.map((row) => {
        const intimacao = intimacoes.find(
          (i) => (i.ordemOriginal ?? 0) === row.ordemOriginal
        );
        if (!intimacao) return null;

        return intimacaoToDemanda(intimacao, atribuicao, {
          ato: row.ato,
          status: row.status,
          prazo: row.prazo,
          estadoPrisional: row.estadoPrisional,
          assistidoMatchId: row.assistidoMatch.matchedId,
          providencias: row.providencias,
        });
      }).filter(Boolean);

      // Se atualizar duplicatas, adicionar as duplicadas com defaults
      let demandasDuplicadas: any[] = [];
      if (atualizarDuplicatas && resultadoVerificacao) {
        demandasDuplicadas = resultadoVerificacao.duplicadas.map((intimacao) =>
          intimacaoToDemanda(intimacao, atribuicao)
        );
      }

      const todasDemandas = [...demandasFromRows, ...demandasDuplicadas];

      // Mostrar tela de resultado com loading
      const excluidas = reviewRows.filter((r) => r.excluded).length;
      setImportResult({
        enviadas: todasDemandas.length,
        excluidas,
        duplicatas: resultadoVerificacao?.duplicadas.length || 0,
        atribuicao,
        serverConfirmed: false,
      });
      setEtapa("resultado");
      setIsImporting(true);

      try {
        // Esperar resultado do servidor
        const serverResult = await onImport(todasDemandas, atualizarDuplicatas);

        if (serverResult) {
          setImportResult((prev) =>
            prev
              ? {
                  ...prev,
                  serverConfirmed: true,
                  importadas: serverResult.imported,
                  atualizadas: serverResult.updated,
                  ignoradas: serverResult.skipped,
                  erros: serverResult.errors,
                }
              : prev
          );
        } else {
          // onImport não retornou Promise (fallback)
          setImportResult((prev) =>
            prev ? { ...prev, serverConfirmed: true } : prev
          );
        }
      } catch (error) {
        setImportResult((prev) =>
          prev
            ? {
                ...prev,
                serverConfirmed: true,
                erros: [(error as Error).message || "Erro desconhecido"],
              }
            : prev
        );
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleVoltar = () => {
    if (etapa === "revisar") {
      setEtapa("colar");
    } else if (etapa === "colar") {
      setEtapa("configurar");
    }
  };

  const handleFechar = () => {
    onClose();
    // Reset após fechar
    setTimeout(() => {
      resetModal();
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleFechar}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto w-[96vw] md:w-full bg-white dark:bg-zinc-900">
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Importar do PJe
              </DialogTitle>
              <DialogDescription className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {etapa === "configurar" && "Configure a atribuição"}
                {etapa === "colar" && "Cole o texto das intimações"}
                {etapa === "revisar" && "Revise antes de importar"}
                {etapa === "resultado" && "Importação enviada"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ETAPA 1: CONFIGURAR */}
        {etapa === "configurar" && (
          <div className="space-y-7 py-6">
            {/* Banner de Instruções */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 mb-1">
                    Configuração Simplificada
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                    Informe a atribuição. O sistema extrairá automaticamente o nome, data e processo.
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 border-l-2 border-emerald-400 pl-2">
                    Prazo calculado ao selecionar o tipo de ato
                  </p>
                </div>
              </div>
            </div>

            {/* Seção: Configurações */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    Configuração Necessária
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Selecione a atribuição para as intimações
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="atribuicao" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  Atribuição
                  <span className="text-red-500 text-xs">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="atribuicao"
                    value={atribuicao}
                    onChange={(e) => setAtribuicao(e.target.value)}
                    className={cn(
                      "w-full h-11 px-4 pr-10 rounded-lg border text-sm font-medium appearance-none cursor-pointer transition-all",
                      "bg-white dark:bg-zinc-900",
                      "border-zinc-300 dark:border-zinc-700",
                      "text-zinc-900 dark:text-zinc-100",
                      "hover:border-zinc-400 dark:hover:border-zinc-600",
                      "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                    )}
                  >
                    <option value="" disabled>Selecione a atribuição</option>
                    {atribuicaoOptions
                      .filter((opt) => opt.value !== "Todas")
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Todas as intimações terão esta atribuição
                </p>
              </div>

              </div>

            {/* Banner VVD */}
            {isVVD && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100 mb-1">
                      Importação Inteligente de VVD
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-2">
                      O sistema detecta automaticamente os processos de MPU (MPUMPCrim) e os direciona para a página especial de Medidas Protetivas.
                    </p>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                      <p>• <strong>MPUMPCrim</strong> → Página de MPUs (como Ciência por padrão)</p>
                      <p>• <strong>Demais classes</strong> → Lista de demandas (APOrd, APSum, PetCrim...)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card de Revisão v2 - Só mostra para não-VVD */}
            {!isVVD && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-l-2 border-emerald-400 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-xs text-zinc-700 dark:text-zinc-300 mb-1">
                      Revisão inteligente
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Ato sugerido automaticamente • Prazo calculado em dobro • Assistidos vinculados
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleFechar}
                className="h-11 px-6 text-sm font-semibold border-zinc-300 dark:border-zinc-700"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAvancarParaColar}
                disabled={!atribuicao}
                className="h-11 px-6 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Avançar para Colar Texto
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2: COLAR TEXTO */}
        {etapa === "colar" && (
          <div className="space-y-6 py-6">
            {/* Configurações escolhidas */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                    Atribuição definida
                  </p>
                  <div className="p-2.5 bg-white/80 dark:bg-emerald-900/20 rounded-lg">
                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">Atribuição</p>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{atribuicao}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500 dark:bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base text-blue-900 dark:text-blue-100 mb-2">
                    Como copiar do PJe
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-blue-800 dark:text-blue-200">
                    <li>Acesse o <strong>PJe</strong> e vá para <strong>Intimações Pendentes</strong></li>
                    <li>Selecione todo o texto das intimações <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded font-mono text-xs">Ctrl+A</span></li>
                    <li>Copie o texto <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded font-mono text-xs">Ctrl+C</span></li>
                    <li>Cole no campo abaixo <span className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded font-mono text-xs">Ctrl+V</span></li>
                    <li>Clique em <strong>&ldquo;Analisar Intimações&rdquo;</strong></li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Área de texto */}
            <div className="space-y-2.5">
              <Label htmlFor="pje-texto" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Cole o texto das intimações do PJe:
              </Label>
              <textarea
                id="pje-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Cole aqui o texto copiado do PJe..."
                className="w-full min-h-[380px] px-4 py-3 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
              />
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {texto.length > 0 ? (
                    <>
                      <strong className="text-zinc-700 dark:text-zinc-300">{texto.length}</strong> caracteres •{" "}
                      <strong className="text-zinc-700 dark:text-zinc-300">{texto.split('\n').length}</strong> linhas
                    </>
                  ) : (
                    "Aguardando entrada..."
                  )}
                </span>
                {texto.length > 0 && (
                  <button
                    onClick={() => setTexto("")}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleVoltar}
                className="h-11 px-6 text-sm font-semibold border-zinc-300 dark:border-zinc-700"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleParsear}
                disabled={!texto.trim()}
                className="h-11 px-6 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 mr-2" />
                Analisar Intimações
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3: REVISAR */}
        {etapa === "revisar" && (
          <div className="space-y-6 py-6">
            {/* Resumo com Análise de Duplicatas */}
            {resultadoVerificacao && resultadoVerificacao.totalDuplicadas > 0 && (
              <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 dark:bg-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base text-amber-900 dark:text-amber-100 mb-3">
                      Verificação de Duplicatas
                    </p>
                    <pre className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap font-sans">
                      {formatarResumoComDuplicatas(resultadoVerificacao)}
                    </pre>

                    {/* Opção para atualizar duplicatas */}
                    <div className="mt-4 pt-4 border-t border-amber-300 dark:border-amber-700">
                      <div className="flex items-center gap-3 p-3 bg-white/80 dark:bg-amber-900/20 rounded-lg">
                        <Checkbox
                          id="atualizar-duplicatas"
                          checked={atualizarDuplicatas}
                          onCheckedChange={(checked) => setAtualizarDuplicatas(checked === true)}
                          className="border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="atualizar-duplicatas"
                            className="text-sm font-medium text-amber-900 dark:text-amber-100 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
                            Atualizar intimações existentes
                          </Label>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                            Reimporta as duplicatas com a ordem correta do PJe
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo padrão se não houver duplicatas */}
            {resultadoVerificacao && resultadoVerificacao.totalDuplicadas === 0 && (
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 dark:bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <pre className="text-sm text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap font-sans mb-4">
                      {formatarResumoComDuplicatas(resultadoVerificacao)}
                    </pre>
                    <div className="pt-4 border-t border-emerald-200 dark:border-emerald-700">
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                        Configuração aplicada:
                      </p>
                      <div className="p-2.5 bg-white/80 dark:bg-emerald-900/20 rounded-lg">
                        <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">Atribuição</p>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">{atribuicao}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso se não houver intimações novas para importar */}
            {intimacoes.length === 0 && resultadoVerificacao && resultadoVerificacao.totalDuplicadas > 0 && (
              <div className={cn(
                "p-5 border-2 rounded-xl transition-colors",
                atualizarDuplicatas
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-300 dark:border-emerald-700"
                  : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-700"
              )}>
                <div className="flex gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-colors",
                    atualizarDuplicatas
                      ? "bg-emerald-500 dark:bg-emerald-600 shadow-emerald-500/30"
                      : "bg-amber-500 dark:bg-amber-600 shadow-amber-500/30"
                  )}>
                    {atualizarDuplicatas ? (
                      <RefreshCw className="w-5 h-5 text-white" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "font-bold text-base mb-2",
                      atualizarDuplicatas
                        ? "text-emerald-900 dark:text-emerald-100"
                        : "text-amber-900 dark:text-amber-100"
                    )}>
                      {atualizarDuplicatas
                        ? `${resultadoVerificacao.totalDuplicadas} intimações serão atualizadas`
                        : "Todas as intimações já foram cadastradas"
                      }
                    </p>
                    <p className={cn(
                      "text-sm",
                      atualizarDuplicatas
                        ? "text-emerald-800 dark:text-emerald-200"
                        : "text-amber-800 dark:text-amber-200"
                    )}>
                      {atualizarDuplicatas
                        ? "As intimações existentes serão atualizadas com a ordem correta do PJe."
                        : `Não há intimações novas. Use a opção abaixo para atualizar as ${resultadoVerificacao.totalDuplicadas} existentes.`
                      }
                    </p>

                    {/* Opção para atualizar duplicatas */}
                    <div className={cn(
                      "mt-4 pt-4 border-t",
                      atualizarDuplicatas
                        ? "border-emerald-300 dark:border-emerald-700"
                        : "border-amber-300 dark:border-amber-700"
                    )}>
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        atualizarDuplicatas
                          ? "bg-white/80 dark:bg-emerald-900/20"
                          : "bg-white/80 dark:bg-amber-900/20"
                      )}>
                        <Checkbox
                          id="atualizar-duplicatas-todas"
                          checked={atualizarDuplicatas}
                          onCheckedChange={(checked) => setAtualizarDuplicatas(checked === true)}
                          className={cn(
                            atualizarDuplicatas
                              ? "border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                              : "border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          )}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="atualizar-duplicatas-todas"
                            className={cn(
                              "text-sm font-medium cursor-pointer",
                              atualizarDuplicatas
                                ? "text-emerald-900 dark:text-emerald-100"
                                : "text-amber-900 dark:text-amber-100"
                            )}
                          >
                            <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
                            Atualizar intimações existentes
                          </Label>
                          <p className={cn(
                            "text-xs mt-0.5",
                            atualizarDuplicatas
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          )}>
                            Reimporta com a ordem correta do PJe
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo da separação VVD */}
            {isVVD && intimacoes.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900/50 dark:to-zinc-800/30 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mb-3">
                      Separação de Intimações VVD
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                          🛡️ MPUs (página especial)
                        </p>
                        <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                          {intimacoesMPU.length}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          Medidas Protetivas de Urgência
                        </p>
                      </div>
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          📋 Demandas Gerais
                        </p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {intimacoesGerais.length}
                        </p>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                          APOrd, APSum, PetCrim, etc.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3">
                      <strong>MPUs</strong> vão para a página especial de Medidas Protetivas.
                      <strong> Demandas gerais</strong> vão para a lista de demandas com atribuição VVD.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de revisão editável (PJe Import v2) — todas as atribuições incluindo VVD */}
            {reviewRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Revise e ajuste antes de importar
                  </h3>
                  {matchQuery.isLoading && (
                    <span className="text-[10px] text-zinc-400 animate-pulse">
                      Buscando assistidos...
                    </span>
                  )}
                </div>

                <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  <PjeReviewTable
                    rows={reviewRows}
                    onRowsChange={setReviewRows}
                    atribuicao={atribuicao}
                    showTipoProcesso={isVVD}
                  />
                </div>
              </div>
            )}

            {/* As listas simplificadas de MPU/Gerais foram substituídas pela review table acima */}

            {/* Botões */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleVoltar}
                disabled={isImporting}
                className="h-11 px-6 text-sm font-semibold border-zinc-300 dark:border-zinc-700"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleImportar}
                disabled={isImporting || (reviewRows.filter(r => !r.excluded).length === 0 && intimacoes.length === 0 && (!atualizarDuplicatas || !resultadoVerificacao?.totalDuplicadas))}
                className="h-11 px-6 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {atualizarDuplicatas && reviewRows.filter(r => !r.excluded).length === 0 ? "Atualizando..." : "Importando..."}
                  </>
                ) : (
                  <>
                    {(() => {
                      const includedCount = reviewRows.filter(r => !r.excluded).length;
                      if (atualizarDuplicatas && includedCount === 0) {
                        return (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar {resultadoVerificacao?.totalDuplicadas || 0} {resultadoVerificacao?.totalDuplicadas === 1 ? "Intimação" : "Intimações"}
                          </>
                        );
                      } else if (atualizarDuplicatas && resultadoVerificacao?.totalDuplicadas) {
                        return (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Importar {includedCount} + Atualizar {resultadoVerificacao.totalDuplicadas}
                          </>
                        );
                      } else {
                        return (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Importar {includedCount} {includedCount === 1 ? "Intimação" : "Intimações"}
                          </>
                        );
                      }
                    })()}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 4: RESULTADO */}
        {etapa === "resultado" && importResult && (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-3">
              {isImporting ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                    <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                    Importando...
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Processando {importResult.enviadas} intimações no servidor. Aguarde.
                  </p>
                </>
              ) : importResult.erros && importResult.erros.length > 0 && (!importResult.importadas || importResult.importadas === 0) ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                    Erro na importação
                  </h3>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                    {importResult.serverConfirmed ? "Importação confirmada" : "Importação enviada"}
                  </h3>
                  {importResult.serverConfirmed && importResult.importadas !== undefined && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      {importResult.importadas === importResult.enviadas
                        ? `Todas as ${importResult.importadas} intimações foram importadas com sucesso.`
                        : `${importResult.importadas} de ${importResult.enviadas} intimações importadas.`
                      }
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Resumo numérico — servidor confirmado */}
            {importResult.serverConfirmed && !isImporting && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                {importResult.importadas !== undefined && importResult.importadas > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {importResult.importadas}
                    </span>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium mt-0.5">
                      Importadas
                    </p>
                  </div>
                )}
                {importResult.atualizadas !== undefined && importResult.atualizadas > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {importResult.atualizadas}
                    </span>
                    <p className="text-[10px] text-blue-600 dark:text-blue-500 font-medium mt-0.5">
                      Atualizadas
                    </p>
                  </div>
                )}
                {importResult.ignoradas !== undefined && importResult.ignoradas > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {importResult.ignoradas}
                    </span>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                      Ignoradas
                    </p>
                  </div>
                )}
                {importResult.excluidas > 0 && (
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-zinc-500 dark:text-zinc-400">
                      {importResult.excluidas}
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium mt-0.5">
                      Excluídas
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resumo numérico — antes da confirmação do servidor */}
            {!importResult.serverConfirmed && !isImporting && (
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {importResult.enviadas}
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium mt-0.5">
                    Enviadas
                  </p>
                </div>
              </div>
            )}

            {/* Erros do servidor */}
            {importResult.erros && importResult.erros.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">
                  {importResult.erros.length} erro{importResult.erros.length > 1 ? "s" : ""}:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {importResult.erros.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600 dark:text-red-400">
                      • {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto space-y-1">
              <div className="flex justify-between">
                <span>Atribuição:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{importResult.atribuicao}</span>
              </div>
              <div className="flex justify-between">
                <span>Total no texto:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{reviewRows.length + (resultadoVerificacao?.duplicadas.length || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Enviadas ao servidor:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{importResult.enviadas}</span>
              </div>
              {importResult.serverConfirmed && importResult.importadas !== undefined && (
                <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1 mt-1">
                  <span className="font-medium">Confirmadas pelo servidor:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {importResult.importadas + (importResult.atualizadas || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Botão fechar */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  onClose();
                  setTimeout(resetModal, 300);
                }}
                disabled={isImporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar e Fechar
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