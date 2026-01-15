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
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Timer,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { differenceInDays, parseISO, isToday, isTomorrow, isPast } from "date-fns";

// Dados mockados
const mockDemandas = [
  { 
    id: 1, 
    assistido: "Diego Bonfim",
    processo: "8012906-74.2025",
    ato: "Resposta à Acusação",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 2, 
    assistido: "Maria Silva",
    processo: "0001234-56.2025",
    ato: "Alegações Finais",
    prazo: "2026-01-16",
    status: "5_FILA",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 3, 
    assistido: "José Carlos",
    processo: "0005678-90.2025",
    ato: "Agravo em Execução",
    prazo: "2026-01-18",
    status: "4_MONITORAR",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
  },
  { 
    id: 4, 
    assistido: "Ana Paula",
    processo: "0009012-34.2025",
    ato: "Pedido de Relaxamento",
    prazo: "2026-01-14",
    status: "2_ATENDER",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
  },
  { 
    id: 5, 
    assistido: "Roberto Ferreira",
    processo: "0003456-78.2025",
    ato: "Memoriais",
    prazo: "2026-01-20",
    status: "7_PROTOCOLADO",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 6, 
    assistido: "Carlos Eduardo",
    processo: "0007890-12.2025",
    ato: "Revisão Criminal",
    prazo: "2026-01-25",
    status: "5_FILA",
    area: "SUBSTITUICAO",
    reuPreso: false,
  },
  { 
    id: 7, 
    assistido: "Pedro Santos",
    processo: "0002345-67.2025",
    ato: "Contrarrazões",
    prazo: "2026-01-17",
    status: "5_FILA",
    area: "EXECUCAO_PENAL",
    reuPreso: false,
  },
  { 
    id: 8, 
    assistido: "Lucas Oliveira",
    processo: "0008901-23.2025",
    ato: "Habeas Corpus",
    prazo: "2026-01-15",
    status: "2_ATENDER",
    area: "JURI",
    reuPreso: true,
  },
];

const columns = [
  { id: "2_ATENDER", title: "Atender", color: "bg-red-500", icon: AlertTriangle },
  { id: "5_FILA", title: "Em Fila", color: "bg-slate-500", icon: Clock },
  { id: "4_MONITORAR", title: "Monitorar", color: "bg-yellow-500", icon: Eye },
  { id: "7_PROTOCOLADO", title: "Protocolado", color: "bg-green-500", icon: CheckCircle2 },
];

function getAreaColor(area: string) {
  const colors: Record<string, string> = {
    JURI: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
    EXECUCAO_PENAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    VIOLENCIA_DOMESTICA: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200",
    SUBSTITUICAO: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    CURADORIA: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  };
  return colors[area] || "bg-slate-100 text-slate-800";
}

function getAreaLabel(area: string) {
  const labels: Record<string, string> = {
    JURI: "Júri",
    EXECUCAO_PENAL: "EP",
    VIOLENCIA_DOMESTICA: "VD",
    SUBSTITUICAO: "Sub",
    CURADORIA: "Cur",
  };
  return labels[area] || area;
}

function getPrazoInfo(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { text: `Vencido`, className: "text-red-600 bg-red-100 dark:bg-red-900/50", urgent: true };
  }
  if (isToday(prazo)) {
    return { text: "HOJE", className: "text-red-600 bg-red-100 dark:bg-red-900/50 font-bold", urgent: true };
  }
  if (isTomorrow(prazo)) {
    return { text: "Amanhã", className: "text-orange-600 bg-orange-100 dark:bg-orange-900/50", urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, className: "text-orange-500 bg-orange-50 dark:bg-orange-900/30", urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, className: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30", urgent: false };
  }
  return { text: `${dias}d`, className: "text-muted-foreground bg-slate-50 dark:bg-slate-800", urgent: false };
}

interface KanbanCardProps {
  demanda: typeof mockDemandas[0];
}

function KanbanCard({ demanda }: KanbanCardProps) {
  const prazoInfo = getPrazoInfo(demanda.prazo);
  
  return (
    <Card className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${demanda.reuPreso ? "ring-2 ring-red-500/50" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className={`text-xs px-2 py-0.5 rounded-full ${prazoInfo.className}`}>
              {prazoInfo.text}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/admin/demandas/${demanda.id}`}>
                <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
              </Link>
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-green-600">
                Marcar Protocolado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {demanda.reuPreso && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">RÉU PRESO</Badge>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded ${getAreaColor(demanda.area)}`}>
              {getAreaLabel(demanda.area)}
            </span>
          </div>
          
          <p className="font-medium text-sm leading-tight">{demanda.ato}</p>
          
          <div className="pt-1 border-t">
            <p className="text-sm text-muted-foreground">{demanda.assistido}</p>
            <p className="text-xs text-muted-foreground font-mono">{demanda.processo}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KanbanPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");

  const filteredDemandas = mockDemandas.filter((demanda) => {
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

  return (
    <div className="space-y-6 h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground mt-1">
            Visualização em quadro das demandas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/demandas/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Demanda
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
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
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
        {columns.map((column) => {
          const columnDemandas = getColumnDemandas(column.id);
          const Icon = column.icon;
          
          return (
            <div key={column.id} className="flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold">{column.title}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {columnDemandas.length}
                </Badge>
              </div>
              
              <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 rounded-lg p-2 min-h-[400px]">
                {columnDemandas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma demanda</p>
                  </div>
                ) : (
                  columnDemandas.map((demanda) => (
                    <KanbanCard key={demanda.id} demanda={demanda} />
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
