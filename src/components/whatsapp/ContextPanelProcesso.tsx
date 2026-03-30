"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, PenLine, Paperclip, StickyNote, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ProcessoAtivo {
  id: number;
  numeroAutos: string;
  vara: string | null;
  assunto: string | null;
}

interface ContextPanelProcessoProps {
  assistidoId: number;
  processoAtivo: ProcessoAtivo | null;
}

// =============================================================================
// SKELETONS
// =============================================================================

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 animate-pulse">
      <div className="h-3 w-24 bg-muted-foreground/20 rounded mb-2" />
      <div className="h-4 w-full bg-muted-foreground/20 rounded mb-1" />
      <div className="h-3 w-3/4 bg-muted-foreground/15 rounded" />
    </div>
  );
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ContextPanelProcesso({ assistidoId, processoAtivo }: ContextPanelProcessoProps) {
  const { data, isLoading } = trpc.whatsappChat.getContactTimeline.useQuery(
    { assistidoId },
    { enabled: !!assistidoId }
  );

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "—";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable cards area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {/* Card: Processo Ativo */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 border-l-2 border-l-emerald-500">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Processo Ativo
          </p>
          {processoAtivo ? (
            <>
              <p className="text-xs font-mono text-foreground font-medium truncate">
                {processoAtivo.numeroAutos}
              </p>
              {processoAtivo.vara && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {processoAtivo.vara}
                </p>
              )}
              {processoAtivo.assunto && (
                <p className="text-[11px] text-muted-foreground truncate">
                  {processoAtivo.assunto}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhum processo ativo</p>
          )}
        </div>

        {/* Card: Próxima Audiência */}
        {isLoading ? (
          <CardSkeleton />
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-3 border-l-2 border-l-amber-500">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Próxima Audiência
              </p>
            </div>
            {data?.proximaAudiencia ? (
              <>
                <p className="text-xs text-foreground font-medium">
                  {formatDate(data.proximaAudiencia.dataAudiencia)}
                </p>
                {data.proximaAudiencia.tipo && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {data.proximaAudiencia.tipo}
                  </p>
                )}
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                  em {data.proximaAudiencia.diasRestantes} dia{data.proximaAudiencia.diasRestantes !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sem audiências futuras</p>
            )}
          </div>
        )}

        {/* Card: Prazo Aberto */}
        {isLoading ? (
          <CardSkeleton />
        ) : (
          <div className={cn(
            "rounded-lg border border-border bg-muted/30 p-3 border-l-2",
            data?.prazoAberto && data.prazoAberto.diasRestantes < 7
              ? "border-l-red-500"
              : "border-l-amber-500"
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className={cn(
                "h-3 w-3",
                data?.prazoAberto && data.prazoAberto.diasRestantes < 7
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              )} />
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Prazo Aberto
              </p>
            </div>
            {data?.prazoAberto ? (
              <>
                {data.prazoAberto.ato && (
                  <p className="text-xs text-foreground font-medium truncate">
                    {data.prazoAberto.ato}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vence: {formatDate(data.prazoAberto.prazo)}
                </p>
                <p className={cn(
                  "text-[11px] font-medium mt-0.5",
                  data.prazoAberto.diasRestantes < 7 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {data.prazoAberto.diasRestantes} dia{data.prazoAberto.diasRestantes !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sem prazos abertos</p>
            )}
          </div>
        )}

        {/* Card: Última Movimentação */}
        {isLoading ? (
          <CardSkeleton />
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <PenLine className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Última Movimentação
              </p>
            </div>
            {data?.ultimaMovimentacao ? (
              <>
                {data.ultimaMovimentacao.tipo && (
                  <p className="text-xs text-foreground font-medium truncate">
                    {data.ultimaMovimentacao.tipo}
                  </p>
                )}
                {data.ultimaMovimentacao.descricao && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {data.ultimaMovimentacao.descricao}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(data.ultimaMovimentacao.dataMovimentacao)}
                  {data.ultimaMovimentacao.origem && ` · ${data.ultimaMovimentacao.origem}`}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sem movimentações</p>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-border px-3 py-2 flex gap-1.5">
        <button className="flex-1 flex items-center justify-center gap-1 rounded-md bg-muted hover:bg-muted/80 transition-colors py-1.5 text-[11px] text-foreground/80 font-medium cursor-pointer">
          <Paperclip className="h-3 w-3" />
          <span>Anexar</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 rounded-md bg-muted hover:bg-muted/80 transition-colors py-1.5 text-[11px] text-foreground/80 font-medium cursor-pointer">
          <StickyNote className="h-3 w-3" />
          <span>Anotar</span>
        </button>
        {processoAtivo && (
          <Link
            href={`/admin/processos/${processoAtivo.id}`}
            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors py-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Abrir</span>
          </Link>
        )}
      </div>
    </div>
  );
}
