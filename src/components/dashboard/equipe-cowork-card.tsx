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
  cobertura: "bg-zinc-400",
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
    <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark transition-all duration-200 hover:shadow-apple-hover dark:hover:shadow-apple-dark-hover">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-600" />
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
            <Users className="w-4 h-4 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">Equipe & Cowork</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Delegações, pareceres e coberturas</p>
          </div>
          {pareceresPendentes > 0 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              {pareceresPendentes} parecer{pareceresPendentes > 1 ? "es" : ""}
            </span>
          )}
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

      {/* Body */}
      <div className="p-4 space-y-3">

        {/* Row 1 — Stats (grid compacto 3×2) + Ações (coluna) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
          {/* Stats grid 3×2 */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            {miniStats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="flex items-center gap-1.5 group/stat transition-colors py-0.5"
                >
                  <StatIcon className="w-3 h-3 text-zinc-400 group-hover/stat:text-emerald-500 transition-colors flex-shrink-0" />
                  <span className="text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200 group-hover/stat:text-emerald-600 dark:group-hover/stat:text-emerald-400 transition-colors">
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-zinc-400 group-hover/stat:text-zinc-600 dark:group-hover/stat:text-zinc-300 transition-colors truncate">
                    {stat.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Ações rápidas — botões maiores */}
          <div className="grid grid-cols-2 gap-1.5">
            {acoes.map((acao, i) => {
              const AcaoIcon = acao.icon;
              return (
                <button
                  key={i}
                  onClick={acao.onClick}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg",
                    "border border-zinc-200/60 dark:border-zinc-700/60",
                    "bg-zinc-50/50 dark:bg-zinc-800/30",
                    "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10",
                    "hover:border-emerald-300/60 dark:hover:border-emerald-800/50",
                    "hover:shadow-sm",
                    "cursor-pointer transition-all duration-200"
                  )}
                >
                  <AcaoIcon className="w-4 h-4 text-emerald-600/80 dark:text-emerald-400/80" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{acao.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2 — Atividade Recente (compacta) */}
        {atividades.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Atividade recente</p>
            <div className="space-y-1.5">
              {atividades.slice(0, 5).map((ativ) => (
                <div key={ativ.id} className="flex items-start gap-2">
                  <div className="relative mt-1.5 flex-shrink-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full", TIPO_DOT_COLORS[ativ.tipo] || "bg-zinc-400")} />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug flex-1 min-w-0 truncate">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{ativ.autor.nome}</span>{" "}
                    {ativ.texto}
                  </p>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap flex-shrink-0">{ativ.tempo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <Link
            href="/admin/delegacoes"
            className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-wide transition-colors"
          >
            Ver histórico completo
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
