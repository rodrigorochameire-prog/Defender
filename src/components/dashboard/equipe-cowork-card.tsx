"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  UserCheck,
  MessageSquare,
  ArrowLeftRight,
  Send,
  FileEdit,
  BookOpen,
  Shield,
  ArrowRight,
  Clock,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS
// ============================================

interface AtividadeRecente {
  id: number;
  texto: string;
  tempo: string;
  tipo: "aceita" | "andamento" | "mural" | "parecer" | "cobertura";
  autor: { nome: string; iniciais: string };
}

interface EquipeCoworkCardProps {
  delegacoesAtivas: number;
  muralNaoLidas: number;
  equipeMembros: number;
  coberturasAtivas: number;
  pareceresPendentes: number;
  pendentesCount?: number;
  prazosEstaSemana?: number;
  atividades: AtividadeRecente[];
  onPedidoTrabalho: () => void;
  onParecer: () => void;
  onCobertura: () => void;
  onMural: () => void;
}

// ============================================
// COMPONENTE — Layout compacto
// ============================================

const TIPO_DOT_COLORS: Record<string, string> = {
  aceita: "bg-emerald-500",
  andamento: "bg-amber-500",
  mural: "bg-violet-500",
  parecer: "bg-sky-500",
  cobertura: "bg-neutral-400",
};

export function EquipeCoworkCard({
  delegacoesAtivas,
  muralNaoLidas,
  equipeMembros,
  coberturasAtivas,
  pareceresPendentes,
  pendentesCount = 0,
  prazosEstaSemana = 0,
  atividades,
  onPedidoTrabalho,
  onParecer,
  onCobertura,
  onMural,
}: EquipeCoworkCardProps) {

  const miniStats = [
    { label: "delegações", value: delegacoesAtivas, href: "/admin/delegacoes", icon: UserCheck },
    { label: "mural", value: muralNaoLidas, href: "/admin/mural", icon: MessageSquare },
    { label: "equipe", value: equipeMembros, href: "/admin/agenda-equipe", icon: Users },
    { label: "coberturas", value: coberturasAtivas, href: "/admin/coberturas", icon: ArrowLeftRight },
    { label: "pendentes", value: pendentesCount, href: "/admin/delegacoes?filter=mine", icon: Clock },
    { label: "prazo sem.", value: prazosEstaSemana, href: "/admin/demandas?prazo=semana", icon: CalendarDays },
  ];

  const acoes = [
    { icon: FileEdit, label: "Minuta", onClick: onPedidoTrabalho },
    { icon: BookOpen, label: "Parecer", onClick: onParecer },
    { icon: Shield, label: "Cobertura", onClick: onCobertura },
    { icon: MessageSquare, label: "Mural", onClick: onMural },
  ];

  return (
    <Card className="group/card relative bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden hover:shadow-md hover:shadow-black/[0.06] hover:border-neutral-300/80 dark:hover:border-neutral-700/60 focus-within:shadow-md focus-within:border-neutral-300/80 dark:focus-within:border-neutral-700/60 transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-200/60 dark:border-neutral-800/60 border-l-[4px] border-l-neutral-300 dark:border-l-neutral-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground tracking-tight">Equipe & Cowork</h3>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {delegacoesAtivas} delegações · {muralNaoLidas} mural · {equipeMembros} equipe · {coberturasAtivas} coberturas
              {pareceresPendentes > 0 && (
                <> · <span className="text-rose-500">{pareceresPendentes} parecer{pareceresPendentes > 1 ? "es" : ""}</span></>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          onClick={onPedidoTrabalho}
        >
          <Send className="w-3 h-3 mr-1" />
          Delegar
        </Button>
      </div>

      {/* Body — ações rápidas */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
            {acoes.map((acao, i) => {
              const AcaoIcon = acao.icon;
              return (
                <button
                  key={i}
                  onClick={acao.onClick}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg",
                    "border border-neutral-200/60 dark:border-neutral-800/60",
                    "bg-neutral-50/50 dark:bg-neutral-800/30",
                    "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10",
                    "hover:border-emerald-300/60 dark:hover:border-emerald-800/50",
                    "hover:shadow-sm",
                    "cursor-pointer transition-all duration-200"
                  )}
                >
                  <AcaoIcon className="w-4 h-4 text-emerald-600/80 dark:text-emerald-400/80" />
                  <span className="text-xs font-medium text-neutral-700 dark:text-foreground/80">{acao.label}</span>
                </button>
              );
            })}
          </div>

        {/* Atividade Recente */}
        {atividades.length > 0 && (
          <div className="space-y-1 mt-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Atividade recente</p>
            <div className="space-y-1.5">
              {atividades.slice(0, 5).map((ativ) => (
                <div key={ativ.id} className="flex items-start gap-2">
                  <div className="relative mt-1.5 flex-shrink-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full", TIPO_DOT_COLORS[ativ.tipo] || "bg-neutral-400")} />
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-muted-foreground leading-snug flex-1 min-w-0 truncate">
                    <span className="font-medium text-neutral-600 dark:text-foreground/80">{ativ.autor.nome}</span>{" "}
                    {ativ.texto}
                  </p>
                  <span className="text-[10px] text-neutral-400 whitespace-nowrap flex-shrink-0">{ativ.tempo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
          <Link
            href="/admin/delegacoes"
            className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-foreground uppercase tracking-wide transition-colors"
          >
            Ver histórico completo
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
