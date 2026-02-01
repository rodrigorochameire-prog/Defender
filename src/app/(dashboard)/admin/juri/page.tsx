"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Users,
  ArrowRight,
  FileSearch,
  ClipboardCheck,
  Target,
  Mic,
  Zap,
  Brain,
  UserCheck,
  Clock,
  Scale,
  Lock,
  TrendingUp,
  ChevronRight,
  LayoutGrid,
  List,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================
// HELPERS
// ============================================
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    AGENDADA: { label: "Agendada", color: "text-violet-700 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/40", icon: Calendar },
    agendada: { label: "Agendada", color: "text-violet-700 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/40", icon: Calendar },
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
  const configs: Record<string, { label: string; color: string; bgColor: string }> = {
    absolvicao: { label: "Absolvição", color: "text-white", bgColor: "bg-emerald-600" },
    ABSOLVICAO: { label: "Absolvição", color: "text-white", bgColor: "bg-emerald-600" },
    condenacao: { label: "Condenação", color: "text-white", bgColor: "bg-rose-600" },
    CONDENACAO: { label: "Condenação", color: "text-white", bgColor: "bg-rose-600" },
    desclassificacao: { label: "Desclassificação", color: "text-white", bgColor: "bg-amber-500" },
    DESCLASSIFICACAO: { label: "Desclassificação", color: "text-white", bgColor: "bg-amber-500" },
  };
  return configs[resultado] || null;
}

function getProximidade(data: Date) {
  if (isToday(data)) return { label: "Hoje", color: "text-rose-600 bg-rose-100 dark:bg-rose-900/40", urgent: true };
  if (isTomorrow(data)) return { label: "Amanhã", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40", urgent: true };
  const dias = differenceInDays(data, new Date());
  if (dias <= 3) return { label: `${dias}d`, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40", urgent: true };
  if (dias <= 7) return { label: `${dias}d`, color: "text-violet-600 bg-violet-100 dark:bg-violet-900/40", urgent: false };
  return { label: format(data, "dd/MM"), color: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800", urgent: false };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function JuriPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header - Padrão Processos */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Gavel className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tribunal do Júri</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">• {stats.agendadas} sessões</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Link href="/admin/juri/cockpit">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
                title="Cockpit"
              >
                <Target className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600"
              title="Exportar"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Link href="/admin/juri/nova">
              <Button 
                size="sm" 
                className="h-7 px-2.5 ml-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Agendadas", value: stats.agendadas, icon: Calendar, color: "violet" },
            { label: "Absolvições", value: stats.absolvicoes, icon: CheckCircle2, color: "emerald" },
            { label: "Condenações", value: stats.condenacoes, icon: XCircle, color: "rose" },
            { label: "Taxa Absolvição", value: `${stats.taxaAbsolvicao}%`, icon: TrendingUp, color: "amber" },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            const colorClasses = {
              violet: "text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400",
              emerald: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
              rose: "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400",
              amber: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
            }[stat.color];
            
            return (
              <div key={idx} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colorClasses)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    {isLoading ? (
                      <Skeleton className="h-6 w-10" />
                    ) : (
                      <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{stat.value}</p>
                    )}
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* PRÓXIMAS SESSÕES - Destaque */}
        {(loadingProximas || (proximasSessoes && proximasSessoes.length > 0)) && (
          <Card className="border-violet-200 dark:border-violet-800/50 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <CardTitle className="text-sm font-semibold">Próximas Sessões</CardTitle>
                  <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600">
                    {proximasSessoes?.length || 0}
                  </Badge>
                </div>
                <Link href="/admin/juri/cockpit">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-600 hover:text-violet-700">
                    Abrir Cockpit <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingProximas ? (
                <div className="grid gap-3 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-4">
                  {proximasSessoes?.slice(0, 4).map((sessao) => {
                    const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : new Date();
                    const prox = getProximidade(dataSessao);
                    
                    return (
                      <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                        <div className={cn(
                          "p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all hover:shadow-md group cursor-pointer",
                          prox.urgent ? "border-violet-300 dark:border-violet-700" : "border-zinc-200 dark:border-zinc-800"
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", prox.color)}>
                              {prox.label}
                            </span>
                            <span className="text-[10px] text-zinc-400">{format(dataSessao, "HH:mm")}</span>
                          </div>
                          <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">{sessao.assistidoNome}</p>
                          <p className="text-[10px] text-zinc-500 truncate font-mono mt-1">{sessao.processo?.numeroAutos}</p>
                          {sessao.defensorNome && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-400">
                              <User className="w-3 h-3" />
                              {sessao.defensorNome}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FERRAMENTAS - Grid Compacto */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "cockpit", label: "Plenário Live", desc: "Cockpit do julgamento", href: "/admin/juri/cockpit", icon: Zap, color: "violet", premium: true },
            { id: "jurados", label: "Banco de Jurados", desc: "Perfis psicológicos", href: "/admin/juri/jurados", icon: Users, color: "blue" },
            { id: "investigacao", label: "Investigação", desc: "OSINT e diligências", href: "/admin/juri/investigacao", icon: FileSearch, color: "emerald" },
            { id: "teses", label: "Teses do Júri", desc: "Narrativa e argumentos", href: "/admin/juri/teses", icon: Target, color: "amber" },
          ].map((tool) => {
            const Icon = tool.icon;
            const bgColor = {
              violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
              blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
              emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
              amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
            }[tool.color];
            
            return (
              <Link key={tool.id} href={tool.href}>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bgColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {tool.premium && (
                      <Badge className="bg-violet-500 text-white text-[9px] border-0">Premium</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{tool.label}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{tool.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* LISTA DE SESSÕES */}
        <Card className="border-zinc-100 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Gavel className="w-4 h-4 text-zinc-500" />
                <CardTitle className="text-sm font-semibold">Todas as Sessões</CardTitle>
                <Badge variant="outline" className="text-[10px]">{sessoesFiltradas.length}</Badge>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                  <Input
                    placeholder="Buscar réu, processo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8 text-xs w-full sm:w-56"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="AGENDADA">Agendadas</SelectItem>
                    <SelectItem value="REALIZADA">Realizadas</SelectItem>
                    <SelectItem value="ADIADA">Adiadas</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "px-2 h-7 rounded-md transition-all",
                      viewMode === "grid" ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "px-2 h-7 rounded-md transition-all",
                      viewMode === "list" ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500"
                    )}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : sessoesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Gavel className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm text-zinc-500">Nenhuma sessão encontrada</p>
                <Link href="/admin/juri/nova">
                  <Button size="sm" className="mt-4 bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Nova Sessão
                  </Button>
                </Link>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sessoesFiltradas.map((sessao) => {
                  const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : null;
                  const statusCfg = getStatusConfig(sessao.status || "AGENDADA");
                  const resultadoCfg = getResultadoConfig(sessao.resultado);
                  const StatusIcon = statusCfg.icon;
                  
                  return (
                    <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-[10px] border-0", statusCfg.bgColor, statusCfg.color)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                            {resultadoCfg && (
                              <Badge className={cn("text-[10px] border-0", resultadoCfg.bgColor, resultadoCfg.color)}>
                                {resultadoCfg.label}
                              </Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Zap className="w-3.5 h-3.5 mr-2" />
                                Abrir cockpit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">
                              {sessao.assistidoNome?.split(" ").map(n => n[0]).slice(0, 2).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">
                              {sessao.assistidoNome || "Réu não informado"}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate">
                              {sessao.processo?.numeroAutos}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            {dataSessao ? format(dataSessao, "dd/MM/yyyy HH:mm") : "—"}
                          </div>
                          {sessao.defensorNome && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <User className="w-3 h-3" />
                              {sessao.defensorNome.split(" ")[0]}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {sessoesFiltradas.map((sessao) => {
                  const dataSessao = sessao.dataSessao ? new Date(sessao.dataSessao) : null;
                  const statusCfg = getStatusConfig(sessao.status || "AGENDADA");
                  const resultadoCfg = getResultadoConfig(sessao.resultado);
                  
                  return (
                    <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                      <div className="flex items-center gap-4 p-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                            {sessao.assistidoNome?.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sessao.assistidoNome}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">{sessao.processo?.numeroAutos}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-[10px] border-0", statusCfg.bgColor, statusCfg.color)}>
                            {statusCfg.label}
                          </Badge>
                          {resultadoCfg && (
                            <Badge className={cn("text-[10px] border-0", resultadoCfg.bgColor, resultadoCfg.color)}>
                              {resultadoCfg.label}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {dataSessao ? format(dataSessao, "dd/MM") : "—"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
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
