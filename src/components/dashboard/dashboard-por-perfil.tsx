"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
  Users,
  ListTodo,
  AlertCircle,
  Calendar,
  Gavel,
  ArrowRight,
  FileText,
  Lock,
  CheckCircle2,
  Clock,
  User,
  Scale,
  FolderOpen,
  Briefcase,
  MessageSquare,
  CalendarDays,
  Send,
  ClipboardList,
  Phone,
  BookOpen,
  Target,
  TrendingUp,
  Building2,
  UserCheck,
  RefreshCw,
  Home,
  GraduationCap,
} from "lucide-react";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { format, parseISO, isToday, isTomorrow, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// TIPOS
// ============================================

interface DashboardPorPerfilProps {
  userRole: UserRole;
  userName?: string;
  supervisorName?: string;
  
  // Dados
  demandas?: any[];
  delegacoes?: any[];
  assistidos?: any[];
  processos?: any[];
  juris?: any[];
  audiencias?: any[];
  
  // Estados de loading
  isLoading?: boolean;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  color = "zinc",
  loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  href?: string;
  color?: "emerald" | "amber" | "blue" | "rose" | "violet" | "zinc";
  loading?: boolean;
}) {
  const colors = {
    emerald: "group-hover:border-emerald-200/50 group-hover:text-emerald-600",
    amber: "group-hover:border-amber-200/50 group-hover:text-amber-600",
    blue: "group-hover:border-blue-200/50 group-hover:text-blue-600",
    rose: "group-hover:border-rose-200/50 group-hover:text-rose-600",
    violet: "group-hover:border-violet-200/50 group-hover:text-violet-600",
    zinc: "group-hover:border-zinc-200/50 group-hover:text-zinc-600",
  };

  const iconColors = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    blue: "text-blue-600 dark:text-blue-400",
    rose: "text-rose-600 dark:text-rose-400",
    violet: "text-violet-600 dark:text-violet-400",
    zinc: "text-zinc-500 dark:text-zinc-400",
  };

  const content = (
    <div className={`group relative p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 ${colors[color]} transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-${color}-500/[0.03]`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-${color}-500/0 to-transparent group-hover:via-${color}-500/30 transition-all duration-300 rounded-t-xl" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-14" />
          ) : (
            <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              {value}
            </p>
          )}
          {subtitle && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:bg-${color}-50 dark:group-hover:bg-${color}-900/20 transition-all duration-300`}>
          <Icon className={`w-4 h-4 ${iconColors[color]} transition-colors duration-300`} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function DelegacaoCard({ delegacao }: { delegacao: any }) {
  const prazoInfo = delegacao.prazoSugerido 
    ? {
        texto: format(new Date(delegacao.prazoSugerido), "dd/MM"),
        diasRestantes: differenceInDays(new Date(delegacao.prazoSugerido), new Date()),
      }
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors">
      <div className={`w-2 h-10 rounded-full ${
        delegacao.status === "pendente" ? "bg-amber-500" :
        delegacao.status === "em_andamento" ? "bg-blue-500" :
        "bg-emerald-500"
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {delegacao.titulo || delegacao.instrucoes?.slice(0, 50) || "Tarefa delegada"}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
          <span>De: {delegacao.delegadoDeNome || "Defensor"}</span>
          {prazoInfo && (
            <span className={`px-1.5 py-0.5 rounded ${
              prazoInfo.diasRestantes <= 1 ? "bg-rose-100 text-rose-600" :
              prazoInfo.diasRestantes <= 3 ? "bg-amber-100 text-amber-600" :
              "bg-zinc-100 text-zinc-600"
            }`}>
              {prazoInfo.texto}
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className={`text-[9px] ${
        delegacao.status === "pendente" ? "border-amber-300 text-amber-600" :
        delegacao.status === "em_andamento" ? "border-blue-300 text-blue-600" :
        "border-emerald-300 text-emerald-600"
      }`}>
        {delegacao.status === "pendente" ? "Pendente" :
         delegacao.status === "em_andamento" ? "Em andamento" :
         "Concluída"}
      </Badge>
    </div>
  );
}

// ============================================
// DASHBOARD PARA ESTAGIÁRIO - PADRÃO DEFENDER
// ============================================

function DashboardEstagiario({
  userName,
  supervisorName,
  delegacoes = [],
  demandas = [],
  assistidos = [],
  isLoading = false,
}: Omit<DashboardPorPerfilProps, "userRole">) {
  // Stats
  const delegacoesPendentes = delegacoes.filter((d: any) => d.status === "pendente").length;
  const delegacoesEmAndamento = delegacoes.filter((d: any) => d.status === "em_andamento").length;
  const delegacoesConcluidas = delegacoes.filter((d: any) => d.status === "concluida").length;
  
  // Taxa de conclusão
  const taxaConclusao = delegacoes.length > 0 
    ? Math.round((delegacoesConcluidas / delegacoes.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Olá, {userName || "Estagiário(a)"}!
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Vinculado(a) a {supervisorName || "Defensor"} • {delegacoesPendentes} tarefas pendentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards - Padrão Defender */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{delegacoesPendentes}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Pendentes</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{delegacoesEmAndamento}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Andamento</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{delegacoesConcluidas}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Concluídas</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-zinc-900 dark:bg-white border-zinc-800 dark:border-zinc-200 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-zinc-900 dark:text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white dark:text-zinc-900 tracking-tighter">{taxaConclusao}%</p>
                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Performance</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tarefas Delegadas */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Minhas Tarefas
                </h3>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px]">
                  {delegacoesPendentes + delegacoesEmAndamento}
                </Badge>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </>
            ) : delegacoes.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Nenhuma tarefa pendente
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Parabéns! Você está em dia.
                </p>
              </div>
            ) : (
              delegacoes
                .filter((d: any) => d.status !== "concluida")
                .slice(0, 5)
                .map((delegacao: any) => (
                  <DelegacaoCard key={delegacao.id} delegacao={delegacao} />
                ))
            )}
          </div>
        </Card>

        {/* Grid de acesso rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/assistidos">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Assistidos</p>
              <p className="text-[10px] text-zinc-500">{assistidos.length} cadastrados</p>
            </Card>
          </Link>
          <Link href="/admin/processos">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Processos</p>
              <p className="text-[10px] text-zinc-500">Consultar</p>
            </Card>
          </Link>
          <Link href="/admin/drive">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Drive</p>
              <p className="text-[10px] text-zinc-500">Documentos</p>
            </Card>
          </Link>
          <Link href="/admin/juri">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Gavel className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Júri</p>
              <p className="text-[10px] text-zinc-500">Preparação</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PARA SERVIDOR - PADRÃO DEFENDER
// ============================================

function DashboardServidor({
  userName,
  delegacoes = [],
  demandas = [],
  assistidos = [],
  audiencias = [],
  isLoading = false,
}: Omit<DashboardPorPerfilProps, "userRole">) {
  // Stats
  const delegacoesPendentes = delegacoes.filter((d: any) => d.status === "pendente").length;
  const atendimentosHoje = audiencias.filter((a: any) => {
    const data = a.data ? new Date(a.data) : null;
    return data && isToday(data);
  }).length;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Olá, {userName || "Servidor(a)"}!
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Painel Administrativo • {delegacoesPendentes} tarefas pendentes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards - Padrão Defender */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{delegacoesPendentes}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Tarefas</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{atendimentosHoje}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Hoje</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                <ListTodo className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{demandas.length}</p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Demandas</p>
              </div>
            </div>
          </Card>

          <Card className="group relative p-5 bg-zinc-900 dark:bg-white border-zinc-800 dark:border-zinc-200 rounded-2xl hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-zinc-900 dark:text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white dark:text-zinc-900 tracking-tighter">{assistidos.length}</p>
                <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Assistidos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tarefas do Dia */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Agenda do Dia
              </h3>
            </div>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : audiencias.filter((a: any) => a.data && isToday(new Date(a.data))).length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhum atendimento agendado para hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {audiencias
                  .filter((a: any) => a.data && isToday(new Date(a.data)))
                  .slice(0, 5)
                  .map((aud: any) => (
                    <div key={aud.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {aud.assistidoNome || "Atendimento"}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {aud.horario || aud.hora || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Card>

        {/* Acesso Rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Link href="/admin/demandas">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ListTodo className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Demandas</p>
            </Card>
          </Link>
          <Link href="/admin/assistidos">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Assistidos</p>
            </Card>
          </Link>
          <Link href="/admin/processos">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Processos</p>
            </Card>
          </Link>
          <Link href="/admin/drive">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Drive</p>
            </Card>
          </Link>
          <Link href="/admin/whatsapp">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-green-200 dark:hover:border-green-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">WhatsApp</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PARA TRIAGEM
// ============================================

function DashboardTriagem({
  userName,
  assistidos = [],
  isLoading = false,
}: Omit<DashboardPorPerfilProps, "userRole">) {
  // Stats
  const assistidosHoje = assistidos.filter((a: any) => {
    const data = a.createdAt ? new Date(a.createdAt) : null;
    return data && isToday(data);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              Olá, {userName || "Triagem"}! 👋
            </h1>
            <p className="text-sm text-zinc-500">
              Recepção e Cadastro
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Cadastrados Hoje"
          value={assistidosHoje}
          subtitle="novos"
          icon={UserCheck}
          color="emerald"
          loading={isLoading}
        />
        <StatCard
          title="Total Assistidos"
          value={assistidos.length}
          subtitle="no sistema"
          icon={Users}
          color="blue"
          loading={isLoading}
        />
      </div>

      {/* Ação Principal */}
      <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Novo Cadastro</h2>
            <p className="text-sm text-white/80">Registre um novo assistido no sistema</p>
          </div>
          <Link href="/admin/assistidos/novo">
            <Button variant="secondary" size="lg" className="bg-white text-emerald-600 hover:bg-white/90">
              Cadastrar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Últimos Cadastros */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Últimos Cadastros
            </h3>
          </div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assistidos.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
              <p className="text-sm text-zinc-500">Nenhum cadastro recente</p>
            </div>
          ) : (
            assistidos.slice(0, 5).map((assistido: any) => (
              <div key={assistido.id} className="flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
                    {assistido.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {assistido.nome}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {assistido.createdAt ? format(new Date(assistido.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================
// DASHBOARD PARA DEFENSOR CRIMINAL GERAL
// ============================================

function DashboardDefensorCriminal({
  userName,
  demandas = [],
  assistidos = [],
  processos = [],
  audiencias = [],
  isLoading = false,
}: Omit<DashboardPorPerfilProps, "userRole">) {
  // Stats
  const demandasPendentes = demandas.filter((d: any) => 
    d.status === "PENDENTE" || d.status === "2_ATENDER"
  ).length;
  
  const prazosUrgentes = demandas.filter((d: any) => {
    if (!d.prazoFinal && !d.prazo) return false;
    const prazo = new Date(d.prazoFinal || d.prazo);
    return differenceInDays(prazo, new Date()) <= 5;
  }).length;

  const reusPresos = assistidos.filter((a: any) => 
    a.situacaoPrisional === "PRESO" || a.reuPreso
  ).length;

  const audienciasProximas = audiencias.filter((a: any) => {
    const data = a.data ? new Date(a.data) : null;
    return data && differenceInDays(data, new Date()) <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              {userName || "Defensor(a)"}
            </h1>
            <p className="text-sm text-zinc-500">
              Vara Criminal
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Demandas Pendentes"
          value={demandasPendentes}
          subtitle="aguardando"
          icon={ListTodo}
          href="/admin/demandas"
          color="amber"
          loading={isLoading}
        />
        <StatCard
          title="Prazos Urgentes"
          value={prazosUrgentes}
          subtitle="próx. 5 dias"
          icon={AlertCircle}
          href="/admin/demandas"
          color="rose"
          loading={isLoading}
        />
        <StatCard
          title="Réus Presos"
          value={reusPresos}
          subtitle={`de ${assistidos.length}`}
          icon={Lock}
          href="/admin/assistidos"
          color="blue"
          loading={isLoading}
        />
        <StatCard
          title="Audiências"
          value={audienciasProximas}
          subtitle="próx. 7 dias"
          icon={Calendar}
          href="/admin/agenda"
          color="violet"
          loading={isLoading}
        />
      </div>

      {/* Prazos Próximos */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Próximos Prazos
              </h3>
            </div>
            <Link href="/admin/demandas">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-emerald-600">
                Ver todas <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : demandas.filter((d: any) => d.prazoFinal || d.prazo).length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-sm text-zinc-500">Nenhum prazo urgente</p>
            </div>
          ) : (
            demandas
              .filter((d: any) => d.prazoFinal || d.prazo)
              .sort((a: any, b: any) => {
                const prazoA = new Date(a.prazoFinal || a.prazo);
                const prazoB = new Date(b.prazoFinal || b.prazo);
                return prazoA.getTime() - prazoB.getTime();
              })
              .slice(0, 5)
              .map((demanda: any) => {
                const prazo = new Date(demanda.prazoFinal || demanda.prazo);
                const diasRestantes = differenceInDays(prazo, new Date());
                
                return (
                  <Link href={`/admin/demandas/${demanda.id}`} key={demanda.id}>
                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${
                        diasRestantes <= 0 ? "bg-rose-500" :
                        diasRestantes <= 3 ? "bg-amber-500" :
                        "bg-zinc-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {demanda.assistido?.nome || demanda.assistidoNome || "Sem assistido"}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">{demanda.ato}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        diasRestantes <= 0 ? "bg-rose-100 text-rose-600" :
                        diasRestantes <= 3 ? "bg-amber-100 text-amber-600" :
                        "bg-zinc-100 text-zinc-500"
                      }`}>
                        {diasRestantes <= 0 ? "Vencido" :
                         diasRestantes === 1 ? "Amanhã" :
                         format(prazo, "dd/MM")}
                      </span>
                    </div>
                  </Link>
                );
              })
          )}
        </div>
      </Card>

      {/* Grid de Acesso */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/demandas">
          <Card className="p-4 hover:border-amber-200 dark:hover:border-amber-800 transition-colors cursor-pointer">
            <ListTodo className="w-5 h-5 text-amber-600 mb-2" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Demandas</p>
            <p className="text-[10px] text-zinc-500">{demandas.length} total</p>
          </Card>
        </Link>
        <Link href="/admin/assistidos">
          <Card className="p-4 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-pointer">
            <Users className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Assistidos</p>
            <p className="text-[10px] text-zinc-500">{assistidos.length} total</p>
          </Card>
        </Link>
        <Link href="/admin/processos">
          <Card className="p-4 hover:border-blue-200 dark:hover:border-blue-800 transition-colors cursor-pointer">
            <Scale className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Processos</p>
            <p className="text-[10px] text-zinc-500">{processos.length} total</p>
          </Card>
        </Link>
        <Link href="/admin/agenda">
          <Card className="p-4 hover:border-violet-200 dark:hover:border-violet-800 transition-colors cursor-pointer">
            <Calendar className="w-5 h-5 text-violet-600 mb-2" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Agenda</p>
            <p className="text-[10px] text-zinc-500">Ver calendário</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL - SELETOR DE DASHBOARD
// ============================================

export function DashboardPorPerfil(props: DashboardPorPerfilProps) {
  const { userRole } = props;

  switch (userRole) {
    case "estagiario":
      return <DashboardEstagiario {...props} />;
    case "servidor":
      return <DashboardServidor {...props} />;
    case "triagem":
      return <DashboardTriagem {...props} />;
    case "defensor":
      // Verificar se é defensor de vara criminal geral
      // Por enquanto, mostrar dashboard criminal para todos defensores não-especializados
      return <DashboardDefensorCriminal {...props} />;
    default:
      return <DashboardDefensorCriminal {...props} />;
  }
}
