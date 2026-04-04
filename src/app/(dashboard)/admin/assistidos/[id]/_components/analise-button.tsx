"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const ATRIB_COLORS: Record<string, { bg: string; hover: string; shadow: string }> = {
  JURI_CAMACARI: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" },
  JURI: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" },
  VVD_CAMACARI: { bg: "bg-amber-500", hover: "hover:bg-amber-600", shadow: "hover:shadow-amber-500/20" },
  VVD: { bg: "bg-amber-500", hover: "hover:bg-amber-600", shadow: "hover:shadow-amber-500/20" },
  EXECUCAO_PENAL: { bg: "bg-sky-600", hover: "hover:bg-sky-700", shadow: "hover:shadow-sky-500/20" },
  EXECUCAO: { bg: "bg-sky-600", hover: "hover:bg-sky-700", shadow: "hover:shadow-sky-500/20" },
  SUBSTITUICAO: { bg: "bg-neutral-700", hover: "hover:bg-neutral-800", shadow: "hover:shadow-neutral-500/20" },
};
const DEFAULT_COLOR = { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" };

interface AnaliseButtonProps {
  assistidoId: number;
  processoId?: number;
  casoId?: number;
  atribuicao?: string;
  disabled?: boolean;
  onComplete?: () => void;
}

type ButtonState = "idle" | "analyzing" | "completed";

export function AnaliseButton({
  assistidoId,
  processoId,
  casoId,
  atribuicao,
  disabled,
  onComplete,
}: AnaliseButtonProps) {
  const colors = (atribuicao && ATRIB_COLORS[atribuicao]) || DEFAULT_COLOR;
  const [state, setState] = useState<ButtonState>("idle");
  const [etapa, setEtapa] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const criarTask = trpc.analise.criarTask.useMutation({
    onSuccess(data) {
      if (data.existing) {
        toast("Análise já em andamento");
        return;
      }

      setState("analyzing");
      setEtapa("Iniciando...");
      subscribeToTask(data.taskId);
    },
    onError(error) {
      toast.error(`Erro ao iniciar análise: ${error.message}`);
      setState("idle");
    },
  });

  const subscribeToTask = useCallback((taskId: number) => {
    const supabase = getSupabaseClient();

    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`analise-task-${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "claude_code_tasks",
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          const status = newRow.status as string;
          const etapaAtual = (newRow.etapa as string) || "";

          if (status === "processing") {
            setEtapa(etapaAtual);
          }

          if (status === "completed") {
            setState("completed");
            setEtapa("");
            toast.success("Análise concluída");
            onCompleteRef.current?.();

            // Return to idle after brief success display
            setTimeout(() => setState("idle"), 2000);
          }

          if (status === "failed") {
            const erro = (newRow.erro as string) || "Erro desconhecido";
            toast.error(`Erro na análise: ${erro}`);
            setState("idle");
            setEtapa("");
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = getSupabaseClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  function handleClick() {
    if (state !== "idle") return;

    criarTask.mutate({
      assistidoId,
      processoId,
      casoId,
      skill: "analise-autos",
    });
  }

  if (state === "completed") {
    return (
      <Button
        disabled
        className="bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        Concluído
      </Button>
    );
  }

  if (state === "analyzing") {
    return (
      <div className="flex items-center gap-3">
        <Button
          disabled
          className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          Analisando...
        </Button>
        {etapa && (
          <span className="text-xs text-emerald-500">{etapa}</span>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || criarTask.isPending}
      className={cn(
        "text-white gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 text-xs h-8 px-3",
        colors.bg, colors.hover, colors.shadow
      )}
    >
      {criarTask.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      Analisar
    </Button>
  );
}
