"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Scale,
  Inbox,
  SendHorizontal,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { usePermissions } from "@/hooks/use-permissions";

// ============================================
// TIPOS
// ============================================

interface Parecer {
  id: number;
  titulo: string;
  descricao: string;
  solicitante: { nome: string; iniciais: string };
  destinatario: { nome: string; iniciais: string };
  assistido?: string;
  processo?: string;
  status: "pendente" | "respondido" | "recusado";
  prioridade: "normal" | "urgente";
  resposta?: string;
  createdAt: Date;
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_RECEBIDOS: Parecer[] = [
  {
    id: 1,
    titulo: "Parecer sobre execucao penal",
    descricao: "Preciso de opiniao sobre a possibilidade de progressao de regime para o assistido Joao Silva, condenado por trafico (art. 33, caput). Ja cumpriu 2/5 da pena.",
    solicitante: { nome: "Maria Santos", iniciais: "MS" },
    destinatario: { nome: "Rodrigo Meire", iniciais: "RM" },
    assistido: "Joao Silva",
    processo: "0500123-45.2024",
    status: "pendente",
    prioridade: "urgente",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 2,
    titulo: "Tese de defesa em juri",
    descricao: "Gostaria de opiniao sobre a viabilidade de tese de desclassificacao para lesao corporal seguida de morte no caso do Pedro.",
    solicitante: { nome: "Pedro Alves", iniciais: "PA" },
    destinatario: { nome: "Rodrigo Meire", iniciais: "RM" },
    assistido: "Carlos Souza",
    processo: "0500456-78.2024",
    status: "pendente",
    prioridade: "normal",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const MOCK_ENVIADOS: Parecer[] = [
  {
    id: 3,
    titulo: "Dosimetria em trafico privilegiado",
    descricao: "Verificar se cabe reducao pela minorante do par. 4o, art. 33.",
    solicitante: { nome: "Rodrigo Meire", iniciais: "RM" },
    destinatario: { nome: "Maria Santos", iniciais: "MS" },
    status: "respondido",
    prioridade: "normal",
    resposta: "Entendo que sim, considerando a primariedade e ausencia de vinculo com organizacao criminosa. Sugiro peticao intercorrente.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

// ============================================
// COMPONENTES
// ============================================

function ParecerCard({ parecer, tipo }: { parecer: Parecer; tipo: "recebido" | "enviado" }) {
  const [respondendo, setRespondendo] = useState(false);
  const [resposta, setResposta] = useState("");

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    pendente: { label: "Pendente", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", icon: Clock },
    respondido: { label: "Respondido", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400", icon: CheckCircle2 },
    recusado: { label: "Recusado", color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400", icon: AlertCircle },
  };

  const st = statusConfig[parecer.status];
  const StIcon = st.icon;

  const timeAgo = (() => {
    const diffH = Math.floor((Date.now() - parecer.createdAt.getTime()) / 3600000);
    if (diffH < 1) return "agora";
    if (diffH < 24) return `ha ${diffH}h`;
    return `ha ${Math.floor(diffH / 24)} dia(s)`;
  })();

  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{parecer.titulo}</h3>
              {parecer.prioridade === "urgente" && (
                <Badge className="h-4 px-1.5 text-[9px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-0">
                  URGENTE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span>{tipo === "recebido" ? "De" : "Para"}: {tipo === "recebido" ? parecer.solicitante.nome : parecer.destinatario.nome}</span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>
          </div>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", st.color)}>
            <StIcon className="w-3 h-3" />
            {st.label}
          </span>
        </div>

        {/* Assistido + Processo */}
        {(parecer.assistido || parecer.processo) && (
          <div className="flex items-center gap-3 mb-3 text-[10px] text-zinc-500">
            {parecer.assistido && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {parecer.assistido}
              </span>
            )}
            {parecer.processo && (
              <span className="flex items-center gap-1 font-mono">
                <Scale className="w-3 h-3" /> {parecer.processo}
              </span>
            )}
          </div>
        )}

        {/* Descrição */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
          {parecer.descricao}
        </p>

        {/* Resposta (se respondido) */}
        {parecer.resposta && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 mb-3">
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Resposta</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{parecer.resposta}</p>
          </div>
        )}

        {/* Ações */}
        {tipo === "recebido" && parecer.status === "pendente" && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-zinc-400"
                    onClick={() => setRespondendo(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    disabled={!resposta.trim()}
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
                  className="h-7 text-xs bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white"
                  onClick={() => setRespondendo(true)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Responder
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-400 hover:text-rose-500"
                >
                  Recusar
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
// PAGE
// ============================================

export default function ParecerPage() {
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

          <Button
            size="sm"
            className="h-8 px-3 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white text-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Solicitar
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Tabs defaultValue="recebidos" className="space-y-4">
          <TabsList className="bg-zinc-200/60 dark:bg-zinc-800 h-9">
            <TabsTrigger value="recebidos" className="text-xs gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              Recebidos
              {MOCK_RECEBIDOS.filter(p => p.status === "pendente").length > 0 && (
                <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  {MOCK_RECEBIDOS.filter(p => p.status === "pendente").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="enviados" className="text-xs gap-1.5">
              <SendHorizontal className="w-3.5 h-3.5" />
              Enviados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recebidos" className="space-y-3">
            {MOCK_RECEBIDOS.length === 0 ? (
              <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
                <Inbox className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-500">Nenhum parecer recebido</p>
              </Card>
            ) : (
              MOCK_RECEBIDOS.map(p => <ParecerCard key={p.id} parecer={p} tipo="recebido" />)
            )}
          </TabsContent>

          <TabsContent value="enviados" className="space-y-3">
            {MOCK_ENVIADOS.length === 0 ? (
              <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 text-center">
                <SendHorizontal className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
                <p className="text-sm font-medium text-zinc-500">Nenhum parecer solicitado</p>
              </Card>
            ) : (
              MOCK_ENVIADOS.map(p => <ParecerCard key={p.id} parecer={p} tipo="enviado" />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
