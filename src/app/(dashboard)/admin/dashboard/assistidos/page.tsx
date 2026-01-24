"use client";

import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle, SwissCardDescription } from "@/components/ui/swiss-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Shield,
  Activity,
  TrendingUp,
  UserPlus,
  Calendar,
  Phone,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { useAssignment } from "@/contexts/assignment-context";

// Mock data para demonstração
const mockAssistidosStats = {
  total: 156,
  ativos: 142,
  presos: 42,
  novosEsteMes: 18,
  atendimentosPendentes: 12,
};

const mockVulnerabilidades = [
  { name: "Hipossuficiência", value: 45, color: "hsl(0, 65%, 55%)" },
  { name: "Dependência Química", value: 28, color: "hsl(35, 70%, 55%)" },
  { name: "Transtorno Mental", value: 22, color: "hsl(210, 60%, 55%)" },
  { name: "Pessoa Idosa", value: 18, color: "hsl(158, 55%, 42%)" },
  { name: "Situação de Rua", value: 15, color: "hsl(280, 55%, 55%)" },
  { name: "Outros", value: 28, color: "hsl(160, 8%, 55%)" },
];

const mockRegioes = [
  { regiao: "Salvador", quantidade: 48 },
  { regiao: "Camaçari", quantidade: 38 },
  { regiao: "Lauro de Freitas", quantidade: 25 },
  { regiao: "Simões Filho", quantidade: 18 },
  { regiao: "Outros", quantidade: 27 },
];

const mockAtividades = [
  { mes: "Jul", novos: 12, atendidos: 45 },
  { mes: "Ago", novos: 15, atendidos: 52 },
  { mes: "Set", novos: 18, atendidos: 48 },
  { mes: "Out", novos: 14, atendidos: 55 },
  { mes: "Nov", novos: 16, atendidos: 58 },
  { mes: "Dez", novos: 19, atendidos: 62 },
];

const mockRecentes = [
  { id: 1, nome: "Diego Bonfim Almeida", status: "REU_PRESO", dataRegistro: "20/01/2026", vulnerabilidades: ["Hipossuficiência"], regiao: "Camaçari" },
  { id: 2, nome: "Maria Silva Santos", status: "ATIVO", dataRegistro: "19/01/2026", vulnerabilidades: ["Violência Doméstica", "Hipossuficiência"], regiao: "Salvador" },
  { id: 3, nome: "José Carlos Oliveira", status: "ATIVO", dataRegistro: "18/01/2026", vulnerabilidades: ["Dependência Química"], regiao: "Lauro de Freitas" },
  { id: 4, nome: "Ana Paula Costa", status: "ATIVO", dataRegistro: "17/01/2026", vulnerabilidades: ["Pessoa Idosa"], regiao: "Salvador" },
  { id: 5, nome: "Roberto Lima Silva", status: "REU_PRESO", dataRegistro: "16/01/2026", vulnerabilidades: ["Transtorno Mental", "Hipossuficiência"], regiao: "Camaçari" },
];

function getStatusStyle(status: string) {
  switch (status) {
    case "REU_PRESO":
      return { bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-400", label: "RÉU PRESO" };
    case "ATIVO":
      return { bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-400", label: "ATIVO" };
    default:
      return { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400", label: "INATIVO" };
  }
}

export default function AssistidosDashboardPage() {
  const { config } = useAssignment();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 mb-5 border-b-2 border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div 
            className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
            }}
          >
            <Users className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Assistidos</h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Gestão completa de assistidos da Defensoria
            </p>
          </div>
        </div>
        <Link href="/admin/assistidos/novo">
          <Button className="gap-2 shadow-md">
            <UserPlus className="h-4 w-4" />
            Novo Assistido
          </Button>
        </Link>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <SwissCard className="border-l-[3px] border-l-purple-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{mockAssistidosStats.total}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Total de Assistidos</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-emerald-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600">{mockAssistidosStats.ativos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Assistidos Ativos</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-red-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">{mockAssistidosStats.presos}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Réus Presos</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-blue-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{mockAssistidosStats.novosEsteMes}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Novos Este Mês</p>
          </SwissCardContent>
        </SwissCard>

        <SwissCard className="border-l-[3px] border-l-orange-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{mockAssistidosStats.atendimentosPendentes}</p>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">Atend. Pendentes</p>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Gráficos de Análise */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vulnerabilidades */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Distribuição de Vulnerabilidades
            </SwissCardTitle>
            <SwissCardDescription>
              Perfil de vulnerabilidades dos assistidos
            </SwissCardDescription>
          </SwissCardHeader>
          <SwissCardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockVulnerabilidades}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockVulnerabilidades.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(240, 6%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {mockVulnerabilidades.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </SwissCardContent>
        </SwissCard>

        {/* Distribuição Regional */}
        <SwissCard className="border-2 border-border/60">
          <SwissCardHeader>
            <SwissCardTitle className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              Distribuição por Região
            </SwissCardTitle>
            <SwissCardDescription>
              Localização geográfica dos assistidos
            </SwissCardDescription>
          </SwissCardHeader>
          <SwissCardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRegioes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                  <XAxis dataKey="regiao" stroke="hsl(240, 4%, 46%)" fontSize={12} />
                  <YAxis stroke="hsl(240, 4%, 46%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid hsl(240, 6%, 88%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="quantidade" fill={config.accentColor} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Atividade ao Longo do Tempo */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            Atividade nos Últimos 6 Meses
          </SwissCardTitle>
          <SwissCardDescription>
            Novos assistidos e atendimentos realizados
          </SwissCardDescription>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockAtividades}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 6%, 88%)" />
                <XAxis dataKey="mes" stroke="hsl(240, 4%, 46%)" />
                <YAxis stroke="hsl(240, 4%, 46%)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid hsl(240, 6%, 88%)",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="novos" stroke="hsl(210, 60%, 55%)" strokeWidth={2} name="Novos Assistidos" />
                <Line type="monotone" dataKey="atendidos" stroke={config.accentColor} strokeWidth={2} name="Atendimentos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Novos Assistidos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.accentColor }} />
              <span className="text-sm text-muted-foreground">Atendimentos</span>
            </div>
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Assistidos Recentes */}
      <SwissCard className="border-2 border-border/60">
        <SwissCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <SwissCardTitle className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                Assistidos Recentes
              </SwissCardTitle>
              <SwissCardDescription>
                Últimos cadastros no sistema
              </SwissCardDescription>
            </div>
            <Link href="/admin/assistidos">
              <Button variant="ghost" size="sm">
                Ver Todos
              </Button>
            </Link>
          </div>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="space-y-3">
            {mockRecentes.map((assistido) => {
              const style = getStatusStyle(assistido.status);
              return (
                <Link key={assistido.id} href={`/admin/assistidos/${assistido.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-base">{assistido.nome}</p>
                        <Badge variant="outline" className={`text-xs font-bold ${style.text}`}>
                          {style.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {assistido.dataRegistro}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {assistido.regiao}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {assistido.vulnerabilidades.map((vuln, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {vuln}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SwissCardContent>
      </SwissCard>

      {/* Ações Rápidas */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Link href="/admin/assistidos">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-semibold">Ver Todos</span>
          </Button>
        </Link>
        <Link href="/admin/assistidos/novo">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <UserPlus className="h-5 w-5" />
            <span className="text-sm font-semibold">Novo Cadastro</span>
          </Button>
        </Link>
        <Link href="/admin/atendimentos">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <Phone className="h-5 w-5" />
            <span className="text-sm font-semibold">Atendimentos</span>
          </Button>
        </Link>
        <Link href="/admin/relatorios">
          <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl border-2">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-semibold">Relatórios</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
