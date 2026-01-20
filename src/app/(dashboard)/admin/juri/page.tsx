"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string }> = {
    agendada: { variant: "default", label: "Agendada" },
    realizada: { variant: "secondary", label: "Realizada", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
    adiada: { variant: "outline", label: "Adiada", className: "border-amber-300 text-amber-700" },
    cancelada: { variant: "destructive", label: "Cancelada" },
  };
  const config = configs[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

function getResultadoBadge(resultado: string | null) {
  if (!resultado) return null;
  
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string, icon: React.ComponentType<{ className?: string }> }> = {
    absolvicao: { variant: "default", label: "Absolvição", className: "bg-emerald-600", icon: CheckCircle2 },
    condenacao: { variant: "destructive", label: "Condenação", icon: XCircle },
    desclassificacao: { variant: "secondary", label: "Desclassificação", icon: AlertTriangle },
  };
  
  const config = configs[resultado] || { variant: "secondary", label: resultado, icon: AlertTriangle };
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className || ""}`}>
      <Icon className="h-3 w-3" />
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tribunal do Júri</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão de sessões e análise de jurados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/juri/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Sessão
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.agendadas}</p>
                <p className="text-sm font-medium mt-1">Sessões Agendadas</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card andamento">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.absolvicoes}</p>
                <p className="text-sm font-medium mt-1">Absolvições</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card fatal">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.condenacoes}</p>
                <p className="text-sm font-medium mt-1">Condenações</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido - Plenário e Jurados */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Plenário & Jurados</CardTitle>
              <CardDescription>Ferramentas para o dia do julgamento</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {acessoPlenario.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href}>
                  <div className={`rounded-xl border ${item.accent} p-4 transition-shadow hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-white/70 dark:bg-zinc-900/40 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${item.iconColor}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[10px]">Premium</Badge>
                        )}
                        {"isNew" in item && item.isNew && (
                          <Badge className="bg-purple-500 text-white text-[10px]">
                            <Sparkles className="h-3 w-3 mr-0.5" />
                            Novo
                          </Badge>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm">{item.titulo}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ferramentas Estratégicas */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Ferramentas Estratégicas</CardTitle>
              <CardDescription>Mapeie provas, teses e oratória do plenário</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ferramentasJuri.map((ferramenta) => {
              const Icon = ferramenta.icon;
              return (
                <Link key={ferramenta.id} href={ferramenta.href}>
                  <div className={`rounded-xl border ${ferramenta.accent} p-4 transition-shadow hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-white/70 dark:bg-zinc-900/40 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${ferramenta.iconColor}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {ferramenta.isPremium && (
                          <Badge className="bg-amber-500 text-white text-[10px]">Premium</Badge>
                        )}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm">{ferramenta.titulo}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{ferramenta.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Próximas Sessões */}
      {proximasSessoes.length > 0 && (
        <Card className="section-card">
          <CardHeader className="pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Gavel className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Próximas Sessões</CardTitle>
                  <CardDescription className="mt-0.5">Plenários agendados</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {proximasSessoes.map((sessao) => (
                <Link key={sessao.id} href={`/admin/juri/${sessao.id}`}>
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 hover:border-purple-300 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-lg px-3 py-1.5">
                        <p className="text-lg font-bold text-purple-600">
                          {format(parseISO(sessao.dataSessao), "dd/MM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline">{sessao.sala}</Badge>
                    </div>
                    <p className="font-semibold text-sm">{sessao.assistidoNome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sessao.assunto}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <User className="h-3 w-3" />
                      {sessao.defensorNome}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Sessões */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por réu, processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
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
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Réu</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessoes.map((sessao) => (
                <TableRow key={sessao.id}>
                  <TableCell>
                    <div className="font-medium">
                      {format(parseISO(sessao.dataSessao), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(sessao.dataSessao), "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{sessao.assistidoNome}</TableCell>
                  <TableCell className="processo-numero">{sessao.processo}</TableCell>
                  <TableCell>{sessao.defensorNome}</TableCell>
                  <TableCell>{getStatusBadge(sessao.status)}</TableCell>
                  <TableCell>{getResultadoBadge(sessao.resultado)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
