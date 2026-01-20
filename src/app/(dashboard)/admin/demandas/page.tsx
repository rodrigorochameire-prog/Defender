"use client";

import { useState } from "react";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
} from "@/components/shared/swiss-table";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  ArrowUpDown,
  Download,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

// ==========================================
// TIPOS
// ==========================================

interface Demanda {
  id: number;
  processo: string;
  assistido: string;
  tipo: string;
  prazo: string;
  status: string;
  responsavel?: string;
  prioridade: "NORMAL" | "URGENTE" | "ALTA";
  dataEntrada: string;
}

// ==========================================
// DADOS MOCK
// ==========================================

const mockDemandas: Demanda[] = [
  {
    id: 1,
    processo: "8012906-74.2025.8.05.0039",
    assistido: "Diego Bonfim Almeida",
    tipo: "Resposta à Acusação",
    prazo: "2026-01-20",
    status: "PENDENTE",
    responsavel: "Dr. Rodrigo",
    prioridade: "URGENTE",
    dataEntrada: "2026-01-10",
  },
  {
    id: 2,
    processo: "0001234-56.2025.8.05.0039",
    assistido: "Maria Silva Santos",
    tipo: "Alegações Finais",
    prazo: "2026-01-22",
    status: "EM_ANDAMENTO",
    responsavel: "Dra. Ana",
    prioridade: "ALTA",
    dataEntrada: "2026-01-12",
  },
  {
    id: 3,
    processo: "0005678-90.2025.8.05.0039",
    assistido: "José Carlos Oliveira",
    tipo: "Recurso de Apelação",
    prazo: "2026-01-25",
    status: "PENDENTE",
    responsavel: "Dr. Rodrigo",
    prioridade: "NORMAL",
    dataEntrada: "2026-01-15",
  },
  {
    id: 4,
    processo: "0009999-88.2025.8.05.0039",
    assistido: "Fernanda Costa",
    tipo: "Manifestação Diversa",
    prazo: "2026-01-30",
    status: "CONCLUIDO",
    responsavel: "Dr. Rodrigo",
    prioridade: "NORMAL",
    dataEntrada: "2026-01-05",
  },
];

// ==========================================
// UTILS
// ==========================================

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDENTE":
      return <Badge variant="warning" className="font-normal">Pendente</Badge>;
    case "EM_ANDAMENTO":
      return <Badge variant="info" className="font-normal">Em Andamento</Badge>;
    case "CONCLUIDO":
      return <Badge variant="success" className="font-normal">Concluído</Badge>;
    default:
      return <Badge variant="secondary" className="font-normal">{status}</Badge>;
  }
}

function getPrioridadeBadge(prioridade: string) {
  switch (prioridade) {
    case "URGENTE":
      return <Badge variant="urgent" className="text-[10px]">Urgente</Badge>;
    case "ALTA":
      return <Badge variant="warning" className="text-[10px]">Alta</Badge>;
    default:
      return null;
  }
}

// ==========================================
// PÁGINA
// ==========================================

export default function DemandasPage() {
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDemandas = mockDemandas.filter((demanda) => {
    const matchesStatus = filterStatus === "todos" || demanda.status === filterStatus;
    const matchesSearch = 
      demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demanda.processo.includes(searchTerm) ||
      demanda.tipo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Demandas</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie prazos e tarefas processuais.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Link href="/admin/demandas/nova">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Demanda
              </Button>
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por assistido, processo ou tipo..." 
              className="pl-9 bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="CONCLUIDO">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Tabela Clean */}
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <SwissTable>
            <SwissTableHeader>
              <SwissTableRow>
                <SwissTableHead className="w-[300px]">Assistido / Processo</SwissTableHead>
                <SwissTableHead>Tipo de Demanda</SwissTableHead>
                <SwissTableHead>Prazo</SwissTableHead>
                <SwissTableHead>Responsável</SwissTableHead>
                <SwissTableHead>Status</SwissTableHead>
                <SwissTableHead className="text-right">Ações</SwissTableHead>
              </SwissTableRow>
            </SwissTableHeader>
            <SwissTableBody>
              {filteredDemandas.map((demanda) => {
                const diasRestantes = differenceInDays(parseISO(demanda.prazo), new Date());
                const isAtrasado = diasRestantes < 0;
                const isHoje = diasRestantes === 0;

                return (
                  <SwissTableRow key={demanda.id} className="hover:bg-muted/30">
                    <SwissTableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{demanda.assistido}</span>
                        <span className="text-xs text-muted-foreground font-mono">{demanda.processo}</span>
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{demanda.tipo}</span>
                        {getPrioridadeBadge(demanda.prioridade)}
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        isAtrasado ? "text-destructive" : isHoje ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        <Clock className="w-4 h-4" />
                        {format(parseISO(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}
                        {isAtrasado && <AlertTriangle className="w-4 h-4" />}
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {demanda.responsavel?.charAt(0)}
                        </div>
                        <span className="text-sm text-muted-foreground">{demanda.responsavel}</span>
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      {getStatusBadge(demanda.status)}
                    </SwissTableCell>
                    <SwissTableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SwissTableCell>
                  </SwissTableRow>
                );
              })}
            </SwissTableBody>
          </SwissTable>
        </div>
      </div>
    </TooltipProvider>
  );
}
