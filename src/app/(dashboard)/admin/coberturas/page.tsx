"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Plus,
  Calendar,
  ArrowRight,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CoberturaModal } from "@/components/cowork/cobertura-modal";

// ============================================
// HELPERS
// ============================================

function getStatus(dataInicio: string, dataFim: string | null, ativo: boolean): { label: string; color: string } {
  if (!ativo) return { label: "Encerrada", color: "bg-zinc-100 dark:bg-muted text-zinc-500" };
  const hoje = new Date();
  const inicio = parseISO(dataInicio);
  if (isAfter(inicio, hoje)) return { label: "Futura", color: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400" };
  if (dataFim && isBefore(parseISO(dataFim), hoje)) return { label: "Encerrada", color: "bg-zinc-100 dark:bg-muted text-zinc-500" };
  return { label: "Ativa", color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" };
}

// ============================================
// CARD
// ============================================

function CoberturaCard({ cobertura, onEncerrar }: {
  cobertura: any;
  onEncerrar: (id: number) => void;
}) {
  const st = getStatus(cobertura.dataInicio, cobertura.dataFim, cobertura.ativo);
  const defensorNome = cobertura.defensorNome || "Desconhecido";
  const substitutoNome = cobertura.substitutoNome || "Desconhecido";

  return (
    <Card className="bg-white dark:bg-card border-zinc-200/80 dark:border-border/80 rounded-xl overflow-hidden hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200">
      <div className="p-4">
        {/* Status + Tipo */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", st.color)}>
            {st.label}
          </span>
          <span className="text-[10px] text-zinc-400">{cobertura.tipo || "Ferias"}{cobertura.motivo ? ` — ${cobertura.motivo}` : ""}</span>
        </div>

        {/* Afastado → Substituto */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-muted text-zinc-600 dark:text-foreground/80 font-medium">
                {getInitials(defensorNome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Afastado</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-foreground/80">{defensorNome}</p>
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-muted-foreground/50 flex-shrink-0" />

          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                {getInitials(substitutoNome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Cobrindo</p>
              <p className="text-xs font-medium text-zinc-700 dark:text-foreground/80">{substitutoNome}</p>
            </div>
          </div>
        </div>

        {/* Período + Ação */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-border">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <Calendar className="w-3 h-3" />
            <span>
              {format(parseISO(cobertura.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
              {cobertura.dataFim ? ` — ${format(parseISO(cobertura.dataFim), "dd/MM/yyyy", { locale: ptBR })}` : " — sem data fim"}
            </span>
          </div>
          {cobertura.ativo && st.label === "Ativa" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-zinc-400 hover:text-rose-500 cursor-pointer"
              onClick={() => onEncerrar(cobertura.id)}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Encerrar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// PAGE
// ============================================

export default function CoberturasPage() {
  const [coberturaModalOpen, setCoberturaModalOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: coberturas, isLoading } = trpc.coberturas.listar.useQuery();

  const encerrarMutation = trpc.coberturas.encerrar.useMutation({
    onSuccess: () => {
      utils.coberturas.listar.invalidate();
      toast.success("Cobertura encerrada");
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const hoje = new Date();
  const ativas = (coberturas ?? []).filter(c => {
    const st = getStatus(c.dataInicio, c.dataFim, c.ativo);
    return st.label === "Ativa";
  });
  const futuras = (coberturas ?? []).filter(c => {
    const st = getStatus(c.dataInicio, c.dataFim, c.ativo);
    return st.label === "Futura";
  });
  const encerradas = (coberturas ?? []).filter(c => {
    const st = getStatus(c.dataInicio, c.dataFim, c.ativo);
    return st.label === "Encerrada";
  });

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-background">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-card border-b border-zinc-200 dark:border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <ArrowLeftRight className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-foreground tracking-tight font-serif">Coberturas</h1>
              <p className="text-xs text-zinc-500 dark:text-muted-foreground">Afastamentos e substituicoes</p>
            </div>
          </div>

          <Button
            size="sm"
            className="h-8 px-3 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white text-xs cursor-pointer"
            onClick={() => setCoberturaModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova Cobertura
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            {/* Ativas */}
            {ativas.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Ativas agora</p>
                <div className="space-y-3">
                  {ativas.map(c => (
                    <CoberturaCard key={c.id} cobertura={c} onEncerrar={(id) => encerrarMutation.mutate({ id })} />
                  ))}
                </div>
              </div>
            )}

            {/* Futuras */}
            {futuras.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Programadas</p>
                <div className="space-y-3">
                  {futuras.map(c => (
                    <CoberturaCard key={c.id} cobertura={c} onEncerrar={(id) => encerrarMutation.mutate({ id })} />
                  ))}
                </div>
              </div>
            )}

            {/* Encerradas */}
            {encerradas.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Encerradas</p>
                <div className="space-y-3">
                  {encerradas.slice(0, 5).map(c => (
                    <CoberturaCard key={c.id} cobertura={c} onEncerrar={(id) => encerrarMutation.mutate({ id })} />
                  ))}
                </div>
              </div>
            )}

            {/* Vazio */}
            {(coberturas ?? []).length === 0 && (
              <Card className="bg-white dark:bg-card border-zinc-200/80 dark:border-border/80 rounded-xl p-8 text-center">
                <ArrowLeftRight className="w-12 h-12 mx-auto text-zinc-300 dark:text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-zinc-500">Nenhuma cobertura registrada</p>
                <p className="text-xs text-zinc-400 mt-1">Registre afastamentos para gerenciar coberturas</p>
                <Button
                  size="sm"
                  className="mt-4 h-8 text-xs bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white cursor-pointer"
                  onClick={() => setCoberturaModalOpen(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Criar cobertura
                </Button>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <CoberturaModal
        open={coberturaModalOpen}
        onOpenChange={setCoberturaModalOpen}
      />
    </div>
  );
}
