"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { FileText, AlertCircle, CheckCircle2, Upload, Download, Settings, User, Scale, ArrowRight, Sparkles, Info, Edit3, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  parsePJeIntimacoes, 
  intimacaoToDemanda, 
  formatarResumoImportacao, 
  verificarDuplicatas, 
  formatarResumoComDuplicatas,
  type IntimacaoPJeSimples,
  type ResultadoVerificacaoDuplicatas 
} from "@/lib/pje-parser";

interface PJeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[]) => void;
  atribuicaoOptions: Array<{ value: string; label: string; icon?: any }>;
  atoOptions: Array<{ value: string; label: string; icon?: any }>;
  statusOptions: Array<{ value: string; label: string; icon?: any }>;
  demandasExistentes?: any[]; // Lista de demandas já cadastradas
}

export function PJeImportModal({ 
  isOpen, 
  onClose, 
  onImport,
  atribuicaoOptions,
  demandasExistentes = [],
}: PJeImportModalProps) {
  const [texto, setTexto] = useState("");
  const [intimacoes, setIntimacoes] = useState<IntimacaoPJeSimples[]>([]);
  const [resultadoVerificacao, setResultadoVerificacao] = useState<ResultadoVerificacaoDuplicatas | null>(null);
  const [etapa, setEtapa] = useState<"configurar" | "colar" | "revisar">("configurar");
  
  // Configurações globais - APENAS ATRIBUIÇÃO
  const [atribuicao, setAtribuicao] = useState("Júri");

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
      const resultado = parsePJeIntimacoes(texto);
      
      if (resultado.length === 0) {
        alert("Nenhuma intimação foi encontrada no texto. Verifique o formato.");
        return;
      }

      // Verificar duplicatas com as demandas existentes
      const verificacao = verificarDuplicatas(resultado, demandasExistentes);
      setResultadoVerificacao(verificacao);
      
      // Armazenar APENAS as intimações novas (não duplicadas)
      setIntimacoes(verificacao.novas);
      setEtapa("revisar");
    } catch (error) {
      console.error("Erro ao processar:", error);
      alert("Erro ao processar o texto. Verifique o formato.");
    }
  };

  const handleImportar = () => {
    const demandas = intimacoes.map(intimacao => 
      intimacaoToDemanda(intimacao, atribuicao)
    );
    onImport(demandas);
    onClose();
    
    // Reset
    setTexto("");
    setIntimacoes([]);
    setEtapa("configurar");
    setAtribuicao("Júri");
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
      setTexto("");
      setIntimacoes([]);
      setEtapa("configurar");
      setAtribuicao("Júri");
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

            {/* Card de Edição Posterior */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-l-2 border-amber-400 rounded-r-lg">
              <div className="flex items-start gap-2">
                <Edit3 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-xs text-zinc-700 dark:text-zinc-300 mb-1">
                    Valores padrão (editáveis depois)
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Ato: Ciência • Status: Analisar • Prazo: Auto
                  </p>
                </div>
              </div>
            </div>

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
            {intimacoes.length === 0 && resultadoVerificacao && (
              <div className="p-5 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-2 border-red-300 dark:border-red-700 rounded-xl">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500 dark:bg-red-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base text-red-900 dark:text-red-100 mb-2">
                      Todas as intimações já foram cadastradas
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Não há intimações novas para importar. Todas as {resultadoVerificacao.totalDuplicadas} intimações encontradas já estão no sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de intimações (apenas se houver intimações novas) */}
            {intimacoes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Intimações que serão importadas ({intimacoes.length})
                  </h3>
                </div>
                
                <div className="max-h-[420px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {intimacoes.map((intimacao, index) => (
                    <div
                      key={index}
                      className="group p-4 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {intimacao.assistido}
                          </h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">
                            {intimacao.numeroProcesso}
                          </p>
                          {intimacao.idDocumento && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                              {intimacao.tipoDocumento} (ID: {intimacao.idDocumento})
                            </p>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                          #{index + 1}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Data de Expedição</p>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{intimacao.dataExpedicao}</p>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            Editar depois
                          </p>
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            Ato: <strong>Ciência (padrão)</strong> • Status: <strong>Analisar (padrão)</strong> • Prazo: <strong>Calculado ao editar ato</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                onClick={handleImportar}
                className="h-11 px-6 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Importar {intimacoes.length} {intimacoes.length === 1 ? "Intimação" : "Intimações"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}