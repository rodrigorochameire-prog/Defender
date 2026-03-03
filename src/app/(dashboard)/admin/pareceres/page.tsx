"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  Send,
  User,
  Scale,
  Inbox,
  SendHorizontal,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// HELPERS
// ============================================

function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffH = Math.floor((Date.now() - d.getTime()) / 3600000);
  if (diffH < 1) return "agora";
  if (diffH < 24) return `ha ${diffH}h`;
  return `ha ${Math.floor(diffH / 24)} dia(s)`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  solicitado: { label: "Pendente", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", icon: Clock },
  respondido: { label: "Respondido", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
  lido: { label: "Lido", color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500", icon: CheckCircle2 },
};

// ============================================
// PARECER CARD — RECEBIDO
// ============================================

function ParecerRecebidoCard({ parecer, onResponder }: {
  parecer: any;
  onResponder: (id: number, resposta: string) => void;
}) {
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState("");
  const st = STATUS_CONFIG[parecer.status] || STATUS_CONFIG.solicitado;
  const StIcon = st.icon;
  const solicitanteNome = parecer.solicitante?.name || parecer.solicitante?.email || "Desconhecido";

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {parecer.urgencia === "urgente" && (
                <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-0">
                  URGENTE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span>De: {solicitanteNome}</span>
              <span>·</span>
              <span>{formatTimeAgo(parecer.dataSolicitacao)}</span>
            </div>
          </div>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", st.color)}>
            <StIcon className="w-3 h-3" />
            {st.label}
          </span>
        </div>

        {(parecer.assistido || parecer.processo) && (
          <div className="flex items-center gap-3 mb-3 text-[10px] text-zinc-500">
            {parecer.assistido?.nome && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {parecer.assistido.nome}
              </span>
            )}
            {parecer.processo?.numeroAutos && (
              <span className="flex items-center gap-1 font-mono">
                <Scale className="w-3 h-3" /> {parecer.processo.numeroAutos}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
          {parecer.pergunta}
        </p>

        {parecer.resposta && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 mb-3">
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Resposta</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{parecer.resposta}</p>
          </div>
        )}

        {parecer.status === "solicitado" && (
          <>
            {respondendo ? (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Textarea
                  placeholder="Escreva seu parecer..."
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  rows={3}
                  className="text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none focus:ring-emerald-500/20"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 cursor-pointer" onClick={() => setRespondendo(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    disabled={!resposta.trim()}
                    onClick={() => {
                      onResponder(parecer.id, resposta.trim());
                      setRespondendo(false);
                      setResposta("");
                    }}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Enviar parecer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white cursor-pointer"
                  onClick={() => setRespondendo(true)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Responder
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ============================================
// PARECER CARD — ENVIADO
// ============================================

function ParecerEnviadoCard({ parecer, onMarcarLido }: {
  parecer: any;
  onMarcarLido: (id: number) => void;
}) {
  const st = STATUS_CONFIG[parecer.status] || STATUS_CONFIG.solicitado;
  const StIcon = st.icon;
  const respondedorNome = parecer.respondedor?.name || parecer.respondedor?.email || "Desconhecido";

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span>Para: {respondedorNome}</span>
              <span>·</span>
              <span>{formatTimeAgo(parecer.dataSolicitacao)}</span>
            </div>
          </div>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", st.color)}>
            <StIcon className="w-3 h-3" />
            {st.label}
          </span>
        </div>

        {(parecer.assistido || parecer.processo) && (
          <div className="flex items-center gap-3 mb-3 text-[10px] text-zinc-500">
            {parecer.assistido?.nome && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {parecer.assistido.nome}
              </span>
            )}
            {parecer.processo?.numeroAutos && (
              <span className="flex items-center gap-1 font-mono">
                <Scale className="w-3 h-3" /> {parecer.processo.numeroAutos}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
          {parecer.pergunta}
        </p>

        {parecer.resposta && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 mb-3">
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Resposta</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{parecer.resposta}</p>
          </div>
        )}

        {parecer.status === "respondido" && (
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-emerald-600 hover:text-emerald-500 cursor-pointer"
              onClick={() => onMarcarLido(parecer.id)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Marcar como lido
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================
// PAGE
// ============================================

export default function ParecerPage() {
  const utils = trpc.useUtils();

  const { data: recebidos, isLoading: loadingRec } = trpc.pareceres.recebidos.useQuery();
  const { data: enviados, isLoading: loadingEnv } = trpc.pareceres.enviados.useQuery();

  const responderMutation = trpc.pareceres.responder.useMutation({
    onSuccess: () => {
      utils.pareceres.recebidos.invalidate();
      toast.success("Parecer respondido");
    },
    onError: (err) => toast.error("Erro ao responder", { description: err.message }),
  });

  const marcarLidoMutation = trpc.pareceres.marcarLido.useMutation({
    onSuccess: () => {
      utils.pareceres.enviados.invalidate();
      toast.success("Marcado como lido");
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const pendentesCount = (recebidos ?? []).filter(p => p.status === "solicitado").length;
  const isLoading = loadingRec || loadingEnv;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <FileCheck className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-serif">Pareceres</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Consultas e opinioes da equipe</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <Tabs defaultValue="recebidos" className="space-y-4">
            <TabsList className="bg-zinc-200/60 dark:bg-zinc-800 h-9">
              <TabsTrigger value="recebidos" className="text-xs gap-1.5">
                <Inbox className="w-3.5 h-3.5" />
                Recebidos
                {pendentesCount > 0 && (
                  <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    {pendentesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="enviados" className="text-xs gap-1.5">
                <SendHorizontal className="w-3.5 h-3.5" />
                Enviados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recebidos" className="space-y-3">
              {(recebidos ?? []).length === 0 ? (
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
                  <Inbox className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-sm font-medium text-zinc-500">Nenhum parecer recebido</p>
                </Card>
              ) : (
                (recebidos ?? []).map(p => (
                  <ParecerRecebidoCard
                    key={p.id}
                    parecer={p}
                    onResponder={(id, resp) => responderMutation.mutate({ parecerId: id, resposta: resp })}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="enviados" className="space-y-3">
              {(enviados ?? []).length === 0 ? (
                <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
                  <SendHorizontal className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                  <p className="text-sm font-medium text-zinc-500">Nenhum parecer solicitado</p>
                </Card>
              ) : (
                (enviados ?? []).map(p => (
                  <ParecerEnviadoCard
                    key={p.id}
                    parecer={p}
                    onMarcarLido={(id) => marcarLidoMutation.mutate({ parecerId: id })}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
