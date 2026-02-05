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
  Shield,
  Share2,
  Bell,
  Eye,
  Inbox,
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
  userNucleo?: string; // 'ESPECIALIZADOS' | 'VARA_1' | 'VARA_2'
  
  // Dados
  demandas?: any[];
  delegacoes?: any[];
  assistidos?: any[];
  processos?: any[];
  juris?: any[];
  audiencias?: any[];
  eventosCompartilhados?: any[]; // Eventos compartilhados pelo supervisor
  
  // Estados de loading
  isLoading?: boolean;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StatCardPremium({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  colorClass = "bg-zinc-500",
  loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  href?: string;
  colorClass?: string;
  loading?: boolean;
}) {
  const content = (
    <Card className="group relative p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter">{value}</p>
          )}
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{title}</p>
          {subtitle && <p className="text-[10px] text-zinc-400">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function DelegacaoCardCompact({ delegacao }: { delegacao: any }) {
  const prazoInfo = delegacao.prazoSugerido 
    ? {
        texto: format(new Date(delegacao.prazoSugerido), "dd/MM"),
        diasRestantes: differenceInDays(new Date(delegacao.prazoSugerido), new Date()),
      }
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-800/50 transition-colors bg-white dark:bg-zinc-900/50">
      <div className={`w-1.5 h-12 rounded-full ${
        delegacao.status === "pendente" ? "bg-amber-500" :
        delegacao.status === "em_andamento" ? "bg-blue-500" :
        "bg-emerald-500"
      }`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {delegacao.titulo || delegacao.instrucoes?.slice(0, 50) || "Tarefa delegada"}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {delegacao.delegadoDeNome || "Defensor"}
          </span>
          {delegacao.assistidoNome && (
            <span className="truncate max-w-[100px]">• {delegacao.assistidoNome}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className={`text-[9px] ${
          delegacao.status === "pendente" ? "border-amber-300 text-amber-600 bg-amber-50" :
          delegacao.status === "em_andamento" ? "border-blue-300 text-blue-600 bg-blue-50" :
          "border-emerald-300 text-emerald-600 bg-emerald-50"
        }`}>
          {delegacao.status === "pendente" ? "Pendente" :
           delegacao.status === "em_andamento" ? "Em andamento" :
           "Concluída"}
        </Badge>
        {prazoInfo && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
            prazoInfo.diasRestantes <= 1 ? "bg-rose-100 text-rose-600" :
            prazoInfo.diasRestantes <= 3 ? "bg-amber-100 text-amber-600" :
            "bg-zinc-100 text-zinc-600"
          }`}>
            {prazoInfo.texto}
          </span>
        )}
      </div>
    </div>
  );
}

function EventoCompartilhadoCard({ evento }: { evento: any }) {
  const dataEvento = evento.data ? new Date(evento.data) : null;
  const isHoje = dataEvento && isToday(dataEvento);
  const isAmanha = dataEvento && isTomorrow(dataEvento);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800/50 transition-colors bg-white dark:bg-zinc-900/50">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        evento.tipo === "audiencia" ? "bg-blue-100 dark:bg-blue-900/30" :
        evento.tipo === "prazo" ? "bg-amber-100 dark:bg-amber-900/30" :
        evento.tipo === "juri" ? "bg-violet-100 dark:bg-violet-900/30" :
        "bg-zinc-100 dark:bg-zinc-800"
      }`}>
        {evento.tipo === "audiencia" ? <CalendarDays className="w-5 h-5 text-blue-600" /> :
         evento.tipo === "prazo" ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
         evento.tipo === "juri" ? <Gavel className="w-5 h-5 text-violet-600" /> :
         <Calendar className="w-5 h-5 text-zinc-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
          {evento.titulo || "Evento"}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
          <span className="flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            Compartilhado
          </span>
          {evento.local && (
            <span className="truncate max-w-[100px]">• {evento.local}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          isHoje ? "bg-rose-100 text-rose-600" :
          isAmanha ? "bg-amber-100 text-amber-600" :
          "bg-zinc-100 text-zinc-600"
        }`}>
          {isHoje ? "Hoje" : isAmanha ? "Amanhã" : dataEvento ? format(dataEvento, "dd/MM") : "—"}
        </span>
        {evento.horario && (
          <span className="text-[10px] text-zinc-400">{evento.horario}</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PARA ESTAGIÁRIO - VERSÃO APRIMORADA
// ============================================

function DashboardEstagiarioV2({
  userName,
  supervisorName,
  delegacoes = [],
  demandas = [],
  assistidos = [],
  eventosCompartilhados = [],
  audiencias = [],
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

  // Eventos do supervisor compartilhados
  const eventosProximos = eventosCompartilhados
    .filter((e: any) => {
      const data = e.data ? new Date(e.data) : null;
      return data && differenceInDays(data, new Date()) >= 0 && differenceInDays(data, new Date()) <= 7;
    })
    .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());

  // Audiências próximas (do supervisor)
  const audienciasProximas = audiencias
    .filter((a: any) => {
      const data = a.data ? new Date(a.data) : null;
      return data && differenceInDays(data, new Date()) >= 0 && differenceInDays(data, new Date()) <= 7;
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Premium */}
      <div className="px-4 md:px-6 py-5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Olá, {userName || "Estagiário(a)"}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Vinculado(a) a {supervisorName || "Defensor"}
                </Badge>
                {delegacoesPendentes > 0 && (
                  <Badge variant="outline" className="border-rose-300 text-rose-600 text-xs">
                    {delegacoesPendentes} pendentes
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardPremium
            title="Pendentes"
            value={delegacoesPendentes}
            icon={ClipboardList}
            colorClass="bg-amber-500 shadow-amber-500/30"
            loading={isLoading}
          />
          <StatCardPremium
            title="Em Andamento"
            value={delegacoesEmAndamento}
            icon={RefreshCw}
            colorClass="bg-blue-500 shadow-blue-500/30"
            loading={isLoading}
          />
          <StatCardPremium
            title="Concluídas"
            value={delegacoesConcluidas}
            icon={CheckCircle2}
            colorClass="bg-emerald-500 shadow-emerald-500/30"
            loading={isLoading}
          />
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

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Minhas Tarefas */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Minhas Tarefas
                  </h3>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                    {delegacoesPendentes + delegacoesEmAndamento}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </>
              ) : delegacoes.filter((d: any) => d.status !== "concluida").length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Todas as tarefas concluídas!
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Parabéns pelo excelente trabalho.
                  </p>
                </div>
              ) : (
                delegacoes
                  .filter((d: any) => d.status !== "concluida")
                  .slice(0, 6)
                  .map((delegacao: any) => (
                    <DelegacaoCardCompact key={delegacao.id} delegacao={delegacao} />
                  ))
              )}
            </div>
          </Card>

          {/* Agenda do Supervisor (Compartilhada) */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Agenda de {supervisorName || "Defensor"}
                  </h3>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                    <Share2 className="w-3 h-3 mr-1" />
                    Compartilhada
                  </Badge>
                </div>
                <Link href="/admin/agenda">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-500 hover:text-blue-600">
                    Ver tudo <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </>
              ) : eventosProximos.length === 0 && audienciasProximas.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-14 h-14 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhum evento nos próximos 7 dias
                  </p>
                </div>
              ) : (
                <>
                  {eventosProximos.map((evento: any) => (
                    <EventoCompartilhadoCard key={evento.id} evento={evento} />
                  ))}
                  {audienciasProximas.map((aud: any) => (
                    <EventoCompartilhadoCard 
                      key={`aud-${aud.id}`} 
                      evento={{
                        ...aud,
                        tipo: "audiencia",
                        titulo: aud.titulo || `Audiência - ${aud.assistido?.nome || ""}`,
                      }} 
                    />
                  ))}
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Acesso Rápido */}
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
          <Link href="/admin/demandas">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ListTodo className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Demandas</p>
              <p className="text-[10px] text-zinc-500">Ver todas</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PARA SERVIDOR - VERSÃO APRIMORADA
// ============================================

function DashboardServidorV2({
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
      {/* Header Premium */}
      <div className="px-4 md:px-6 py-5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Olá, {userName || "Servidor(a)"}!
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Painel Administrativo • Defensoria de Camaçari
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardPremium
            title="Tarefas"
            value={delegacoesPendentes}
            icon={ClipboardList}
            colorClass="bg-amber-500 shadow-amber-500/30"
            loading={isLoading}
          />
          <StatCardPremium
            title="Hoje"
            value={atendimentosHoje}
            subtitle="atendimentos"
            icon={MessageSquare}
            colorClass="bg-emerald-500 shadow-emerald-500/30"
            loading={isLoading}
          />
          <StatCardPremium
            title="Demandas"
            value={demandas.length}
            icon={ListTodo}
            colorClass="bg-blue-500 shadow-blue-500/30"
            loading={isLoading}
            href="/admin/demandas"
          />
          <StatCardPremium
            title="Assistidos"
            value={assistidos.length}
            icon={Users}
            colorClass="bg-violet-500 shadow-violet-500/30"
            loading={isLoading}
            href="/admin/assistidos"
          />
        </div>

        {/* Tarefas e Agenda */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tarefas Delegadas */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Minhas Tarefas
                </h3>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px]">
                  {delegacoesPendentes}
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              ) : delegacoes.filter((d: any) => d.status !== "concluida").length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhuma tarefa pendente
                  </p>
                </div>
              ) : (
                delegacoes
                  .filter((d: any) => d.status !== "concluida")
                  .slice(0, 5)
                  .map((delegacao: any) => (
                    <DelegacaoCardCompact key={delegacao.id} delegacao={delegacao} />
                  ))
              )}
            </div>
          </Card>

          {/* Agenda do Dia */}
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
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Nenhum atendimento agendado para hoje
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {audiencias
                    .filter((a: any) => a.data && isToday(new Date(a.data)))
                    .slice(0, 5)
                    .map((aud: any) => (
                      <div key={aud.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {aud.titulo || "Audiência"}
                          </p>
                          <p className="text-[10px] text-zinc-500">{aud.horario || "—"}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Acesso Rápido */}
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
          <Link href="/admin/demandas">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ListTodo className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Demandas</p>
              <p className="text-[10px] text-zinc-500">{demandas.length} total</p>
            </Card>
          </Link>
          <Link href="/admin/agenda">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Agenda</p>
              <p className="text-[10px] text-zinc-500">Ver calendário</p>
            </Card>
          </Link>
          <Link href="/admin/drive">
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Drive</p>
              <p className="text-[10px] text-zinc-500">Documentos</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PARA TRIAGEM - VERSÃO APRIMORADA
// ============================================

function DashboardTriagemV2({
  userName,
  assistidos = [],
  isLoading = false,
}: Omit<DashboardPorPerfilProps, "userRole">) {
  // Stats
  const cadastrosHoje = assistidos.filter((a: any) => {
    const data = a.createdAt ? new Date(a.createdAt) : null;
    return data && isToday(data);
  }).length;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Premium */}
      <div className="px-4 md:px-6 py-5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Olá, {userName || "Triagem"}!
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Atendimento Inicial • Defensoria de Camaçari
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <StatCardPremium
            title="Cadastros Hoje"
            value={cadastrosHoje}
            icon={User}
            colorClass="bg-emerald-500 shadow-emerald-500/30"
            loading={isLoading}
          />
          <StatCardPremium
            title="Total"
            value={assistidos.length}
            subtitle="no sistema"
            icon={Users}
            colorClass="bg-blue-500 shadow-blue-500/30"
            loading={isLoading}
          />
        </div>

        {/* Ação Principal */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Novo Cadastro</h2>
              <p className="text-sm text-white/80">Registre um novo assistido no sistema</p>
            </div>
            <Link href="/admin/assistidos/novo">
              <Button variant="secondary" size="lg" className="bg-white text-emerald-600 hover:bg-white/90 shadow-lg">
                Cadastrar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Últimos Cadastros */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
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
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : assistidos.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm text-zinc-500">Nenhum cadastro recente</p>
              </div>
            ) : (
              assistidos.slice(0, 8).map((assistido: any) => (
                <div key={assistido.id} className="flex items-center gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
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
                  <Link href={`/admin/assistidos/${assistido.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ver
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL - SELETOR DE DASHBOARD
// ============================================

export function DashboardPorPerfilV2(props: DashboardPorPerfilProps) {
  const { userRole } = props;

  switch (userRole) {
    case "estagiario":
      return <DashboardEstagiarioV2 {...props} />;
    case "servidor":
      return <DashboardServidorV2 {...props} />;
    case "triagem":
      return <DashboardTriagemV2 {...props} />;
    default:
      // Para defensores, usar o dashboard principal
      return null;
  }
}

export default DashboardPorPerfilV2;
