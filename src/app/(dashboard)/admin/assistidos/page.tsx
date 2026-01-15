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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertOctagon,
  Phone,
  Scale,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

// Dados mockados
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida", 
    cpf: "123.456.789-00",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria (Mãe)",
    processosAtivos: 2,
    demandasAbertas: 3,
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos", 
    cpf: "987.654.321-00",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    telefone: "(71) 97777-4321",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 1,
    demandasAbertas: 1,
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira", 
    cpf: "456.789.123-00",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana (Esposa)",
    processosAtivos: 3,
    demandasAbertas: 5,
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa", 
    cpf: "321.654.987-00",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro (Irmão)",
    processosAtivos: 1,
    demandasAbertas: 2,
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima", 
    cpf: "654.321.987-00",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    telefone: "(71) 93333-3333",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 2,
    demandasAbertas: 1,
  },
];

function getStatusPrisionalBadge(status: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string, className?: string }> = {
    CADEIA_PUBLICA: { variant: "destructive", label: "Cadeia Pública" },
    PENITENCIARIA: { variant: "destructive", label: "Penitenciária" },
    COP: { variant: "destructive", label: "COP" },
    HOSPITAL_CUSTODIA: { variant: "destructive", label: "Hosp. Custódia" },
    SOLTO: { variant: "secondary", label: "Solto", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    DOMICILIAR: { variant: "outline", label: "Domiciliar", className: "border-orange-300 text-orange-700" },
    MONITORADO: { variant: "outline", label: "Monitorado", className: "border-yellow-300 text-yellow-700" },
  };
  const config = configs[status] || { variant: "secondary", label: status };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

export default function AssistidosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredAssistidos = mockAssistidos.filter((assistido) => {
    const matchesSearch = assistido.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          assistido.cpf.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || assistido.statusPrisional === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const presosCount = mockAssistidos.filter(a => 
    ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistidos</h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de assistidos da Defensoria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/assistidos/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Assistido
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAssistidos.length}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Presos</CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{presosCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Ativos</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockAssistidos.reduce((acc, a) => acc + a.processosAtivos, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas Abertas</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockAssistidos.reduce((acc, a) => acc + a.demandasAbertas, 0)}
            </div>
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
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status Prisional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CADEIA_PUBLICA">Cadeia Pública</SelectItem>
                <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
                <SelectItem value="COP">COP</SelectItem>
                <SelectItem value="HOSPITAL_CUSTODIA">Hosp. Custódia</SelectItem>
                <SelectItem value="DOMICILIAR">Domiciliar</SelectItem>
                <SelectItem value="MONITORADO">Monitorado</SelectItem>
                <SelectItem value="SOLTO">Solto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assistido</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status Prisional</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-center">Processos</TableHead>
                <TableHead className="text-center">Demandas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssistidos.map((assistido) => (
                <TableRow key={assistido.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(assistido.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{assistido.nome}</p>
                        {assistido.unidadePrisional && (
                          <p className="text-xs text-muted-foreground">{assistido.unidadePrisional}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{assistido.cpf}</TableCell>
                  <TableCell>{getStatusPrisionalBadge(assistido.statusPrisional)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {assistido.telefone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {assistido.telefone}
                        </div>
                      )}
                      {assistido.nomeContato && (
                        <p className="text-xs text-muted-foreground">{assistido.nomeContato}: {assistido.telefoneContato}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{assistido.processosAtivos}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={assistido.demandasAbertas > 2 ? "default" : "secondary"}>
                      {assistido.demandasAbertas}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/assistidos/${assistido.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/processos?assistido=${assistido.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Scale className="h-4 w-4 mr-2" />
                            Ver Processos
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAssistidos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum assistido encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
