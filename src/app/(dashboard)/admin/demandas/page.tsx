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
  FileText, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados
const mockDemandas = [
  { 
    id: 1, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "manifestacao",
    prazo: "2026-01-15",
    dataEntrada: "2026-01-10",
    status: "2_ATENDER",
    prioridade: "REU_PRESO",
    providencias: "Requerer diligências, verificar câmeras de segurança",
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 2, 
    assistido: "Maria Silva Santos",
    processo: "0001234-56.2025.8.05.0039",
    ato: "Alegações Finais",
    tipoAto: "manifestacao",
    prazo: "2026-01-16",
    dataEntrada: "2026-01-08",
    status: "5_FILA",
    prioridade: "ALTA",
    providencias: "Analisar provas, preparar tese de absolvição",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 3, 
    assistido: "José Carlos Oliveira",
    processo: "0005678-90.2025.8.05.0039",
    ato: "Agravo em Execução",
    tipoAto: "recurso",
    prazo: "2026-01-18",
    dataEntrada: "2026-01-05",
    status: "4_MONITORAR",
    prioridade: "NORMAL",
    providencias: "Aguardando decisão do agravo",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
  },
  { 
    id: 4, 
    assistido: "Ana Paula Costa",
    processo: "0009012-34.2025.8.05.0039",
    ato: "Pedido de Relaxamento",
    tipoAto: "peticao",
    prazo: "2026-01-14",
    dataEntrada: "2026-01-12",
    status: "2_ATENDER",
    prioridade: "URGENTE",
    providencias: "Prisão ilegal, prazo expirado",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
  },
  { 
    id: 5, 
    assistido: "Roberto Ferreira Lima",
    processo: "0003456-78.2025.8.05.0039",
    ato: "Memoriais",
    tipoAto: "manifestacao",
    prazo: "2026-01-20",
    dataEntrada: "2026-01-10",
    status: "7_PROTOCOLADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 6, 
    assistido: "Carlos Eduardo Silva",
    processo: "0007890-12.2025.8.05.0039",
    ato: "Revisão Criminal",
    tipoAto: "recurso",
    prazo: "2026-01-25",
    dataEntrada: "2026-01-02",
    status: "5_FILA",
    prioridade: "NORMAL",
    providencias: "Estudar processo, identificar erros processuais",
    area: "SUBSTITUICAO",
    reuPreso: false,
  },
];

function getStatusBadge(status: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string }> = {
    "2_ATENDER": { variant: "destructive", label: "Atender" },
    "4_MONITORAR": { variant: "outline", label: "Monitorar", className: "border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400" },
    "5_FILA": { variant: "secondary", label: "Em Fila" },
    "7_PROTOCOLADO": { variant: "default", label: "Protocolado", className: "bg-green-600 hover:bg-green-700" },
    "7_CIENCIA": { variant: "outline", label: "Ciência", className: "border-green-300 text-green-700" },
    "7_SEM_ATUACAO": { variant: "outline", label: "Sem Atuação" },
    "URGENTE": { variant: "destructive", label: "URGENTE" },
    "CONCLUIDO": { variant: "secondary", label: "Concluído", className: "bg-slate-200" },
    "ARQUIVADO": { variant: "outline", label: "Arquivado" },
  };
  const config = configs[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

function getPrioridadeBadge(prioridade: string, reuPreso: boolean) {
  if (reuPreso) {
    return <Badge variant="destructive" className="bg-red-700">RÉU PRESO</Badge>;
  }
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string }> = {
    URGENTE: { variant: "destructive", label: "URGENTE" },
    ALTA: { variant: "default", label: "Alta" },
    NORMAL: { variant: "secondary", label: "Normal" },
    BAIXA: { variant: "outline", label: "Baixa" },
  };
  const config = configs[prioridade] || { variant: "secondary", label: prioridade };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getAreaBadge(area: string) {
  const configs: Record<string, { label: string, className: string }> = {
    JURI: { label: "Júri", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    EXECUCAO_PENAL: { label: "Exec. Penal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    VIOLENCIA_DOMESTICA: { label: "Viol. Dom.", className: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
    SUBSTITUICAO: { label: "Substituição", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    CURADORIA: { label: "Curadoria", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
    FAMILIA: { label: "Família", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    CIVEL: { label: "Cível", className: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
    FAZENDA_PUBLICA: { label: "Fazenda Púb.", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  };
  const config = configs[area] || { label: area, className: "" };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function getPrazoDisplay(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { text: `Vencido há ${Math.abs(dias)} dia(s)`, className: "text-red-600 font-bold", icon: AlertTriangle };
  }
  if (isToday(prazo)) {
    return { text: "HOJE", className: "text-red-600 font-bold", icon: Timer };
  }
  if (isTomorrow(prazo)) {
    return { text: "Amanhã", className: "text-orange-600 font-semibold", icon: Clock };
  }
  if (dias <= 3) {
    return { text: `Em ${dias} dias`, className: "text-orange-500", icon: Clock };
  }
  if (dias <= 7) {
    return { text: `Em ${dias} dias`, className: "text-yellow-600", icon: Calendar };
  }
  return { text: format(prazo, "dd/MM/yyyy", { locale: ptBR }), className: "text-muted-foreground", icon: Calendar };
}

export default function DemandasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");

  const filteredDemandas = mockDemandas.filter((demanda) => {
    const matchesSearch = 
      demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demanda.processo.includes(searchTerm) ||
      demanda.ato.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || demanda.status === statusFilter;
    const matchesArea = areaFilter === "all" || demanda.area === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

  // Ordenar por prioridade e prazo
  const sortedDemandas = [...filteredDemandas].sort((a, b) => {
    // Réu preso primeiro
    if (a.reuPreso && !b.reuPreso) return -1;
    if (!a.reuPreso && b.reuPreso) return 1;
    // Depois por prazo
    return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
  });

  const stats = {
    total: mockDemandas.length,
    atender: mockDemandas.filter(d => d.status === "2_ATENDER").length,
    fila: mockDemandas.filter(d => d.status === "5_FILA").length,
    protocolado: mockDemandas.filter(d => d.status === "7_PROTOCOLADO").length,
    reuPreso: mockDemandas.filter(d => d.reuPreso).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demandas</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de prazos e atos processuais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/demandas/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Demanda
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Atender</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atender}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Fila</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fila}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Protocolado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.protocolado}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Réu Preso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.reuPreso}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assistido, processo ou ato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="2_ATENDER">Atender</SelectItem>
                <SelectItem value="4_MONITORAR">Monitorar</SelectItem>
                <SelectItem value="5_FILA">Em Fila</SelectItem>
                <SelectItem value="7_PROTOCOLADO">Protocolado</SelectItem>
                <SelectItem value="7_CIENCIA">Ciência</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                <SelectItem value="JURI">Júri</SelectItem>
                <SelectItem value="EXECUCAO_PENAL">Execução Penal</SelectItem>
                <SelectItem value="VIOLENCIA_DOMESTICA">Violência Doméstica</SelectItem>
                <SelectItem value="SUBSTITUICAO">Substituição</SelectItem>
                <SelectItem value="CURADORIA">Curadoria</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prazo</TableHead>
                <TableHead>Assistido / Processo</TableHead>
                <TableHead>Ato</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDemandas.map((demanda) => {
                const prazoInfo = getPrazoDisplay(demanda.prazo);
                const PrazoIcon = prazoInfo.icon;
                return (
                  <TableRow key={demanda.id} className={demanda.reuPreso ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${prazoInfo.className}`}>
                        <PrazoIcon className="h-4 w-4" />
                        <span>{prazoInfo.text}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{demanda.assistido}</p>
                        <p className="text-xs text-muted-foreground font-mono">{demanda.processo}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{demanda.ato}</p>
                        {demanda.providencias && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{demanda.providencias}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getAreaBadge(demanda.area)}</TableCell>
                    <TableCell>{getStatusBadge(demanda.status)}</TableCell>
                    <TableCell>{getPrioridadeBadge(demanda.prioridade, demanda.reuPreso)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/admin/demandas/${demanda.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/admin/demandas/${demanda.id}/editar`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem className="cursor-pointer text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Marcar Protocolado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {sortedDemandas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma demanda encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
