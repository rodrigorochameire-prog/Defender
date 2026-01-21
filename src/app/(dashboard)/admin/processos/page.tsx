"use client";

import { useState, useMemo } from "react";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableCellMono,
  DataTableActions,
} from "@/components/shared/data-table";
import { StatusIndicator, StatusBadge } from "@/components/shared/status-indicator";
import { PremiumCard, PremiumCardHeader, PremiumCardContent, PremiumCardFooter } from "@/components/shared/premium-card";
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
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
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
import { FilterTab, FilterTabsGroup } from "@/components/shared/filter-tabs";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";
import { SearchToolbar, FilterSelect } from "@/components/shared/search-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { 
  PageContainer, 
  PageSection, 
  ContentGrid,
  Divider,
  StatBlock
} from "@/components/shared/page-structure";

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
// Cores de atribuição NEUTRAS para reduzir poluição visual - com contraste melhorado
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-300", 
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  JURI: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  VVD: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  SUBSTITUICAO: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  CIVEL: { 
    border: "border-l-zinc-400",
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
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
  const prazoHoje = diasPrazo === 0;
  const prazoVencido = diasPrazo !== null && diasPrazo < 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PremiumCard 
      hoverable
      padding="none"
      className={cn(
        processo.assistido.preso && "border-l-[3px] border-l-rose-500"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Cabeçalho */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Status Indicators - PREMIUM */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Réu Preso - PULSANTE */}
                {processo.assistido.preso && (
                  <StatusBadge status="critical" label="Réu Preso" pulsing />
                )}
                
                {/* Prazo - PULSANTE se urgente */}
                {prazoVencido && (
                  <StatusBadge status="critical" label="Vencido" pulsing />
                )}
                {prazoHoje && (
                  <StatusBadge status="urgent" label="Hoje" pulsing />
                )}
                {diasPrazo === 1 && (
                  <StatusBadge status="warning" label="Amanhã" />
                )}
                {diasPrazo !== null && diasPrazo > 1 && diasPrazo <= 3 && (
                  <StatusBadge status="info" label={`${diasPrazo}d`} />
                )}

                {/* Área - Neutro */}
                <Badge className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border-0">
                  {ATRIBUICAO_OPTIONS.find(o => o.value === processo.area)?.shortLabel || processo.area}
                </Badge>

                {/* Júri */}
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
              <div className="flex items-center gap-2 group/copy cursor-pointer" onClick={handleCopy}>
                <span className="font-mono text-xs sm:text-sm text-foreground hover:text-primary transition-colors truncate">
                  {processo.numeroAutos}
                </span>
                {copied ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Assunto (Fonte serifada) */}
              <p className="font-serif text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {processo.assunto}
              </p>

              {/* Localização */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{processo.vara} • {processo.comarca}</span>
              </div>
            </div>

            {/* Ações - Sempre visível em mobile */}
            <div className="flex items-start gap-1 flex-shrink-0">
              <Link href={`/admin/processos/${processo.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4" />
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/admin/processos/${processo.id}`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/admin/demandas?processo=${processo.id}`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <FileText className="w-4 h-4 mr-2" /> Ver Demandas
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Consultar no TJ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Assistido */}
          <div className="flex items-center gap-3 py-3 border-t border-border/30">
            <Avatar className="w-9 h-9 ring-1 ring-border/50">
              <AvatarImage src={processo.assistido.foto || undefined} alt={processo.assistido.nome} />
              <AvatarFallback className="text-xs font-semibold bg-muted">
                {processo.assistido.nome.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <Link href={`/admin/assistidos/${processo.assistido.id}`}>
                <p className="font-medium text-sm truncate hover:text-primary transition-colors">
                  {processo.assistido.nome}
                </p>
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                {processo.assistido.preso ? (
                  <StatusIndicator status="critical" label="Preso" size="xs" pulsing />
                ) : (
                  <span className="text-xs text-muted-foreground">Solto</span>
                )}
              </div>
            </div>

            {/* Contadores */}
            {processo.demandasAbertas > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <Clock className="w-3 h-3" />
                    {processo.demandasAbertas}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{processo.demandasAbertas} demandas pendentes</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Conteúdo Expansível */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/30">
              {/* Próximo Prazo */}
              {processo.proximoPrazo && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card">
                  {prazoVencido && <StatusIndicator status="critical" size="sm" pulsing />}
                  {prazoHoje && <StatusIndicator status="urgent" size="sm" pulsing />}
                  {!prazoVencido && !prazoHoje && <Clock className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{processo.atoProximoPrazo}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {format(processo.proximoPrazo, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {/* Caso Vinculado */}
              {processo.casoId && processo.casoTitulo && (
                <Link href={`/admin/casos/${processo.casoId}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors">
                    <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 truncate">
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{processo.defensorNome}</span>
                </div>
            )}
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex justify-center py-2 cursor-pointer hover:bg-muted/20 transition-colors border-t border-border/30">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>{isOpen ? "Recolher" : "Ver detalhes"}</span>
            </div>
          </button>
        </CollapsibleTrigger>
      </Collapsible>
    </PremiumCard>
  );
}

// ==========================================
// COMPONENTE DE LINHA DA TABELA - DESIGN SUÍÇO
// ==========================================

function ProcessoRow({ processo }: { processo: Processo }) {
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
    <DataTableRow selected={false} className={cn(
      processo.assistido.preso && "border-l-rose-500"
    )}>
      {/* Número do Processo */}
      <DataTableCellMono className="min-w-[200px]">
        <div 
          className="flex items-center gap-2 cursor-pointer group/copy" 
          onClick={handleCopy}
        >
          <span className="truncate hover:text-primary transition-colors">
            {processo.numeroAutos}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {processo.isJuri && (
              <Tooltip>
                <TooltipTrigger>
                  <Gavel className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </TooltipTrigger>
                <TooltipContent>Processo do Júri</TooltipContent>
              </Tooltip>
            )}
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </DataTableCellMono>

      {/* Assistido */}
      <DataTableCell className="min-w-[180px]">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 ring-1 ring-border/50 flex-shrink-0">
            <AvatarImage src={processo.assistido.foto || undefined} alt={processo.assistido.nome} />
            <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
              {processo.assistido.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link href={`/admin/assistidos/${processo.assistido.id}`} className="hover:text-primary transition-colors">
              <span className="text-sm font-medium block truncate">{processo.assistido.nome}</span>
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              {processo.assistido.preso && (
                <StatusIndicator status="critical" size="xs" pulsing />
              )}
            </div>
          </div>
        </div>
      </DataTableCell>

      {/* Comarca/Vara */}
      <DataTableCell className="min-w-[160px]">
        <div>
          <p className="text-sm font-medium truncate">{processo.comarca}</p>
          <p className="text-xs text-muted-foreground truncate">{processo.vara}</p>
        </div>
      </DataTableCell>

      {/* Área */}
      <DataTableCell>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-xs font-medium">
          {ATRIBUICAO_OPTIONS.find(o => o.value === processo.area)?.shortLabel || processo.area}
        </span>
      </DataTableCell>

      {/* Classe/Assunto */}
      <DataTableCell className="min-w-[180px]">
        <div>
          <p className="text-xs font-medium truncate">{processo.classeProcessual}</p>
          <p className="text-xs font-serif text-muted-foreground truncate">
            {processo.assunto}
          </p>
        </div>
      </DataTableCell>

      {/* Defensor */}
      <DataTableCell>
        <p className="text-xs truncate">
          {processo.defensorNome || "-"}
        </p>
      </DataTableCell>

      {/* Situação */}
      <DataTableCell>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-xs font-medium">
          {situacaoConfig.label}
        </span>
      </DataTableCell>

      {/* Demandas */}
      <DataTableCell align="center">
        <span className={cn(
          "inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md text-xs font-semibold",
          processo.demandasAbertas > 0 
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-muted/60 text-muted-foreground"
        )}>
          {processo.demandasAbertas}
        </span>
      </DataTableCell>

      {/* Próximo Prazo */}
      <DataTableCell className="min-w-[120px]">
        {processo.proximoPrazo ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {prazoVencido && <StatusIndicator status="critical" size="xs" pulsing />}
              {prazoHoje && <StatusIndicator status="urgent" size="xs" pulsing />}
              {diasPrazo === 1 && <StatusIndicator status="warning" size="xs" />}
              <span className={cn(
                "text-xs font-mono font-semibold",
                prazoVencido && "text-rose-600",
                prazoHoje && "text-orange-600",
                diasPrazo === 1 && "text-amber-600"
              )}>
                {diasPrazo === 0 ? "Hoje" : diasPrazo === 1 ? "Amanhã" : diasPrazo < 0 ? "Vencido" : `${diasPrazo}d`}
              </span>
            </div>
            {processo.atoProximoPrazo && (
              <p className="text-xs text-muted-foreground truncate">{processo.atoProximoPrazo}</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">-</span>
        )}
      </DataTableCell>

      {/* Ações */}
      <DataTableCell align="right">
        <DataTableActions>
          <Link href={`/admin/processos/${processo.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
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
        </DataTableActions>
      </DataTableCell>
    </DataTableRow>
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

  // Preparar filtros ativos
  const activeFilters = [
    situacaoFilter !== "all" && { 
      key: "situacao", 
      label: "Situação", 
      value: SITUACAO_CONFIGS[situacaoFilter]?.label || situacaoFilter 
    },
    areaFilter !== "all" && { 
      key: "area", 
      label: "Área", 
      value: ATRIBUICAO_OPTIONS.find(o => o.value === areaFilter)?.label || areaFilter 
    },
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <TooltipProvider>
      <PageContainer maxWidth="wide">
        {/* Breadcrumbs */}
        <Breadcrumbs className="mb-4" />
        
        {/* Page Header */}
        <PageHeader
          title="Processos"
          description={`Gerenciamento integrado de processos judiciais • ${stats.total} processos cadastrados`}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-12 w-12 border-2 rounded-xl">
                <Download className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
              <Link href="/admin/processos/novo">
                <Button className="gap-2 h-12 px-6 text-base md:text-lg font-semibold rounded-xl">
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="hidden sm:inline">Novo Processo</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Seção de Estatísticas */}
        <PageSection
          subtitle="Visão Geral"
          title="Estatísticas"
          icon={<Target className="w-6 h-6" />}
        >
          <ContentGrid columns={5} gap="sm">
            <StatBlock
              label="Total de Processos"
              value={stats.total}
              icon={<Scale className="w-5 h-5 text-muted-foreground" />}
              variant="default"
            />
            <StatBlock
              label="Processos do Júri"
              value={stats.juri}
              icon={<Gavel className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              variant="success"
            />
            <StatBlock
              label="Com Demandas"
              value={stats.comDemandas}
              icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              variant={stats.comDemandas > 0 ? "warning" : "default"}
            />
            <StatBlock
              label="Réu Preso"
              value={stats.reuPreso}
              icon={<Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              variant={stats.reuPreso > 0 ? "danger" : "default"}
            />
            <StatBlock
              label="Comarcas"
              value={stats.comarcas}
              icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              variant="primary"
            />
          </ContentGrid>
        </PageSection>

        {/* Seção de Filtros e Listagem */}
        <PageSection
          subtitle="Gestão"
          title="Listagem de Processos"
          icon={<FileText className="w-6 h-6" />}
        >
          {/* Filtros Rápidos - Tabs Premium */}
          <FilterTabsGroup label="Filtrar por Área">
            {ATRIBUICAO_OPTIONS.map((option) => {
              const count = option.value === "all" 
                ? mockProcessos.length 
                : mockProcessos.filter(p => p.area === option.value).length;
              
              return (
                <FilterTab
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  selected={areaFilter === option.value}
                  onSelect={setAreaFilter}
                  count={count}
                  icon={ATRIBUICAO_ICONS[option.value]}
                />
              );
            })}
          </FilterTabsGroup>

          {/* Barra de Filtros Principal */}
          <FilterBar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar por número, assistido ou assunto..."
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showViewToggle={true}
            sortOptions={[
              { value: "recente", label: "Mais Recentes" },
              { value: "antigo", label: "Mais Antigos" },
              { value: "numero", label: "Número do Processo" },
              { value: "assistido", label: "Nome do Assistido" },
            ]}
            sortValue="recente"
            advancedFilters={
              <>
                <FilterSelect
                  label="Situação"
                  placeholder="Todas as situações"
                  value={situacaoFilter}
                  onValueChange={setSituacaoFilter}
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "ativo", label: "Ativos" },
                    { value: "suspenso", label: "Suspensos" },
                    { value: "arquivado", label: "Arquivados" },
                    { value: "baixado", label: "Baixados" },
                  ]}
                />
                <FilterSelect
                  label="Comarca"
                  placeholder="Todas as comarcas"
                  value="all"
                  options={[
                    { value: "all", label: "Todas" },
                    { value: "camacari", label: "Camaçari" },
                    { value: "salvador", label: "Salvador" },
                  ]}
                />
                <FilterSelect
                  label="Defensor"
                  placeholder="Todos os defensores"
                  value="all"
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "rodrigo", label: "Dr. Rodrigo Rocha" },
                    { value: "maria", label: "Dra. Maria Oliveira" },
                  ]}
                />
              </>
            }
            activeFilters={activeFilters}
            onRemoveFilter={(key) => {
              if (key === "situacao") setSituacaoFilter("all");
              if (key === "area") setAreaFilter("all");
            }}
            onClearFilters={() => {
              setSituacaoFilter("all");
              setAreaFilter("all");
              setSearchTerm("");
            }}
          />

          {/* Content */}
          {filteredProcessos.length === 0 ? (
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
          ) : viewMode === "grid" ? (
            <ContentGrid columns={3} gap="md">
              {filteredProcessos.map((processo) => (
                <ProcessoCard key={processo.id} processo={processo} />
              ))}
            </ContentGrid>
          ) : (
            <div className="max-h-[calc(100vh-400px)] overflow-auto">
              <DataTable>
                <DataTableHeader>
                  <tr>
                    <DataTableCell header>Nº Processo</DataTableCell>
                    <DataTableCell header>Assistido</DataTableCell>
                    <DataTableCell header>Comarca/Vara</DataTableCell>
                    <DataTableCell header>Área</DataTableCell>
                    <DataTableCell header>Classe/Assunto</DataTableCell>
                    <DataTableCell header>Defensor</DataTableCell>
                    <DataTableCell header>Situação</DataTableCell>
                    <DataTableCell header align="center">Dem.</DataTableCell>
                    <DataTableCell header>Próximo Prazo</DataTableCell>
                    <DataTableCell header align="right">Ações</DataTableCell>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {filteredProcessos.map((processo) => (
                    <ProcessoRow key={processo.id} processo={processo} />
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          )}
        </PageSection>
      </PageContainer>
    </TooltipProvider>
  );
}
