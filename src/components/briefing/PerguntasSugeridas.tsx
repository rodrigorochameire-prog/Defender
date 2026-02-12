"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircleQuestion,
  Copy,
  Check,
  User,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PerguntaPorTestemunha {
  testemunha: string;
  tipo: string;
  pergunta: string;
}

interface PerguntasSugeridasProps {
  perguntas: PerguntaPorTestemunha[];
  selectedPerguntas?: Set<string>;
  onPerguntaSelect?: (pergunta: string, selected: boolean) => void;
  onExportSelected?: () => void;
  className?: string;
}

export function PerguntasSugeridas({
  perguntas,
  selectedPerguntas = new Set(),
  onPerguntaSelect,
  onExportSelected,
  className,
}: PerguntasSugeridasProps) {
  const [copiedPergunta, setCopiedPergunta] = useState<string | null>(null);

  const handleCopyPergunta = (pergunta: string) => {
    navigator.clipboard.writeText(pergunta);
    setCopiedPergunta(pergunta);
    toast.success("Pergunta copiada!");
    setTimeout(() => setCopiedPergunta(null), 2000);
  };

  const handleCopyAll = () => {
    const text = perguntas
      .map((p) => `[${p.testemunha}]\n${p.pergunta}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Todas as perguntas copiadas!");
  };

  const handleCopySelected = () => {
    const selected = perguntas.filter((p) => selectedPerguntas.has(p.pergunta));
    const text = selected
      .map((p) => `[${p.testemunha}]\n${p.pergunta}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success(`${selected.length} pergunta(s) copiada(s)!`);
  };

  const handleSelectAll = () => {
    if (onPerguntaSelect) {
      const allSelected = perguntas.every((p) =>
        selectedPerguntas.has(p.pergunta)
      );
      perguntas.forEach((p) => {
        onPerguntaSelect(p.pergunta, !allSelected);
      });
    }
  };

  const handlePrint = () => {
    const selected = perguntas.filter((p) => selectedPerguntas.has(p.pergunta));
    const content =
      selected.length > 0
        ? selected
        : perguntas;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Perguntas para Inquirição</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          .testemunha { margin-top: 30px; }
          .testemunha-nome { font-weight: bold; color: #10b981; margin-bottom: 10px; }
          .pergunta { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 8px; }
          .pergunta-num { font-weight: bold; color: #10b981; margin-right: 8px; }
        </style>
      </head>
      <body>
        <h1>Perguntas para Inquirição</h1>
        ${Object.entries(
          content.reduce(
            (acc, p) => {
              if (!acc[p.testemunha]) acc[p.testemunha] = [];
              acc[p.testemunha].push(p.pergunta);
              return acc;
            },
            {} as Record<string, string[]>
          )
        )
          .map(
            ([testemunha, ps]) => `
            <div class="testemunha">
              <div class="testemunha-nome">${testemunha}</div>
              ${ps.map((p, i) => `<div class="pergunta"><span class="pergunta-num">${i + 1}.</span>${p}</div>`).join("")}
            </div>
          `
          )
          .join("")}
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Agrupar por testemunha
  const perguntasPorTestemunha = perguntas.reduce(
    (acc, p) => {
      if (!acc[p.testemunha]) {
        acc[p.testemunha] = { tipo: p.tipo, perguntas: [] };
      }
      acc[p.testemunha].perguntas.push(p.pergunta);
      return acc;
    },
    {} as Record<string, { tipo: string; perguntas: string[] }>
  );

  const allSelected = perguntas.every((p) => selectedPerguntas.has(p.pergunta));

  return (
    <Card className={cn("border-2 border-emerald-200 dark:border-emerald-800", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircleQuestion className="w-5 h-5 text-emerald-600" />
            Perguntas Consolidadas
            <Badge variant="secondary">{perguntas.length} perguntas</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {onPerguntaSelect && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-1"
              >
                <Checkbox
                  checked={allSelected}
                  className="mr-1"
                />
                {allSelected ? "Desmarcar" : "Selecionar"} todas
              </Button>
            )}
            {selectedPerguntas.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySelected}
                className="gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar selecionadas ({selectedPerguntas.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 pr-4">
            {Object.entries(perguntasPorTestemunha).map(
              ([testemunha, data]) => (
                <div key={testemunha} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-white dark:bg-zinc-950 py-1 z-10">
                    <User className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium text-sm">{testemunha}</span>
                    <Badge
                      variant="outline"
                      className={
                        data.tipo === "ACUSACAO"
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      }
                    >
                      {data.tipo === "ACUSACAO" ? "Acusação" : "Defesa"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pl-6">
                    {data.perguntas.map((pergunta, idx) => {
                      const isSelected = selectedPerguntas.has(pergunta);
                      const isCopied = copiedPergunta === pergunta;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start gap-2 p-2 rounded-lg transition-colors group",
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-900/20"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          )}
                        >
                          {onPerguntaSelect && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                onPerguntaSelect(pergunta, checked as boolean)
                              }
                              className="mt-0.5"
                            />
                          )}
                          <span className="font-medium text-emerald-600 text-sm">
                            {idx + 1}.
                          </span>
                          <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {pergunta}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleCopyPergunta(pergunta)}
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
