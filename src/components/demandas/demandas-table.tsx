"use client";

import { useState } from "react";
import { 
  AlertCircle, CheckCircle2, Clock, Send, Archive, 
  Lock, MoreHorizontal, FileText, Calendar, Search, User, 
  Copy, Eye, ExternalLink, Gavel
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
  SwissTableContainer,
} from "@/components/shared/swiss-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- CONFIGURAÇÃO DE STATUS (A Lógica Gamificada) - MELHORADA ---
const STATUS_MAP: Record<string, any> = {
  "1 - Urgente": { 
    label: "URGENTE", 
    className: "status-badge-urgent",
    icon: AlertCircle,
    priority: 1
  },
  "2 - Elaborar": { 
    label: "A FAZER", 
    className: "status-badge-warning",
    icon: FileText,
    priority: 2
  },
  "3 - Revisar": { 
    label: "REVISAR", 
    className: "status-badge-info",
    icon: Search,
    priority: 3
  },
  "4 - Assinar": { 
    label: "ASSINAR", 
    className: "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/50",
    icon: Send,
    priority: 4
  },
  "5 - Protocolar": { 
    label: "PROTOCOLAR", 
    className: "bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/50",
    icon: Send,
    priority: 5
  },
  "6 - Monitorar": { 
    label: "MONITORAR", 
    className: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50",
    icon: Clock,
    priority: 6
  },
  "7 - Concluido": { 
    label: "CONCLUÍDO", 
    className: "status-badge-neutral line-through decoration-zinc-400 dark:decoration-zinc-600",
    icon: CheckCircle2,
    priority: 7
  },
};

// Dados de Exemplo - EXPANDIDOS
const MOCK_DATA = [
  { 
    id: 1, 
    status: "1 - Urgente", 
    assistidoId: 1,
    assistidoNome: "Carlos Alberto Silva",
    assistidoFoto: null,
    preso: true, 
    data: "2026-01-22",
    prazo: "2026-01-22", 
    autos: "0004567-89.2024.8.05.0000", 
    processoId: 1,
    ato: "Habeas Corpus", 
    tipoAto: "PETICAO",
    providencia: "Liminar indeferida. Preparar recurso ordinário.",
    defensorNome: "Dr. Rodrigo Rocha",
    area: "JURI",
    prioridade: 1
  },
  { 
    id: 2, 
    status: "5 - Protocolar", 
    assistidoId: 2,
    assistidoNome: "Maria de Lourdes Santos",
    assistidoFoto: null,
    preso: false, 
    data: "2026-01-10",
    prazo: "2026-01-28", 
    autos: "8001234-56.2023.8.05.0000", 
    processoId: 2,
    ato: "Alegações Finais", 
    tipoAto: "PETICAO",
    providencia: "Peça pronta no drive. Falta apenas protocolar.",
    defensorNome: "Dra. Maria Oliveira",
    area: "CRIMINAL",
    prioridade: 5
  },
  { 
    id: 3, 
    status: "2 - Elaborar", 
    assistidoId: 3,
    assistidoNome: "José Santos Oliveira",
    assistidoFoto: null,
    preso: true, 
    data: "2026-01-14",
    prazo: "2026-01-25", 
    autos: "0009999-11.2024.8.05.0000", 
    processoId: 3,
    ato: "Resposta à Acusação", 
    tipoAto: "PETICAO",
    providencia: "Verificar vídeos da audiência de custódia. Analisar laudo pericial.",
    defensorNome: "Dr. Rodrigo Rocha",
    area: "JURI",
    prioridade: 2
  },
  { 
    id: 4, 
    status: "7 - Concluido", 
    assistidoId: 4,
    assistidoNome: "Ana Paula Souza",
    assistidoFoto: null,
    preso: false, 
    data: "2026-01-05",
    prazo: null, 
    autos: "1234567-00.2022.8.05.0000", 
    processoId: 4,
    ato: "Pedido de Relaxamento", 
    tipoAto: "PETICAO",
    providencia: "Alvará expedido. Cliente notificada.",
    defensorNome: "Dra. Juliane Costa",
    area: "VVD",
    prioridade: 7
  },
  { 
    id: 5, 
    status: "4 - Assinar", 
    assistidoId: 5,
    assistidoNome: "Roberto Ferreira Lima",
    assistidoFoto: null,
    preso: true, 
    data: "2026-01-18",
    prazo: "2026-01-30", 
    autos: "8002341-90.2025.8.05.0039", 
    processoId: 5,
    ato: "Memoriais Finais", 
    tipoAto: "PETICAO",
    providencia: "Peça revisada e pronta para assinatura do defensor titular.",
    defensorNome: "Dr. Rodrigo Rocha",
    area: "JURI",
    prioridade: 4
  },
  { 
    id: 6, 
    status: "6 - Monitorar", 
    assistidoId: 6,
    assistidoNome: "Carlos Eduardo Mendes",
    assistidoFoto: null,
    preso: true, 
    data: "2026-01-15",
    prazo: null, 
    autos: "0006789-01.2025.8.05.0039", 
    processoId: 6,
    ato: "Habeas Corpus", 
    tipoAto: "HC",
    providencia: "HC protocolado no TJ. Aguardando distribuição ao relator.",
    defensorNome: "Dr. Rodrigo Rocha",
    area: "JURI",
    prioridade: 6
  },
];

export function DemandasTable() {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState<number | null>(null);

  // Filtrar e Ordenar: Prioridade -> Data
  const filteredData = MOCK_DATA.filter((item) => {
    const matchesFilter = 
      item.assistidoNome.toLowerCase().includes(filter.toLowerCase()) ||
      item.autos.includes(filter) ||
      item.ato.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesFilter && matchesStatus;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const statusA = STATUS_MAP[a.status]?.priority || 99;
    const statusB = STATUS_MAP[b.status]?.priority || 99;
    if (statusA !== statusB) return statusA - statusB;
    return new Date(a.data).getTime() - new Date(b.data).getTime();
  });

  const handleCopyProcesso = (id: number, numeroAutos: string) => {
    navigator.clipboard.writeText(numeroAutos);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const calcularDiasPrazo = (prazoStr: string | null) => {
    if (!prazoStr) return null;
    const prazo = new Date(prazoStr);
    const hoje = new Date();
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Barra de Ferramentas */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input 
              placeholder="Filtrar por nome, autos ou ato..." 
              className="pl-9"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1 - Urgente">Urgente</SelectItem>
                <SelectItem value="2 - Elaborar">A Fazer</SelectItem>
                <SelectItem value="3 - Revisar">Revisar</SelectItem>
                <SelectItem value="4 - Assinar">Assinar</SelectItem>
                <SelectItem value="5 - Protocolar">Protocolar</SelectItem>
                <SelectItem value="6 - Monitorar">Monitorar</SelectItem>
                <SelectItem value="7 - Concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="w-4 h-4" /> Prazos Fatais
            </Button>
            <Button size="sm" className="gap-2">
              <FileText className="w-4 h-4" /> Nova Demanda
            </Button>
          </div>
        </div>

        {/* Tabela Melhorada */}
        <SwissTableContainer className="max-h-[calc(100vh-320px)]">
          <SwissTable>
            <SwissTableHeader>
              <SwissTableRow>
                <SwissTableHead className="w-[120px]">Status</SwissTableHead>
                <SwissTableHead className="min-w-[200px]">Assistido</SwissTableHead>
                <SwissTableHead className="min-w-[180px]">Nº Processo</SwissTableHead>
                <SwissTableHead className="min-w-[160px]">Ato/Tipo</SwissTableHead>
                <SwissTableHead>Defensor</SwissTableHead>
                <SwissTableHead className="text-center w-[100px]">Prazo</SwissTableHead>
                <SwissTableHead className="min-w-[250px]">Providências</SwissTableHead>
                <SwissTableHead className="text-right w-[80px]">Ações</SwissTableHead>
              </SwissTableRow>
            </SwissTableHeader>
            <SwissTableBody>
              {sortedData.map((item) => {
                const config = STATUS_MAP[item.status] || STATUS_MAP["2 - Elaborar"];
                const StatusIcon = config.icon;
                const diasPrazo = calcularDiasPrazo(item.prazo);
                const prazoUrgente = diasPrazo !== null && diasPrazo <= 3;

                return (
                  <SwissTableRow 
                    key={item.id}
                    className={cn(
                      "group",
                      item.preso && "border-semantic-prisoner"
                    )}
                  >
                    {/* Status */}
                    <SwissTableCell>
                      <Badge 
                        variant="outline"
                        className={cn(
                          "status-badge",
                          config.className
                        )}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </SwissTableCell>

                    {/* Assistido */}
                    <SwissTableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className={cn(
                          "h-8 w-8 ring-2 flex-shrink-0",
                          item.preso ? "ring-rose-400 dark:ring-rose-500" : "ring-zinc-200 dark:ring-zinc-700"
                        )}>
                          <AvatarImage src={item.assistidoFoto || undefined} alt={item.assistidoNome} />
                          <AvatarFallback className={cn(
                            "text-xs font-semibold",
                            item.preso
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          )}>
                            {item.assistidoNome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Link href={`/admin/assistidos/${item.assistidoId}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <p className="text-sm font-medium truncate">{item.assistidoNome}</p>
                          </Link>
                          <div className="flex items-center gap-1">
                            <PrisonerIndicator 
                              preso={item.preso} 
                              size="xs"
                            />
                          </div>
                        </div>
                      </div>
                    </SwissTableCell>

                    {/* Processo */}
                    <SwissTableCell>
                      <div 
                        className="process-number group/copy cursor-pointer inline-flex items-center gap-1.5"
                        onClick={() => handleCopyProcesso(item.id, item.autos)}
                      >
                        <span className="truncate">{item.autos}</span>
                        {copied === item.id ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </SwissTableCell>

                    {/* Ato */}
                    <SwissTableCell>
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{item.ato}</p>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 mt-1 area-badge">
                          {item.tipoAto}
                        </Badge>
                      </div>
                    </SwissTableCell>

                    {/* Defensor */}
                    <SwissTableCell>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{item.defensorNome}</p>
                    </SwissTableCell>

                    {/* Prazo */}
                    <SwissTableCell className="text-center">
                      {diasPrazo !== null ? (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs px-2 py-0.5 font-medium border-0",
                            prazoUrgente 
                              ? "status-badge-urgent"
                              : "status-badge-info"
                          )}
                        >
                          {diasPrazo === 0 ? "Hoje" : diasPrazo === 1 ? "Amanhã" : diasPrazo < 0 ? "Vencido" : `${diasPrazo}d`}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-300 dark:text-zinc-600 italic">-</span>
                      )}
                    </SwissTableCell>

                    {/* Providências */}
                    <SwissTableCell>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {item.providencia}
                      </p>
                    </SwissTableCell>

                    {/* Ações */}
                    <SwissTableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/admin/demandas/${item.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Ver Detalhes</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer">
                              <FileText className="w-4 h-4 mr-2" /> Editar Detalhes
                            </DropdownMenuItem>
                            <Link href={`/admin/processos/${item.processoId}`}>
                              <DropdownMenuItem className="cursor-pointer">
                                <Gavel className="w-4 h-4 mr-2" /> Ver Processo
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem className="cursor-pointer text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Concluído
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SwissTableCell>
                  </SwissTableRow>
                );
              })}
            </SwissTableBody>
          </SwissTable>
        </SwissTableContainer>
      </div>
    </TooltipProvider>
  );
}
