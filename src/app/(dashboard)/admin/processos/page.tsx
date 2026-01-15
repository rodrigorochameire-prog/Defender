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
  Scale, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  FileText,
  Gavel,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Dados mockados
const mockProcessos = [
  { 
    id: 1, 
    numeroAutos: "8012906-74.2025.8.05.0039",
    assistido: "Diego Bonfim Almeida",
    assistidoId: 1,
    comarca: "Candeias",
    vara: "1ª Vara Criminal",
    area: "JURI",
    classeProcessual: "Ação Penal",
    assunto: "Homicídio Qualificado (Art. 121, §2º, CP)",
    situacao: "ativo",
    isJuri: true,
    demandasAbertas: 2,
  },
  { 
    id: 2, 
    numeroAutos: "0001234-56.2025.8.05.0039",
    assistido: "Maria Silva Santos",
    assistidoId: 2,
    comarca: "Candeias",
    vara: "2ª Vara Criminal",
    area: "JURI",
    classeProcessual: "Ação Penal",
    assunto: "Homicídio Simples (Art. 121, CP)",
    situacao: "ativo",
    isJuri: true,
    demandasAbertas: 1,
  },
  { 
    id: 3, 
    numeroAutos: "0005678-90.2025.8.05.0039",
    assistido: "José Carlos Oliveira",
    assistidoId: 3,
    comarca: "Dias D'Ávila",
    vara: "Vara de Execuções Penais",
    area: "EXECUCAO_PENAL",
    classeProcessual: "Execução Penal",
    assunto: "Progressão de Regime",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 3,
  },
  { 
    id: 4, 
    numeroAutos: "0009012-34.2025.8.05.0039",
    assistido: "Ana Paula Costa",
    assistidoId: 4,
    comarca: "Candeias",
    vara: "Juizado de Violência Doméstica",
    area: "VIOLENCIA_DOMESTICA",
    classeProcessual: "Medida Protetiva",
    assunto: "Violência Doméstica (Lei Maria da Penha)",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 1,
  },
  { 
    id: 5, 
    numeroAutos: "0003456-78.2025.8.05.0039",
    assistido: "Roberto Ferreira Lima",
    assistidoId: 5,
    comarca: "Candeias",
    vara: "1ª Vara Criminal",
    area: "SUBSTITUICAO",
    classeProcessual: "Ação Penal",
    assunto: "Tráfico de Drogas (Art. 33, Lei 11.343)",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 1,
  },
];

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

function getSituacaoBadge(situacao: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline", label: string }> = {
    ativo: { variant: "default", label: "Ativo" },
    suspenso: { variant: "secondary", label: "Suspenso" },
    arquivado: { variant: "outline", label: "Arquivado" },
    baixado: { variant: "outline", label: "Baixado" },
  };
  const config = configs[situacao] || { variant: "secondary", label: situacao };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function ProcessosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [situacaoFilter, setSituacaoFilter] = useState("ativo");

  const filteredProcessos = mockProcessos.filter((processo) => {
    const matchesSearch = 
      processo.numeroAutos.includes(searchTerm) ||
      processo.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.assunto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === "all" || processo.area === areaFilter;
    const matchesSituacao = situacaoFilter === "all" || processo.situacao === situacaoFilter;
    return matchesSearch && matchesArea && matchesSituacao;
  });

  const stats = {
    total: mockProcessos.length,
    juri: mockProcessos.filter(p => p.isJuri).length,
    comDemandas: mockProcessos.filter(p => p.demandasAbertas > 0).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Processos</h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de processos judiciais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/processos/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Processo
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Processos do Júri</CardTitle>
            <Gavel className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.juri}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Demandas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.comDemandas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comarcas</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(mockProcessos.map(p => p.comarca)).size}
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
                placeholder="Buscar por número, assistido ou assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
            <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="suspenso">Suspensos</SelectItem>
                <SelectItem value="arquivado">Arquivados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número dos Autos</TableHead>
                <TableHead>Assistido</TableHead>
                <TableHead>Comarca / Vara</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="text-center">Demandas</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProcessos.map((processo) => (
                <TableRow key={processo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{processo.numeroAutos}</span>
                      {processo.isJuri && (
                        <Gavel className="h-4 w-4 text-purple-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/assistidos/${processo.assistidoId}`} className="hover:underline font-medium">
                      {processo.assistido}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{processo.comarca}</p>
                      <p className="text-xs text-muted-foreground">{processo.vara}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getAreaBadge(processo.area)}</TableCell>
                  <TableCell>
                    <p className="text-sm max-w-[250px] truncate" title={processo.assunto}>
                      {processo.assunto}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={processo.demandasAbertas > 0 ? "default" : "secondary"}>
                      {processo.demandasAbertas}
                    </Badge>
                  </TableCell>
                  <TableCell>{getSituacaoBadge(processo.situacao)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/processos/${processo.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/processos/${processo.id}/editar`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/demandas?processo=${processo.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <FileText className="h-4 w-4 mr-2" />
                            Ver Demandas
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="cursor-pointer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Consultar no TJ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredProcessos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Scale className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum processo encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
