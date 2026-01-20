"use client";

import { useState } from "react";
import Link from "next/link";
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
  ArrowLeft,
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  FileText,
  BarChart3,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data
const mockAvaliacoes = [
  {
    id: 1,
    sessaoId: 1,
    dataJulgamento: "2026-01-17",
    observador: "Mariana Silva",
    reu: "Roberto Silva Nascimento",
    status: "em_andamento",
    progresso: 45,
  },
  {
    id: 2,
    sessaoId: 3,
    dataJulgamento: "2026-01-10",
    observador: "Ana Paula",
    reu: "Carlos Eduardo Lima",
    status: "concluida",
    progresso: 100,
  },
  {
    id: 3,
    sessaoId: 4,
    dataJulgamento: "2026-01-08",
    observador: "Mariana Silva",
    reu: "José Ferreira Santos",
    status: "concluida",
    progresso: 100,
  },
];

const mockSessoesDisponiveis = [
  {
    id: 1,
    dataJulgamento: "2026-01-17",
    reu: "Roberto Silva Nascimento",
    temAvaliacao: true,
  },
  {
    id: 2,
    dataJulgamento: "2026-01-19",
    reu: "Marcos Paulo Souza",
    temAvaliacao: false,
  },
  {
    id: 3,
    dataJulgamento: "2026-01-10",
    reu: "Carlos Eduardo Lima",
    temAvaliacao: true,
  },
];

function getStatusBadge(status: string) {
  const configs: Record<string, { label: string; className: string }> = {
    em_andamento: { 
      label: "Em Andamento", 
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" 
    },
    concluida: { 
      label: "Concluída", 
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" 
    },
    rascunho: { 
      label: "Rascunho", 
      className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200" 
    },
  };
  const config = configs[status] || { label: status, className: "bg-slate-100" };
  return <Badge className={config.className}>{config.label}</Badge>;
}

export default function AvaliacoesListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAvaliacoes = mockAvaliacoes.filter((avaliacao) => {
    const matchesSearch = 
      avaliacao.reu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      avaliacao.observador.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || avaliacao.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockAvaliacoes.length,
    emAndamento: mockAvaliacoes.filter(a => a.status === "em_andamento").length,
    concluidas: mockAvaliacoes.filter(a => a.status === "concluida").length,
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Avaliações do Júri</h1>
            <p className="text-sm text-muted-foreground">
              Formulários de observação comportamental dos jurados
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm font-medium mt-1">Total de Avaliações</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.emAndamento}</p>
                <p className="text-sm font-medium mt-1">Em Andamento</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.concluidas}</p>
                <p className="text-sm font-medium mt-1">Concluídas</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Iniciar Nova Avaliação */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-purple-600" />
            Iniciar Nova Avaliação
          </CardTitle>
          <CardDescription>
            Selecione uma sessão do júri para iniciar o formulário de observação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mockSessoesDisponiveis.map((sessao) => (
              <Link 
                key={sessao.id} 
                href={`/admin/juri/avaliacao/${sessao.id}`}
              >
                <div className={`rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${
                  sessao.temAvaliacao 
                    ? "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20" 
                    : "border-muted hover:border-purple-300"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-lg px-3 py-1.5">
                      <p className="text-sm font-bold text-purple-600">
                        {format(new Date(sessao.dataJulgamento), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                    {sessao.temAvaliacao ? (
                      <Badge className="bg-purple-500 text-white text-xs">
                        <Edit className="h-3 w-3 mr-0.5" />
                        Continuar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Plus className="h-3 w-3 mr-0.5" />
                        Nova
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm">{sessao.reu}</p>
                  <p className="text-xs text-muted-foreground mt-1">Sessão #{sessao.id}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader className="pb-4 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por réu ou observador..."
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
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="rascunho">Rascunhos</SelectItem>
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
                <TableHead>Observador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvaliacoes.map((avaliacao) => (
                <TableRow key={avaliacao.id}>
                  <TableCell>
                    <div className="font-medium">
                      {format(new Date(avaliacao.dataJulgamento), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{avaliacao.reu}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {avaliacao.observador}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(avaliacao.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            avaliacao.progresso === 100 
                              ? "bg-emerald-500" 
                              : "bg-purple-500"
                          }`}
                          style={{ width: `${avaliacao.progresso}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{avaliacao.progresso}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/juri/avaliacao/${avaliacao.sessaoId}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver/Editar
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="cursor-pointer">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Relatório
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

      {/* Aprendizado e Insights */}
      <Card className="border-purple-200/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            Aprendizado e Insights
          </CardTitle>
          <CardDescription>
            Dados consolidados das avaliações para aprimorar a estratégia de defesa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/jurados">
              <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm">Banco de Jurados</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Histórico e tendências de votação dos jurados observados
                </p>
              </div>
            </Link>
            <Link href="/admin/juri/historico">
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-sm">Resultados</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comparativo entre previsões e resultados reais
                </p>
              </div>
            </Link>
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-sm">Personagens do Júri</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Perfis de juízes e promotores com estratégias recomendadas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
