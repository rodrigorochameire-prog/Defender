"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UrgenciaBadge({ urgencia }: { urgencia: string }) {
  if (urgencia === "urgente") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 uppercase tracking-wide">
        <AlertTriangle className="w-2.5 h-2.5" />
        Urgente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 uppercase tracking-wide">
      <Clock className="w-2.5 h-2.5" />
      Normal
    </span>
  );
}

interface ParecerItemProps {
  parecer: any;
  onRespondido: () => void;
}

function ParecerItem({ parecer, onRespondido }: ParecerItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [resposta, setResposta] = useState("");
  const utils = trpc.useUtils();

  const responder = trpc.parecer.responder.useMutation({
    onSuccess: () => {
      toast.success("Parecer respondido!", {
        description: "Sua resposta foi enviada ao colega.",
        icon: <CheckCircle2 className="w-4 h-4 text-violet-500" />,
      });
      setResposta("");
      setExpanded(false);
      utils.parecer.meusPareceres.invalidate();
      onRespondido();
    },
    onError: (error) => {
      toast.error("Erro ao responder", { description: error.message });
    },
  });

  const handleResponder = () => {
    if (!resposta.trim()) {
      toast.error("Digite sua resposta antes de enviar");
      return;
    }
    responder.mutate({ parecerId: parecer.id, resposta: resposta.trim() });
  };

  const dataFormatada = parecer.dataSolicitacao
    ? format(new Date(parecer.dataSolicitacao), "dd/MM 'às' HH:mm", { locale: ptBR })
    : null;

  return (
    <div
      className={cn(
        "border rounded-xl transition-all duration-200",
        expanded
          ? "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10"
          : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-violet-200 dark:hover:border-violet-800"
      )}
    >
      <button
        className="w-full text-left p-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-2.5">
          <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
            <AvatarFallback className="text-[9px] bg-gradient-to-br from-violet-200 to-purple-300 dark:from-violet-700 dark:to-purple-800 font-semibold text-violet-800 dark:text-violet-200">
              {getInitials(parecer.outraPessoa?.name || "?")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                {parecer.outraPessoa?.name || "Colega"}
              </span>
              <UrgenciaBadge urgencia={parecer.urgencia} />
              {dataFormatada && (
                <span className="text-[9px] text-zinc-400 ml-auto">{dataFormatada}</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
              {parecer.pergunta}
            </p>
            {(parecer.assistido || parecer.processo) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {parecer.assistido && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                    <User className="w-2.5 h-2.5" />
                    {parecer.assistido.nome}
                  </span>
                )}
                {parecer.processo && (
                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-mono">
                    <FileText className="w-2.5 h-2.5" />
                    {parecer.processo.numeroAutos}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 mt-0.5">
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-violet-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-violet-100 dark:border-violet-800/50 pt-3">
          <div className="mb-3 p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-1">
              Pergunta completa
            </p>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {parecer.pergunta}
            </p>
          </div>
          <Textarea
            placeholder="Digite sua resposta..."
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            className="min-h-[80px] resize-none text-xs rounded-xl bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-violet-500/30 mb-2"
            disabled={responder.isPending}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-zinc-400">
              {resposta.length > 0 ? `${resposta.length} caracteres` : "Seja claro e objetivo"}
            </span>
            <Button
              size="sm"
              onClick={handleResponder}
              disabled={responder.isPending || !resposta.trim()}
              className="h-7 px-3 text-xs rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-sm shadow-violet-500/20 transition-all"
            >
              {responder.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Responder
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ParecerRecebidoCard({ className }: { className?: string }) {
  const { data: meusPareceres, isLoading } = trpc.parecer.meusPareceres.useQuery();

  const pendentes = (meusPareceres ?? []).filter(
    (p: any) => p.meuPapel === "respondedor" && p.status === "solicitado"
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (pendentes.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {pendentes.map((parecer: any) => (
        <ParecerItem key={parecer.id} parecer={parecer} onRespondido={() => {}} />
      ))}
    </div>
  );
}

export function usePareceresPendentesCount(): number {
  const { data: meusPareceres } = trpc.parecer.meusPareceres.useQuery();
  return (meusPareceres ?? []).filter(
    (p: any) => p.meuPapel === "respondedor" && p.status === "solicitado"
  ).length;
}
