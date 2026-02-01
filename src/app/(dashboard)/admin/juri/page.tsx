"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  Gavel, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Users,
  ArrowUpRight,
  FileSearch,
  ClipboardCheck,
  Target,
  Mic,
  Zap,
  Brain,
  UserCheck,
  Sparkles,
  Clock,
  Scale,
  Lock,
  TrendingUp,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, isFuture, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";

// ============================================
// FERRAMENTAS DO PLENÁRIO
// ============================================
const ferramentasPlenario = [
  {
    id: "cockpit",
    titulo: "Plenário Live",
    descricao: "Cockpit para o dia do julgamento com timer, anotações e controle de reações",
    href: "/admin/juri/cockpit",
    icon: Zap,
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
    isPremium: true,
  },
  {
    id: "avaliacao",
    titulo: "Avaliação do Júri",
    descricao: "Formulário de observação comportamental dos jurados",
    href: "/admin/juri/avaliacao",
    icon: ClipboardCheck,
    gradient: "from-purple-500 to-violet-600",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
    isNew: true,
  },
  {
    id: "jurados",
    titulo: "Banco de Jurados",
    descricao: "Perfil e histórico de votações de cada jurado",
    href: "/admin/jurados",
    icon: UserCheck,
    gradient: "from-blue-500 to-cyan-600",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "profiler",
    titulo: "Profiler de Jurados",
    descricao: "Score de empatia e análise comportamental com IA",
    href: "/admin/jurados/profiler",
    icon: Brain,
    gradient: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-950/30",
    isPremium: true,
  },
];

// ============================================
// FERRAMENTAS ESTRATÉGICAS
// ============================================
const ferramentasEstrategicas = [
  {
    id: "investigacao",
    titulo: "Investigação Defensiva",
    descricao: "Kanban de providências, diligências e OSINT",
    href: "/admin/juri/investigacao",
    icon: FileSearch,
    color: "text-emerald-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "provas",
    titulo: "Matriz de Provas",
    descricao: "Comparador de versões e contradições",
    href: "/admin/juri/provas",
    icon: Scale,
    color: "text-sky-600",
    bgLight: "bg-sky-50 dark:bg-sky-950/30",
  },
  {
    id: "teses",
    titulo: "Teses do Júri",
    descricao: "Narrativa, argumentos e quesitos",
    href: "/admin/juri/teses",
    icon: Target,
    color: "text-indigo-600",
    bgLight: "bg-indigo-50 dark:bg-indigo-950/30",
  },
  {
    id: "laboratorio",
    titulo: "Laboratório de Oratória",
    descricao: "Timer, análise de discurso e treino",
    href: "/admin/juri/laboratorio",
    icon: Mic,
    color: "text-rose-600",
    bgLight: "bg-rose-50 dark:bg-rose-950/30",
    isPremium: true,
  },
];

// ============================================
// HELPERS
// ============================================
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    AGENDADA: { label: "Agendada", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", icon: Calendar },
    agendada: { label: "Agendada", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/40", icon: Calendar },
    REALIZADA: { label: "Realizada", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", icon: CheckCircle2 },
    realizada: { label: "Realizada", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", icon: CheckCircle2 },
    ADIADA: { label: "Adiada", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", icon: Clock },
    adiada: { label: "Adiada", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", icon: Clock },
    CANCELADA: { label: "Cancelada", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", icon: XCircle },
    cancelada: { label: "Cancelada", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", icon: XCircle },
  };
  return configs[status] || { label: status, color: "text-zinc-700", bgColor: "bg-zinc-100", icon: Calendar };
}

function getResultadoConfig(resultado: string | null) {
  if (!resultado) return null;
  const configs: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    absolvicao: { label: "Absolvição", color: "text-white", bgColor: "bg-emerald-600", icon: CheckCircle2 },
    ABSOLVICAO: { label: "Absolvição", color: "text-white", bgColor: "bg-emerald-600", icon: CheckCircle2 },
    condenacao: { label: "Condenação", color: "text-white", bgColor: "bg-rose-600", icon: XCircle },
    CONDENACAO: { label: "Condenação", color: "text-white", bgColor: "bg-rose-600", icon: XCircle },
    desclassificacao: { label: "Desclassificação", color: "text-white", bgColor: "bg-amber-500", icon: AlertTriangle },
    DESCLASSIFICACAO: { label: "Desclassificação", color: "text-white", bgColor: "bg-amber-500", icon: AlertTriangle },
  };
  return configs[resultado] || { label: resultado, color: "text-white", bgColor: "bg-zinc-500", icon: AlertTriangle };
}

function getProximidadeLabel(data: Date) {
  if (isToday(data)) return { label: "Hoje", urgent: true };
  if (isTomorrow(data)) return { label: "Amanhã", urgent: true };
  const dias = differenceInDays(data, new Date());
  if (dias <= 7) return { label: `${dias} dias`, urgent: dias <= 3 };
  return { label: format(data, "dd/MM", { locale: ptBR }), urgent: false };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function JuriPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Buscar dados reais
  const { data: sessoes, isLoading } = trpc.juri.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const { data: proximasSessoes, isLoading: loadingProximas } = trpc.juri.proximas.useQuery({ dias: 30 });

  // Filtrar por busca
  const sessoesFiltradas = useMemo(() => {
    if (!sessoes) return [];
    if (!searchTerm.trim()) return sessoes;
    const query = searchTerm.toLowerCase();
    return sessoes.filter((s) =>
      s.assistidoNome?.toLowerCase().includes(query) ||
      s.defensorNome?.toLowerCase().includes(query) ||
      s.processo?.numeroAutos?.includes(query)
    );
  }, [sessoes, searchTerm]);

  // Stats calculados
  const stats = useMemo(() => {
    if (!sessoes) return { total: 0, agendadas: 0, absolvicoes: 0, condenacoes: 0, taxaAbsolvicao: 0 };
    const total = sessoes.length;
    const agendadas = sessoes.filter((s) => s.status === "AGENDADA" || s.status === "agendada").length;
    const realizadas = sessoes.filter((s) => s.status === "REALIZADA" || s.status === "realizada");
    const absolvicoes = realizadas.filter((s) => s.resultado === "absolvicao" || s.resultado === "ABSOLVICAO").length;
    const condenacoes = realizadas.filter((s) => s.resultado === "condenacao" || s.resultado === "CONDENACAO").length;
    const taxaAbsolvicao = realizadas.length > 0 ? Math.round((absolvicoes / realizadas.length) * 100) : 0;
    return { total, agendadas, absolvicoes, condenacoes, taxaAbsolvicao };
  }, [sessoes]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Gavel className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Tribunal do Júri</h1>
                <p className="text-sm text-zinc-400">Gestão completa de sessões plenárias</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Link href="/admin/juri/nova">
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Sessão
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats no header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.agendadas}</p>
                  <p className="text-xs text-zinc-400">Agendadas</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.absolvicoes}</p>
                  <p className="text-xs text-zinc-400">Absolvições</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.condenacoes}</p>
                  <p className="text-xs text-zinc-400">Condenações</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.taxaAbsolvicao}%</p>
                  <p className="text-xs text-zinc-400">Taxa Absolvição</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Próximas Sessões - Destaque */}
        {(loadingProximas || (proximasSessoes && proximasSessoes.length > 0)) && (
          <Card className="border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Próximas Sessões</CardTitle>
                    <CardDescription>Plenários agendados para os próximos 30 dias</CardDescription>
                  </div>
                </div>
                <Link href="/admin/juri?status=AGENDADA">
                  <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100">
                    Ver todas <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProximas ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {proximasSessoes?.slice(0, 3).map((sessao) => {
                    const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : new Date();
                    const prox = getProximidadeLabel(dataSessao);
                    
                    return (
                      <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                        <div className={cn(
                          "p-4 rounded-xl border transition-all hover:shadow-lg group cursor-pointer",
                          prox.urgent 
                            ? "bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-900/20" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        )}>
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn(
                              "px-3 py-1.5 rounded-lg text-center font-mono",
                              prox.urgent 
                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" 
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}>
                              <p className="text-lg font-bold">{prox.label}</p>
                              <p className="text-[10px] text-zinc-500">{format(dataSessao, "HH:mm")}</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-600 transition-colors" />
                          </div>
                          <p className="font-semibold text-sm line-clamp-1">{sessao.assistidoNome}</p>
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1 font-mono">{sessao.processo?.numeroAutos}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                            <User className="w-3 h-3" />
                            <span>{sessao.defensorNome}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ferramentas do Plenário */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Ferramentas do Plenário</CardTitle>
                <CardDescription>Recursos para o dia do julgamento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ferramentasPlenario.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.href}>
                    <div className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-lg group cursor-pointer",
                      item.bgLight,
                      "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("p-2.5 rounded-lg bg-gradient-to-br shadow-lg", item.gradient)}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.isPremium && (
                            <Badge className="bg-amber-500 text-white text-[9px] border-0">Premium</Badge>
                          )}
                          {"isNew" in item && item.isNew && (
                            <Badge className="bg-purple-500 text-white text-[9px] border-0">
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              Novo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm">{item.titulo}</h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.descricao}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ferramentas Estratégicas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Target className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">Ferramentas Estratégicas</CardTitle>
                <CardDescription>Mapeie provas, teses e prepare a oratória</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {ferramentasEstrategicas.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.href}>
                    <div className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-lg group cursor-pointer",
                      item.bgLight,
                      "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("p-2.5 rounded-lg", item.bgLight)}>
                          <Icon className={cn("w-5 h-5", item.color)} />
                        </div>
                        {item.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[9px] border-0">Premium</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{item.titulo}</h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.descricao}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Sessões */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Gavel className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Todas as Sessões</CardTitle>
                  <CardDescription>{stats.total} sessões registradas</CardDescription>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar réu, processo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="AGENDADA">Agendadas</SelectItem>
                    <SelectItem value="REALIZADA">Realizadas</SelectItem>
                    <SelectItem value="ADIADA">Adiadas</SelectItem>
                    <SelectItem value="CANCELADA">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : sessoesFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <Gavel className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500">Nenhuma sessão encontrada</p>
                <Link href="/admin/juri/nova">
                  <Button className="mt-4" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Agendar Sessão
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sessoesFiltradas.map((sessao) => {
                  const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : null;
                  const statusConfig = getStatusConfig(sessao.status || "AGENDADA");
                  const resultadoConfig = getResultadoConfig(sessao.resultado);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                      <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          {/* Data */}
                          <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center">
                            <p className="text-lg font-bold font-mono">
                              {dataSessao ? format(dataSessao, "dd", { locale: ptBR }) : "--"}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase">
                              {dataSessao ? format(dataSessao, "MMM", { locale: ptBR }) : "---"}
                            </p>
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">{sessao.assistidoNome}</p>
                              <Badge className={cn("text-[10px] border-0 gap-1", statusConfig.bgColor, statusConfig.color)}>
                                <StatusIcon className="w-2.5 h-2.5" />
                                {statusConfig.label}
                              </Badge>
                              {resultadoConfig && (
                                <Badge className={cn("text-[10px] border-0 gap-1", resultadoConfig.bgColor, resultadoConfig.color)}>
                                  {resultadoConfig.label}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                              <span className="font-mono">{sessao.processo?.numeroAutos}</span>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {sessao.defensorNome}
                              </span>
                              {dataSessao && (
                                <span className="sm:hidden font-mono">
                                  {format(dataSessao, "dd/MM/yy HH:mm")}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Hora e Ação */}
                          <div className="hidden sm:flex items-center gap-4">
                            {dataSessao && (
                              <div className="text-right">
                                <p className="font-mono text-sm font-medium">
                                  {format(dataSessao, "HH:mm")}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {format(dataSessao, "yyyy")}
                                </p>
                              </div>
                            )}
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-600">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
