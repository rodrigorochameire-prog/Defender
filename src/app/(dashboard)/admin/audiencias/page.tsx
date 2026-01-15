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
  Briefcase, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Calendar,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, parseISO, isToday, isTomorrow, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados
const mockAudiencias = [
  { 
    id: 1, 
    dataAudiencia: "2026-01-15T09:00:00",
    tipo: "instrucao",
    processo: "8012906-74.2025.8.05.0039",
    assistido: "Diego Bonfim Almeida",
    local: "1ª Vara Criminal - Sala 2",
    defensor: "Dr. Rodrigo",
    status: "agendada",
  },
  { 
    id: 2, 
    dataAudiencia: "2026-01-15T14:00:00",
    tipo: "custodia",
    processo: "0001234-56.2025.8.05.0039",
    assistido: "Maria Silva Santos",
    local: "CEAC - Sala de Audiências",
    defensor: "Dra. Juliane",
    status: "agendada",
  },
  { 
    id: 3, 
    dataAudiencia: "2026-01-16T10:00:00",
    tipo: "conciliacao",
    processo: "0005678-90.2025.8.05.0039",
    assistido: "José Carlos Oliveira",
    local: "Juizado Especial Criminal",
    defensor: "Dr. Rodrigo",
    status: "agendada",
  },
  { 
    id: 4, 
    dataAudiencia: "2026-01-14T09:00:00",
    tipo: "instrucao",
    processo: "0009012-34.2025.8.05.0039",
    assistido: "Ana Paula Costa",
    local: "Juizado de Violência Doméstica",
    defensor: "Dra. Juliane",
    status: "realizada",
    resultado: "Testemunhas ouvidas, conclusos para sentença",
  },
];

function getTipoBadge(tipo: string) {
  const configs: Record<string, { label: string, className: string }> = {
    instrucao: { label: "Instrução", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    custodia: { label: "Custódia", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    conciliacao: { label: "Conciliação", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    justificacao: { label: "Justificação", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
    admonicao: { label: "Admonição", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  };
  const config = configs[tipo] || { label: tipo, className: "" };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function getStatusBadge(status: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string }> = {
    agendada: { variant: "default", label: "Agendada" },
    realizada: { variant: "secondary", label: "Realizada" },
    adiada: { variant: "outline", label: "Adiada" },
    cancelada: { variant: "destructive", label: "Cancelada" },
  };
  const config = configs[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function AudienciasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("agendada");

  const filteredAudiencias = mockAudiencias.filter((audiencia) => {
    const matchesSearch = 
      audiencia.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audiencia.processo.includes(searchTerm);
    const matchesTipo = tipoFilter === "all" || audiencia.tipo === tipoFilter;
    const matchesStatus = statusFilter === "all" || audiencia.status === statusFilter;
    return matchesSearch && matchesTipo && matchesStatus;
  }).sort((a, b) => new Date(a.dataAudiencia).getTime() - new Date(b.dataAudiencia).getTime());

  const stats = {
    total: mockAudiencias.length,
    hoje: mockAudiencias.filter(a => isToday(parseISO(a.dataAudiencia))).length,
    proximas: mockAudiencias.filter(a => a.status === "agendada" && isFuture(parseISO(a.dataAudiencia))).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audiências</h1>
          <p className="text-muted-foreground mt-1">
            Gestão de audiências processuais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/audiencias/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Audiência
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className={stats.hoje > 0 ? "border-blue-200 dark:border-blue-900" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.hoje}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proximas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters e Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assistido ou processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="instrucao">Instrução</SelectItem>
                <SelectItem value="custodia">Custódia</SelectItem>
                <SelectItem value="conciliacao">Conciliação</SelectItem>
                <SelectItem value="justificacao">Justificação</SelectItem>
                <SelectItem value="admonicao">Admonição</SelectItem>
              </SelectContent>
            </Select>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Assistido</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Defensor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudiencias.map((audiencia) => (
                <TableRow key={audiencia.id}>
                  <TableCell>
                    <div>
                      <div className={`font-medium ${isToday(parseISO(audiencia.dataAudiencia)) ? "text-blue-600" : ""}`}>
                        {format(parseISO(audiencia.dataAudiencia), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(audiencia.dataAudiencia), "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTipoBadge(audiencia.tipo)}</TableCell>
                  <TableCell className="font-medium">{audiencia.assistido}</TableCell>
                  <TableCell className="font-mono text-sm">{audiencia.processo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {audiencia.local}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <User className="h-3 w-3" />
                      {audiencia.defensor}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(audiencia.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/audiencias/${audiencia.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/audiencias/${audiencia.id}/editar`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAudiencias.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhuma audiência encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
