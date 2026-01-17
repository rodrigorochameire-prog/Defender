"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  TrendingUp,
  TrendingDown,
  Minus,
  GripVertical,
  ArrowUpRight,
  BarChart3,
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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

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

// Dados mockados de jurados
const mockJurados = [
  { id: 1, nome: "Maria das Graças Silva", profissao: "Professora", idade: 45, bairro: "Centro", totalSessoes: 12, votosCondenacao: 5, votosAbsolvicao: 6, votosDesclassificacao: 1, perfilTendencia: "neutro" },
  { id: 2, nome: "José Carlos Oliveira", profissao: "Comerciante", idade: 52, bairro: "Vila Nova", totalSessoes: 8, votosCondenacao: 6, votosAbsolvicao: 2, votosDesclassificacao: 0, perfilTendencia: "condenatorio" },
  { id: 3, nome: "Ana Paula Santos", profissao: "Enfermeira", idade: 38, bairro: "Jardim", totalSessoes: 15, votosCondenacao: 4, votosAbsolvicao: 10, votosDesclassificacao: 1, perfilTendencia: "absolutorio" },
  { id: 4, nome: "Pedro Henrique Costa", profissao: "Contador", idade: 41, bairro: "Centro", totalSessoes: 6, votosCondenacao: 3, votosAbsolvicao: 3, votosDesclassificacao: 0, perfilTendencia: "neutro" },
  { id: 5, nome: "Fernanda Lima Souza", profissao: "Advogada", idade: 35, bairro: "Alto", totalSessoes: 10, votosCondenacao: 3, votosAbsolvicao: 7, votosDesclassificacao: 0, perfilTendencia: "absolutorio" },
  { id: 6, nome: "Roberto Almeida", profissao: "Empresário", idade: 58, bairro: "Industrial", totalSessoes: 20, votosCondenacao: 14, votosAbsolvicao: 5, votosDesclassificacao: 1, perfilTendencia: "condenatorio" },
  { id: 7, nome: "Carla Beatriz Moura", profissao: "Psicóloga", idade: 42, bairro: "Centro", totalSessoes: 9, votosCondenacao: 2, votosAbsolvicao: 7, votosDesclassificacao: 0, perfilTendencia: "absolutorio" },
  { id: 8, nome: "Marcos Antonio Reis", profissao: "Engenheiro", idade: 47, bairro: "Boa Vista", totalSessoes: 5, votosCondenacao: 2, votosAbsolvicao: 2, votosDesclassificacao: 1, perfilTendencia: "neutro" },
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

function getTendenciaIcon(tendencia: string) {
  switch (tendencia) {
    case "condenatorio":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "absolutorio":
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    default:
      return <Minus className="h-4 w-4 text-zinc-400" />;
  }
}

function getTendenciaBadge(tendencia: string) {
  const configs: Record<string, { label: string; className: string }> = {
    condenatorio: { label: "Condenatório", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    absolutorio: { label: "Absolutório", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    neutro: { label: "Neutro", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
    desconhecido: { label: "Desconhecido", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" },
  };
  const config = configs[tendencia] || configs.desconhecido;
  return <Badge className={config.className}>{config.label}</Badge>;
}

function JurorProfileChart({ jurado }: { jurado: typeof mockJurados[0] }) {
  const data = [
    { name: "Condenação", value: jurado.votosCondenacao, fill: "hsl(0, 65%, 45%)" },
    { name: "Absolvição", value: jurado.votosAbsolvicao, fill: "hsl(158, 64%, 28%)" },
    { name: "Desclassificação", value: jurado.votosDesclassificacao, fill: "hsl(240, 4%, 46%)" },
  ];
  
  return (
    <div className="h-[100px] w-[100px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={25}
            outerRadius={45}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Componente do Cockpit de Plenário
function CockpitPlenario() {
  const [conselho, setConselho] = useState<(typeof mockJurados[0] | null)[]>(
    Array(7).fill(null)
  );
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [anotacoes, setAnotacoes] = useState<Record<number, string>>({});

  const handleDropJurado = (jurado: typeof mockJurados[0], position: number) => {
    const newConselho = [...conselho];
    newConselho[position] = jurado;
    setConselho(newConselho);
  };

  const handleRemoveJurado = (position: number) => {
    const newConselho = [...conselho];
    newConselho[position] = null;
    setConselho(newConselho);
  };

  return (
    <div className="space-y-6">
      {/* Mapa Visual do Conselho */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Composição do Conselho
          </CardTitle>
          <CardDescription>Arraste jurados para organizar o conselho de sentença</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Layout do Tribunal */}
          <div className="relative max-w-2xl mx-auto">
            {/* Juiz (topo) */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                <Gavel className="h-8 w-8 text-white dark:text-zinc-900" />
              </div>
            </div>
            
            {/* Conselho de Sentença (7 assentos) */}
            <div className="flex justify-center gap-4 flex-wrap">
              {conselho.map((jurado, index) => (
                <div
                  key={index}
                  className={`jury-seat ${
                    jurado
                      ? jurado.perfilTendencia === "absolutorio"
                        ? "favorable"
                        : jurado.perfilTendencia === "condenatorio"
                        ? "unfavorable"
                        : "neutral"
                      : ""
                  }`}
                  onClick={() => setSelectedPosition(index)}
                >
                  {jurado ? (
                    <div className="text-center">
                      <span className="jury-seat-number">{index + 1}</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-zinc-400">{index + 1}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Legenda */}
            <div className="flex justify-center gap-6 mt-8 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Absolutório</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Condenatório</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-400" />
                <span className="text-muted-foreground">Neutro</span>
              </div>
            </div>
          </div>

          {/* Lista de Jurados Sorteados */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <h4 className="text-sm font-semibold mb-4">Jurados no Conselho</h4>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {conselho.map((jurado, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    jurado ? "bg-card" : "bg-muted/30 border-dashed"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    jurado
                      ? jurado.perfilTendencia === "absolutorio"
                        ? "bg-emerald-100 text-emerald-700"
                        : jurado.perfilTendencia === "condenatorio"
                        ? "bg-red-100 text-red-700"
                        : "bg-zinc-100 text-zinc-700"
                      : "bg-zinc-100 text-zinc-400"
                  }`}>
                    {index + 1}
                  </div>
                  {jurado ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{jurado.nome}</p>
                      <p className="text-xs text-muted-foreground">{jurado.profissao}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Vazio</p>
                  )}
                  {jurado && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveJurado(index)}
                    >
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anotações Rápidas */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <CardTitle className="text-base">Anotações do Plenário</CardTitle>
          <CardDescription>Registre observações durante os debates</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            placeholder="Digite suas anotações sobre o plenário..."
            className="min-h-[120px]"
          />
          <div className="flex justify-end mt-3">
            <Button size="sm">Salvar Anotações</Button>
          </div>
        </CardContent>
      </Card>

      {/* Selecionar Jurados */}
      <Card className="section-card">
        <CardHeader className="pb-4 border-b border-border/30">
          <CardTitle className="text-base">Adicionar ao Conselho</CardTitle>
          <CardDescription>Clique em um jurado para adicionar à posição selecionada</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2 md:grid-cols-2">
            {mockJurados.slice(0, 8).map((jurado) => {
              const isInConselho = conselho.some(j => j?.id === jurado.id);
              return (
                <div
                  key={jurado.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isInConselho
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    if (!isInConselho && selectedPosition !== null) {
                      handleDropJurado(jurado, selectedPosition);
                      setSelectedPosition(null);
                    }
                  }}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{jurado.nome}</p>
                    <p className="text-xs text-muted-foreground">{jurado.profissao}</p>
                  </div>
                  {getTendenciaIcon(jurado.perfilTendencia)}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JuriPage() {
  const [activeTab, setActiveTab] = useState("sessoes");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [juradoSearch, setJuradoSearch] = useState("");
  const [tendenciaFilter, setTendenciaFilter] = useState("all");

  const filteredSessoes = mockSessoesJuri.filter((sessao) => {
    const matchesSearch = 
      sessao.assistidoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sessao.processo.includes(searchTerm) ||
      sessao.assunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sessao.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(a.dataSessao).getTime() - new Date(b.dataSessao).getTime());

  const filteredJurados = mockJurados.filter((jurado) => {
    const matchesSearch = jurado.nome.toLowerCase().includes(juradoSearch.toLowerCase()) ||
      jurado.profissao.toLowerCase().includes(juradoSearch.toLowerCase());
    const matchesTendencia = tendenciaFilter === "all" || jurado.perfilTendencia === tendenciaFilter;
    return matchesSearch && matchesTendencia;
  });

  const stats = {
    total: mockSessoesJuri.length,
    agendadas: mockSessoesJuri.filter(s => s.status === "agendada").length,
    absolvicoes: mockSessoesJuri.filter(s => s.resultado === "absolvicao").length,
    condenacoes: mockSessoesJuri.filter(s => s.resultado === "condenacao").length,
    totalJurados: mockJurados.length,
    juradosAbsolutorios: mockJurados.filter(j => j.perfilTendencia === "absolutorio").length,
  };

  const proximasSessoes = mockSessoesJuri
    .filter(s => s.status === "agendada" && isFuture(parseISO(s.dataSessao)))
    .slice(0, 3);

  return (
    <div className="space-y-6">
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
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalJurados}</p>
                <p className="text-sm font-medium mt-1">Jurados Cadastrados</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="sessoes" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sessões
          </TabsTrigger>
          <TabsTrigger value="jurados" className="gap-2">
            <Users className="h-4 w-4" />
            Banco de Jurados
          </TabsTrigger>
          <TabsTrigger value="cockpit" className="gap-2">
            <Gavel className="h-4 w-4" />
            Cockpit de Plenário
          </TabsTrigger>
        </TabsList>

        {/* Tab: Sessões */}
        <TabsContent value="sessoes" className="space-y-6">
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
        </TabsContent>

        {/* Tab: Banco de Jurados */}
        <TabsContent value="jurados" className="space-y-6">
          <Card className="section-card">
            <CardHeader className="pb-4 border-b border-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Banco de Jurados
                  </CardTitle>
                  <CardDescription>Análise de perfil e tendência de votação</CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Jurado
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou profissão..."
                    value={juradoSearch}
                    onChange={(e) => setJuradoSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={tendenciaFilter} onValueChange={setTendenciaFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tendência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="absolutorio">Absolutório</SelectItem>
                    <SelectItem value="condenatorio">Condenatório</SelectItem>
                    <SelectItem value="neutro">Neutro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grid de Jurados */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredJurados.map((jurado) => (
                  <Card key={jurado.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Gráfico de Perfil */}
                        <JurorProfileChart jurado={jurado} />
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm">{jurado.nome}</h4>
                              <p className="text-xs text-muted-foreground">{jurado.profissao}, {jurado.idade} anos</p>
                              <p className="text-xs text-muted-foreground">{jurado.bairro}</p>
                            </div>
                            {getTendenciaBadge(jurado.perfilTendencia)}
                          </div>
                          
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                            <div className="p-2 rounded bg-muted/50">
                              <p className="text-lg font-bold">{jurado.totalSessoes}</p>
                              <p className="text-[10px] text-muted-foreground">Sessões</p>
                            </div>
                            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20">
                              <p className="text-lg font-bold text-emerald-600">{jurado.votosAbsolvicao}</p>
                              <p className="text-[10px] text-muted-foreground">Absolvição</p>
                            </div>
                            <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
                              <p className="text-lg font-bold text-red-600">{jurado.votosCondenacao}</p>
                              <p className="text-[10px] text-muted-foreground">Condenação</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cockpit de Plenário */}
        <TabsContent value="cockpit">
          <CockpitPlenario />
        </TabsContent>
      </Tabs>
    </div>
  );
}
