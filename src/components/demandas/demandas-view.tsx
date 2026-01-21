"use client";

import { useState, useMemo } from "react";
import { 
  AlertCircle, CheckCircle2, Clock, Send, Archive, 
  Lock, MoreHorizontal, FileText, Calendar, Search,
  Grid3x3, List, Columns3, Plus, Download, Upload,
  Filter, ArrowUpDown, Eye, Edit, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SwissCard } from "@/components/ui/swiss-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- CONFIGURAÇÃO DE STATUS (Lógica Gamificada) ---
const STATUS_CONFIG: Record<string, {
  label: string;
  rowColor: string;
  badgeColor: string;
  icon: React.ElementType;
  order: number;
}> = {
  "urgente": { 
    label: "URGENTE", 
    rowColor: "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500", 
    badgeColor: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800", 
    icon: AlertCircle,
    order: 1
  },
  "protocolar": { 
    label: "PROTOCOLAR", 
    rowColor: "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500", 
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800", 
    icon: Send,
    order: 2
  },
  "a_fazer": { 
    label: "A FAZER", 
    rowColor: "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500", 
    badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800", 
    icon: FileText,
    order: 3
  },
  "monitorar": { 
    label: "MONITORAR", 
    rowColor: "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500", 
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800", 
    icon: Clock,
    order: 4
  },
  "fila": { 
    label: "FILA", 
    rowColor: "bg-purple-50 dark:bg-purple-950/20 border-l-4 border-l-purple-500", 
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800", 
    icon: Archive,
    order: 5
  },
  "concluido": { 
    label: "CONCLUÍDO", 
    rowColor: "bg-stone-100 dark:bg-zinc-900 border-l-4 border-l-stone-300", 
    badgeColor: "bg-stone-100 text-stone-500 border-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700", 
    icon: CheckCircle2,
    order: 6
  },
};

// Dados de Exemplo
const MOCK_DEMANDAS = [
  { 
    id: 1, 
    status: "urgente", 
    preso: true, 
    data: "12/01/2026", 
    assistido: "Carlos Alberto Silva", 
    autos: "0004567-89.2024.8.05.0000", 
    ato: "Habeas Corpus", 
    providencia: "Liminar indeferida. Preparar recurso ordinário com urgência." 
  },
  { 
    id: 2, 
    status: "protocolar", 
    preso: false, 
    data: "10/01/2026", 
    assistido: "Maria de Lourdes", 
    autos: "8001234-56.2023.8.05.0000", 
    ato: "Alegações Finais", 
    providencia: "Peça pronta no drive. Falta apenas protocolar." 
  },
  { 
    id: 3, 
    status: "a_fazer", 
    preso: true, 
    data: "14/01/2026", 
    assistido: "José Santos", 
    autos: "0009999-11.2024.8.05.0000", 
    ato: "Resposta à Acusação", 
    providencia: "Verificar vídeos da audiência de custódia." 
  },
  { 
    id: 4, 
    status: "concluido", 
    preso: false, 
    data: "05/01/2026", 
    assistido: "Ana Paula Souza", 
    autos: "1234567-00.2022.8.05.0000", 
    ato: "Relaxamento", 
    providencia: "Alvará expedido." 
  },
  { 
    id: 5, 
    status: "monitorar", 
    preso: false, 
    data: "18/01/2026", 
    assistido: "Pedro Oliveira", 
    autos: "5555555-22.2024.8.05.0000", 
    ato: "Recurso em Sentido Estrito", 
    providencia: "Aguardando julgamento no TJ." 
  },
  { 
    id: 6, 
    status: "fila", 
    preso: false, 
    data: "20/01/2026", 
    assistido: "Mariana Costa", 
    autos: "7777777-33.2024.8.05.0000", 
    ato: "Contestação", 
    providencia: "Aguardando documentos do cliente." 
  },
];

type ViewMode = "lista" | "grid" | "kanban";

// --- COMPONENTE: LISTA VIEW ---
function DemandasLista({ demandas, onEdit }: { demandas: typeof MOCK_DEMANDAS; onEdit: (id: number) => void }) {
  return (
    <SwissCard className="divide-y divide-stone-100 dark:divide-zinc-800">
      {/* Cabeçalho */}
      <div className="grid grid-cols-12 gap-4 p-3 bg-stone-50/80 dark:bg-zinc-900/50 text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider border-b border-stone-100 dark:border-zinc-800">
        <div className="col-span-2">Status</div>
        <div className="col-span-4">Assistido / Autos</div>
        <div className="col-span-2">Ato / Prazo</div>
        <div className="col-span-3">Providências</div>
        <div className="col-span-1 text-right">Ações</div>
      </div>

      {/* Linhas */}
      {demandas.map((item) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG["a_fazer"];
        const StatusIcon = config.icon;

        return (
          <div 
            key={item.id} 
            className={cn(
              "group grid grid-cols-12 gap-4 p-3 items-center hover:bg-stone-50 dark:hover:bg-zinc-900/50 transition-colors duration-200 text-sm",
              config.rowColor
            )}
          >
            {/* 1. Status + Data */}
            <div className="col-span-2 flex flex-col gap-1.5 items-start">
              <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] font-bold shadow-none rounded-md", config.badgeColor)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono flex items-center gap-1 pl-1">
                <Calendar className="w-3 h-3" /> {item.data}
              </span>
            </div>

            {/* 2. Assistido + Cadeado + Autos */}
            <div className="col-span-4 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold text-stone-800 dark:text-stone-200 truncate",
                  item.status === "concluido" && "line-through text-stone-400"
                )}>
                  {item.assistido}
                </span>
                {/* Ícone de Cadeado */}
                {item.preso && (
                  <div className="flex items-center justify-center w-5 h-5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 shrink-0" title="Réu Preso">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
              <span className="text-xs text-stone-500 dark:text-zinc-400 font-mono mt-0.5 select-all hover:text-stone-900 dark:hover:text-zinc-200 transition-colors cursor-pointer">
                {item.autos}
              </span>
            </div>

            {/* 3. Ato */}
            <div className="col-span-2 text-stone-700 dark:text-stone-300 font-medium leading-snug">
              {item.ato}
            </div>

            {/* 4. Providências */}
            <div className="col-span-3 text-stone-500 dark:text-zinc-400 text-xs leading-relaxed line-clamp-2">
              {item.providencia}
            </div>

            {/* 5. Ações */}
            <div className="col-span-1 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-900 dark:hover:text-zinc-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(item.id)}>
                    <Edit className="w-4 h-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </SwissCard>
  );
}

// --- COMPONENTE: GRID VIEW ---
function DemandasGrid({ demandas, onEdit }: { demandas: typeof MOCK_DEMANDAS; onEdit: (id: number) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {demandas.map((item) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG["a_fazer"];
        const StatusIcon = config.icon;

        return (
          <SwissCard 
            key={item.id} 
            className={cn(
              "p-4 hover:shadow-lg transition-all duration-200 border-l-4",
              item.status === "urgente" && "border-l-red-500",
              item.status === "protocolar" && "border-l-orange-500",
              item.status === "a_fazer" && "border-l-yellow-500",
              item.status === "monitorar" && "border-l-blue-500",
              item.status === "fila" && "border-l-purple-500",
              item.status === "concluido" && "border-l-stone-300 opacity-75"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className={cn("text-[10px] font-bold", config.badgeColor)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {item.preso && (
                <div className="flex items-center justify-center w-5 h-5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Assistido */}
            <h3 className={cn(
              "font-serif font-semibold text-lg text-stone-900 dark:text-stone-100 mb-2",
              item.status === "concluido" && "line-through text-stone-400"
            )}>
              {item.assistido}
            </h3>

            {/* Ato */}
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              {item.ato}
            </p>

            {/* Providências */}
            <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed mb-3 line-clamp-3">
              {item.providencia}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-zinc-800">
              <span className="text-xs text-stone-400 dark:text-zinc-500 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {item.data}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onEdit(item.id)}
                className="h-7 text-xs"
              >
                <Edit className="w-3 h-3 mr-1" /> Editar
              </Button>
            </div>

            {/* Autos (pequeno) */}
            <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono mt-2 truncate">
              {item.autos}
            </p>
          </SwissCard>
        );
      })}
    </div>
  );
}

// --- COMPONENTE: KANBAN VIEW ---
function DemandasKanban({ demandas, onEdit }: { demandas: typeof MOCK_DEMANDAS; onEdit: (id: number) => void }) {
  const columns = useMemo(() => {
    const grouped: Record<string, typeof MOCK_DEMANDAS> = {};
    Object.keys(STATUS_CONFIG).forEach(status => {
      grouped[status] = demandas.filter(d => d.status === status);
    });
    return grouped;
  }, [demandas]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(STATUS_CONFIG).map(([status, config]) => {
        const StatusIcon = config.icon;
        const items = columns[status] || [];

        return (
          <div key={status} className="flex-shrink-0 w-80">
            {/* Column Header */}
            <div className={cn(
              "p-3 rounded-t-xl border-b-4",
              status === "urgente" && "border-b-red-500 bg-red-50 dark:bg-red-950/20",
              status === "protocolar" && "border-b-orange-500 bg-orange-50 dark:bg-orange-950/20",
              status === "a_fazer" && "border-b-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
              status === "monitorar" && "border-b-blue-500 bg-blue-50 dark:bg-blue-950/20",
              status === "fila" && "border-b-purple-500 bg-purple-50 dark:bg-purple-950/20",
              status === "concluido" && "border-b-stone-300 bg-stone-100 dark:bg-zinc-900"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    {config.label}
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {items.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div className="space-y-3 p-3 bg-stone-50/50 dark:bg-zinc-900/50 rounded-b-xl min-h-[400px]">
              {items.map((item) => (
                <SwissCard 
                  key={item.id} 
                  className="p-3 hover:shadow-md transition-shadow cursor-move"
                >
                  {/* Assistido */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={cn(
                      "font-serif font-semibold text-sm text-stone-900 dark:text-stone-100",
                      status === "concluido" && "line-through text-stone-400"
                    )}>
                      {item.assistido}
                    </h4>
                    {item.preso && (
                      <div className="flex items-center justify-center w-4 h-4 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Ato */}
                  <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
                    {item.ato}
                  </p>

                  {/* Providências */}
                  <p className="text-xs text-stone-500 dark:text-zinc-400 line-clamp-2 mb-2">
                    {item.providencia}
                  </p>

                  {/* Data */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
                    <span className="text-xs text-stone-400 dark:text-zinc-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.data}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(item.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                </SwissCard>
              ))}

              {items.length === 0 && (
                <div className="flex items-center justify-center h-32 text-stone-400 dark:text-zinc-500 text-sm">
                  Nenhuma demanda
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export function DemandasView() {
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filtrar e ordenar
  const filteredDemandas = useMemo(() => {
    let result = [...MOCK_DEMANDAS];

    // Filtro de texto
    if (filter) {
      result = result.filter(d => 
        d.assistido.toLowerCase().includes(filter.toLowerCase()) ||
        d.ato.toLowerCase().includes(filter.toLowerCase()) ||
        d.autos.includes(filter)
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      result = result.filter(d => d.status === statusFilter);
    }

    // Ordenar por ordem de prioridade
    result.sort((a, b) => {
      const orderA = STATUS_CONFIG[a.status]?.order || 999;
      const orderB = STATUS_CONFIG[b.status]?.order || 999;
      return orderA - orderB;
    });

    return result;
  }, [filter, statusFilter]);

  const handleEdit = (id: number) => {
    console.log("Editar demanda:", id);
    // Implementar navegação ou modal
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Busca */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400 dark:text-zinc-500" />
          <Input 
            placeholder="Filtrar por nome, autos ou ato..." 
            className="pl-9 bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botões de Ação */}
          <Button variant="outline" size="sm" className="text-stone-600 dark:text-zinc-400 border-stone-200 dark:border-zinc-800">
            <Upload className="w-4 h-4 mr-2" /> Importar
          </Button>
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Demanda
          </Button>
        </div>
      </div>

      {/* Seletor de Visualização */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800">
            <TabsTrigger value="lista" className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800">
              <List className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="grid" className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="kanban" className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800">
              <Columns3 className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
          </TabsList>

          <div className="text-sm text-stone-500 dark:text-zinc-400">
            {filteredDemandas.length} demanda{filteredDemandas.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        <TabsContent value="lista" className="mt-0">
          <DemandasLista demandas={filteredDemandas} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="grid" className="mt-0">
          <DemandasGrid demandas={filteredDemandas} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="kanban" className="mt-0">
          <DemandasKanban demandas={filteredDemandas} onEdit={handleEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
