"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/shared/swiss-card";
import { SwissTable, SwissTableBody, SwissTableCell, SwissTableHead, SwissTableHeader, SwissTableRow } from "@/components/shared/swiss-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Edit,
  MoreHorizontal,
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
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados de sessões
const mockSessoesJuri = [
  { 
    id: 1, 
    dataSessao: "2026-01-17T09:00:00",
    assistidoNome: "Roberto Silva Nascimento",
    processo: "8012906-74.2025.8.05.0039",
    defensorNome: "Dr. Rodrigo",
    sala: "Plenário 1",
    status: "agendada",
    resultado: null,
    assunto: "Homicídio Qualificado",
  },
  { 
    id: 2, 
    dataSessao: "2026-01-19T09:00:00",
    assistidoNome: "Marcos Paulo Souza",
    processo: "0001234-56.2025.8.05.0039",
    defensorNome: "Dra. Juliane",
    sala: "Plenário 2",
    status: "agendada",
    resultado: null,
    assunto: "Tentativa de Homicídio",
  },
  { 
    id: 3, 
    dataSessao: "2026-01-10T09:00:00",
    assistidoNome: "Carlos Eduardo Lima",
    processo: "0005678-90.2024.8.05.0039",
    defensorNome: "Dr. Rodrigo",
    sala: "Plenário 1",
    status: "realizada",
    resultado: "absolvicao",
    assunto: "Homicídio Simples",
  },
  { 
    id: 4, 
    dataSessao: "2026-01-08T09:00:00",
    assistidoNome: "José Ferreira Santos",
    processo: "0009012-34.2024.8.05.0039",
    defensorNome: "Dra. Juliane",
    sala: "Plenário 2",
    status: "realizada",
    resultado: "condenacao",
    assunto: "Homicídio Qualificado",
    penaAplicada: "15 anos de reclusão",
  },
];

// Acesso rápido a ferramentas do Plenário
const acessoPlenario = [
  {
    id: "cockpit",
    titulo: "Plenário Live",
    descricao: "Cockpit para o dia do julgamento",
    href: "/admin/juri/cockpit",
    icon: Zap,
    accent: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60",
    iconColor: "text-amber-600",
    isPremium: true,
  },
  {
    id: "avaliacao",
    titulo: "Avaliação do Júri",
    descricao: "Formulário de observação comportamental",
    href: "/admin/juri/avaliacao",
    icon: ClipboardCheck,
    accent: "bg-purple-50 dark:bg-purple-950/20 border-purple-200/60",
    iconColor: "text-purple-600",
    isNew: true,
  },
  {
    id: "jurados",
    titulo: "Banco de Jurados",
    descricao: "Perfil e histórico de votações",
    href: "/admin/jurados",
    icon: UserCheck,
    accent: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/60",
    iconColor: "text-blue-600",
  },
  {
    id: "profiler",
    titulo: "Profiler de Jurados",
    descricao: "Score de empatia e análise",
    href: "/admin/jurados/profiler",
    icon: Brain,
    accent: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60",
    iconColor: "text-violet-600",
    isPremium: true,
  },
];

// Ferramentas estratégicas do Júri
const ferramentasJuri = [
  {
    id: "investigacao",
    titulo: "Investigação & OSINT",
    descricao: "Kanban de providências e diligências",
    href: "/admin/juri/investigacao",
    icon: FileSearch,
    accent: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60",
    iconColor: "text-emerald-600",
  },
  {
    id: "provas",
    titulo: "Matriz de Provas",
    descricao: "Comparador e contradições",
    href: "/admin/juri/provas",
    icon: ClipboardCheck,
    accent: "bg-sky-50 dark:bg-sky-950/20 border-sky-200/60",
    iconColor: "text-sky-600",
  },
  {
    id: "teses",
    titulo: "Teses do Júri",
    descricao: "Narrativa e argumentos",
    href: "/admin/juri/teses",
    icon: Target,
    accent: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200/60",
    iconColor: "text-indigo-600",
  },
  {
    id: "laboratorio",
    titulo: "Laboratório de Oratória",
    descricao: "Timer e análise de discurso",
    href: "/admin/juri/laboratorio",
    icon: Mic,
    accent: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60",
    iconColor: "text-rose-600",
    isPremium: true,
  },
];

function getStatusBadge(status: string) {
  const configs: Record<string, { label: string, className: string }> = {
    agendada: { label: "Agendada", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0" },
    realizada: { label: "Realizada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0" },
    adiada: { label: "Adiada", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0" },
    cancelada: { label: "Cancelada", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-0" },
  };
  const config = configs[status] || { label: status, className: "bg-slate-100 text-slate-700 border-0" };
  return <Badge className={cn("text-[10px] sm:text-xs font-medium", config.className)}>{config.label}</Badge>;
}

function getResultadoBadge(resultado: string | null) {
  if (!resultado) return null;
  
  const configs: Record<string, { label: string, className: string, icon: React.ComponentType<{ className?: string }> }> = {
    absolvicao: { label: "Absolvição", className: "bg-emerald-600 text-white border-0", icon: CheckCircle2 },
    condenacao: { label: "Condenação", className: "bg-rose-600 text-white border-0", icon: XCircle },
    desclassificacao: { label: "Desclassificação", className: "bg-amber-500 text-white border-0", icon: AlertTriangle },
  };
  
  const config = configs[resultado] || { label: resultado, className: "bg-slate-500 text-white border-0", icon: AlertTriangle };
  const Icon = config.icon;
  
  return (
    <Badge className={cn("gap-1 text-[10px] sm:text-xs font-medium", config.className)}>
      <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      {config.label}
    </Badge>
  );
}

export default function JuriPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSessoes = mockSessoesJuri.filter((sessao) => {
    const matchesSearch = 
      sessao.assistidoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sessao.processo.includes(searchTerm) ||
      sessao.assunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sessao.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(a.dataSessao).getTime() - new Date(b.dataSessao).getTime());

  const stats = {
    total: mockSessoesJuri.length,
    agendadas: mockSessoesJuri.filter(s => s.status === "agendada").length,
    absolvicoes: mockSessoesJuri.filter(s => s.resultado === "absolvicao").length,
    condenacoes: mockSessoesJuri.filter(s => s.resultado === "condenacao").length,
  };

  const proximasSessoes = mockSessoesJuri
    .filter(s => s.status === "agendada" && isFuture(parseISO(s.dataSessao)))
    .slice(0, 3);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header - Padrão Swiss */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Gavel className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Tribunal do Júri</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Gestão de sessões e análise de jurados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/juri/nova">
            <Button className="gap-2 h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Sessão</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Padrão Swiss */}
      <div className="grid gap-3 sm:gap-4 grid-cols-3">
        <SwissCard className="border-l-[3px] border-l-purple-500 dark:border-l-purple-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.agendadas}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Agendadas</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-emerald-500 dark:border-l-emerald-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.absolvicoes}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Absolvições</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-[3px] border-l-rose-500 dark:border-l-rose-400">
          <SwissCardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{stats.condenacoes}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Condenações</p>
              </div>
              <div className="hidden sm:flex w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Acesso Rápido - Plenário e Jurados - Padrão Swiss */}
      <SwissCard>
        <SwissCardHeader className="pb-3 sm:pb-4">
          <SwissCardTitle className="text-sm sm:text-base">Plenário & Jurados</SwissCardTitle>
          <SwissCardDescription>Ferramentas para o dia do julgamento</SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent className="p-3 sm:p-4">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {acessoPlenario.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href}>
                  <div className={cn(
                    "rounded-lg border p-3 sm:p-4 transition-all hover:shadow-md group",
                    item.accent
                  )}>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-white/70 dark:bg-zinc-900/40 flex items-center justify-center">
                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", item.iconColor)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[9px] sm:text-[10px] border-0 px-1.5">Premium</Badge>
                        )}
                        {"isNew" in item && item.isNew && (
                          <Badge className="bg-purple-500 text-white text-[9px] sm:text-[10px] border-0 px-1.5">
                            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                            Novo
                          </Badge>
                        )}
                        <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm">{item.titulo}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{item.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Ferramentas Estratégicas - Padrão Swiss */}
      <SwissCard>
        <SwissCardHeader className="pb-3 sm:pb-4">
          <SwissCardTitle className="text-sm sm:text-base">Ferramentas Estratégicas</SwissCardTitle>
          <SwissCardDescription>Mapeie provas, teses e oratória do plenário</SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent className="p-3 sm:p-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
            {ferramentasJuri.map((ferramenta) => {
              const Icon = ferramenta.icon;
              return (
                <Link key={ferramenta.id} href={ferramenta.href}>
                  <div className={cn(
                    "rounded-lg border p-3 sm:p-4 transition-all hover:shadow-md group",
                    ferramenta.accent
                  )}>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-white/70 dark:bg-zinc-900/40 flex items-center justify-center">
                        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", ferramenta.iconColor)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {ferramenta.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[9px] sm:text-[10px] border-0 px-1.5">Premium</Badge>
                        )}
                        <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm">{ferramenta.titulo}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{ferramenta.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Próximas Sessões - Padrão Swiss */}
      {proximasSessoes.length > 0 && (
        <SwissCard>
          <SwissCardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Gavel className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div>
                <SwissCardTitle className="text-sm sm:text-base">Próximas Sessões</SwissCardTitle>
                <SwissCardDescription>Plenários agendados</SwissCardDescription>
              </div>
            </div>
          </SwissCardHeader>
          <SwissCardContent className="p-3 sm:p-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {proximasSessoes.map((sessao) => (
                <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                  <div className={cn(
                    "p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md group",
                    "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/40"
                  )}>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-md px-2.5 py-1 sm:px-3 sm:py-1.5">
                        <p className="text-sm sm:text-lg font-bold font-mono text-purple-600">
                          {format(parseISO(sessao.dataSessao), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] sm:text-xs border-0 bg-white/60 dark:bg-zinc-900/40">{sessao.sala}</Badge>
                    </div>
                    <p className="font-semibold text-xs sm:text-sm line-clamp-1">{sessao.assistidoNome}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{sessao.assunto}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {sessao.defensorNome}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </SwissCardContent>
        </SwissCard>
      )}

      {/* Tabela de Sessões - Padrão Swiss */}
      <SwissCard>
        <SwissCardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por réu, processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="agendada">Agendadas</SelectItem>
                <SelectItem value="realizada">Realizadas</SelectItem>
                <SelectItem value="adiada">Adiadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SwissCardHeader>
        <SwissCardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <SwissTable>
              <SwissTableHeader>
                <SwissTableRow>
                  <SwissTableHead>Data</SwissTableHead>
                  <SwissTableHead>Réu</SwissTableHead>
                  <SwissTableHead>Processo</SwissTableHead>
                  <SwissTableHead>Defensor</SwissTableHead>
                  <SwissTableHead>Status</SwissTableHead>
                  <SwissTableHead>Resultado</SwissTableHead>
                  <SwissTableHead className="text-right">Ações</SwissTableHead>
                </SwissTableRow>
              </SwissTableHeader>
              <SwissTableBody>
                {filteredSessoes.map((sessao) => (
                  <SwissTableRow key={sessao.id}>
                    <SwissTableCell>
                      <div className="font-medium font-mono text-xs">
                        {format(parseISO(sessao.dataSessao), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {format(parseISO(sessao.dataSessao), "HH:mm")}
                      </div>
                    </SwissTableCell>
                    <SwissTableCell className="font-medium text-sm">{sessao.assistidoNome}</SwissTableCell>
                    <SwissTableCell className="font-mono text-xs text-muted-foreground">{sessao.processo}</SwissTableCell>
                    <SwissTableCell className="text-sm">{sessao.defensorNome}</SwissTableCell>
                    <SwissTableCell>{getStatusBadge(sessao.status)}</SwissTableCell>
                    <SwissTableCell>{getResultadoBadge(sessao.resultado)}</SwissTableCell>
                    <SwissTableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/admin/juri/${sessao.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SwissTableCell>
                  </SwissTableRow>
                ))}
              </SwissTableBody>
            </SwissTable>
          </div>
          
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSessoes.map((sessao) => (
              <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                <div className="p-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{sessao.assistidoNome}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{sessao.assunto}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(sessao.status)}
                      {getResultadoBadge(sessao.resultado)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{sessao.processo}</span>
                    <span className="font-mono">
                      {format(parseISO(sessao.dataSessao), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                    <User className="h-2.5 w-2.5" />
                    {sessao.defensorNome}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          
          {filteredSessoes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Gavel className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma sessão encontrada</p>
            </div>
          )}
        </SwissCardContent>
      </SwissCard>
    </div>
  );
}
