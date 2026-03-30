"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  ArrowDownRight,
  Clock,
  Gavel,
  TrendingUp,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

const RESULTADO_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  absolvicao: { label: "Absolvido", color: "bg-emerald-500 text-white", icon: CheckCircle2 },
  condenacao: { label: "Condenado", color: "bg-rose-500 text-white", icon: XCircle },
  desclassificacao: { label: "Desclassificado", color: "bg-amber-500 text-white", icon: ArrowDownRight },
  nulidade: { label: "Nulidade", color: "bg-violet-500 text-white", icon: Clock },
  redesignado: { label: "Redesignado", color: "bg-zinc-500 text-white", icon: Clock },
};

export default function HistoricoJuriPage() {
  const [busca, setBusca] = useState("");
  const [filtroResultado, setFiltroResultado] = useState("all");

  const { data: sessoes, isLoading } = trpc.juri.list.useQuery({
    status: "realizada",
    limit: 100,
  });

  // Stats calculadas dos dados reais
  const stats = useMemo(() => {
    if (!sessoes) return { absolvicoes: 0, condenacoes: 0, desclassificacoes: 0, total: 0 };
    return {
      absolvicoes: sessoes.filter((s) => s.resultado === "absolvicao").length,
      condenacoes: sessoes.filter((s) => s.resultado === "condenacao").length,
      desclassificacoes: sessoes.filter((s) => s.resultado === "desclassificacao").length,
      total: sessoes.length,
    };
  }, [sessoes]);

  // Filtros
  const sessoeFiltradas = useMemo(() => {
    if (!sessoes) return [];
    let result = sessoes;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(
        (s) =>
          s.assistidoNome?.toLowerCase().includes(q) ||
          s.processo?.numeroAutos?.toLowerCase().includes(q)
      );
    }

    if (filtroResultado !== "all") {
      result = result.filter((s) => s.resultado === filtroResultado);
    }

    return result;
  }, [sessoes, busca, filtroResultado]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <History className="w-5 h-5 text-white dark:text-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">
              Histórico de Plenários
            </h1>
            <p className="text-sm text-muted-foreground">
              Sessões realizadas e resultados
            </p>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 flex-1 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <Gavel className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-semibold text-foreground">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Absolvições</span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{stats.absolvicoes}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/30">
              <XCircle className="w-4 h-4 text-rose-500" />
              <span className="text-xs text-rose-600 dark:text-rose-400">Condenações</span>
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">{stats.condenacoes}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
              <ArrowDownRight className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Desclassificações</span>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{stats.desclassificacoes}</span>
            </div>
            {stats.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Taxa absolvição</span>
                <span className="text-sm font-semibold text-foreground">
                  {Math.round((stats.absolvicoes / stats.total) * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por réu ou nº processo..."
              className="pl-10 h-9"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={filtroResultado} onValueChange={setFiltroResultado}>
            <SelectTrigger className="w-44">
              <Filter className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="absolvicao">Absolvições</SelectItem>
              <SelectItem value="condenacao">Condenações</SelectItem>
              <SelectItem value="desclassificacao">Desclassificações</SelectItem>
              <SelectItem value="nulidade">Nulidades</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : sessoeFiltradas.length > 0 ? (
          <div className="space-y-3">
            {sessoeFiltradas.map((sessao) => {
              const res = RESULTADO_MAP[sessao.resultado || ""] || {
                label: sessao.resultado || "Sem resultado",
                color: "bg-zinc-400 text-white",
                icon: Clock,
              };
              const Icon = res.icon;

              return (
                <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                  <div className="group p-4 rounded-xl bg-card border border-border hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-xs gap-1", res.color)}>
                            <Icon className="w-3 h-3" />
                            {res.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sessao.dataSessao
                              ? new Date(sessao.dataSessao).toLocaleDateString("pt-BR")
                              : "—"}
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-foreground truncate">
                          {sessao.assistidoNome || "Réu não identificado"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {sessao.processo?.numeroAutos || "Processo S/N"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-emerald-500 transition-colors">
                        Ver detalhes →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {busca || filtroResultado !== "all"
                ? "Nenhum resultado encontrado"
                : "Nenhuma sessão realizada"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {busca || filtroResultado !== "all"
                ? "Tente ajustar os filtros de busca"
                : "As sessões realizadas aparecerão aqui"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
