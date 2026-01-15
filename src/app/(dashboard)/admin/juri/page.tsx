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
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, isFuture, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados
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
  { 
    id: 5, 
    dataSessao: "2026-01-05T09:00:00",
    assistidoNome: "Pedro Henrique Costa",
    processo: "0003456-78.2024.8.05.0039",
    defensorNome: "Dr. Rodrigo",
    sala: "Plenário 1",
    status: "adiada",
    resultado: null,
    assunto: "Feminicídio Tentado",
    observacoes: "Redesignado por ausência de testemunha",
  },
  { 
    id: 6, 
    dataSessao: "2026-01-22T09:00:00",
    assistidoNome: "Antonio Carlos Oliveira",
    processo: "0007890-12.2025.8.05.0039",
    defensorNome: "Dr. Rodrigo",
    sala: "Plenário 1",
    status: "agendada",
    resultado: null,
    assunto: "Homicídio Qualificado",
  },
];

function getStatusBadge(status: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string }> = {
    agendada: { variant: "default", label: "Agendada", className: "bg-blue-600" },
    realizada: { variant: "secondary", label: "Realizada", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    adiada: { variant: "outline", label: "Adiada", className: "border-orange-300 text-orange-700" },
    cancelada: { variant: "destructive", label: "Cancelada" },
  };
  const config = configs[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

function getResultadoBadge(resultado: string | null) {
  if (!resultado) return null;
  
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string, icon: any }> = {
    absolvicao: { variant: "default", label: "Absolvição", className: "bg-green-600", icon: CheckCircle2 },
    condenacao: { variant: "destructive", label: "Condenação", icon: XCircle },
    desclassificacao: { variant: "secondary", label: "Desclassificação", icon: AlertTriangle },
    nulidade: { variant: "outline", label: "Nulidade", icon: AlertTriangle },
    redesignado: { variant: "outline", label: "Redesignado", className: "border-orange-300 text-orange-700", icon: Calendar },
  };
  
  const config = configs[resultado] || { variant: "secondary", label: resultado, icon: null };
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className || ""}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

export default function JuriPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [defensorFilter, setDefensorFilter] = useState("all");

  const filteredSessoes = mockSessoesJuri.filter((sessao) => {
    const matchesSearch = 
      sessao.assistidoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sessao.processo.includes(searchTerm) ||
      sessao.assunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sessao.status === statusFilter;
    const matchesDefensor = defensorFilter === "all" || sessao.defensorNome.includes(defensorFilter);
    return matchesSearch && matchesStatus && matchesDefensor;
  }).sort((a, b) => new Date(a.dataSessao).getTime() - new Date(b.dataSessao).getTime());

  const stats = {
    total: mockSessoesJuri.length,
    agendadas: mockSessoesJuri.filter(s => s.status === "agendada").length,
    realizadas: mockSessoesJuri.filter(s => s.status === "realizada").length,
    absolvicoes: mockSessoesJuri.filter(s => s.resultado === "absolvicao").length,
  };

  // Próximas sessões
  const proximasSessoes = mockSessoesJuri
    .filter(s => s.status === "agendada" && isFuture(parseISO(s.dataSessao)))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tribunal do Júri</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de sessões do plenário
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.agendadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realizadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.realizadas}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Absolvições</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.absolvicoes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Sessões */}
      {proximasSessoes.length > 0 && (
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gavel className="h-5 w-5 text-purple-500" />
              Próximas Sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {proximasSessoes.map((sessao) => (
                <Card key={sessao.id} className="bg-purple-50/50 dark:bg-purple-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-center bg-purple-100 dark:bg-purple-900/50 rounded-lg px-3 py-2">
                        <p className="text-lg font-bold text-purple-600">
                          {format(parseISO(sessao.dataSessao), "dd/MM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-purple-500">
                          {format(parseISO(sessao.dataSessao), "HH:mm")}
                        </p>
                      </div>
                      <Badge variant="outline">{sessao.sala}</Badge>
                    </div>
                    <h4 className="font-medium">{sessao.assistidoNome}</h4>
                    <p className="text-sm text-muted-foreground">{sessao.assunto}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {sessao.defensorNome}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por réu, processo ou assunto..."
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
                <SelectItem value="cancelada">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={defensorFilter} onValueChange={setDefensorFilter}>
              <SelectTrigger className="w-[150px]">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Defensor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Rodrigo">Dr. Rodrigo</SelectItem>
                <SelectItem value="Juliane">Dra. Juliane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Réu</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead>Sala</TableHead>
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
                  <TableCell className="font-mono text-sm">{sessao.processo}</TableCell>
                  <TableCell>{sessao.assunto}</TableCell>
                  <TableCell>{sessao.defensorNome}</TableCell>
                  <TableCell>{sessao.sala}</TableCell>
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
                        <Link href={`/admin/juri/${sessao.id}/editar`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        {sessao.status === "realizada" && !sessao.resultado && (
                          <DropdownMenuItem className="cursor-pointer">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Registrar Resultado
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSessoes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma sessão encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
