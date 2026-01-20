"use client";

import { useState } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
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
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  Target,
  ArrowRight,
  FileText,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInDays, parseISO, isToday, isTomorrow, isPast, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados
const mockDemandas = [
  { 
    id: 1, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 2, 
    assistido: "Maria Silva Santos",
    processo: "0001234-56.2025.8.05.0039",
    ato: "Alegações Finais",
    prazo: "2026-01-16",
    status: "ELABORANDO",
    area: "JURI",
    reuPreso: false,
    defensor: "Dra. Juliane",
  },
  { 
    id: 3, 
    assistido: "José Carlos Oliveira",
    processo: "0005678-90.2025.8.05.0039",
    ato: "Agravo em Execução",
    prazo: "2026-01-18",
    status: "REVISAO",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 4, 
    assistido: "Ana Paula Costa",
    processo: "0009012-34.2025.8.05.0039",
    ato: "Pedido de Relaxamento",
    prazo: "2026-01-14",
    status: "2_ATENDER",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
    defensor: "Dra. Juliane",
  },
  { 
    id: 5, 
    assistido: "Roberto Ferreira Lima",
    processo: "0003456-78.2025.8.05.0039",
    ato: "Memoriais",
    prazo: "2026-01-20",
    status: "PROTOCOLADO",
    area: "JURI",
    reuPreso: false,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 6, 
    assistido: "Carlos Eduardo Mendes",
    processo: "0007890-12.2025.8.05.0039",
    ato: "Revisão Criminal",
    prazo: "2026-01-25",
    status: "ELABORANDO",
    area: "SUBSTITUICAO",
    reuPreso: false,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 7, 
    assistido: "Pedro Santos Neto",
    processo: "0002345-67.2025.8.05.0039",
    ato: "Contrarrazões de Apelação",
    prazo: "2026-01-17",
    status: "2_ATENDER",
    area: "EXECUCAO_PENAL",
    reuPreso: false,
    defensor: "Dra. Juliane",
  },
  { 
    id: 8, 
    assistido: "Lucas Oliveira Silva",
    processo: "0008901-23.2025.8.05.0039",
    ato: "Habeas Corpus",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
  },
];

const columns = [
  { id: "2_ATENDER", title: "A Fazer", color: "bg-zinc-400", textColor: "text-zinc-600", count: 0 },
  { id: "ELABORANDO", title: "Minutando", color: "bg-amber-500", textColor: "text-amber-600", count: 0 },
  { id: "REVISAO", title: "Aguard. Assinatura", color: "bg-blue-500", textColor: "text-blue-600", count: 0 },
  { id: "PROTOCOLADO", title: "Protocolado", color: "bg-emerald-500", textColor: "text-emerald-600", count: 0 },
];

function getAreaBadge(area: string) {
  const configs: Record<string, { label: string; className: string }> = {
    JURI: { label: "Júri", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    EXECUCAO_PENAL: { label: "EP", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    VIOLENCIA_DOMESTICA: { label: "VVD", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
    SUBSTITUICAO: { label: "Sub", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    CURADORIA: { label: "Cur", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
    FAMILIA: { label: "Fam", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  };
  const config = configs[area] || { label: area, className: "bg-zinc-100 text-zinc-700" };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.className}`}>{config.label}</span>;
}

function getPrazoInfo(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { 
      text: "Vencido", 
      className: "text-white bg-red-600", 
      urgent: true,
      dias: dias 
    };
  }
  if (isToday(prazo)) {
    return { 
      text: "HOJE", 
      className: "text-white bg-red-600 font-bold animate-pulse", 
      urgent: true,
      dias: 0 
    };
  }
  if (isTomorrow(prazo)) {
    return { 
      text: "Amanhã", 
      className: "text-white bg-orange-500", 
      urgent: true,
      dias: 1 
    };
  }
  if (dias <= 3) {
    return { 
      text: `${dias}d`, 
      className: "text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400", 
      urgent: false,
      dias 
    };
  }
  if (dias <= 7) {
    return { 
      text: `${dias}d`, 
      className: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400", 
      urgent: false,
      dias 
    };
  }
  return { 
    text: `${dias}d`, 
    className: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400", 
    urgent: false,
    dias 
  };
}

interface KanbanCardProps {
  demanda: typeof mockDemandas[0];
  onMove?: (status: string) => void;
}

function KanbanCard({ demanda, onMove }: KanbanCardProps) {
  const prazoInfo = getPrazoInfo(demanda.prazo);
  
  return (
    <SwissCard className={cn(
      "mb-2 hover:shadow-md transition-shadow",
      demanda.reuPreso && "border-l-[3px] border-l-rose-500"
    )}>
      <SwissCardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prazoInfo.className}`}>
              {prazoInfo.text}
            </span>
            {demanda.reuPreso && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">
                RÉU PRESO
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <Link href={`/admin/demandas/${demanda.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => onMove?.("ELABORANDO")}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para Minutando
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => onMove?.("REVISAO")}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Mover para Revisão
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-emerald-600"
                onClick={() => onMove?.("PROTOCOLADO")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Marcar Protocolado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <p className="font-semibold text-sm leading-tight">{demanda.ato}</p>
          
          <div className="flex items-center gap-1.5">
            {getAreaBadge(demanda.area)}
          </div>
          
          <div className="pt-2 border-t border-border/30">
            <p className="text-sm font-medium text-foreground">{demanda.assistido}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{demanda.processo}</p>
          </div>
          
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">{demanda.defensor}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {format(parseISO(demanda.prazo), "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </SwissCardContent>
    </SwissCard>
  );
}

export default function KanbanPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [demandas, setDemandas] = useState(mockDemandas);

  const filteredDemandas = demandas.filter((demanda) => {
    const matchesSearch = 
      demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demanda.processo.includes(searchTerm) ||
      demanda.ato.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === "all" || demanda.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  const getColumnDemandas = (status: string) => {
    return filteredDemandas
      .filter(d => d.status === status)
      .sort((a, b) => {
        // Réu preso primeiro
        if (a.reuPreso && !b.reuPreso) return -1;
        if (!a.reuPreso && b.reuPreso) return 1;
        // Depois por prazo
        return new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
      });
  };

  const handleMoveDemanda = (demandaId: number, newStatus: string) => {
    setDemandas(prev => 
      prev.map(d => d.id === demandaId ? { ...d, status: newStatus } : d)
    );
  };

  // Contadores
  const stats = columns.map(col => ({
    ...col,
    count: getColumnDemandas(col.id).length
  }));

  const totalUrgentes = filteredDemandas.filter(d => {
    const info = getPrazoInfo(d.prazo);
    return info.urgent;
  }).length;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      {/* Header - Padrão Swiss */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kanban de Prazos</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Gerencie o fluxo de demandas e prazos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="Atualizar" className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/admin/demandas/nova">
            <Button className="gap-2 h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Demanda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats - Padrão Swiss */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        {stats.map((col) => (
          <SwissCard 
            key={col.id}
            className="border-l-[3px]"
            style={{ borderLeftColor: col.color.replace("bg-", "").includes("zinc") ? "#a1a1aa" : 
              col.color.includes("amber") ? "#f59e0b" :
              col.color.includes("blue") ? "#3b82f6" :
              col.color.includes("emerald") ? "#10b981" : "#a1a1aa" }}
          >
            <SwissCardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full", col.color)} />
                <div>
                  <p className="text-lg sm:text-2xl font-bold">{col.count}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">{col.title}</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        ))}
        <SwissCard className="border-l-[3px] border-l-rose-500">
          <SwissCardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold text-rose-600">{totalUrgentes}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Filters - Padrão Swiss */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por assistido, processo ou ato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-9">
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
            <SelectItem value="FAMILIA">Família</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map((column) => {
          const columnDemandas = getColumnDemandas(column.id);
          
          return (
            <div key={column.id} className="kanban-column">
              {/* Column Header */}
              <div className="kanban-column-header">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                  <span className="kanban-column-title">{column.title}</span>
                </div>
                <span className="kanban-column-count">{columnDemandas.length}</span>
              </div>
              
              {/* Column Content */}
              <ScrollArea className="flex-1">
                {columnDemandas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma demanda</p>
                  </div>
                ) : (
                  columnDemandas.map((demanda) => (
                    <KanbanCard 
                      key={demanda.id} 
                      demanda={demanda}
                      onMove={(status) => handleMoveDemanda(demanda.id, status)}
                    />
                  ))
                )}
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
