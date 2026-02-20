"use client";

import { useState } from "react";
import { Copy, Check, Sparkles, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TranscriptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: string;
  summary?: string | null;
  assistidoNome?: string;
  onSummarize?: () => void;
  isSummarizing?: boolean;
  title?: string;
}

export function TranscriptViewer({
  open,
  onOpenChange,
  transcript,
  summary,
  assistidoNome,
  onSummarize,
  isSummarizing,
  title,
}: TranscriptViewerProps) {
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-zinc-500" />
            {title ?? "Transcrição de Áudio"}
            {assistidoNome && (
              <span className="text-sm font-normal text-zinc-500">
                — {assistidoNome}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0 mt-2">
          {/* Coluna esquerda: transcrição bruta */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Transcrição
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyTranscript}
                className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-700"
              >
                {copiedTranscript ? (
                  <Check className="h-3 w-3 mr-1 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copiedTranscript ? "Copiado!" : "Copiar"}
              </Button>
            </div>
            <ScrollArea className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 max-h-[300px]">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {transcript || (
                  <span className="text-zinc-400 italic">
                    Nenhum texto transcrito.
                  </span>
                )}
              </p>
            </ScrollArea>
          </div>

          {/* Coluna direita: resumo IA */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Resumo Jurídico
              </span>
              {summary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySummary}
                  className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  {copiedSummary ? (
                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copiedSummary ? "Copiado!" : "Copiar"}
                </Button>
              )}
            </div>

            {summary ? (
              <ScrollArea className={cn(
                "flex-1 rounded-md border p-3 max-h-[300px]",
                "border-violet-200 dark:border-violet-800",
                "bg-violet-50/50 dark:bg-violet-950/20"
              )}>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </ScrollArea>
            ) : (
              <div className="flex-1 rounded-md border border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 p-6 min-h-[200px]">
                {isSummarizing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                    <p className="text-xs text-zinc-500">Gerando resumo...</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6 text-violet-300" />
                    <p className="text-xs text-zinc-500 text-center">
                      Clique para gerar um resumo jurídico estruturado com IA
                    </p>
                    {onSummarize && (
                      <Button
                        size="sm"
                        onClick={onSummarize}
                        className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7 px-3"
                      >
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Resumir com IA
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
