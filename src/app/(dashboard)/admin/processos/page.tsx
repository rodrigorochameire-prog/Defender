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
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-600"
  },
  JURI: { 
    border: "border-l-emerald-600 dark:border-l-emerald-500", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-600"
  },
  VVD: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
    indicator: "bg-violet-600"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-600"
  },
  SUBSTITUICAO: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-600"
  },
  CIVEL: { 
    border: "border-l-purple-600 dark:border-l-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    indicator: "bg-purple-600"
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

const SITUACAO_CONFIGS: Record<string, { label: string; color: string; bg: string }> = {
  ativo: { label: "Ativo", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  suspenso: { label: "Suspenso", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  arquivado: { label: "Arquivado", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-900/30" },
  baixado: { label: "Baixado", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-900/30" },
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
    vara: "Juizado de VVD",
    area: "VVD",
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
          : "border-l-emerald-500 dark:border-l-emerald-400"
      )}>
        {/* Cabeçalho */}
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              {/* Badges - ORDENAÇÃO: Situação → Área → Réu Preso → Prazo */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* 1. SITUAÇÃO/STATUS */}
                <Badge className={cn(
                  "text-[9px] sm:text-[10px] px-1.5 py-0 font-semibold uppercase rounded-md border-0",
                  situacaoConfig.bg, situacaoConfig.color
                )}>
                  {situacaoConfig.label}
                </Badge>

                {/* 2. ÁREA */}
                <Badge className={cn(
                  "text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md border-0",
                  atribuicaoColors.bg, atribuicaoColors.text
                )}>
                  {ATRIBUICAO_OPTIONS.find(o => o.value === processo.area)?.shortLabel || processo.area}
                </Badge>
                
                {/* 3. RÉU PRESO */}
                {processo.assistido.preso && (
                  <Badge className="text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 font-bold">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Preso
                  </Badge>
                )}

                {/* 4. PRAZO URGENTE */}
                {prazoUrgente && diasPrazo !== null && (
                  <Badge className="text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0">
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
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
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
            <Avatar className={cn(
              "w-7 h-7 sm:w-9 sm:h-9 ring-2",
              processo.assistido.preso ? "ring-rose-500/50" : "ring-emerald-500/50"
            )}>
              <AvatarImage src={processo.assistido.foto || undefined} />
              <AvatarFallback className={cn(
                "text-[10px] sm:text-xs font-bold",
                processo.assistido.preso
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
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
                    <span className="text-[9px] sm:text-[10px] text-rose-600 dark:text-rose-400 truncate max-w-[100px] sm:max-w-[150px]">
                      {processo.assistido.localPrisao || "Preso"}
                    </span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" />
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400">Solto</span>
                  </>
                )}
              </div>
            </div>

            {/* Contadores */}
            {processo.demandasAbertas > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-[9px] sm:text-[10px] font-mono px-1.5 py-0 rounded-md",
                    "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/30"
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
                  ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                  : "bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
              )}>
                <Clock className={cn(
                  "w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0",
                  prazoUrgente ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[10px] sm:text-xs font-medium",
                    prazoUrgente ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>
                    {processo.atoProximoPrazo}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
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
                    <p className="text-[10px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      {processo.casoTitulo}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                      Vinculado ao caso
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* Último Evento */}
            {processo.ultimoEvento && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
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
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                <span>{processo.defensorNome}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão */}
        <CollapsibleTrigger asChild>
          <div className="flex justify-center py-1.5 sm:py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-400">
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
          <Avatar className={cn(
            "w-7 h-7 ring-1",
            processo.assistido.preso ? "ring-rose-500" : "ring-emerald-500"
          )}>
            <AvatarFallback className="text-[10px]">
              {processo.assistido.nome.charAt(0)}
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
        <Badge className={cn("text-[10px] border-0", atribuicaoColors.bg, atribuicaoColors.text)}>
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
        <Badge className={cn("text-[10px] border-0", situacaoConfig.bg, situacaoConfig.color)}>
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
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header - Design Suíço */}
        <div className="space-y-4">
          {/* Linha superior: Título + Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
                atribuicaoColors.bg
              )}>
                <Scale className={cn("w-5 h-5 sm:w-6 sm:h-6", atribuicaoColors.text)} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Processos
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Gerenciamento integrado • {stats.total} processos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Link href="/admin/processos/novo">
                <Button className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Novo Processo</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Seletor de Atribuição - Tabs com cores dos workspaces */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="flex gap-1 sm:gap-1.5 min-w-max border-b border-zinc-200 dark:border-zinc-800 pb-px">
              {ATRIBUICAO_OPTIONS.map((option) => {
                const isActive = areaFilter === option.value;
                const optionColors = ATRIBUICAO_COLORS[option.value] || ATRIBUICAO_COLORS.all;
                const count = option.value === "all" 
                  ? mockProcessos.length 
                  : mockProcessos.filter(p => p.area === option.value).length;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setAreaFilter(option.value)}
                    className={cn(
                      "relative px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 rounded-t-md",
                      isActive 
                        ? cn("text-zinc-900 dark:text-zinc-100", optionColors.bg)
                        : cn("text-zinc-500 dark:text-zinc-400", optionColors.hoverBg)
                    )}
                  >
                    <span className={cn(isActive ? optionColors.text : "text-zinc-400")}>{ATRIBUICAO_ICONS[option.value]}</span>
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.shortLabel}</span>
                    <span className={cn(
                      "ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                      isActive 
                        ? cn(optionColors.text, "bg-white/60 dark:bg-black/20")
                        : "text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
                    )}>
                      {count}
                    </span>
                    {isActive && (
                      <span className={cn(
                        "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                        optionColors.indicator
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards - Design Suíço com borda lateral */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <SwissCard className="border-l-2 border-l-slate-400">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
                  <p className="text-[10px] sm:text-xs text-zinc-500">Total</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-emerald-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.juri}</p>
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400">Júri</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-amber-500">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.comDemandas}</p>
                  <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400">Demandas</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
          
          <SwissCard className="border-l-2 border-l-rose-500 hidden sm:block">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.reuPreso}</p>
                  <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400">Réu Preso</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>

          <SwissCard className="border-l-2 border-l-blue-500 hidden lg:block">
            <SwissCardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.comarcas}</p>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">Comarcas</p>
                </div>
              </div>
            </SwissCardContent>
          </SwissCard>
        </div>

        {/* Filters - Design Suíço */}
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* Search + View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar por número, assistido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-950 h-9 text-sm"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "h-7 w-7 p-0 rounded-md",
                      viewMode === "grid" 
                        ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" 
                        : "text-zinc-500"
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modo Grade</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-7 w-7 p-0 rounded-md",
                      viewMode === "list" 
                        ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" 
                        : "text-zinc-500"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modo Lista</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
              <SelectTrigger className="w-[100px] sm:w-[140px] h-8 text-xs flex-shrink-0">
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
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 px-1 sm:px-0">
            {filteredProcessos.map((processo) => (
              <ProcessoCard key={processo.id} processo={processo} />
            ))}
          </div>
        ) : (
          <SwissCard className="overflow-hidden">
            <SwissCardContent className="p-0">
              <SwissTable>
                <SwissTableHeader>
                  <SwissTableRow>
                    <SwissTableHead>Número</SwissTableHead>
                    <SwissTableHead>Assistido</SwissTableHead>
                    <SwissTableHead>Comarca/Vara</SwissTableHead>
                    <SwissTableHead>Área</SwissTableHead>
                    <SwissTableHead>Assunto</SwissTableHead>
                    <SwissTableHead className="text-center">Dem.</SwissTableHead>
                    <SwissTableHead>Situação</SwissTableHead>
                    <SwissTableHead className="text-right">Ações</SwissTableHead>
                  </SwissTableRow>
                </SwissTableHeader>
                <SwissTableBody>
                  {filteredProcessos.map((processo) => (
                    <ProcessoRow key={processo.id} processo={processo} />
                  ))}
                </SwissTableBody>
              </SwissTable>
            </SwissCardContent>
          </SwissCard>
        )}

        {/* Empty State */}
        {filteredProcessos.length === 0 && (
          <SwissCard className="border-dashed">
            <SwissCardContent className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <Scale className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhum processo encontrado
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Ajuste os filtros de busca ou cadastre um novo processo.
              </p>
              <Link href="/admin/processos/novo">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Processo
                </Button>
              </Link>
            </SwissCardContent>
          </SwissCard>
        )}
      </div>
    </TooltipProvider>
  );
}
