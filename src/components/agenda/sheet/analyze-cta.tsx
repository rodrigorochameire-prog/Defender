"use client";

import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Props {
  assistidoId: number | null;
  processoId: number | null;
  casoId?: number | null;
  skill?: string;
  analysisStatus?: string | null;
  onTriggered?: () => void;
}

export function AnalyzeCTA({
  assistidoId, processoId, casoId, skill, analysisStatus, onTriggered,
}: Props) {
  const criarTask = trpc.analise.criarTask.useMutation({
    onSuccess: () => {
      toast.success("Análise enfileirada");
      onTriggered?.();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao enfileirar análise"),
  });

  const trigger = () => {
    if (!assistidoId) return;
    criarTask.mutate({
      assistidoId,
      processoId: processoId ?? undefined,
      casoId: casoId ?? undefined,
      skill: skill ?? "analise-autos",
    });
  };

  if (analysisStatus === "queued") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
        <span>Enfileirada…</span>
      </div>
    );
  }

  if (analysisStatus === "processing") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-emerald-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
        <span>Analisando…</span>
      </div>
    );
  }

  if (analysisStatus === "failed") {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        <span className="text-rose-600">Análise falhou</span>
        <button
          type="button"
          onClick={trigger}
          disabled={!assistidoId || criarTask.isPending}
          className="px-2 py-0.5 rounded-md border border-neutral-200 text-neutral-600 hover:border-neutral-400 cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={!assistidoId || criarTask.isPending}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Sparkles className="w-3 h-3" />
      Rodar análise IA
    </button>
  );
}
