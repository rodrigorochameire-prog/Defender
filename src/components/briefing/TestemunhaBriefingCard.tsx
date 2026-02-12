"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  Scale,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageCircleQuestion,
  Star,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TestemunhaBriefingData {
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

interface TestemunhaBriefingCardProps {
  testemunha: TestemunhaBriefingData;
  onPerguntaSelect?: (pergunta: string, selected: boolean) => void;
  selectedPerguntas?: Set<string>;
  className?: string;
}

export function TestemunhaBriefingCard({
  testemunha,
  onPerguntaSelect,
  selectedPerguntas = new Set(),
  className,
}: TestemunhaBriefingCardProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    delegacia: true,
    juizo: false,
    contradicoes: true,
    pontos: false,
    perguntas: true,
  });

  const [copiedPergunta, setCopiedPergunta] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopyPergunta = (pergunta: string) => {
    navigator.clipboard.writeText(pergunta);
    setCopiedPergunta(pergunta);
    toast.success("Pergunta copiada!");
    setTimeout(() => setCopiedPergunta(null), 2000);
  };

  const handleCopyAllPerguntas = () => {
    const text = testemunha.perguntas_sugeridas.join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as perguntas copiadas!");
  };

  const tipoColor =
    testemunha.tipo === "ACUSACAO"
      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";

  const credibilidadeColor =
    testemunha.credibilidade_score !== undefined
      ? testemunha.credibilidade_score >= 7
        ? "text-emerald-600"
        : testemunha.credibilidade_score >= 4
          ? "text-amber-600"
          : "text-rose-600"
      : "text-zinc-500";

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{testemunha.nome}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={tipoColor}>
                  {testemunha.tipo === "ACUSACAO" ? "Acusação" : "Defesa"}
                </Badge>
                {testemunha.arquivos_encontrados.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="w-3 h-3" />
                    {testemunha.arquivos_encontrados.length} arquivo(s)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {testemunha.credibilidade_score !== undefined && (
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className={cn("w-4 h-4", credibilidadeColor)} />
                <span className={cn("text-xl font-bold", credibilidadeColor)}>
                  {testemunha.credibilidade_score}/10
                </span>
              </div>
              <p className="text-xs text-zinc-500 max-w-[150px] truncate">
                {testemunha.credibilidade_justificativa}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Versão Delegacia */}
        {testemunha.versao_delegacia && (
          <Collapsible
            open={openSections.delegacia}
            onOpenChange={() => toggleSection("delegacia")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              {openSections.delegacia ? (
                <ChevronDown className="w-4 h-4 text-amber-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-amber-600" />
              )}
              <Scale className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Depoimento na Delegacia
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {testemunha.versao_delegacia}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Versão Juízo */}
        {testemunha.versao_juizo && (
          <Collapsible
            open={openSections.juizo}
            onOpenChange={() => toggleSection("juizo")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              {openSections.juizo ? (
                <ChevronDown className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-600" />
              )}
              <Scale className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                Depoimento em Juízo
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {testemunha.versao_juizo}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Contradições */}
        {testemunha.contradicoes.length > 0 && (
          <Collapsible
            open={openSections.contradicoes}
            onOpenChange={() => toggleSection("contradicoes")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              {openSections.contradicoes ? (
                <ChevronDown className="w-4 h-4 text-rose-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-rose-600" />
              )}
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="font-medium text-sm text-rose-800 dark:text-rose-200">
                Contradições ({testemunha.contradicoes.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {testemunha.contradicoes.map((contradicao, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-200 dark:border-rose-900/30"
                  >
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      {contradicao}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pontos Fortes e Fracos */}
        {(testemunha.pontos_fortes.length > 0 ||
          testemunha.pontos_fracos.length > 0) && (
          <Collapsible
            open={openSections.pontos}
            onOpenChange={() => toggleSection("pontos")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              {openSections.pontos ? (
                <ChevronDown className="w-4 h-4 text-zinc-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              )}
              <span className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
                Análise de Pontos
              </span>
              <Badge variant="secondary" className="ml-auto">
                {testemunha.pontos_fortes.length} fortes /{" "}
                {testemunha.pontos_fracos.length} fracos
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {/* Pontos Fortes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Pontos Fortes</span>
                  </div>
                  {testemunha.pontos_fortes.map((ponto, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30"
                    >
                      <p className="text-xs text-emerald-900 dark:text-emerald-100">
                        {ponto}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pontos Fracos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Vulnerabilidades</span>
                  </div>
                  {testemunha.pontos_fracos.map((ponto, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30"
                    >
                      <p className="text-xs text-amber-900 dark:text-amber-100">
                        {ponto}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Perguntas Sugeridas */}
        {testemunha.perguntas_sugeridas.length > 0 && (
          <Collapsible
            open={openSections.perguntas}
            onOpenChange={() => toggleSection("perguntas")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              {openSections.perguntas ? (
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              )}
              <MessageCircleQuestion className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                Perguntas Sugeridas ({testemunha.perguntas_sugeridas.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyAllPerguntas();
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copiar todas
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="mt-2 max-h-[300px]">
                <div className="space-y-2 pr-4">
                  {testemunha.perguntas_sugeridas.map((pergunta, idx) => {
                    const isSelected = selectedPerguntas.has(pergunta);
                    const isCopied = copiedPergunta === pergunta;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-lg border transition-colors group",
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {onPerguntaSelect && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                onPerguntaSelect(pergunta, checked as boolean)
                              }
                              className="mt-0.5"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-sm text-zinc-800 dark:text-zinc-200">
                              <span className="font-medium text-emerald-600 mr-1">
                                {idx + 1}.
                              </span>
                              {pergunta}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyPergunta(pergunta)}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {!testemunha.versao_delegacia &&
          !testemunha.versao_juizo &&
          testemunha.contradicoes.length === 0 &&
          testemunha.perguntas_sugeridas.length === 0 && (
            <div className="text-center py-6 text-zinc-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Nenhum depoimento encontrado para esta testemunha
              </p>
              <p className="text-xs mt-1">
                Verifique se há arquivos na pasta do processo
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
