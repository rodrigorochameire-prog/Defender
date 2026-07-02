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
    { icon: BookOpen, label: "Parecer", onClick: onParecer },
    { icon: Shield, label: "Cobertura", onClick: onCobertura },
    { icon: MessageSquare, label: "Mural", onClick: onMural },
  ];

  // Agrupa atividades idênticas (mesmo autor + texto) preservando a ordem
  // e a data mais recente; a lista vem recent-first.
  const atividadesAgrupadas: (AtividadeRecente & { count: number })[] = [];
  const vistas = new Map<string, number>();
  for (const a of atividades) {
    const key = `${a.autor.nome}||${a.texto}`;
    const idx = vistas.get(key);
    if (idx === undefined) {
      vistas.set(key, atividadesAgrupadas.length);
      atividadesAgrupadas.push({ ...a, count: 1 });
    } else {
      atividadesAgrupadas[idx].count += 1;
    }
  }

  return (
    <Card className="group/card relative bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] ring-1 ring-neutral-200/70 dark:ring-neutral-800 overflow-hidden hover:shadow-md hover:shadow-black/[0.06] hover:ring-neutral-300/70 dark:hover:ring-neutral-700 focus-within:shadow-md focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700 transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-4 bg-neutral-50/60 dark:bg-neutral-900/40 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-serif text-[17px] font-semibold text-foreground tracking-tight leading-tight">Equipe & Cowork</h3>
            <p className="text-[10px] text-muted-foreground">Delegações, coberturas e atividade da equipe</p>
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
      
      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Stat chips — números como atalhos clicáveis (zeros atenuados) */}
        <div className="flex flex-wrap gap-1.5">
          {miniStats.map((stat) => {
            const StatIcon = stat.icon;
            const zero = stat.value === 0;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all cursor-pointer",
                  zero
                    ? "border-transparent bg-neutral-50/60 dark:bg-neutral-800/20 text-muted-foreground/45 hover:text-muted-foreground hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                    : "border-neutral-200/70 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 hover:border-emerald-300/60 dark:hover:border-emerald-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:shadow-sm"
                )}
              >
                <StatIcon className={cn("w-3 h-3", zero ? "" : "text-emerald-600/80 dark:text-emerald-400/80")} />
                <span className="tabular-nums font-semibold">{stat.value}</span>
                <span>{stat.label}</span>
              </Link>
            );
          })}
          {pareceresPendentes > 0 && (
            <Link
              href="/admin/pareceres"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-rose-200/70 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 text-[11px] transition-all cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:shadow-sm"
            >
              <BookOpen className="w-3 h-3" />
              <span className="tabular-nums font-semibold">{pareceresPendentes}</span>
              <span>parecer{pareceresPendentes > 1 ? "es" : ""}</span>
            </Link>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-2">
            {acoes.map((acao, i) => {
              const AcaoIcon = acao.icon;
              return (
                <button
                  key={i}
                  onClick={acao.onClick}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                    "border border-neutral-200/60 dark:border-neutral-800/60",
                    "bg-neutral-50/50 dark:bg-neutral-800/30",
                    "hover:bg-emerald-50/60 dark:hover:bg-emerald-900/10",
                    "hover:border-emerald-300/60 dark:hover:border-emerald-800/50",
                    "hover:shadow-sm",
                    "cursor-pointer transition-all duration-200"
                  )}
                >
                  <AcaoIcon className="w-3.5 h-3.5 text-emerald-600/80 dark:text-emerald-400/80" />
                  <span className="text-[12px] font-medium text-neutral-700 dark:text-foreground/80">{acao.label}</span>
                </button>
              );
            })}
          </div>

        {/* Atividade Recente — agrupada por autor+texto */}
        {atividadesAgrupadas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Atividade recente</p>
            <div className="space-y-1.5">
              {atividadesAgrupadas.slice(0, 5).map((ativ) => (
                <div key={ativ.id} className="flex items-center gap-2">
                  <div className="relative flex-shrink-0">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[9px] font-semibold text-neutral-500 dark:text-neutral-400 flex items-center justify-center">
                      {ativ.autor.iniciais}
                    </span>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-neutral-900",
                      TIPO_DOT_COLORS[ativ.tipo] || "bg-neutral-400"
                    )} />
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-muted-foreground leading-snug flex-1 min-w-0 truncate">
                    <span className="font-medium text-neutral-600 dark:text-foreground/80">{ativ.autor.nome}</span>{" "}
                    {ativ.texto}
                  </p>
                  {ativ.count > 1 && (
                    <span className="text-[9px] font-semibold text-muted-foreground bg-neutral-100 dark:bg-neutral-800 rounded px-1 py-0.5 tabular-nums flex-shrink-0">
                      {ativ.count}×
                    </span>
                  )}
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
