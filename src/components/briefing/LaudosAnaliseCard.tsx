"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Microscope,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  MessageCircleQuestion,
  HelpCircle,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LaudoAnalise } from "@/lib/services/python-backend";

interface LaudosAnaliseCardProps {
  laudo: LaudoAnalise;
  className?: string;
}

const tipoLaudoLabels: Record<string, string> = {
  cadaverico: "Laudo Cadavérico",
  lesoes_corporais: "Lesões Corporais",
  toxicologico: "Toxicológico",
  local: "Local de Crime",
  balistico: "Balístico",
  dna: "Exame de DNA",
  outro: "Laudo Pericial",
};

const tipoLaudoColors: Record<string, string> = {
  cadaverico: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  lesoes_corporais: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  toxicologico: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  local: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  balistico: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  dna: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  outro: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

export function LaudosAnaliseCard({ laudo, className }: LaudosAnaliseCardProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resumo: true,
    favoraveis: true,
    desfavoraveis: false,
    inconsistencias: true,
    perguntas: true,
    correlacao: false,
    quesitos: false,
  });

  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleCopyAllPerguntas = () => {
    const text = laudo.perguntas_para_perito.join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as perguntas copiadas!");
  };

  const tipoLabel = tipoLaudoLabels[laudo.tipo_laudo] || laudo.tipo_laudo;
  const tipoColor = tipoLaudoColors[laudo.tipo_laudo] || tipoLaudoColors.outro;

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Microscope className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{tipoLabel}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={tipoColor}>
                  {laudo.tipo_laudo}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {laudo.arquivo_origem}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {laudo.pontos_favoraveis_defesa.length} favoráveis
            </Badge>
            <Badge
              variant="outline"
              className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              {laudo.pontos_desfavoraveis.length} desfavoráveis
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Resumo */}
        <Collapsible
          open={openSections.resumo}
          onOpenChange={() => toggleSection("resumo")}
        >
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            {openSections.resumo ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <FileText className="w-4 h-4" />
            <span className="font-medium text-sm">Resumo do Laudo</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {laudo.resumo}
              </p>
              {laudo.conclusoes_principais.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-500 mb-2">
                    Conclusões Principais:
                  </p>
                  <ul className="space-y-1">
                    {laudo.conclusoes_principais.map((conclusao, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                      >
                        <span className="text-blue-500 mt-1">•</span>
                        {conclusao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Pontos Favoráveis */}
        {laudo.pontos_favoraveis_defesa.length > 0 && (
          <Collapsible
            open={openSections.favoraveis}
            onOpenChange={() => toggleSection("favoraveis")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              {openSections.favoraveis ? (
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              )}
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                Pontos Favoráveis à Defesa ({laudo.pontos_favoraveis_defesa.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {laudo.pontos_favoraveis_defesa.map((ponto, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30"
                  >
                    <p className="text-sm text-emerald-900 dark:text-emerald-100">
                      <span className="font-medium text-emerald-600 mr-1">
                        {idx + 1}.
                      </span>
                      {ponto}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pontos Desfavoráveis */}
        {laudo.pontos_desfavoraveis.length > 0 && (
          <Collapsible
            open={openSections.desfavoraveis}
            onOpenChange={() => toggleSection("desfavoraveis")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              {openSections.desfavoraveis ? (
                <ChevronDown className="w-4 h-4 text-rose-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-rose-600" />
              )}
              <ThumbsDown className="w-4 h-4 text-rose-600" />
              <span className="font-medium text-sm text-rose-800 dark:text-rose-200">
                Pontos Desfavoráveis ({laudo.pontos_desfavoraveis.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {laudo.pontos_desfavoraveis.map((ponto, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-200 dark:border-rose-900/30"
                  >
                    <p className="text-sm text-rose-900 dark:text-rose-100">
                      {ponto}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Inconsistências */}
        {laudo.inconsistencias_internas.length > 0 && (
          <Collapsible
            open={openSections.inconsistencias}
            onOpenChange={() => toggleSection("inconsistencias")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
              {openSections.inconsistencias ? (
                <ChevronDown className="w-4 h-4 text-amber-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-amber-600" />
              )}
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
                Inconsistências Internas ({laudo.inconsistencias_internas.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {laudo.inconsistencias_internas.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30"
                  >
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Perguntas para o Perito */}
        {laudo.perguntas_para_perito.length > 0 && (
          <Collapsible
            open={openSections.perguntas}
            onOpenChange={() => toggleSection("perguntas")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              {openSections.perguntas ? (
                <ChevronDown className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-blue-600" />
              )}
              <MessageCircleQuestion className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                Perguntas para o Perito ({laudo.perguntas_para_perito.length})
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
              <ScrollArea className="mt-2 max-h-[250px]">
                <div className="space-y-2 pr-4">
                  {laudo.perguntas_para_perito.map((pergunta, idx) => {
                    const perguntaId = `perito-${idx}`;
                    const isCopied = copiedItem === perguntaId;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-medium text-blue-600 text-sm">
                            {idx + 1}.
                          </span>
                          <p className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                            {pergunta}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopy(pergunta, perguntaId)}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-blue-600" />
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

        {/* Correlação com Depoimentos */}
        {laudo.correlacao_depoimentos.length > 0 && (
          <Collapsible
            open={openSections.correlacao}
            onOpenChange={() => toggleSection("correlacao")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              {openSections.correlacao ? (
                <ChevronDown className="w-4 h-4 text-purple-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-purple-600" />
              )}
              <Link2 className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm text-purple-800 dark:text-purple-200">
                Correlação com Depoimentos ({laudo.correlacao_depoimentos.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {laudo.correlacao_depoimentos.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-900/30"
                  >
                    <p className="text-sm text-purple-900 dark:text-purple-100">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quesitos Complementares */}
        {laudo.quesitos_complementares.length > 0 && (
          <Collapsible
            open={openSections.quesitos}
            onOpenChange={() => toggleSection("quesitos")}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              {openSections.quesitos ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <HelpCircle className="w-4 h-4" />
              <span className="font-medium text-sm">
                Quesitos Complementares ({laudo.quesitos_complementares.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {laudo.quesitos_complementares.map((quesito, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium mr-1">{idx + 1}.</span>
                      {quesito}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
