"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface AnaliseButtonProps {
  assistidoId: number;
  processoId?: number;
  casoId?: number;
  disabled?: boolean;
  onComplete?: () => void;
}

type ButtonState = "idle" | "analyzing" | "completed";

export function AnaliseButton({
  assistidoId,
  processoId,
  casoId,
  disabled,
  onComplete,
}: AnaliseButtonProps) {
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
        className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 gap-2"
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
          className="bg-zinc-800 border border-zinc-700 text-zinc-400 gap-2"
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
      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm hover:shadow-md hover:shadow-emerald-500/20 transition-all duration-200"
    >
      {criarTask.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      Analisar
    </Button>
  );
}
