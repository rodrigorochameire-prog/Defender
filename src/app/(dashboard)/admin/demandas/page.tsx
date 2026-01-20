"use client";

import { useState, useMemo } from "react";
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
  Plus,
  ArrowDownAZ,
  ArrowUpAZ,
  ListFilter
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
  status: string; // Ex: "7_PROTOCOLADO", "2_ATENDER", "5_FILA", "CONCLUIDO"
  responsavel?: string;
  prioridade: "NORMAL" | "URGENTE" | "ALTA" | "FATAL";
  reuPreso: boolean;
  dataEntrada: string;
}

// Ordem de prioridade personalizada para o sort
const STATUS_ORDER: Record<string, number> = {
  "1_URGENTE": 1,
  "2_ATENDER": 3,
  "3_ELABORAR": 3,
  "4_MONITORAR": 4,
  "COM_ESTAGIARIO": 4,
  "5_FILA": 5,
  "7_PROTOCOLADO": 2, // Usuário quer protocolar antes dos amarelos (atender), mas depois de urgências? Ou urgências inclui tudo crítico.
                      // O usuário disse: "primeiro urgências, depois protocolar, depois amarelos, depois azuis, fila, concluídos"
                      // Vou ajustar os pesos com base nisso.
  "CONCLUIDO": 6,
  "ARQUIVADO": 6
};

// Ajuste fino baseado no pedido do usuário:
// 1. Urgências (Flag de prioridade/réu preso/vencendo) - Tratado via lógica de sort combinada
// 2. Protocolar (7_PROTOCOLADO) -> Peso 2
// 3. Amarelos (2_ATENDER, ELABORAR) -> Peso 3
// 4. Azuis (4_MONITORAR, COM_ESTAGIARIO) -> Peso 4
// 5. Fila (5_FILA) -> Peso 5
// 6. Concluídos -> Peso 6

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
    status: "2_ATENDER",
    responsavel: "Dr. Rodrigo",
    prioridade: "URGENTE",
    reuPreso: true,
    dataEntrada: "2026-01-10",
  },
  {
    id: 2,
    processo: "0001234-56.2025.8.05.0039",
    assistido: "Maria Silva Santos",
    tipo: "Alegações Finais",
    prazo: "2026-01-22",
    status: "7_PROTOCOLADO", // Protocolar
    responsavel: "Dra. Ana",
    prioridade: "ALTA",
    reuPreso: false,
    dataEntrada: "2026-01-12",
  },
  {
    id: 3,
    processo: "0005678-90.2025.8.05.0039",
    assistido: "José Carlos Oliveira",
    tipo: "Recurso de Apelação",
    prazo: "2026-01-25",
    status: "5_FILA",
    responsavel: "Dr. Rodrigo",
    prioridade: "NORMAL",
    reuPreso: false,
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
    reuPreso: false,
    dataEntrada: "2026-01-05",
  },
  {
    id: 5,
    processo: "8005555-11.2025.8.05.0039",
    assistido: "Carlos Eduardo",
    tipo: "Relaxamento de Prisão",
    prazo: "2026-01-18",
    status: "2_ATENDER",
    responsavel: "Dr. Rodrigo",
    prioridade: "FATAL",
    reuPreso: true,
    dataEntrada: "2026-01-14",
  }
];

// ==========================================
// UTILS
// ==========================================

function getStatusBadge(status: string) {
  switch (status) {
    case "2_ATENDER":
    case "3_ELABORAR":
      return <Badge variant="warning" className="font-normal text-[10px]">Atender</Badge>;
    case "7_PROTOCOLADO":
      return <Badge variant="info" className="font-normal text-[10px] bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200">Protocolar</Badge>; // Azul/Ciano para protocolar
    case "4_MONITORAR":
    case "COM_ESTAGIARIO":
      return <Badge variant="info" className="font-normal text-[10px]">Monitorar</Badge>;
    case "5_FILA":
      return <Badge variant="secondary" className="font-normal text-[10px]">Fila</Badge>;
    case "CONCLUIDO":
      return <Badge variant="success" className="font-normal text-[10px]">Concluído</Badge>;
    default:
      return <Badge variant="secondary" className="font-normal text-[10px]">{status}</Badge>;
  }
}

function getPrioridadeBadge(prioridade: string, reuPreso: boolean) {
  if (reuPreso) {
    return <Badge variant="reuPreso" className="text-[10px]">Réu Preso</Badge>;
  }
  switch (prioridade) {
    case "FATAL":
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

type SortOption = "smart" | "date_asc" | "date_desc" | "name_asc" | "status_asc";

export default function DemandasPage() {
  const [filterStatus, setFilterStatus] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("smart");

  // Lógica de Ordenação Inteligente
  const sortDemandas = (a: Demanda, b: Demanda) => {
    if (sortOption === "date_asc") return a.prazo.localeCompare(b.prazo);
    if (sortOption === "date_desc") return b.prazo.localeCompare(a.prazo);
    if (sortOption === "name_asc") return a.assistido.localeCompare(b.assistido);
    
    // SMART SORT (Padrão solicitado)
    // 1. Urgências (Prioridade alta/fatal ou Réu Preso)
    const isAUrgent = a.prioridade === "FATAL" || a.prioridade === "URGENTE" || a.reuPreso;
    const isBUrgent = b.prioridade === "FATAL" || b.prioridade === "URGENTE" || b.reuPreso;
    
    if (isAUrgent && !isBUrgent) return -1;
    if (!isAUrgent && isBUrgent) return 1;
    
    // Se ambos são urgentes ou ambos não são, desempata pelo Status Group
    const weightA = STATUS_ORDER[a.status] || 99;
    const weightB = STATUS_ORDER[b.status] || 99;
    
    if (weightA !== weightB) return weightA - weightB;
    
    // Se mesmo status, desempata pelo prazo (mais próximo primeiro)
    return a.prazo.localeCompare(b.prazo);
  };

  const filteredDemandas = mockDemandas
    .filter((demanda) => {
      const matchesStatus = filterStatus === "todos" || demanda.status === filterStatus;
      const matchesSearch = 
        demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demanda.processo.includes(searchTerm) ||
        demanda.tipo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort(sortDemandas);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Demandas</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de prazos com priorização inteligente.
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

        {/* Filtros e Controles */}
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
            {/* Sort Dropdown Melhorado */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-[180px] justify-between">
                  <span className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4" />
                    {sortOption === "smart" && "Prioridade Inteligente"}
                    {sortOption === "date_asc" && "Prazo (Mais próximo)"}
                    {sortOption === "date_desc" && "Prazo (Mais distante)"}
                    {sortOption === "name_asc" && "Assistido (A-Z)"}
                  </span>
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => setSortOption("smart")}>
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                  Prioridade (Padrão)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date_asc")}>
                  <Clock className="w-4 h-4 mr-2" />
                  Prazo: Próximo primeiro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("date_desc")}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Prazo: Distante primeiro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption("name_asc")}>
                  <User className="w-4 h-4 mr-2" />
                  Assistido: A-Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="2_ATENDER">Atender</SelectItem>
                <SelectItem value="7_PROTOCOLADO">Protocolar</SelectItem>
                <SelectItem value="4_MONITORAR">Monitorar</SelectItem>
                <SelectItem value="5_FILA">Fila</SelectItem>
                <SelectItem value="CONCLUIDO">Concluídos</SelectItem>
              </SelectContent>
            </Select>
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
                        <span className="font-medium text-foreground text-sm">{demanda.assistido}</span>
                        <span className="text-[11px] text-muted-foreground font-mono mt-0.5">{demanda.processo}</span>
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">{demanda.tipo}</span>
                        {getPrioridadeBadge(demanda.prioridade, demanda.reuPreso)}
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className={cn(
                        "flex items-center gap-1.5 text-sm font-medium",
                        isAtrasado ? "text-destructive" : isHoje ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseISO(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}
                        {isAtrasado && <AlertTriangle className="w-3.5 h-3.5" />}
                      </div>
                    </SwissTableCell>
                    <SwissTableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
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
