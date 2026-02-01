"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  Activity,
  Zap,
  TrendingUp,
  Circle,
  PlusCircle,
  Edit3,
  ArrowUpRight,
  Layers,
  BarChart3,
  Filter,
  XCircle,
  ArrowUpDown,
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
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

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

import { 
  ATRIBUICAO_OPTIONS,
  getAtribuicaoColors,
  normalizeAreaToFilter,
  areaMatchesFilter,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";

// ==========================================
// CONSTANTES - DESIGN SUÍÇO
// ==========================================

// Ícones para cada atribuição
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Scale className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VVD: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO: <Lock className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  SUBSTITUICAO_CIVEL: <FileText className="w-3.5 h-3.5" />,
  CIVEL: <FileText className="w-3.5 h-3.5" />,
  CURADORIA: <Shield className="w-3.5 h-3.5" />,
};

// Status NEUTROS para reduzir poluição visual
const SITUACAO_CONFIGS: Record<string, { label: string; color: string; bg: string }> = {
  ativo: { label: "Ativo", color: "text-zinc-700 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800" },
  suspenso: { label: "Suspenso", color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
  arquivado: { label: "Arquivado", color: "text-zinc-400 dark:text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
  baixado: { label: "Baixado", color: "text-zinc-400 dark:text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
};

// ==========================================
// FASES DO PROCESSO DO JÚRI
// ==========================================
const FASES_JURI = [
  { id: "inquerito", label: "Inquérito", shortLabel: "INQ" },
  { id: "instrucao", label: "Instrução", shortLabel: "INST" },
  { id: "pronuncia", label: "Pronúncia", shortLabel: "PRON" },
  { id: "plenario", label: "Plenário", shortLabel: "PLEN" },
  { id: "recurso", label: "Recurso", shortLabel: "REC" },
];

// Helper: Calcular dias sem movimentação
function getDiasSemMovimentacao(dataUltimoEvento: Date | null | undefined): number {
  if (!dataUltimoEvento) return 999;
  return differenceInDays(new Date(), dataUltimoEvento);
}

// Helper: Cor do indicador de "dormindo"
function getCorDormindo(dias: number): { bg: string; text: string; label: string } {
  if (dias <= 7) return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: "Ativo" };
  if (dias <= 15) return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", label: `${dias}d` };
  if (dias <= 30) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: `${dias}d` };
  return { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", label: `${dias}d sem mov.` };
}

// Helper: Calcular prioridade do processo (para ordenação)
function calcularPrioridade(processo: Processo): number {
  let score = 0;
  // Réu preso = máxima prioridade
  if (processo.assistido.preso) score += 1000;
  // Prazo vencido
  if (processo.proximoPrazo) {
    const dias = differenceInDays(processo.proximoPrazo, new Date());
    if (dias < 0) score += 500; // Vencido
    else if (dias === 0) score += 400; // Hoje
    else if (dias === 1) score += 300; // Amanhã
    else if (dias <= 3) score += 200; // Urgente
    else if (dias <= 7) score += 100; // Próximo
  }
  // Processo do Júri
  if (processo.isJuri) score += 50;
  // Demandas abertas
  score += processo.demandasAbertas * 10;
  return score;
}

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
// COMPONENTE DE CARD DE PROCESSO - PREMIUM
// ==========================================

// Função para gerar URL de consulta no TJ-BA
function getTJBAUrl(numeroProcesso: string): string {
  const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
  return `https://esaj.tjba.jus.br/cpopg/search.do?conversationId=&dadosConsulta.valorConsulta=${numeroLimpo}&cbPesquisa=NUMPROC`;
}

// Componente de Barra de Progresso de Fases (Júri)
function FaseProgressBar({ faseAtual }: { faseAtual?: string }) {
  const faseIndex = FASES_JURI.findIndex(f => f.id === faseAtual) + 1;
  const progress = (faseIndex / FASES_JURI.length) * 100;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-400 uppercase tracking-wider font-medium">Fase Processual</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
          {FASES_JURI.find(f => f.id === faseAtual)?.label || "Inquérito"}
        </span>
      </div>
      <div className="flex gap-0.5">
        {FASES_JURI.map((fase, idx) => (
          <div
            key={fase.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-all",
              idx < faseIndex 
                ? "bg-emerald-500" 
                : idx === faseIndex 
                  ? "bg-emerald-300 dark:bg-emerald-700" 
                  : "bg-zinc-200 dark:bg-zinc-700"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Componente de Mini Timeline
function MiniTimeline({ eventos }: { eventos: Array<{ texto: string; data?: Date }> }) {
  if (!eventos.length) return null;
  
  return (
    <div className="space-y-2">
      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Últimos Eventos</span>
      <div className="space-y-1.5">
        {eventos.slice(0, 3).map((evento, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5",
                idx === 0 ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
              )} />
              {idx < 2 && <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-xs truncate",
                idx === 0 ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-500 dark:text-zinc-400"
              )}>{evento.texto}</p>
              {evento.data && (
                <p className="text-[10px] text-zinc-400 font-mono">
                  {format(evento.data, "dd/MM/yy")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Card de Processo - Versão Compacta e Limpa
function ProcessoCard({ processo, index = 0 }: { processo: Processo; index?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Animação de entrada escalonada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 30);
    return () => clearTimeout(timer);
  }, [index]);
  
  const areaColor = SOLID_COLOR_MAP[normalizeAreaToFilter(processo.area)] || "#71717a";
  
  const diasPrazo = processo.proximoPrazo 
    ? differenceInDays(processo.proximoPrazo, new Date())
    : null;
  const prazoHoje = diasPrazo === 0;
  const prazoVencido = diasPrazo !== null && diasPrazo < 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className={cn(
        "group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200",
        "overflow-hidden",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
      style={{ borderLeftWidth: '3px', borderLeftColor: processo.assistido.preso ? '#f43f5e' : areaColor }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Cabeçalho Compacto */}
        <div className="p-3 space-y-2">
          {/* Linha 1: Número do Processo + Ações */}
          <div className="flex items-center justify-between gap-2">
            <div 
              className="flex items-center gap-1.5 min-w-0 cursor-pointer group/copy" 
              onClick={handleCopy}
            >
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300 truncate hover:text-emerald-600 transition-colors">
                {processo.numeroAutos}
              </span>
              {copied ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-400 opacity-0 group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
              )}
            </div>
            
            {/* Badges compactos */}
            <div className="flex items-center gap-1">
              {/* Área */}
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: `${areaColor}15`, color: areaColor }}
              >
                {ATRIBUICAO_OPTIONS.find(o => o.value === normalizeAreaToFilter(processo.area))?.shortLabel || processo.area}
              </span>
              
              {/* Júri */}
              {processo.isJuri && (
                <Gavel className="w-3 h-3 text-emerald-600" />
              )}
              
              {/* Preso */}
              {processo.assistido.preso && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
              
              {/* Prazo urgente */}
              {(prazoVencido || prazoHoje) && (
                <span className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                  prazoVencido ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                )}>
                  {prazoVencido ? "!" : "Hoje"}
                </span>
              )}
            </div>
          </div>
          
          {/* Linha 2: Assunto */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {processo.assunto}
          </p>
          
          {/* Linha 3: Assistido + Comarca */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Link href={`/admin/assistidos/${processo.assistido.id}`} className="flex items-center gap-2 min-w-0">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: areaColor }}
              >
                {processo.assistido.nome.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate hover:text-emerald-600 transition-colors">
                {processo.assistido.nome}
              </span>
            </Link>
            
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 flex-shrink-0">
              <MapPin className="w-3 h-3" />
              <span>{processo.comarca}</span>
            </div>
          </div>
          
          {/* Linha 4: Demandas + Ações (se hover) */}
          <div className="flex items-center justify-between gap-2">
            {processo.demandasAbertas > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                {processo.demandasAbertas} demanda{processo.demandasAbertas > 1 && 's'}
              </span>
            ) : (
              <span />
            )}
            
            {/* Ações compactas */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={`/admin/processos/${processo.id}`}>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Eye className="w-3 h-3" />
                </Button>
              </Link>
              <a href={getTJBAUrl(processo.numeroAutos)} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Conteúdo Expansível */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 space-y-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              
              {/* Barra de Progresso do Júri */}
              {processo.isJuri && (
                <FaseProgressBar faseAtual="pronuncia" />
              )}

              {/* Timeline de Atos Principais */}
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" />
                  Atos Principais
                </p>
                <div className="relative pl-3 space-y-1.5 border-l border-zinc-200 dark:border-zinc-700">
                  {/* Próximo prazo */}
                  {processo.proximoPrazo && (
                    <div className="relative">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-amber-500" />
                      <div className="ml-2 flex items-center gap-2">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          {format(processo.proximoPrazo, "dd/MM/yyyy")}
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate">
                          {processo.atoProximoPrazo || "Prazo"}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Última movimentação (placeholder) */}
                  {processo.dataDistribuicao && !isNaN(new Date(processo.dataDistribuicao).getTime()) && (
                    <div className="relative">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      <div className="ml-2 flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">
                          {format(new Date(processo.dataDistribuicao), "dd/MM/yyyy")}
                        </span>
                        <span className="text-[10px] text-zinc-500">Distribuição</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Caso Vinculado */}
              {processo.casoId && processo.casoTitulo && (
                <Link href={`/admin/casos/${processo.casoId}`} className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                  <Target className="w-3 h-3" />
                  <span className="truncate">{processo.casoTitulo}</span>
                </Link>
              )}

              {/* Vara */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{processo.vara}</span>
              </div>
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão - mais compacto */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex justify-center py-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-zinc-100 dark:border-zinc-800">
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-zinc-400 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
      </Collapsible>
    </div>
  );
}

// ==========================================
// COMPONENTE DE LINHA DA TABELA - DESIGN SUÍÇO
// ==========================================

function ProcessoRow({ processo }: { processo: Processo }) {
  const [copied, setCopied] = useState(false);
  const atribuicaoColors = getAtribuicaoColors(processo.area);
  const areaColor = SOLID_COLOR_MAP[normalizeAreaToFilter(processo.area)] || "#71717a";
  const situacaoConfig = SITUACAO_CONFIGS[processo.situacao] || SITUACAO_CONFIGS.ativo;
  
  const diasPrazo = processo.proximoPrazo 
    ? differenceInDays(processo.proximoPrazo, new Date())
    : null;
  const prazoVencido = diasPrazo !== null && diasPrazo < 0;
  const prazoHoje = diasPrazo === 0;
  const prazoUrgente = diasPrazo !== null && diasPrazo <= 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DataTableRow 
      selected={false} 
      className="relative"
      style={{ borderLeft: `3px solid ${processo.assistido.preso ? '#f43f5e' : areaColor}` }}
    >
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
        <span 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
          style={{ 
            backgroundColor: `${areaColor}15`,
            color: areaColor,
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: areaColor }}
          />
          {ATRIBUICAO_OPTIONS.find(o => o.value === normalizeAreaToFilter(processo.area))?.shortLabel || processo.area}
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
                {diasPrazo === 0 ? "Hoje" : diasPrazo === 1 ? "Amanhã" : diasPrazo !== null && diasPrazo < 0 ? "Vencido" : `${diasPrazo}d`}
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
              <DropdownMenuSeparator />
              <a href={getTJBAUrl(processo.numeroAutos)} target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem className="cursor-pointer text-blue-600 dark:text-blue-400">
                  <ExternalLink className="w-4 h-4 mr-2" /> Consultar no TJ-BA
                </DropdownMenuItem>
              </a>
            </DropdownMenuContent>
          </DropdownMenu>
        </DataTableActions>
      </DataTableCell>
    </DataTableRow>
  );
}

// ==========================================
// FILTROS - PADRÃO DEMANDAS
// ==========================================

const situacoesProcesso = [
  { value: "ativo", label: "Ativos", color: "#22c55e" },
  { value: "suspenso", label: "Suspensos", color: "#f59e0b" },
  { value: "arquivado", label: "Arquivados", color: "#6b7280" },
  { value: "baixado", label: "Baixados", color: "#3b82f6" },
];

interface FilterSectionProcessosProps {
  selectedArea: string;
  setSelectedArea: (value: string) => void;
  selectedSituacao: string;
  setSelectedSituacao: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  groupBy: string;
  setGroupBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

function FilterSectionProcessos({
  selectedArea,
  setSelectedArea,
  selectedSituacao,
  setSelectedSituacao,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
}: FilterSectionProcessosProps) {
  const [isMainExpanded, setIsMainExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    atribuicoes: false,
    situacao: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalFilters =
    (selectedArea !== "all" ? 1 : 0) +
    (selectedSituacao !== "all" && selectedSituacao !== "ativo" ? 1 : 0);

  const handleClearAll = () => {
    setSelectedArea("all");
    setSelectedSituacao("ativo");
    setSearchTerm("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div 
          onClick={() => setIsMainExpanded(!isMainExpanded)}
          className="flex items-center gap-3 cursor-pointer flex-1 group"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtros</h3>
            <p className="text-[10px] text-zinc-400">
              {totalFilters > 0 ? `${totalFilters} ativo${totalFilters > 1 ? 's' : ''}` : 'Nenhum filtro aplicado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalFilters > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="h-7 text-[10px] px-2 text-zinc-400 hover:text-zinc-600"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
          <div 
            onClick={() => setIsMainExpanded(!isMainExpanded)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {isMainExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
      </div>

      {/* Seções de Filtro */}
      {isMainExpanded && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {/* Atribuição/Área */}
          <div>
            <button
              onClick={() => toggleSection('atribuicoes')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Atribuição</span>
                {selectedArea !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: SOLID_COLOR_MAP[selectedArea] || '#71717a' }}
                  >
                    {ATRIBUICAO_OPTIONS.find(o => o.value === selectedArea)?.shortLabel}
                  </span>
                )}
              </div>
              {expandedSections.atribuicoes ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.atribuicoes && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {ATRIBUICAO_OPTIONS.filter(o => o.value !== "all").map((option) => {
                  const isSelected = selectedArea === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedArea(isSelected ? "all" : option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: SOLID_COLOR_MAP[option.value] || '#71717a' }} 
                      />
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Situação */}
          <div>
            <button
              onClick={() => toggleSection('situacao')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Situação</span>
                {selectedSituacao !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: situacoesProcesso.find(e => e.value === selectedSituacao)?.color }}
                  >
                    {situacoesProcesso.find(e => e.value === selectedSituacao)?.label}
                  </span>
                )}
              </div>
              {expandedSections.situacao ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.situacao && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {situacoesProcesso.map((situacao) => {
                  const isSelected = selectedSituacao === situacao.value;
                  return (
                    <button
                      key={situacao.value}
                      onClick={() => setSelectedSituacao(isSelected ? "all" : situacao.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: situacao.color }} 
                      />
                      {situacao.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de Ações (Busca, Ordenação, Agrupamento, View) */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            placeholder="Buscar processo, assistido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1 text-zinc-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="recente">Recentes</SelectItem>
              <SelectItem value="comarca">Comarca</SelectItem>
              <SelectItem value="assistido">Assistido</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <Layers className="w-3 h-3 mr-1 text-zinc-400" />
              <SelectValue placeholder="Agrupar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem grupo</SelectItem>
              <SelectItem value="comarca">Comarca</SelectItem>
              <SelectItem value="area">Área</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [sortBy, setSortBy] = useState<"prioridade" | "recente" | "comarca" | "assistido">("prioridade");
  const [groupBy, setGroupBy] = useState<"none" | "comarca" | "area" | "defensor">("none");

  // Buscar processos do banco de dados
  const { data: processosData, isLoading } = trpc.processos.list.useQuery({
    limit: 100,
  });

  // Transformar dados do banco para o formato esperado pela UI
  const realProcessos = useMemo(() => {
    if (!processosData) return [];
    return processosData.map((p) => ({
      id: p.id,
      numeroAutos: p.numeroAutos || "",
      comarca: p.comarca || "Camaçari",
      vara: p.vara || "",
      area: p.area || "CRIMINAL",
      classeProcessual: p.classeProcessual || "",
      assunto: p.assunto || "",
      isJuri: p.isJuri || false,
      situacao: p.situacao || "ativo",
      assistido: {
        id: p.assistido?.id || 0,
        nome: p.assistido?.nome || "Não identificado",
        preso: p.assistido?.statusPrisional && ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(p.assistido.statusPrisional),
      },
      demandasAbertas: 0,
      ultimaMovimentacao: "",
      proximoPrazo: null as string | null,
      createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
    }));
  }, [processosData]);

  // Filtrar processos
  const filteredProcessos = useMemo(() => {
    let result = realProcessos.filter((processo) => {
      const matchesSearch = 
        processo.numeroAutos.includes(searchTerm) ||
        processo.assistido.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        processo.assunto.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArea = areaMatchesFilter(processo.area, areaFilter);
      const matchesSituacao = situacaoFilter === "all" || processo.situacao === situacaoFilter;
      return matchesSearch && matchesArea && matchesSituacao;
    });

    // Ordenar
    if (sortBy === "prioridade") {
      result = [...result].sort((a, b) => calcularPrioridade(b as any) - calcularPrioridade(a as any));
    } else if (sortBy === "recente") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "comarca") {
      result = [...result].sort((a, b) => a.comarca.localeCompare(b.comarca));
    } else if (sortBy === "assistido") {
      result = [...result].sort((a, b) => a.assistido.nome.localeCompare(b.assistido.nome));
    }

    return result;
  }, [realProcessos, searchTerm, areaFilter, situacaoFilter, sortBy]);

  // Agrupar processos
  const groupedProcessos = useMemo(() => {
    if (groupBy === "none") return null;
    
    const groups: Record<string, typeof filteredProcessos> = {};
    filteredProcessos.forEach(processo => {
      let key = "";
      if (groupBy === "comarca") key = processo.comarca;
      else if (groupBy === "area") key = ATRIBUICAO_OPTIONS.find(o => o.value === normalizeAreaToFilter(processo.area))?.label || processo.area;
      else if (groupBy === "defensor") key = "Dr. Rodrigo Rocha"; // TODO: usar processo.defensorNome quando disponível
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(processo);
    });
    
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredProcessos, groupBy]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: realProcessos.length,
    juri: realProcessos.filter(p => p.isJuri).length,
    comDemandas: realProcessos.filter(p => p.demandasAbertas > 0).length,
    reuPreso: realProcessos.filter(p => p.assistido.preso).length,
    comarcas: new Set(realProcessos.map(p => p.comarca)).size,
  }), [realProcessos]);

  // Estatísticas por área (para mini gráfico)
  const statsByArea = useMemo(() => {
    const areas = ATRIBUICAO_OPTIONS.filter(o => o.value !== "all");
    return areas.map(area => ({
      name: area.shortLabel,
      value: realProcessos.filter(p => areaMatchesFilter(p.area, area.value)).length,
      color: SOLID_COLOR_MAP[area.value] || "#71717a",
    })).filter(s => s.value > 0);
  }, [realProcessos]);

  // Loading state - Premium Skeleton
  if (isLoading) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
          {/* Sub-header Skeleton */}
          <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="w-20 h-7 rounded-md" />
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-4">
            {/* Stats Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-10" />
                    </div>
                    <Skeleton className="w-9 h-9 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Filter Card Skeleton */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-7 w-16 rounded-lg" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex gap-3">
                  <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-20 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Cards Skeleton with shimmer effect */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="p-4 space-y-3">
                    {/* Status badges */}
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-12 rounded" />
                      <Skeleton className="h-5 w-16 rounded" />
                    </div>
                    {/* Número do processo */}
                    <Skeleton className="h-5 w-48" />
                    {/* Assunto */}
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    {/* Localização */}
                    <Skeleton className="h-4 w-32" />
                    {/* Divider */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-9 h-9 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-8 rounded-md" />
                      </div>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 py-2 flex justify-center">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = getAtribuicaoColors(areaFilter);

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
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Sub-header unificado */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                <Scale className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Gerenciamento de processos • {stats.total} cadastrados
              </span>
            </div>
            
            <div className="flex items-center gap-0.5">
              <a href="https://esaj.tjba.jus.br/cpopg/open.do" target="_blank" rel="noopener noreferrer">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Consultar TJ-BA"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Exportar"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Link href="/admin/processos/novo">
                <Button 
                  size="sm"
                  className="h-7 px-2.5 ml-1.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Stats Cards Compactos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Scale, color: "zinc" },
            { label: "Júri", value: stats.juri, icon: Gavel, color: "emerald" },
            { label: "Com Demandas", value: stats.comDemandas, icon: Clock, color: "amber", highlight: stats.comDemandas > 0 },
            { label: "Réu Preso", value: stats.reuPreso, icon: Lock, color: "rose", highlight: stats.reuPreso > 0 },
            { label: "Comarcas", value: stats.comarcas, icon: Building2, color: "blue" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={cn(
                "group relative p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-200",
                "border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm",
                idx >= 3 && "hidden md:block",
                idx === 4 && "hidden lg:block"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                  <p className={cn(
                    "text-xl font-bold",
                    stat.highlight ? `text-${stat.color}-600 dark:text-${stat.color}-400` : "text-zinc-800 dark:text-zinc-200"
                  )}>{stat.value}</p>
                </div>
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center border transition-all",
                  `bg-${stat.color}-50 dark:bg-${stat.color}-900/20 border-${stat.color}-100 dark:border-${stat.color}-800/50`
                )}>
                  <stat.icon className={cn("w-4 h-4", `text-${stat.color}-600 dark:text-${stat.color}-400`)} />
                </div>
              </div>
            </div>
          ))}

          {/* Mini Gráfico de Distribuição - Compacto */}
          <div className="hidden lg:flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide whitespace-nowrap">Por área</span>
            <div className="flex-1 flex items-center gap-0.5 h-4">
              {statsByArea.map((area, idx) => (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setAreaFilter(ATRIBUICAO_OPTIONS.find(o => o.shortLabel === area.name)?.value || "all")}
                      className="h-full rounded-sm transition-all hover:opacity-80"
                      style={{ 
                        flex: area.value,
                        backgroundColor: area.color,
                        minWidth: area.value > 0 ? '6px' : '0'
                      }}
                    />
                    </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{area.name}: {area.value}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* Card de Filtros - Padrão Demandas */}
        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5">
          <FilterSectionProcessos
            selectedArea={areaFilter}
            setSelectedArea={setAreaFilter}
            selectedSituacao={situacaoFilter}
            setSelectedSituacao={setSituacaoFilter}
            sortBy={sortBy}
            setSortBy={(v) => setSortBy(v as any)}
            groupBy={groupBy}
            setGroupBy={(v) => setGroupBy(v as any)}
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </Card>

        {/* Card de Listagem */}
        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">

          {/* Header da listagem */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {filteredProcessos.length} processo{filteredProcessos.length !== 1 && 's'}
            </span>
          </div>

          {/* Content */}
          <div className="p-4">
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
            // Grid com agrupamento
            groupBy !== "none" && groupedProcessos ? (
              <div className="space-y-6">
                {groupedProcessos.map(([groupName, processos], groupIdx) => (
                  <div key={groupName} className="space-y-3">
                    {/* Header do Grupo */}
                    <div className="flex items-center gap-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{groupName}</h3>
                      <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {processos.length} processo{processos.length !== 1 && 's'}
                      </span>
                    </div>
                    {/* Cards do Grupo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {processos.map((processo, idx) => (
                        <ProcessoCard 
                          key={processo.id} 
                          processo={processo as any} 
                          index={groupIdx * 10 + idx} 
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Grid simples com animação
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProcessos.map((processo, idx) => (
                  <ProcessoCard 
                    key={processo.id} 
                    processo={processo as any} 
                    index={idx} 
                  />
                ))}
              </div>
            )
          ) : (
            <div className="max-h-[calc(100vh-400px)] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
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
                    <ProcessoRow key={processo.id} processo={processo as any} />
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          )}
          </div>
        </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
