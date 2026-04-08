"use client";

/**
 * useSkillTask — unified hook for invoking skills via claude_code_tasks.
 *
 * Encapsulates the pattern used across all IA buttons in OMBUDS:
 *   1. Call analise.criarTask (tRPC) to enqueue a task
 *   2. Subscribe to claude_code_tasks via Supabase Realtime for the task id
 *   3. Expose { status, etapa, resultado, erro } so the UI renders reactively
 *   4. Clean up subscription on unmount
 *
 * Replaces the ad-hoc subscription code previously duplicated in
 * analise-button.tsx, cowork-action-button.tsx, etc.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";

export type SkillTaskState = "idle" | "pending" | "processing" | "completed" | "failed" | "needs_review";

export interface UseSkillTaskOptions {
  /** Called once when status transitions to "completed". */
  onComplete?: (resultado: unknown) => void;
  /** Called once when status transitions to "failed". */
  onError?: (erro: string) => void;
  /** How long (ms) to hold the "completed" state before returning to "idle". Default: 2000. */
  resetDelayMs?: number;
}

export interface SkillTaskTriggerInput {
  assistidoId: number;
  processoId?: number;
  casoId?: number;
  skill: string;
  instrucaoAdicional?: string;
}

export interface UseSkillTaskReturn {
  state: SkillTaskState;
  etapa: string;
  taskId: number | null;
  resultado: unknown | null;
  erro: string | null;
  /** Submit a new task. No-op if a task is already running. */
  trigger: (input: SkillTaskTriggerInput) => void;
  /** Force return to idle, detaching any active subscription. */
  reset: () => void;
  /** True while the mutation is in flight (before the task id is returned). */
  isSubmitting: boolean;
}

export function useSkillTask(options: UseSkillTaskOptions = {}): UseSkillTaskReturn {
  const { onComplete, onError, resetDelayMs = 2000 } = options;

  const [state, setState] = useState<SkillTaskState>("idle");
  const [etapa, setEtapa] = useState("");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [resultado, setResultado] = useState<unknown | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Refs so callbacks inside the realtime subscription always see the latest values
  // without forcing the subscription to re-subscribe on every render.
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      const supabase = getSupabaseClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    cleanupChannel();
    setState("idle");
    setEtapa("");
    setTaskId(null);
    setResultado(null);
    setErro(null);
  }, [cleanupChannel]);

  const subscribeToTask = useCallback(
    (id: number) => {
      cleanupChannel();
      const supabase = getSupabaseClient();

      const channel = supabase
        .channel(`skill-task-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "claude_code_tasks",
            filter: `id=eq.${id}`,
          },
          (payload) => {
            const newRow = payload.new as Record<string, unknown>;
            const status = newRow.status as string;
            const etapaAtual = (newRow.etapa as string) || "";

            if (status === "processing") {
              setState("processing");
              setEtapa(etapaAtual);
              return;
            }

            if (status === "completed") {
              const res = newRow.resultado ?? null;
              setState("completed");
              setEtapa("");
              setResultado(res);
              onCompleteRef.current?.(res);

              if (resetDelayMs > 0) {
                resetTimerRef.current = setTimeout(() => {
                  setState("idle");
                  setEtapa("");
                  setTaskId(null);
                  cleanupChannel();
                }, resetDelayMs);
              }
              return;
            }

            if (status === "needs_review") {
              const res = newRow.resultado ?? null;
              setState("needs_review");
              setEtapa("Revisão manual");
              setResultado(res);
              return;
            }

            if (status === "failed") {
              const e = (newRow.erro as string) || "Erro desconhecido";
              setState("failed");
              setEtapa("");
              setErro(e);
              onErrorRef.current?.(e);
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    },
    [cleanupChannel, resetDelayMs],
  );

  const criarTask = trpc.analise.criarTask.useMutation({
    onSuccess: (data) => {
      setTaskId(data.taskId);
      if (data.existing) {
        // Server said this task was already pending — subscribe anyway so the UI
        // catches the eventual completion.
        setState("processing");
        setEtapa("Já em andamento...");
      } else {
        setState("pending");
        setEtapa("Iniciando...");
      }
      subscribeToTask(data.taskId);
    },
    onError: (error) => {
      setState("failed");
      setErro(error.message);
      onErrorRef.current?.(error.message);
    },
  });

  const trigger = useCallback(
    (input: SkillTaskTriggerInput) => {
      if (state === "pending" || state === "processing") return;
      setErro(null);
      setResultado(null);
      criarTask.mutate(input);
    },
    [criarTask, state],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      cleanupChannel();
    };
  }, [cleanupChannel]);

  return {
    state,
    etapa,
    taskId,
    resultado,
    erro,
    trigger,
    reset,
    isSubmitting: criarTask.isPending,
  };
}
