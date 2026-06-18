"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, CornerDownLeft, MapPin, AlertTriangle } from "lucide-react";

interface Citacao {
  pagina: number;
  trecho: string;
}
interface QaResultado {
  resposta?: string;
  citacoes?: Citacao[];
  confianca?: number;
  encontrado?: boolean;
}

interface Props {
  fileId: number;
  /** Pula o leitor para a página citada (e opcionalmente realça o trecho). */
  onJumpTo: (pagina: number, trecho?: string) => void;
}

/**
 * "Pergunte ao auto" (#4) — Q&A sobre o PDF na assinatura Max (daemon).
 * Dispara uma claude_code_task (skill pergunte-ao-auto) e faz poll do status.
 * Renderiza a resposta + citações clicáveis que pulam para a página.
 */
export function PerguntarAoAutoPanel({ fileId, onJumpTo }: Props) {
  const [pergunta, setPergunta] = useState("");
  const [taskId, setTaskId] = useState<number | null>(null);

  const perguntar = trpc.drive.perguntarAoAuto.useMutation({
    onSuccess: (data) => setTaskId(data.taskId),
  });

  const { data: task } = trpc.analise.getTaskStatus.useQuery(
    { taskId: taskId ?? 0 },
    {
      enabled: taskId != null,
      refetchInterval: (q) => {
        const s = (q.state.data as { status?: string } | undefined)?.status;
        return s === "completed" || s === "failed" || s === "needs_review" ? false : 2000;
      },
    },
  );

  const status = task?.status;
  const loading = perguntar.isPending || status === "pending" || status === "processing";
  const resultado = (status === "completed" ? (task?.resultado as QaResultado | null) : null) ?? null;

  const submit = () => {
    if (pergunta.trim().length < 3 || loading) return;
    setTaskId(null);
    perguntar.mutate({ fileId, pergunta: pergunta.trim() });
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Campo de pergunta */}
      <div className="p-3 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <div className="relative">
          <textarea
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            placeholder="Pergunte sobre este auto…  (ex.: há contradição entre os depoimentos?)"
            rows={3}
            className="w-full text-[13px] rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-900 text-foreground/90 px-3 py-2 resize-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 outline-none transition-all"
          />
        </div>
        <button
          onClick={submit}
          disabled={pergunta.trim().length < 3 || loading}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-500 text-white text-[12px] font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Consultando o auto…" : "Perguntar"}
          {!loading && <CornerDownLeft className="w-3 h-3 opacity-60" />}
        </button>
      </div>

      {/* Estado / resposta */}
      <div className="flex-1 overflow-y-auto p-3">
        {perguntar.isError && (
          <div className="flex items-start gap-2 text-[12px] text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{perguntar.error.message}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-neutral-400 py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {task?.etapa || "Enfileirado no daemon…"}
          </div>
        )}

        {status === "failed" && (
          <div className="flex items-start gap-2 text-[12px] text-red-600 dark:text-red-400 py-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{task?.erro || "Falha ao processar a pergunta."}</span>
          </div>
        )}

        {resultado && (
          <div className="space-y-3">
            {resultado.encontrado === false && (
              <div className="text-[11px] text-amber-600 dark:text-amber-500 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Sem base no documento
              </div>
            )}

            <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
              {resultado.resposta || "—"}
            </p>

            {Array.isArray(resultado.citacoes) && resultado.citacoes.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Evidências</p>
                {resultado.citacoes.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => onJumpTo(c.pagina, c.trecho)}
                    className="group w-full text-left flex items-stretch rounded-lg bg-neutral-50/60 dark:bg-neutral-800/30 border border-transparent hover:border-emerald-300/70 dark:hover:border-emerald-700/50 hover:bg-white dark:hover:bg-neutral-800/50 transition-all cursor-pointer overflow-hidden"
                  >
                    <div className="w-1 shrink-0 bg-emerald-400/70" />
                    <div className="flex-1 min-w-0 px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <MapPin className="w-2.5 h-2.5" /> p. {c.pagina}
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3 mt-0.5">
                        {c.trecho}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {typeof resultado.confianca === "number" && (
              <p className="text-[10px] text-neutral-400 tabular-nums pt-1">
                confiança {resultado.confianca}%
              </p>
            )}
          </div>
        )}

        {!loading && !resultado && !perguntar.isError && status !== "failed" && (
          <div className="text-center text-[12px] text-neutral-400 py-8 px-4">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Pergunte qualquer coisa sobre este auto. As respostas se baseiam só no documento e citam as páginas.
          </div>
        )}
      </div>
    </div>
  );
}
