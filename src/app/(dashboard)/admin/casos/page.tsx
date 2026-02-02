"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Briefcase,
  Plus,
  Scale,
  Users,
  FileText,
  Clock,
  FolderOpen,
  Lock,
  CheckCircle2,
  Eye,
  Gavel,
  Shield,
  ArrowRight,
  Calendar,
  LayoutGrid,
  List,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  ChevronDown,
  User,
  AlertCircle,
  MapPin,
  Filter,
  XCircle,
  ChevronUp,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes padronizados
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/section-header";
import { FilterTab, FilterTabsGroup } from "@/components/shared/filter-tabs";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";
import { SearchToolbar, FilterSelect } from "@/components/shared/search-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Briefcase className="w-3.5 h-3.5" />,
  JURI_CAMACARI: <Gavel className="w-3.5 h-3.5" />,
  VVD_CAMACARI: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  GRUPO_JURI: <Users className="w-3.5 h-3.5" />,
  SUBSTITUICAO_CIVEL: <FileText className="w-3.5 h-3.5" />,
};

// Cores sólidas para cada atribuição (hex)
const ATRIBUICAO_SOLID_COLORS: Record<string, string> = {
  all: "#71717a",
  JURI_CAMACARI: "#10b981",
  VVD_CAMACARI: "#f59e0b",
  EXECUCAO_PENAL: "#3b82f6",
  SUBSTITUICAO: "#f43f5e",
  GRUPO_JURI: "#14b8a6",
  SUBSTITUICAO_CIVEL: "#f97316",
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todos", shortLabel: "Todos" },
  { value: "JURI_CAMACARI", label: "Júri", shortLabel: "Júri" },
  { value: "VVD_CAMACARI", label: "Violência Doméstica", shortLabel: "VVD" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal", shortLabel: "EP" },
  { value: "GRUPO_JURI", label: "Grupo Esp. Júri", shortLabel: "G.Júri" },
  { value: "SUBSTITUICAO", label: "Subst. Criminal", shortLabel: "Crim." },
  { value: "SUBSTITUICAO_CIVEL", label: "Subst. Cível", shortLabel: "Cível" },
];

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "V.D.",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Subst.",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

const FASES_CASO: Record<string, { label: string; color: string }> = {
  inquerito: { label: "Inquérito", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  instrucao: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  plenario: { label: "Plenário", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  recurso: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  execucao: { label: "Execução", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

// ==========================================
// TIPOS E DADOS MOCKADOS (REMOVER DEPOIS)
// ==========================================

interface AssistidoMock {
  id: number;
  nome: string;
  preso: boolean;
  localPrisao?: string;
}

interface ProcessoMock {
  id: number;
  numero: string;
  vara: string;
}

interface AudienciaMock {
  id: number;
  tipo: string;
  data: Date;
}

interface DemandaMock {
  id: number;
  titulo: string;
  prazo: Date;
  status: string;
}

const MOCK_CASOS = [
  {
    id: 1,
    titulo: "Homicídio Qualificado - Art. 121, §2º, I e IV do CP",
    codigo: "CASO-2024-001",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "plenario",
    prioridade: "REU_PRESO",
    tags: "homicídio,júri,preso",
    linkDrive: "https://drive.google.com/folder/exemplo1",
    createdAt: new Date("2024-01-15"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: true,
    // Dados extras para card expandido
    assistidos: [
      { id: 1, nome: "Nathan Gonçalves dos Santos", preso: true, localPrisao: "CP Feira de Santana" },
    ] as AssistidoMock[],
    processos: [
      { id: 1, numero: "6005582-31.2024.8.05.0039", vara: "1ª Vara do Júri" },
    ] as ProcessoMock[],
    audiencias: [
      { id: 1, tipo: "Plenário do Júri", data: new Date("2024-03-15") },
    ] as AudienciaMock[],
    demandas: [
      { id: 1, titulo: "Memorial de Defesa", prazo: new Date("2024-03-10"), status: "pendente" },
    ] as DemandaMock[],
    teoriaResumo: "Legítima defesa putativa. Réu agiu em erro de tipo permissivo.",
  },
  {
    id: 2,
    titulo: "Tentativa de Homicídio - Legítima Defesa",
    codigo: "CASO-2024-002",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "instrucao",
    prioridade: null,
    tags: "tentativa,legítima defesa",
    linkDrive: "https://drive.google.com/folder/exemplo2",
    createdAt: new Date("2024-02-20"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: false,
    hasTeoriaDireito: true,
    assistidos: [
      { id: 2, nome: "Carlos Alberto Ferreira", preso: false },
    ] as AssistidoMock[],
    processos: [
      { id: 2, numero: "0012345-67.2024.8.05.0039", vara: "2ª Vara do Júri" },
    ] as ProcessoMock[],
    audiencias: [
      { id: 2, tipo: "Instrução", data: new Date("2024-04-10") },
    ] as AudienciaMock[],
    demandas: [] as DemandaMock[],
    teoriaResumo: "Legítima defesa real. Ação proporcional à agressão sofrida.",
  },
  {
    id: 3,
    titulo: "Feminicídio Tentado - Art. 121, §2º-A do CP",
    codigo: "CASO-2024-003",
    atribuicao: "VVD_CAMACARI",
    status: "ativo",
    fase: "instrucao",
    prioridade: "REU_PRESO",
    tags: "feminicídio,maria da penha,preso",
    linkDrive: null,
    createdAt: new Date("2024-03-10"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: false,
    assistidos: [
      { id: 3, nome: "João Pedro Silva", preso: true, localPrisao: "CP Simões Filho" },
    ] as AssistidoMock[],
    processos: [
      { id: 3, numero: "0054321-89.2024.8.05.0039", vara: "Vara de V. Doméstica" },
    ] as ProcessoMock[],
    audiencias: [
      { id: 3, tipo: "Instrução", data: new Date("2024-05-20") },
    ] as AudienciaMock[],
    demandas: [
      { id: 2, titulo: "Pedido de Revogação de Prisão", prazo: new Date("2024-04-01"), status: "pendente" },
    ] as DemandaMock[],
    teoriaResumo: "Desclassificação para lesão corporal. Ausência de animus necandi.",
  },
  {
    id: 4,
    titulo: "Ameaça e Descumprimento de Medida Protetiva",
    codigo: "CASO-2024-004",
    atribuicao: "VVD_CAMACARI",
    status: "ativo",
    fase: "inquerito",
    prioridade: null,
    tags: "ameaça,medida protetiva",
    linkDrive: null,
    createdAt: new Date("2024-04-05"),
    hasTeoriaFatos: false,
    hasTeoriaProvas: false,
    hasTeoriaDireito: false,
    assistidos: [
      { id: 4, nome: "Marcos Vinícius Santos", preso: false },
    ] as AssistidoMock[],
    processos: [] as ProcessoMock[],
    audiencias: [] as AudienciaMock[],
    demandas: [
      { id: 3, titulo: "Elaborar Defesa Preliminar", prazo: new Date("2024-04-20"), status: "pendente" },
    ] as DemandaMock[],
  },
  {
    id: 5,
    titulo: "Progressão de Regime - Trabalho Externo",
    codigo: "CASO-2024-005",
    atribuicao: "EXECUCAO_PENAL",
    status: "ativo",
    fase: "execucao",
    prioridade: null,
    tags: "progressão,trabalho externo",
    linkDrive: "https://drive.google.com/folder/exemplo5",
    createdAt: new Date("2024-04-15"),
    assistidos: [
      { id: 5, nome: "Ricardo Almeida", preso: true, localPrisao: "Regime Semiaberto" },
    ] as AssistidoMock[],
    processos: [
      { id: 4, numero: "0098765-43.2020.8.05.0039", vara: "VEP Camaçari" },
    ] as ProcessoMock[],
    audiencias: [] as AudienciaMock[],
    demandas: [
      { id: 4, titulo: "Acompanhar Parecer do MP", prazo: new Date("2024-04-25"), status: "pendente" },
    ] as DemandaMock[],
    teoriaResumo: "Requisitos objetivos preenchidos. Bom comportamento atestado.",
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: true,
  },
  {
    id: 6,
    titulo: "Livramento Condicional - Requisitos Objetivos",
    codigo: "CASO-2024-006",
    atribuicao: "EXECUCAO_PENAL",
    status: "ativo",
    fase: "execucao",
    prioridade: null,
    tags: "livramento,condicional",
    linkDrive: null,
    createdAt: new Date("2024-05-01"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: false,
    hasTeoriaDireito: true,
  },
  {
    id: 7,
    titulo: "Latrocínio - Desclassificação para Roubo",
    codigo: "CASO-2024-007",
    atribuicao: "GRUPO_JURI",
    status: "ativo",
    fase: "plenario",
    prioridade: "REU_PRESO",
    tags: "latrocínio,desclassificação,preso",
    linkDrive: "https://drive.google.com/folder/exemplo7",
    createdAt: new Date("2024-05-15"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: true,
  },
  {
    id: 8,
    titulo: "Tráfico de Drogas - Uso Pessoal",
    codigo: "CASO-2024-008",
    atribuicao: "SUBSTITUICAO",
    status: "ativo",
    fase: "instrucao",
    prioridade: null,
    tags: "tráfico,drogas,desclassificação",
    linkDrive: null,
    createdAt: new Date("2024-06-01"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: false,
    hasTeoriaDireito: false,
  },
  {
    id: 9,
    titulo: "Roubo Majorado - Emprego de Arma",
    codigo: "CASO-2024-009",
    atribuicao: "SUBSTITUICAO",
    status: "ativo",
    fase: "recurso",
    prioridade: null,
    tags: "roubo,arma,majorante",
    linkDrive: "https://drive.google.com/folder/exemplo9",
    createdAt: new Date("2024-06-10"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: true,
  },
  {
    id: 10,
    titulo: "Homicídio Culposo - Acidente de Trânsito",
    codigo: "CASO-2024-010",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "inquerito",
    prioridade: null,
    tags: "homicídio culposo,trânsito",
    linkDrive: null,
    createdAt: new Date("2024-06-20"),
    hasTeoriaFatos: false,
    hasTeoriaProvas: false,
    hasTeoriaDireito: false,
  },
  {
    id: 11,
    titulo: "Ação de Alimentos - Revisional",
    codigo: "CASO-2024-011",
    atribuicao: "SUBSTITUICAO_CIVEL",
    status: "ativo",
    fase: "instrucao",
    prioridade: null,
    tags: "alimentos,revisional,família",
    linkDrive: null,
    createdAt: new Date("2024-07-01"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: false,
    hasTeoriaDireito: true,
  },
  {
    id: 12,
    titulo: "Guarda Compartilhada - Interesse do Menor",
    codigo: "CASO-2024-012",
    atribuicao: "SUBSTITUICAO_CIVEL",
    status: "ativo",
    fase: "instrucao",
    prioridade: null,
    tags: "guarda,menor,família",
    linkDrive: "https://drive.google.com/folder/exemplo12",
    createdAt: new Date("2024-07-15"),
    hasTeoriaFatos: true,
    hasTeoriaProvas: true,
    hasTeoriaDireito: false,
  },
];

// Mock de estatísticas
const MOCK_STATS = {
  totalCasos: 12,
  casosReuPreso: 3,
  demandasPendentes: 7,
  audienciasFuturas: 5,
};

// ==========================================
// CORES POR ATRIBUIÇÃO - DESIGN DEFENDER
// ==========================================

const ATRIBUICAO_COLORS: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  JURI_CAMACARI: { 
    border: "border-l-emerald-500", 
    bg: "bg-emerald-50/50 dark:bg-emerald-900/10", 
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "text-emerald-600"
  },
  VVD_CAMACARI: { 
    border: "border-l-amber-500", 
    bg: "bg-amber-50/50 dark:bg-amber-900/10", 
    text: "text-amber-700 dark:text-amber-400",
    icon: "text-amber-600"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-blue-500", 
    bg: "bg-blue-50/50 dark:bg-blue-900/10", 
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-600"
  },
  SUBSTITUICAO: { 
    border: "border-l-violet-500", 
    bg: "bg-violet-50/50 dark:bg-violet-900/10", 
    text: "text-violet-700 dark:text-violet-400",
    icon: "text-violet-600"
  },
  GRUPO_JURI: { 
    border: "border-l-teal-500", 
    bg: "bg-teal-50/50 dark:bg-teal-900/10", 
    text: "text-teal-700 dark:text-teal-400",
    icon: "text-teal-600"
  },
  SUBSTITUICAO_CIVEL: { 
    border: "border-l-rose-500", 
    bg: "bg-rose-50/50 dark:bg-rose-900/10", 
    text: "text-rose-700 dark:text-rose-400",
    icon: "text-rose-600"
  },
};

// ==========================================
// CARD DE CASO EXPANDÍVEL - DESIGN DEFENDER
// ==========================================

interface CasoCardProps {
  caso: {
    id: number;
    titulo: string;
    codigo: string | null;
    atribuicao: string;
    status: string | null;
    fase: string | null;
    prioridade: string | null;
    tags: string | null;
    linkDrive: string | null;
    createdAt: Date;
    hasTeoriaFatos: boolean;
    hasTeoriaProvas: boolean;
    hasTeoriaDireito: boolean;
    // Dados extras opcionais
    assistidos?: AssistidoMock[];
    processos?: ProcessoMock[];
    audiencias?: AudienciaMock[];
    demandas?: DemandaMock[];
    teoriaResumo?: string;
  };
}

function CasoCard({ caso }: CasoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const atribuicaoLabel = ATRIBUICAO_LABELS[caso.atribuicao] || caso.atribuicao;
  const faseConfig = caso.fase ? FASES_CASO[caso.fase.toLowerCase()] : null;
  const colors = ATRIBUICAO_COLORS[caso.atribuicao] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const isReuPreso = caso.prioridade === "REU_PRESO";
  const teoriaCount = [caso.hasTeoriaFatos, caso.hasTeoriaProvas, caso.hasTeoriaDireito].filter(Boolean).length;
  const teoriaCompleta = teoriaCount === 3;
  
  // Parse tags
  const tags = useMemo(() => {
    if (!caso.tags) return [];
    try {
      const parsed = JSON.parse(caso.tags);
      return Array.isArray(parsed) ? parsed : caso.tags.split(",").map(t => t.trim());
    } catch {
      return caso.tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  }, [caso.tags]);

  // Contadores
  const assistidosCount = caso.assistidos?.length || 0;
  const processosCount = caso.processos?.length || 0;
  const audienciasCount = caso.audiencias?.length || 0;
  const demandasCount = caso.demandas?.filter(d => d.status === "pendente")?.length || 0;
  const hasExtras = assistidosCount > 0 || processosCount > 0 || audienciasCount > 0 || demandasCount > 0;

  // Função para gerar iniciais
  const getInitials = (nome: string) => {
    return nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className={cn(
      "group relative bg-white dark:bg-zinc-900 rounded-lg overflow-hidden",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:shadow-lg hover:-translate-y-0.5",
      "transition-all duration-300",
      "border-l-[3px]",
      isReuPreso ? "border-l-red-500" : colors.border
    )}>
      {/* Indicador de Réu Preso */}
      {isReuPreso && (
        <div className="absolute top-3 right-12 z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Preso</span>
          </div>
        </div>
      )}

      {/* Menu de Ações */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/admin/casos/${caso.id}`} className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> Ver detalhes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/casos/${caso.id}/editar`} className="flex items-center gap-2">
                <Edit className="w-4 h-4" /> Editar caso
              </Link>
            </DropdownMenuItem>
            {caso.linkDrive && (
              <DropdownMenuItem asChild>
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Abrir Drive
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2 text-zinc-500">
              <Copy className="w-4 h-4" /> Duplicar caso
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 text-zinc-500">
              <Archive className="w-4 h-4" /> Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Área clicável principal */}
      <Link href={`/admin/casos/${caso.id}`} className="block p-4">
        {/* Meta Row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {faseConfig && (
            <Badge className={cn("text-[10px] px-2 py-0.5 font-medium border-0", faseConfig.color)}>
              {faseConfig.label}
            </Badge>
          )}
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", colors.text)}>
            {atribuicaoLabel}
          </span>
          {teoriaCompleta && (
            <Tooltip>
              <TooltipTrigger>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </TooltipTrigger>
              <TooltipContent>Teoria Completa</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Título */}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-2 leading-snug group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors pr-8">
          {caso.titulo}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, idx) => (
              <span 
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Código e Data */}
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          {caso.codigo ? (
            <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {caso.codigo}
            </span>
          ) : (
            <span></span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(caso.createdAt), "dd/MM/yy")}
          </span>
        </div>

        {/* Barra de Progresso da Teoria */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Teoria do Caso
            </span>
            <span className={cn(
              "text-[10px] font-bold",
              teoriaCompleta ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"
            )}>
              {teoriaCount}/3
            </span>
          </div>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors cursor-help",
                  caso.hasTeoriaFatos 
                    ? "bg-blue-500" 
                    : "bg-zinc-200 dark:bg-zinc-700"
                )} />
              </TooltipTrigger>
              <TooltipContent>Fatos {caso.hasTeoriaFatos ? "✓" : "pendente"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors cursor-help",
                  caso.hasTeoriaProvas 
                    ? "bg-amber-500" 
                    : "bg-zinc-200 dark:bg-zinc-700"
                )} />
              </TooltipTrigger>
              <TooltipContent>Provas {caso.hasTeoriaProvas ? "✓" : "pendente"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors cursor-help",
                  caso.hasTeoriaDireito 
                    ? "bg-emerald-500" 
                    : "bg-zinc-200 dark:bg-zinc-700"
                )} />
              </TooltipTrigger>
              <TooltipContent>Direito {caso.hasTeoriaDireito ? "✓" : "pendente"}</TooltipContent>
            </Tooltip>
          </div>

          {/* Indicadores resumidos */}
          {hasExtras && (
            <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              {assistidosCount > 0 && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {assistidosCount} assistido{assistidosCount > 1 ? "s" : ""}
                </span>
              )}
              {processosCount > 0 && (
                <span className="flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  {processosCount} processo{processosCount > 1 ? "s" : ""}
                </span>
              )}
              {audienciasCount > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {audienciasCount} audiência{audienciasCount > 1 ? "s" : ""}
                </span>
              )}
              {demandasCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  {demandasCount} pendente{demandasCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Seção Expandível */}
      {hasExtras && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2 text-xs",
              "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
              "border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30",
              "hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            )}>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
              {isExpanded ? "Recolher" : "Ver mais detalhes"}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-3 space-y-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50">
              
              {/* Assistidos */}
              {caso.assistidos && caso.assistidos.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Assistidos
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {caso.assistidos.map((assistido) => (
                      <div 
                        key={assistido.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                          "bg-white dark:bg-zinc-800 border",
                          assistido.preso 
                            ? "border-red-200 dark:border-red-900/50" 
                            : "border-zinc-200 dark:border-zinc-700"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-700">
                            {getInitials(assistido.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                            {assistido.nome}
                          </p>
                          {assistido.preso && (
                            <p className="text-[10px] text-red-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {assistido.localPrisao || "Preso"}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processos */}
              {caso.processos && caso.processos.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Processos
                  </h4>
                  <div className="space-y-1.5">
                    {caso.processos.map((processo) => (
                      <div 
                        key={processo.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                          {processo.numero}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {processo.vara}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Próximas Audiências */}
              {caso.audiencias && caso.audiencias.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Próximas Audiências
                  </h4>
                  <div className="space-y-1.5">
                    {caso.audiencias.slice(0, 2).map((audiencia) => (
                      <div 
                        key={audiencia.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      >
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">
                          {audiencia.tipo}
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(audiencia.data), "dd/MM/yy")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Demandas Pendentes */}
              {caso.demandas && caso.demandas.filter(d => d.status === "pendente").length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-2">
                    Demandas Pendentes
                  </h4>
                  <div className="space-y-1.5">
                    {caso.demandas.filter(d => d.status === "pendente").slice(0, 3).map((demanda) => (
                      <div 
                        key={demanda.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50"
                      >
                        <span className="text-xs text-amber-700 dark:text-amber-300">
                          {demanda.titulo}
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(demanda.prazo), "dd/MM")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teoria Resumo */}
              {caso.teoriaResumo && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Tese Principal
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 italic bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    &ldquo;{caso.teoriaResumo}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer com ações rápidas */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 border-t border-zinc-100 dark:border-zinc-800",
        "bg-zinc-50/50 dark:bg-zinc-800/30"
      )}>
        <div className="flex items-center gap-3">
          {caso.linkDrive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a 
                  href={caso.linkDrive} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Abrir Drive</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link 
                href={`/admin/casos/${caso.id}/editar`}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        </div>
        <Link 
          href={`/admin/casos/${caso.id}`}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <span>Ver detalhes</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// SKELETON DE LOADING
// ==========================================

function CasoCardSkeleton() {
  return (
    <Card className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-3/4 mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </Card>
  );
}

// ==========================================
// FILTROS - PADRÃO DEMANDAS
// ==========================================

const fasesCaso = [
  { value: "inquerito", label: "Inquérito", color: "#6b7280" },
  { value: "instrucao", label: "Instrução", color: "#3b82f6" },
  { value: "plenario", label: "Plenário", color: "#f59e0b" },
  { value: "recurso", label: "Recurso", color: "#8b5cf6" },
  { value: "execucao", label: "Execução", color: "#22c55e" },
];

const statusCaso = [
  { value: "ativo", label: "Ativos", color: "#22c55e" },
  { value: "suspenso", label: "Suspensos", color: "#f59e0b" },
  { value: "arquivado", label: "Arquivados", color: "#6b7280" },
];

interface FilterSectionCasosProps {
  selectedAtribuicao: string;
  setSelectedAtribuicao: (value: string) => void;
  selectedFase: string;
  setSelectedFase: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}

function FilterSectionCasos({
  selectedAtribuicao,
  setSelectedAtribuicao,
  selectedFase,
  setSelectedFase,
  selectedStatus,
  setSelectedStatus,
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
}: FilterSectionCasosProps) {
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    atribuicoes: false,
    fase: false,
    status: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalFilters =
    (selectedAtribuicao !== "all" ? 1 : 0) +
    (selectedFase !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0);

  const handleClearAll = () => {
    setSelectedAtribuicao("all");
    setSelectedFase("all");
    setSelectedStatus("all");
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
          {/* Atribuição */}
          <div>
            <button
              onClick={() => toggleSection('atribuicoes')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Atribuição</span>
                {selectedAtribuicao !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: ATRIBUICAO_SOLID_COLORS[selectedAtribuicao] || '#71717a' }}
                  >
                    {ATRIBUICAO_OPTIONS.find(o => o.value === selectedAtribuicao)?.shortLabel}
                  </span>
                )}
              </div>
              {expandedSections.atribuicoes ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.atribuicoes && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {ATRIBUICAO_OPTIONS.filter(o => o.value !== "all").map((option) => {
                  const isSelected = selectedAtribuicao === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAtribuicao(isSelected ? "all" : option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: ATRIBUICAO_SOLID_COLORS[option.value] || '#71717a' }} 
                      />
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fase */}
          <div>
            <button
              onClick={() => toggleSection('fase')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Fase</span>
                {selectedFase !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: fasesCaso.find(f => f.value === selectedFase)?.color }}
                  >
                    {fasesCaso.find(f => f.value === selectedFase)?.label}
                  </span>
                )}
              </div>
              {expandedSections.fase ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.fase && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {fasesCaso.map((fase) => {
                  const isSelected = selectedFase === fase.value;
                  return (
                    <button
                      key={fase.value}
                      onClick={() => setSelectedFase(isSelected ? "all" : fase.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: fase.color }} 
                      />
                      {fase.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Status</span>
                {selectedStatus !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: statusCaso.find(s => s.value === selectedStatus)?.color }}
                  >
                    {statusCaso.find(s => s.value === selectedStatus)?.label}
                  </span>
                )}
              </div>
              {expandedSections.status ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.status && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {statusCaso.map((status) => {
                  const isSelected = selectedStatus === status.value;
                  return (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(isSelected ? "all" : status.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: status.color }} 
                      />
                      {status.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de Ações (Busca, View) */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
        {/* Busca */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <Input
            placeholder="Buscar caso, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
        </div>

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
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function CasosPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFase, setFilterFase] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAtribuicao, setFilterAtribuicao] = useState<string>("all");

  // Query de casos com filtros
  const { data: casosFromDB = [], isLoading } = trpc.casos.list.useQuery({
    atribuicao: filterAtribuicao === "all" ? undefined : filterAtribuicao,
    status: filterStatus === "all" ? undefined : filterStatus,
    fase: filterFase === "all" ? undefined : filterFase,
    search: searchTerm || undefined,
    limit: 50,
  });

  // Query de estatísticas
  const { data: statsFromDB } = trpc.casos.getDashboardStats.useQuery({
    atribuicao: filterAtribuicao === "all" ? undefined : filterAtribuicao,
  });

  // Query de todos os casos para contagem
  const { data: allCasosFromDB = [] } = trpc.casos.list.useQuery({
    limit: 100,
  });

  // ==========================================
  // USAR APENAS DADOS DO BANCO (sem mock)
  // ==========================================
  const casos = casosFromDB;
  const stats = statsFromDB;
  const allCasos = allCasosFromDB;

  const countByAtribuicao = useMemo(() => {
    const counts: Record<string, number> = { all: allCasos.length };
    ATRIBUICAO_OPTIONS.forEach(opt => {
      if (opt.value !== "all") {
        counts[opt.value] = allCasos.filter(c => c.atribuicao === opt.value).length;
      }
    });
    return counts;
  }, [allCasos]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Sub-header unificado */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Gestão de casos com teoria integrada
              </span>
            </div>
            
            <div className="flex items-center gap-0.5">
              <Link href="/admin/casos/novo">
                <Button 
                  size="sm"
                  className="h-7 px-2.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
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

        {/* Stats Cards - Mobile-first */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats?.totalCasos || 0, icon: Briefcase },
            { label: "Réu Preso", value: stats?.casosReuPreso || 0, icon: Lock, highlight: (stats?.casosReuPreso || 0) > 0 },
            { label: "Demandas Pend.", value: stats?.demandasPendentes || 0, icon: Clock },
            { label: "Audiências", value: stats?.audienciasFuturas || 0, icon: Calendar },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="group relative text-left p-4 sm:p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs sm:text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                  <p className={cn(
                    "text-2xl sm:text-lg font-semibold",
                    stat.highlight ? "text-rose-600 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                  )}>{stat.value}</p>
                </div>
                <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                  <stat.icon className="w-5 h-5 sm:w-4 sm:h-4 text-zinc-500 dark:text-zinc-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Card de Filtros - Padrão Demandas */}
        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5">
          <FilterSectionCasos
            selectedAtribuicao={filterAtribuicao}
            setSelectedAtribuicao={setFilterAtribuicao}
            selectedFase={filterFase}
            setSelectedFase={setFilterFase}
            selectedStatus={filterStatus}
            setSelectedStatus={setFilterStatus}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </Card>

        {/* Card de Listagem */}
        <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
          {/* Header da listagem */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {casos.length} caso{casos.length !== 1 && 's'}
            </span>
          </div>

          {/* Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CasoCardSkeleton key={i} />
                ))}
              </div>
            ) : casos.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="Nenhum caso encontrado"
                description={searchTerm ? "Tente ajustar os filtros de busca." : "Crie seu primeiro caso para começar."}
                action={{
                  label: "Criar Caso",
                  onClick: () => {},
                  icon: Plus,
                }}
                variant={searchTerm ? "search" : "default"}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {casos.map((caso) => (
                  <CasoCard key={caso.id} caso={caso} />
                ))}
              </div>
            )}
          </div>
        </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
