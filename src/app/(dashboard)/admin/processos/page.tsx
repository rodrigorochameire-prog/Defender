"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
  SwissTableContainer,
} from "@/components/shared/swiss-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Scale, 
  Plus,
  Search,
  Download,
  Eye,
  MoreHorizontal,
  FileText,
  Gavel,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Copy,
  CheckCircle2,
  Lock,
  Unlock,
  Clock,
  LayoutGrid,
  List,
  AlertTriangle,
  Users,
  Building2,
  Target,
  Shield,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes estruturais padronizados
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/section-header";
import { FilterChip, FilterChipGroup } from "@/components/shared/filter-chips";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";
import { SearchToolbar, FilterSelect } from "@/components/shared/search-toolbar";
import { EmptyState } from "@/components/shared/empty-state";

// ==========================================
// TIPOS
// ==========================================

interface Processo {
  id: number;
  numeroAutos: string;
  assistido: {
    id: number;
    nome: string;
    foto?: string | null;
    preso: boolean;
    localPrisao?: string | null;
  };
  comarca: string;
  vara: string;
  area: string;
  classeProcessual: string;
  assunto: string;
  situacao: "ativo" | "suspenso" | "arquivado" | "baixado";
  isJuri: boolean;
  demandasAbertas: number;
  proximoPrazo?: Date | null;
  atoProximoPrazo?: string | null;
  ultimoEvento?: string | null;
  dataUltimoEvento?: Date | null;
  casoId?: number | null;
  casoTitulo?: string | null;
  defensorNome?: string | null;
  createdAt: Date;
}

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

// Cores alinhadas com os workspaces
// Cores de atribuição NEUTRAS para reduzir poluição visual
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-300", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-500"
  },
  JURI: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  VVD: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  SUBSTITUICAO: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
  CIVEL: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-500"
  },
};

// Ícones para cada atribuição
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Scale className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VVD: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  CIVEL: <FileText className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todos os Processos", shortLabel: "Todos" },
  { value: "JURI", label: "Júri", shortLabel: "Júri" },
  { value: "VVD", label: "VVD", shortLabel: "VVD" },
  { value: "EXECUCAO_PENAL", label: "Exec. Penal", shortLabel: "EP" },
  { value: "SUBSTITUICAO", label: "Subst. Criminal", shortLabel: "Crim" },
  { value: "CIVEL", label: "Subst. Cível", shortLabel: "Cível" },
];

// Status NEUTROS para reduzir poluição visual
const SITUACAO_CONFIGS: Record<string, { label: string; color: string; bg: string }> = {
  ativo: { label: "Ativo", color: "text-zinc-700 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800" },
  suspenso: { label: "Suspenso", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
  arquivado: { label: "Arquivado", color: "text-zinc-400 dark:text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
  baixado: { label: "Baixado", color: "text-zinc-400 dark:text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
};

// Dados mockados
const mockProcessos: Processo[] = [
  { 
    id: 1, 
    numeroAutos: "8012906-74.2025.8.05.0039",
    assistido: { id: 1, nome: "Diego Bonfim Almeida", preso: true, localPrisao: "Cadeia Pública de Camaçari" },
    comarca: "Camaçari",
    vara: "1ª Vara do Júri",
    area: "JURI",
    classeProcessual: "Ação Penal",
    assunto: "Homicídio Qualificado (Art. 121, §2º, CP)",
    situacao: "ativo",
    isJuri: true,
    demandasAbertas: 2,
    proximoPrazo: new Date("2026-01-22"),
    atoProximoPrazo: "Rol de Testemunhas",
    ultimoEvento: "Recebimento da denúncia",
    dataUltimoEvento: new Date("2026-01-15"),
    casoId: 1,
    casoTitulo: "Homicídio Qualificado - Operação Reuso",
    defensorNome: "Dr. Rodrigo Rocha",
    createdAt: new Date("2025-11-10"),
  },
  { 
    id: 2, 
    numeroAutos: "0001234-56.2025.8.05.0039",
    assistido: { id: 2, nome: "Maria Silva Santos", preso: false },
    comarca: "Camaçari",
    vara: "2ª Vara Criminal",
    area: "SUBSTITUICAO",
    classeProcessual: "Ação Penal",
    assunto: "Tráfico de Drogas (Art. 33, Lei 11.343)",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 1,
    proximoPrazo: new Date("2026-01-28"),
    atoProximoPrazo: "Razões de Apelação",
    ultimoEvento: "Sentença condenatória",
    dataUltimoEvento: new Date("2026-01-10"),
    defensorNome: "Dra. Maria Oliveira",
    createdAt: new Date("2025-06-20"),
  },
  { 
    id: 3, 
    numeroAutos: "0005678-90.2024.8.05.0039",
    assistido: { id: 3, nome: "José Carlos Oliveira", preso: true, localPrisao: "Conjunto Penal de Candeias" },
    comarca: "Camaçari",
    vara: "VEP",
    area: "EXECUCAO_PENAL",
    classeProcessual: "Execução Penal",
    assunto: "Progressão de Regime",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 3,
    proximoPrazo: new Date("2026-02-01"),
    atoProximoPrazo: "Pedido de Progressão",
    ultimoEvento: "Cálculo de pena atualizado",
    dataUltimoEvento: new Date("2026-01-12"),
    defensorNome: "Dr. Rodrigo Rocha",
    createdAt: new Date("2023-06-15"),
  },
  { 
    id: 4, 
    numeroAutos: "0009012-34.2025.8.05.0039",
    assistido: { id: 4, nome: "Ana Paula Costa Ferreira", preso: false },
    comarca: "Camaçari",
    vara: "Juizado de Violência Doméstica",
    area: "VIOLENCIA_DOMESTICA",
    classeProcessual: "Medida Protetiva",
    assunto: "Lesão Corporal Doméstica (Art. 129, §9º)",
    situacao: "ativo",
    isJuri: false,
    demandasAbertas: 1,
    proximoPrazo: new Date("2026-02-10"),
    atoProximoPrazo: "Audiência de Instrução",
    defensorNome: "Dra. Juliane Costa",
    createdAt: new Date("2025-09-20"),
  },
  { 
    id: 5, 
    numeroAutos: "8002341-90.2025.8.05.0039",
    assistido: { id: 5, nome: "Roberto Ferreira Lima", preso: true, localPrisao: "Prisão Domiciliar" },
    comarca: "Camaçari",
    vara: "1ª Vara do Júri",
    area: "JURI",
    classeProcessual: "Ação Penal",
    assunto: "Homicídio Simples (Art. 121, CP)",
    situacao: "ativo",
    isJuri: true,
    demandasAbertas: 1,
    proximoPrazo: new Date("2026-03-10"),
    atoProximoPrazo: "Plenário do Júri",
    ultimoEvento: "Pronúncia mantida",
    dataUltimoEvento: new Date("2025-10-15"),
    casoId: 5,
    casoTitulo: "Homicídio Simples - Acidente de Trânsito",
    defensorNome: "Dr. Rodrigo Rocha",
    createdAt: new Date("2025-01-05"),
  },
];

// ==========================================
// COMPONENTE DE CARD DE PROCESSO - DESIGN SUÍÇO
// ==========================================

function ProcessoCard({ processo }: { processo: Processo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const atribuicaoColors = ATRIBUICAO_COLORS[processo.area] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const situacaoConfig = SITUACAO_CONFIGS[processo.situacao] || SITUACAO_CONFIGS.ativo;
  
  const diasPrazo = processo.proximoPrazo 
    ? differenceInDays(processo.proximoPrazo, new Date())
    : null;
  const prazoUrgente = diasPrazo !== null && diasPrazo <= 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SwissCard className={cn(
        "group",
        "transition-all duration-200",
        "hover:shadow-md",
        // Borda lateral semântica - réu preso ou solto
        "border-l-[3px]",
        processo.assistido.preso 
          ? "border-l-rose-500 dark:border-l-rose-400" 
          : "border-l-zinc-300 dark:border-l-zinc-600"
      )}>
        {/* Cabeçalho */}
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              {/* Badges - ORDENAÇÃO: Situação → Área → Réu Preso → Prazo */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* 1. SITUAÇÃO/STATUS */}
                <Badge className={cn(
                  "text-xs px-1.5 py-0 font-semibold uppercase rounded-md border-0",
                  situacaoConfig.bg, situacaoConfig.color
                )}>
                  {situacaoConfig.label}
                </Badge>

                {/* 2. ÁREA */}
                <Badge className={cn(
                  "text-xs px-1.5 py-0 rounded-md border-0",
                  atribuicaoColors.bg, atribuicaoColors.text
                )}>
                  {ATRIBUICAO_OPTIONS.find(o => o.value === processo.area)?.shortLabel || processo.area}
                </Badge>
                
                {/* 3. RÉU PRESO */}
                {processo.assistido.preso && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-4 h-4 text-rose-500" />
                    </TooltipTrigger>
                    <TooltipContent>Preso</TooltipContent>
                  </Tooltip>
                )}

                {/* 4. PRAZO URGENTE */}
                {prazoUrgente && diasPrazo !== null && (
                  <Badge className="text-xs px-1.5 py-0 rounded-md bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200 border-0">
                    <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                    {diasPrazo === 0 ? "Hoje" : diasPrazo === 1 ? "Amanhã" : `${diasPrazo}d`}
                  </Badge>
                )}

                {/* 5. JÚRI */}
                {processo.isJuri && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Gavel className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    </TooltipTrigger>
                    <TooltipContent>Processo do Júri</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Número do Processo (Mono) */}
              <div className="flex items-center gap-1.5 sm:gap-2 group/copy cursor-pointer" onClick={handleCopy}>
                <span className="font-mono text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <span className="hidden sm:inline">{processo.numeroAutos}</span>
                  <span className="sm:hidden">{processo.numeroAutos.split('.')[0]}...</span>
                </span>
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-300 dark:text-zinc-600 sm:opacity-0 sm:group-hover/copy:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Assunto (Fonte serifada) */}
              <p className="font-legal text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 sm:line-clamp-1">
                {processo.assunto}
              </p>

              {/* Localização */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{processo.vara}</span>
                  <span className="hidden sm:inline">• {processo.comarca}</span>
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-start gap-0.5 sm:gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/admin/processos/${processo.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ver Detalhes</TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/processos/${processo.id}`}>
                    <DropdownMenuItem className="cursor-pointer text-sm">
                      <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/admin/demandas?processo=${processo.id}`}>
                    <DropdownMenuItem className="cursor-pointer text-sm">
                      <FileText className="w-4 h-4 mr-2" /> Ver Demandas
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-sm">
                    <ExternalLink className="w-4 h-4 mr-2" /> Consultar no TJ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Assistido */}
          <div className="flex items-center gap-2 sm:gap-3 py-2 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Avatar neutro - vermelho apenas se preso */}
            <Avatar className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 ring-2 cursor-pointer hover:ring-primary/50 transition-all",
              processo.assistido.preso ? "ring-rose-400" : "ring-zinc-200 dark:ring-zinc-700"
            )}>
              <AvatarImage src={processo.assistido.foto || undefined} alt={processo.assistido.nome} />
              <AvatarFallback className={cn(
                "text-xs sm:text-sm font-semibold",
                processo.assistido.preso
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}>
                {processo.assistido.nome.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <Link href={`/admin/assistidos/${processo.assistido.id}`}>
                <p className="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {processo.assistido.nome}
                </p>
              </Link>
              <div className="flex items-center gap-1">
                {processo.assistido.preso ? (
                  <>
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500" />
                    <span className="text-xs text-rose-600 dark:text-rose-400 truncate max-w-[100px] sm:max-w-[150px]">
                      {processo.assistido.localPrisao || "Preso"}
                    </span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Solto</span>
                  </>
                )}
              </div>
            </div>

            {/* Contadores */}
            {processo.demandasAbertas > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-xs font-mono px-1.5 py-0 rounded-md",
                    "border-zinc-300 text-zinc-700 bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:bg-zinc-800"
                  )}>
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {processo.demandasAbertas}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{processo.demandasAbertas} demandas pendentes</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Conteúdo Expansível */}
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 space-y-2.5 sm:space-y-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            {/* Próximo Prazo */}
            {processo.proximoPrazo && (
              <div className={cn(
                "flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg mt-2.5 sm:mt-3",
                prazoUrgente
                  ? "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  : "bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
              )}>
                <Clock className={cn(
                  "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0",
                  prazoUrgente ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-xs font-medium",
                    prazoUrgente ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {processo.atoProximoPrazo}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    {format(processo.proximoPrazo, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {/* Caso Vinculado */}
            {processo.casoId && processo.casoTitulo && (
              <Link href={`/admin/casos/${processo.casoId}`}>
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      {processo.casoTitulo}
                    </p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                      Vinculado ao caso
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Último Evento */}
            {processo.ultimoEvento && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span className="truncate">
                  {processo.ultimoEvento}
                  {processo.dataUltimoEvento && (
                    <span className="ml-1 font-mono">
                      ({format(processo.dataUltimoEvento, "dd/MM")})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Defensor */}
            {processo.defensorNome && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>{processo.defensorNome}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão */}
        <CollapsibleTrigger asChild>
          <div className="flex justify-center py-1.5 sm:py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              {isOpen ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </div>
          </div>
        </CollapsibleTrigger>
      </SwissCard>
    </Collapsible>
  );
}

// ==========================================
// COMPONENTE DE LINHA DA TABELA - DESIGN SUÍÇO
// ==========================================

function ProcessoRow({ processo }: { processo: Processo }) {
  const [copied, setCopied] = useState(false);
  const atribuicaoColors = ATRIBUICAO_COLORS[processo.area] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const situacaoConfig = SITUACAO_CONFIGS[processo.situacao] || SITUACAO_CONFIGS.ativo;

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SwissTableRow className={cn(
      "group transition-colors",
      processo.assistido.preso && "border-l-[3px] border-l-rose-500"
    )}>
      <SwissTableCell>
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleCopy}>
          <span className="font-mono text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {processo.numeroAutos}
          </span>
          {processo.isJuri && <Gavel className="w-3.5 h-3.5 text-emerald-600" />}
          {copied && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
      </SwissTableCell>
      <SwissTableCell>
        <div className="flex items-center gap-2">
          {/* Avatar neutro - vermelho apenas se preso */}
          <Avatar className={cn(
            "w-8 h-8 ring-2 cursor-pointer hover:ring-primary/50 transition-all",
            processo.assistido.preso ? "ring-rose-400" : "ring-zinc-200 dark:ring-zinc-700"
          )}>
            <AvatarImage src={processo.assistido.foto || undefined} alt={processo.assistido.nome} />
            <AvatarFallback className={cn(
              "text-xs font-semibold",
              processo.assistido.preso
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              {processo.assistido.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link href={`/admin/assistidos/${processo.assistido.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            <span className="text-sm font-medium">{processo.assistido.nome}</span>
          </Link>
        </div>
      </SwissTableCell>
      <SwissTableCell>
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{processo.comarca}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{processo.vara}</p>
        </div>
      </SwissTableCell>
      <SwissTableCell>
        <Badge className={cn("text-xs border-0", atribuicaoColors.bg, atribuicaoColors.text)}>
          {ATRIBUICAO_OPTIONS.find(o => o.value === processo.area)?.shortLabel || processo.area}
        </Badge>
      </SwissTableCell>
      <SwissTableCell>
        <p className="text-xs font-legal text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate">
          {processo.assunto}
        </p>
      </SwissTableCell>
      <SwissTableCell className="text-center">
        <span className={cn(
          "font-mono text-sm font-medium",
          processo.demandasAbertas > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"
        )}>
          {processo.demandasAbertas}
        </span>
      </SwissTableCell>
      <SwissTableCell>
        <Badge className={cn("text-xs border-0", situacaoConfig.bg, situacaoConfig.color)}>
          {situacaoConfig.label}
        </Badge>
      </SwissTableCell>
      <SwissTableCell className="text-right">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/admin/processos/${processo.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/admin/demandas?processo=${processo.id}`}>
                <DropdownMenuItem className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" /> Ver Demandas
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem className="cursor-pointer">
                <ExternalLink className="w-4 h-4 mr-2" /> Consultar no TJ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SwissTableCell>
    </SwissTableRow>
  );
}

// ==========================================
// PÁGINA PRINCIPAL - DESIGN SUÍÇO
// ==========================================

export default function ProcessosPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [situacaoFilter, setSituacaoFilter] = useState("ativo");

  const filteredProcessos = useMemo(() => {
    return mockProcessos.filter((processo) => {
      const matchesSearch = 
        processo.numeroAutos.includes(searchTerm) ||
        processo.assistido.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        processo.assunto.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArea = areaFilter === "all" || processo.area === areaFilter;
      const matchesSituacao = situacaoFilter === "all" || processo.situacao === situacaoFilter;
      return matchesSearch && matchesArea && matchesSituacao;
    });
  }, [searchTerm, areaFilter, situacaoFilter]);

  const stats = useMemo(() => ({
    total: mockProcessos.length,
    juri: mockProcessos.filter(p => p.isJuri).length,
    comDemandas: mockProcessos.filter(p => p.demandasAbertas > 0).length,
    reuPreso: mockProcessos.filter(p => p.assistido.preso).length,
    comarcas: new Set(mockProcessos.map(p => p.comarca)).size,
  }), []);

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[areaFilter] || ATRIBUICAO_COLORS.all;

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs className="mb-2" />
        
        {/* Page Header */}
        <PageHeader
          title="Processos"
          description={`Gerenciamento integrado • ${stats.total} processos`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
              <Link href="/admin/processos/novo">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Novo Processo</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Filtros por Atribuição */}
        <FilterChipGroup label="Filtrar por Área">
          {ATRIBUICAO_OPTIONS.map((option) => {
            const count = option.value === "all" 
              ? mockProcessos.length 
              : mockProcessos.filter(p => p.area === option.value).length;
            
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                value={option.value}
                selected={areaFilter === option.value}
                onSelect={setAreaFilter}
                count={count}
                icon={ATRIBUICAO_ICONS[option.value]}
                size="md"
              />
            );
          })}
        </FilterChipGroup>

        {/* Stats Cards - Padronizado */}
        <StatsGrid columns={5}>
          <StatsCard
            label="Total"
            value={stats.total}
            icon={Scale}
            variant="default"
            size="sm"
          />
          <StatsCard
            label="Júri"
            value={stats.juri}
            icon={Gavel}
            variant="success"
            size="sm"
          />
          <StatsCard
            label="Com Demandas"
            value={stats.comDemandas}
            icon={Clock}
            variant={stats.comDemandas > 0 ? "warning" : "default"}
            size="sm"
          />
          <StatsCard
            label="Réu Preso"
            value={stats.reuPreso}
            icon={Lock}
            variant={stats.reuPreso > 0 ? "danger" : "default"}
            size="sm"
            className="hidden sm:flex"
          />
          <StatsCard
            label="Comarcas"
            value={stats.comarcas}
            icon={Building2}
            variant="info"
            size="sm"
            className="hidden lg:flex"
          />
        </StatsGrid>

        {/* Search & Filters - Padronizado */}
        <SearchToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por número, assistido..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={
            <FilterSelect
              label="Situação"
              value={situacaoFilter}
              onValueChange={setSituacaoFilter}
              options={[
                { value: "all", label: "Todas" },
                { value: "ativo", label: "Ativos" },
                { value: "suspenso", label: "Suspensos" },
                { value: "arquivado", label: "Arquivados" },
              ]}
              width="md"
            />
          }
          activeFiltersCount={situacaoFilter !== "all" ? 1 : 0}
          onClearFilters={() => setSituacaoFilter("all")}
        />

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProcessos.map((processo) => (
              <ProcessoCard key={processo.id} processo={processo} />
            ))}
          </div>
        ) : (
          <SwissTableContainer className="max-h-[calc(100vh-320px)]">
            <SwissTable>
              <SwissTableHeader>
                <SwissTableRow className="bg-muted/50">
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Número</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Assistido</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Comarca/Vara</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Área</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Assunto</SwissTableHead>
                  <SwissTableHead className="text-center font-semibold text-xs uppercase tracking-wider">Dem.</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Situação</SwissTableHead>
                  <SwissTableHead className="text-right font-semibold text-xs uppercase tracking-wider">Ações</SwissTableHead>
                </SwissTableRow>
              </SwissTableHeader>
              <SwissTableBody>
                {filteredProcessos.map((processo) => (
                  <ProcessoRow key={processo.id} processo={processo} />
                ))}
              </SwissTableBody>
            </SwissTable>
          </SwissTableContainer>
        )}

        {/* Empty State */}
        {filteredProcessos.length === 0 && (
          <EmptyState
            icon={Scale}
            title="Nenhum processo encontrado"
            description="Crie um novo processo ou ajuste os filtros de busca."
            action={{
              label: "Novo Processo",
              onClick: () => {},
              icon: Plus,
            }}
            variant={searchTerm ? "search" : "default"}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
