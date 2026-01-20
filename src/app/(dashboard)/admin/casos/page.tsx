"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
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
  Briefcase,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Scale,
  Users,
  FileText,
  Calendar,
  Clock,
  Tag,
  Filter,
  LayoutGrid,
  List,
  FolderOpen,
  ExternalLink,
  AlertCircle,
  Lock,
  Unlock,
  MapPin,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  MessageCircle,
  Target,
  Gavel,
  Sparkles,
  Shield,
  Swords,
  User,
  UserCheck,
  UserX,
  FileSearch,
  Microscope,
  CircleDot,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";

// Novos componentes estruturais
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/section-header";
import { FilterChip, FilterChipGroup } from "@/components/shared/filter-chips";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";
import { SearchToolbar, FilterSelect } from "@/components/shared/search-toolbar";
import { EmptyState } from "@/components/shared/empty-state";

// Cores alinhadas com os workspaces
// Cores de atribuição NEUTRAS para reduzir poluição visual
// Cores são reservadas apenas para informações críticas (Preso, Prazos urgentes)
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
  JURI_CAMACARI: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-200/80 dark:bg-zinc-700",
    text: "text-zinc-700 dark:text-zinc-200",
    hoverBg: "hover:bg-zinc-200 dark:hover:bg-zinc-700/80",
    indicator: "bg-zinc-500"
  },
  VVD_CAMACARI: { 
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
    indicator: "bg-rose-600"
  },
  GRUPO_JURI: { 
    border: "border-l-zinc-500 dark:border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-600"
  },
  SUBSTITUICAO_CIVEL: { 
    border: "border-l-zinc-500 dark:border-l-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
    indicator: "bg-zinc-600"
  },
};

// Ícones para cada atribuição (Lucide icons)
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Briefcase className="w-3.5 h-3.5" />,
  JURI_CAMACARI: <Gavel className="w-3.5 h-3.5" />,
  VVD_CAMACARI: <Shield className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  GRUPO_JURI: <Users className="w-3.5 h-3.5" />,
  SUBSTITUICAO_CIVEL: <FileText className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todos os Casos", shortLabel: "Todos" },
  { value: "JURI_CAMACARI", label: "Júri", shortLabel: "Júri" },
  { value: "VVD_CAMACARI", label: "Violência Doméstica", shortLabel: "V.D." },
  { value: "EXECUCAO_PENAL", label: "Exec. Penal", shortLabel: "EP" },
  { value: "GRUPO_JURI", label: "Grupo Esp. Júri", shortLabel: "GEJ" },
  { value: "SUBSTITUICAO", label: "Subst. Criminal", shortLabel: "Crim" },
  { value: "SUBSTITUICAO_CIVEL", label: "Subst. Cível", shortLabel: "Cível" },
];
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface Assistido {
  id: number;
  nome: string;
  foto?: string | null;
  preso: boolean;
}

interface Processo {
  id: number;
  numeroAutos: string;
  vara?: string;
  isJuri?: boolean;
}

interface Demanda {
  id: number;
  ato: string;
  prazo: Date;
  urgente: boolean;
}

interface Audiencia {
  id: number;
  data: Date;
  tipo: string;
  local?: string;
}

interface Testemunha {
  id: number;
  nome: string;
  tipo: "defesa" | "acusacao" | "informante";
  ouvida: boolean;
  dataOitiva?: Date | null;
}

interface Prova {
  id: number;
  tipo: "documental" | "pericial" | "testemunhal" | "material";
  descricao: string;
  status: "juntada" | "pendente" | "requerida" | "indeferida";
}

interface Laudo {
  id: number;
  tipo: string;
  descricao: string;
  data?: Date | null;
  favoravel?: boolean | null;
}

interface Caso {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  comarca: string;
  vara?: string | null;
  dataInicio: Date;
  fase: number;
  faseNome: string;
  status: "ativo" | "suspenso" | "arquivado";
  prioridade: string;
  // Conexões
  assistidos: Assistido[];
  processos: Processo[];
  demandasPendentes: Demanda[];
  proximaAudiencia?: Audiencia | null;
  // Teoria do Caso - Expandida
  teoriaResumo?: string | null;
  teoriaCompleta: boolean;
  teseAcusacao?: string | null;
  versaoReu?: string | null;
  investigacaoDefensiva?: string | null;
  // Testemunhas
  testemunhas?: Testemunha[];
  interrogatorioRealizado?: boolean;
  // Provas e Laudos
  provas?: Prova[];
  laudos?: Laudo[];
  // Links
  linkDrive?: string | null;
  // Meta
  defensorNome?: string | null;
  tags?: string[];
}

// ==========================================
// CONSTANTES
// ==========================================

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "V.D.",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Subst.",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

// Fases do caso - TODAS NEUTRAS para reduzir poluição visual
const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: "🔍", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: "⚖️", progress: 35 },
  PLENARIO: { label: "Plenário", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: "🎭", progress: 60 },
  RECURSO: { label: "Recurso", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: "📤", progress: 80 },
  EXECUCAO: { label: "Execução", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: "⏱️", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500", icon: "📁", progress: 100 },
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// Dados de exemplo completos com informações jurídicas ricas
const MOCK_CASOS: Caso[] = [
  {
    id: 1,
    titulo: "Homicídio Qualificado - Operação Reuso",
    codigo: "CASO-2025-001",
    atribuicao: "JURI_CAMACARI",
    comarca: "Camaçari",
    vara: "1ª Vara do Júri",
    dataInicio: new Date("2025-01-10"),
    fase: 35,
    faseNome: "INSTRUCAO",
    status: "ativo",
    prioridade: "REU_PRESO",
    assistidos: [
      { id: 1, nome: "José Carlos Santos", preso: true },
      { id: 2, nome: "Maria Aparecida Silva", preso: false },
    ],
    processos: [
      { id: 1, numeroAutos: "8012906-74.2025.8.05.0039", vara: "1ª Vara", isJuri: true },
      { id: 2, numeroAutos: "8012907-59.2025.8.05.0039", vara: "1ª Vara", isJuri: true },
    ],
    demandasPendentes: [
      { id: 1, ato: "Resposta à Acusação", prazo: new Date("2026-01-20"), urgente: true },
      { id: 2, ato: "Rol de Testemunhas", prazo: new Date("2026-01-25"), urgente: false },
    ],
    proximaAudiencia: {
      id: 1,
      data: new Date("2026-01-22T14:00:00"),
      tipo: "Instrução e Julgamento",
      local: "Sala 3 - Fórum de Camaçari",
    },
    teoriaResumo: "Legítima defesa. Réu agiu para proteger sua vida após ser atacado com faca pela vítima.",
    teoriaCompleta: false,
    teseAcusacao: "Homicídio qualificado por motivo fútil e meio cruel. Réu teria desferido múltiplas facadas na vítima após discussão por dívida de jogo.",
    versaoReu: "Estava no bar quando a vítima chegou armada com faca exigindo dinheiro. Tentou sair mas foi atacado. Na luta, conseguiu tomar a faca e se defendeu. Não tinha intenção de matar.",
    investigacaoDefensiva: "Localizar câmeras do bar (solicitado ao Google). Ouvir testemunha Carlos (ex-dono do bar). Verificar antecedentes violentos da vítima.",
    testemunhas: [
      { id: 1, nome: "Maria Silva", tipo: "defesa", ouvida: true, dataOitiva: new Date("2026-01-10") },
      { id: 2, nome: "Pedro Santos (garçom)", tipo: "defesa", ouvida: false, dataOitiva: null },
      { id: 3, nome: "José Oliveira (vítima 2)", tipo: "acusacao", ouvida: true, dataOitiva: new Date("2026-01-10") },
      { id: 4, nome: "Ana Costa", tipo: "acusacao", ouvida: false, dataOitiva: null },
      { id: 5, nome: "Carlos (dono do bar)", tipo: "informante", ouvida: false, dataOitiva: null },
    ],
    interrogatorioRealizado: false,
    provas: [
      { id: 1, tipo: "documental", descricao: "Boletim de ocorrência", status: "juntada" },
      { id: 2, tipo: "pericial", descricao: "Laudo necroscópico", status: "juntada" },
      { id: 3, tipo: "material", descricao: "Faca apreendida", status: "juntada" },
      { id: 4, tipo: "documental", descricao: "Imagens de câmera", status: "requerida" },
      { id: 5, tipo: "pericial", descricao: "Exame de DNA na faca", status: "pendente" },
    ],
    laudos: [
      { id: 1, tipo: "Necroscópico", descricao: "IML - causa mortis", data: new Date("2025-01-12"), favoravel: null },
      { id: 2, tipo: "Local", descricao: "Perícia no bar", data: new Date("2025-01-11"), favoravel: true },
    ],
    linkDrive: "https://drive.google.com/drive/folders/example",
    defensorNome: "Dr. Rodrigo Rocha",
    tags: ["LegitimaDefesa", "ExcessoPrazo", "NulidadeBusca"],
  },
  {
    id: 2,
    titulo: "Tráfico de Drogas - Bairro Nova Esperança",
    codigo: "CASO-2025-002",
    atribuicao: "SUBSTITUICAO",
    comarca: "Camaçari",
    vara: "2ª Vara Criminal",
    dataInicio: new Date("2025-01-15"),
    fase: 80,
    faseNome: "RECURSO",
    status: "ativo",
    prioridade: "ALTA",
    assistidos: [
      { id: 3, nome: "Pedro Almeida", preso: false },
    ],
    processos: [
      { id: 3, numeroAutos: "0001234-56.2025.8.05.0039" },
    ],
    demandasPendentes: [
      { id: 3, ato: "Razões de Apelação", prazo: new Date("2026-01-28"), urgente: false },
    ],
    proximaAudiencia: null,
    teoriaResumo: "Porte para uso pessoal. Quantidade incompatível com tráfico e ausência de prova de comercialização.",
    teoriaCompleta: true,
    teseAcusacao: "Tráfico de drogas. Réu encontrado com 50g de maconha em porções individuais, balança de precisão e dinheiro trocado.",
    versaoReu: "Usuário de maconha há 10 anos. Comprou quantidade maior para consumo mensal. Balança era para pesar as porções do próprio consumo.",
    testemunhas: [
      { id: 1, nome: "PM condutor", tipo: "acusacao", ouvida: true, dataOitiva: new Date("2025-12-01") },
      { id: 2, nome: "Mãe do réu", tipo: "defesa", ouvida: true, dataOitiva: new Date("2025-12-01") },
    ],
    interrogatorioRealizado: true,
    provas: [
      { id: 1, tipo: "material", descricao: "Droga apreendida", status: "juntada" },
      { id: 2, tipo: "documental", descricao: "Laudo toxicológico do réu", status: "juntada" },
    ],
    laudos: [
      { id: 1, tipo: "Toxicológico", descricao: "Confirmação de uso", data: new Date("2025-02-10"), favoravel: true },
    ],
    linkDrive: null,
    defensorNome: "Dra. Maria Oliveira",
    tags: ["FlagranteForjado", "ProvaIlicita"],
  },
  {
    id: 3,
    titulo: "Latrocínio Tentado - Posto Central",
    codigo: "CASO-2025-003",
    atribuicao: "JURI_CAMACARI",
    comarca: "Camaçari",
    vara: "1ª Vara do Júri",
    dataInicio: new Date("2024-11-20"),
    fase: 60,
    faseNome: "PLENARIO",
    status: "ativo",
    prioridade: "REU_PRESO",
    assistidos: [
      { id: 4, nome: "Marcos Silva", preso: true },
    ],
    processos: [
      { id: 4, numeroAutos: "8002341-90.2025.8.05.0039", isJuri: true },
    ],
    demandasPendentes: [
      { id: 4, ato: "Memoriais", prazo: new Date("2026-02-05"), urgente: false },
    ],
    proximaAudiencia: {
      id: 2,
      data: new Date("2026-02-15T09:00:00"),
      tipo: "Plenário do Júri",
      local: "Plenário - Fórum de Camaçari",
    },
    teoriaResumo: "Desclassificação para roubo simples. Ausência de prova da intenção de matar.",
    teoriaCompleta: true,
    teseAcusacao: "Latrocínio tentado. Réu teria efetuado disparo contra vítima durante roubo a posto de gasolina.",
    versaoReu: "Admite o roubo mas nega ter atirado. Diz que a arma disparou acidentalmente quando frentista tentou tomá-la.",
    investigacaoDefensiva: "Perícia independente na arma. Verificar se vítima tem treinamento em armas.",
    testemunhas: [
      { id: 1, nome: "Frentista (vítima)", tipo: "acusacao", ouvida: true, dataOitiva: new Date("2025-09-15") },
      { id: 2, nome: "Cliente do posto", tipo: "acusacao", ouvida: true, dataOitiva: new Date("2025-09-15") },
      { id: 3, nome: "Perito balística", tipo: "informante", ouvida: true, dataOitiva: new Date("2025-10-01") },
    ],
    interrogatorioRealizado: true,
    provas: [
      { id: 1, tipo: "material", descricao: "Arma apreendida", status: "juntada" },
      { id: 2, tipo: "pericial", descricao: "Laudo balístico", status: "juntada" },
      { id: 3, tipo: "documental", descricao: "Imagens de câmera", status: "juntada" },
    ],
    laudos: [
      { id: 1, tipo: "Balístico", descricao: "Análise do disparo", data: new Date("2025-01-20"), favoravel: false },
      { id: 2, tipo: "Médico", descricao: "Lesões na vítima", data: new Date("2024-12-01"), favoravel: null },
    ],
    linkDrive: "https://drive.google.com/drive/folders/example2",
    defensorNome: "Dr. Rodrigo Rocha",
    tags: ["Desclassificacao", "RubroQuesito"],
  },
  {
    id: 4,
    titulo: "Agressão em Contexto Doméstico - MPU",
    codigo: "CASO-2025-004",
    atribuicao: "VVD_CAMACARI",
    comarca: "Camaçari",
    vara: "Vara de Violência Doméstica",
    dataInicio: new Date("2025-06-10"),
    fase: 35,
    faseNome: "INSTRUCAO",
    status: "ativo",
    prioridade: "NORMAL",
    assistidos: [
      { id: 5, nome: "Ana Paula Ferreira", preso: false, foto: null },
    ],
    processos: [
      { id: 5, numeroAutos: "0005678-12.2025.8.05.0039" },
    ],
    demandasPendentes: [
      { id: 5, ato: "Revogação de MPU", prazo: new Date("2026-01-30"), urgente: false },
    ],
    proximaAudiencia: {
      id: 3,
      data: new Date("2026-02-10T10:00:00"),
      tipo: "Instrução",
      local: "Sala 5",
    },
    teoriaResumo: "Atipicidade da conduta. Discussão verbal sem violência física comprovada.",
    teoriaCompleta: false,
    teseAcusacao: "Lesão corporal no contexto doméstico. Vítima apresentou hematomas supostamente causados pela ré.",
    versaoReu: "Discussão verbal após descobrir traição. Não houve contato físico. Hematomas são de queda anterior.",
    testemunhas: [
      { id: 1, nome: "Vizinha Clara", tipo: "defesa", ouvida: false, dataOitiva: null },
      { id: 2, nome: "Ex-companheiro (vítima)", tipo: "acusacao", ouvida: false, dataOitiva: null },
    ],
    interrogatorioRealizado: false,
    provas: [
      { id: 1, tipo: "documental", descricao: "Laudo de corpo de delito", status: "juntada" },
      { id: 2, tipo: "documental", descricao: "Prontuário médico anterior", status: "requerida" },
    ],
    laudos: [
      { id: 1, tipo: "Corpo delito", descricao: "Exame na vítima", data: new Date("2025-06-11"), favoravel: false },
    ],
    linkDrive: null,
    defensorNome: "Dra. Juliane Costa",
    tags: ["MPU", "Atipicidade"],
  },
  {
    id: 5,
    titulo: "Progressão de Regime - Trabalho Externo",
    codigo: "CASO-2025-005",
    atribuicao: "EXECUCAO_PENAL",
    comarca: "Camaçari",
    vara: "VEP",
    dataInicio: new Date("2023-06-15"),
    fase: 90,
    faseNome: "EXECUCAO",
    status: "ativo",
    prioridade: "ALTA",
    assistidos: [
      { id: 6, nome: "José Carlos Oliveira", preso: true },
    ],
    processos: [
      { id: 6, numeroAutos: "0009999-88.2024.8.05.0039" },
    ],
    demandasPendentes: [
      { id: 6, ato: "Pedido de Progressão", prazo: new Date("2026-02-01"), urgente: true },
    ],
    proximaAudiencia: null,
    teoriaResumo: "Cumprimento de 2/5 da pena. Bom comportamento atestado. Apto para progressão ao semiaberto.",
    teoriaCompleta: true,
    versaoReu: "Trabalhando na faxina do pavilhão. Estudando para concluir ensino médio. Família aguarda retorno.",
    provas: [
      { id: 1, tipo: "documental", descricao: "Atestado de comportamento", status: "juntada" },
      { id: 2, tipo: "documental", descricao: "Certificado de curso", status: "juntada" },
      { id: 3, tipo: "documental", descricao: "Carta de emprego", status: "pendente" },
    ],
    laudos: [
      { id: 1, tipo: "Psicossocial", descricao: "Avaliação para progressão", data: new Date("2026-01-05"), favoravel: true },
    ],
    linkDrive: "https://drive.google.com/drive/folders/example3",
    defensorNome: "Dr. Rodrigo Rocha",
    tags: ["Progressao", "Remicao", "BomComportamento"],
  },
];

// ==========================================
// COMPONENTE DE CARD SOFISTICADO (DOSSIER)
// ==========================================

function CasoCardDossier({ caso }: { caso: Caso }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCNJ, setCopiedCNJ] = useState<string | null>(null);

  const themeColors = ATRIBUICAO_COLORS[caso.atribuicao] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const atribuicaoLabel = ATRIBUICAO_LABELS[caso.atribuicao] || caso.atribuicao;

  const hasAudienciaHoje = caso.proximaAudiencia && isToday(caso.proximaAudiencia.data);
  const hasAudienciaAmanha = caso.proximaAudiencia && isTomorrow(caso.proximaAudiencia.data);
  const hasReuPreso = caso.assistidos.some(a => a.preso);
  const tempoDecorrido = formatDistanceToNow(caso.dataInicio, { locale: ptBR });

  const handleCopyCNJ = (cnj: string) => {
    navigator.clipboard.writeText(cnj);
    setCopiedCNJ(cnj);
    setTimeout(() => setCopiedCNJ(null), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card className={cn(
        "group bg-white dark:bg-zinc-950",
        "border border-zinc-200 dark:border-zinc-800",
        "transition-all duration-300",
        "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700",
        "border-l-[4px]",
        themeColors.border,
        hasReuPreso && "ring-1 ring-rose-200 dark:ring-rose-900/50"
      )}>
        
        {/* CAMADA A: CABEÇALHO - DESIGN SUÍÇO */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
          {/* Topo */}
          <div className="flex justify-between items-start gap-2 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              {/* Badges de Status - ORDENAÇÃO: Status/Fase → Atribuição → Réu Preso */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* 1. FASE/STATUS DO PROCESSO - Primeiro */}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-semibold uppercase px-1.5 py-0 rounded-md",
                    FASES_CASO[caso.faseNome as keyof typeof FASES_CASO]?.color || "bg-zinc-100 text-zinc-600"
                  )}
                >
                  {FASES_CASO[caso.faseNome as keyof typeof FASES_CASO]?.label || caso.faseNome}
                </Badge>

                {/* 2. ATRIBUIÇÃO/WORKSPACE - Neutro */}
                <Badge 
                  variant="neutral" 
                  className="text-xs font-mono tracking-wider uppercase px-1.5 py-0"
                >
                  {atribuicaoLabel}
                </Badge>
                
                {/* 3. CÓDIGO (secundário) */}
                {caso.codigo && (
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                    {caso.codigo}
                  </span>
                )}

                {/* 4. RÉU PRESO - Ícone de cadeado */}
                {hasReuPreso && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-4 h-4 text-rose-500" />
                    </TooltipTrigger>
                    <TooltipContent>Preso</TooltipContent>
                  </Tooltip>
                )}

                {/* 5. AUDIÊNCIA HOJE/AMANHÃ */}
                {hasAudienciaHoje && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                    </span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">
                      Hoje
                    </span>
                  </span>
                )}

                {hasAudienciaAmanha && !hasAudienciaHoje && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-1.5 py-0 rounded-md border border-amber-200 dark:border-amber-800">
                    Amanhã
                  </Badge>
                )}

                {/* 6. TEORIA COMPLETA */}
                {caso.teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Teoria do Caso Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título (Serifada - Elegante) */}
              <Link href={`/admin/casos/${caso.id}`}>
                <h3 className="font-serif text-base sm:text-lg font-medium text-foreground leading-tight hover:text-primary transition-colors cursor-pointer line-clamp-2 tracking-[-0.01em]">
                  {caso.titulo}
                </h3>
              </Link>

              {/* Meta-dados */}
              <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground font-medium flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 sm:gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-[150px]">
                        {caso.vara ? `${caso.vara}` : caso.comarca}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{caso.vara} - {caso.comarca}</TooltipContent>
                </Tooltip>

                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Há </span><span>{tempoDecorrido}</span>
                </span>

                {caso.defensorNome && (
                  <span className="flex items-center gap-1.5 hidden sm:flex">
                    <Users className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[100px]">{caso.defensorNome}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas - Sempre visíveis no mobile */}
            <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/admin/casos/${caso.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ver Detalhes</TooltipContent>
              </Tooltip>

              {caso.linkDrive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Abrir no Drive</TooltipContent>
                </Tooltip>
              )}

              <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* CAMADA B: CONEXÕES - MOBILE OPTIMIZED */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2.5 sm:py-3 gap-2 sm:gap-0 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Assistidos (Avatares) */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex -space-x-2">
                {caso.assistidos.slice(0, 3).map((assistido) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger asChild>
                      <Avatar className={cn(
                        "h-7 w-7 sm:h-9 sm:w-9 border-2 border-white dark:border-zinc-950 transition-transform hover:scale-110 hover:z-10",
                        assistido.preso && "ring-2 ring-rose-500"
                      )}>
                        <AvatarImage src={assistido.foto || undefined} />
                        <AvatarFallback className={cn(
                          "text-xs font-bold",
                          assistido.preso 
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        )}>
                          {assistido.nome.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{assistido.nome}</p>
                        {assistido.preso && (
                          <p className="text-rose-400 text-xs flex items-center gap-1 justify-center">
                            <Lock className="w-3 h-3" />
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {caso.assistidos.length > 3 && (
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                    +{caso.assistidos.length - 3}
                  </div>
                )}
              </div>
              
              {caso.assistidos.length === 1 && (
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[120px] sm:max-w-none">
                  {caso.assistidos[0].nome}
                </span>
              )}
            </div>

            {/* Badges de Processos - Scroll horizontal no mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
              {caso.processos.slice(0, 2).map((processo) => (
                <Tooltip key={processo.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs cursor-pointer transition-colors flex-shrink-0 px-1.5 py-0",
                        "border-zinc-200 dark:border-zinc-800 text-zinc-500",
                        "hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                        copiedCNJ === processo.numeroAutos && "border-emerald-500 text-emerald-600"
                      )}
                      onClick={() => handleCopyCNJ(processo.numeroAutos)}
                    >
                      {copiedCNJ === processo.numeroAutos ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> OK
                        </span>
                      ) : (
                        <>
                          {processo.isJuri && <Gavel className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />}
                          <span className="hidden sm:inline">{processo.numeroAutos.split('.')[0]}...</span>
                          <span className="sm:hidden">{processo.numeroAutos.split('-')[0]}</span>
                        </>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <Copy className="w-3 h-3" />
                      <span className="font-mono text-xs">{processo.numeroAutos}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {caso.processos.length > 2 && (
                <span className="text-xs text-zinc-400 flex-shrink-0">+{caso.processos.length - 2}</span>
              )}
            </div>
          </div>

          {/* Barra de Progresso - Responsiva */}
          <div className="space-y-1">
            {/* Labels no desktop */}
            <div className="hidden sm:flex justify-between text-xs uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span 
                  key={label}
                  className={cn(
                    (caso.fase / 100) * (FASE_LABELS.length - 1) >= idx && "text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            {/* No mobile, mostra só a fase atual */}
            <div className="flex sm:hidden items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">{FASES_CASO[caso.faseNome as keyof typeof FASES_CASO]?.label || caso.faseNome}</span>
              <span className="font-mono">{caso.fase}%</span>
            </div>
            <Progress 
              value={caso.fase} 
              className="h-1 sm:h-1.5 bg-zinc-100 dark:bg-zinc-800" 
            />
          </div>
        </div>

        {/* CAMADA C: GAVETA EXPANSÍVEL - DESIGN SUÍÇO EXPANDIDO */}
        <CollapsibleContent>
          <div className="px-3 sm:px-5 pb-4 sm:pb-5 space-y-3 sm:space-y-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/30 dark:to-zinc-950">
            
            {/* Teoria da Defesa */}
            {caso.teoriaResumo && (
              <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                <h4 className="text-xs uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Shield className="w-3 h-3" /> Teoria da Defesa
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-serif italic">
                  &ldquo;{caso.teoriaResumo}&rdquo;
                </p>
              </div>
            )}

            {/* Tese da Acusação */}
            {caso.teseAcusacao && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-100 dark:border-rose-900/50">
                <h4 className="text-xs uppercase font-semibold text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Swords className="w-3 h-3" /> Tese da Acusação
                </h4>
                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
                  {caso.teseAcusacao}
                </p>
              </div>
            )}

            {/* Versão do Réu */}
            {caso.versaoReu && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                <h4 className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <User className="w-3 h-3" /> Versão do Réu
                </h4>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                  {caso.versaoReu}
                </p>
              </div>
            )}

            {/* Testemunhas */}
            {caso.testemunhas && caso.testemunhas.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-xs uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-2 mb-2">
                  <Users className="w-3 h-3" /> 
                  Testemunhas ({caso.testemunhas.filter(t => t.ouvida).length}/{caso.testemunhas.length})
                </h4>
                
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                    <UserCheck className="w-2.5 h-2.5" />
                    {caso.testemunhas.filter(t => t.ouvida).length} ouvidas
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    <UserX className="w-2.5 h-2.5" />
                    {caso.testemunhas.filter(t => !t.ouvida).length} pendentes
                  </span>
                  {caso.interrogatorioRealizado !== undefined && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      caso.interrogatorioRealizado 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                    )}>
                      <User className="w-2.5 h-2.5" />
                      {caso.interrogatorioRealizado ? "Interrogado" : "Interrog. Pendente"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 max-h-[100px] overflow-y-auto">
                  {caso.testemunhas.slice(0, 4).map((testemunha) => (
                    <div
                      key={testemunha.id}
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded text-xs",
                        testemunha.ouvida 
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {testemunha.ouvida ? (
                          <CircleDot className="w-2.5 h-2.5 flex-shrink-0" />
                        ) : (
                          <Circle className="w-2.5 h-2.5 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{testemunha.nome}</span>
                      </div>
                      <Badge variant="neutral" className="text-xs px-1 py-0 ml-1">
                        {testemunha.tipo === "defesa" ? "DEF" : testemunha.tipo === "acusacao" ? "ACUS" : "INFO"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provas e Laudos */}
            {((caso.provas && caso.provas.length > 0) || (caso.laudos && caso.laudos.length > 0)) && (
              <div className="grid grid-cols-2 gap-2">
                {caso.provas && caso.provas.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileSearch className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs uppercase font-semibold tracking-wider text-zinc-500">Provas</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold font-mono text-zinc-700 dark:text-zinc-300">
                        {caso.provas.filter(p => p.status === "juntada").length}
                      </span>
                      <span className="text-xs text-zinc-400">/{caso.provas.length}</span>
                    </div>
                    {caso.provas.filter(p => p.status === "pendente" || p.status === "requerida").length > 0 && (
                      <Badge variant="neutral" className="text-xs px-1 py-0 mt-1">
                        {caso.provas.filter(p => p.status === "pendente" || p.status === "requerida").length} pendentes
                      </Badge>
                    )}
                  </div>
                )}

                {caso.laudos && caso.laudos.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Microscope className="w-3 h-3 text-zinc-400" />
                      <span className="text-xs uppercase font-semibold tracking-wider text-zinc-500">Laudos</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold font-mono text-zinc-700 dark:text-zinc-300">
                        {caso.laudos.length}
                      </span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {caso.laudos.filter(l => l.favoravel === true).length > 0 && (
                        <Badge variant="neutral" className="text-xs px-1 py-0">
                          ✓ {caso.laudos.filter(l => l.favoravel === true).length} fav.
                        </Badge>
                      )}
                      {caso.laudos.filter(l => l.favoravel === false).length > 0 && (
                        <Badge variant="neutral" className="text-xs px-1 py-0">
                          ✗ {caso.laudos.filter(l => l.favoravel === false).length} desf.
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Investigação Defensiva */}
            {caso.investigacaoDefensiva && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-violet-50/80 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-100 dark:border-violet-900/50">
                <h4 className="text-xs uppercase font-semibold text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <FileSearch className="w-3 h-3" /> Investigação Defensiva
                </h4>
                <p className="text-xs sm:text-sm text-violet-700 dark:text-violet-300 leading-relaxed">
                  {caso.investigacaoDefensiva}
                </p>
              </div>
            )}

            {/* Próxima Audiência */}
            {caso.proximaAudiencia && (
              <div className={cn(
                "flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border",
                hasAudienciaHoje 
                  ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              )}>
                <AlertTriangle className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0",
                  hasAudienciaHoje ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                )} />
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-xs font-bold block",
                    hasAudienciaHoje ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                  )}>
                    Próxima Audiência
                  </span>
                  <p className={cn(
                    "text-xs",
                    hasAudienciaHoje ? "text-rose-600 dark:text-rose-500" : "text-amber-600 dark:text-amber-500"
                  )}>
                    <span className="font-medium">{caso.proximaAudiencia.tipo}</span>
                    <span className="hidden sm:inline"> • </span>
                    <br className="sm:hidden" />
                    <span className="font-mono">{format(caso.proximaAudiencia.data, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Prazos Pendentes */}
            {caso.demandasPendentes.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-xs uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3" /> Próximos Prazos ({caso.demandasPendentes.length})
                </h4>
                <div className="space-y-1">
                  {caso.demandasPendentes.slice(0, 3).map((demanda) => {
                    const dias = differenceInDays(demanda.prazo, new Date());
                    const isUrgente = dias <= 3;
                    return (
                      <div
                        key={demanda.id}
                        className={cn(
                          "flex items-center justify-between py-1.5 px-2 rounded text-xs",
                          isUrgente 
                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                            : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{demanda.ato}</span>
                        <span className={cn(
                          "font-mono text-xs flex-shrink-0 ml-2",
                          isUrgente && "font-bold"
                        )}>
                          {dias === 0 ? "HOJE" : dias === 1 ? "Amanhã" : format(demanda.prazo, "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {caso.tags && caso.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1 sm:pt-2">
                {caso.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs px-1.5 sm:px-2 py-0 border-dashed border-zinc-300 dark:border-zinc-700"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 pt-2">
              <Link href={`/admin/casos/${caso.id}`} className="col-span-2 sm:col-span-1">
                <Button variant="outline" className="w-full h-8 sm:h-9 text-xs border-zinc-200 dark:border-zinc-700">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                  Ver Caso
                </Button>
              </Link>
              {caso.linkDrive && (
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer" className="col-span-1">
                  <Button variant="outline" className="w-full h-8 sm:h-9 text-xs border-zinc-200 dark:border-zinc-700">
                    <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                    <span className="hidden sm:inline">Drive</span>
                    <span className="sm:hidden">📁</span>
                  </Button>
                </a>
              )}
              <Button variant="outline" className="col-span-1 h-8 sm:h-9 text-xs border-zinc-200 dark:border-zinc-700">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                <span className="hidden sm:inline">Contato</span>
                <span className="sm:hidden">💬</span>
              </Button>
            </div>
          </div>
        </CollapsibleContent>

        {/* Trigger */}
        <CollapsibleTrigger asChild>
          <div className="flex justify-center py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              {isOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Recolher</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Ver detalhes</span>
                </>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
      </Card>
    </Collapsible>
  );
}

// ==========================================
// COMPONENTE DE LINHA DA TABELA
// ==========================================

function CasoTableRow({ caso }: { caso: Caso }) {
  const themeColors = ATRIBUICAO_COLORS[caso.atribuicao] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const hasReuPreso = caso.assistidos.some(a => a.preso);
  const faseConfig = FASES_CASO[caso.faseNome as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;

  return (
    <SwissTableRow className={cn(
      "group transition-colors cursor-pointer hover:bg-muted/50",
      hasReuPreso && "border-l-[3px] border-l-rose-500"
    )}>
      <SwissTableCell className="py-4">
        <Link href={`/admin/casos/${caso.id}`} className="block">
          <div className="font-serif font-medium text-sm text-foreground hover:text-primary transition-colors tracking-[-0.01em]">
            {caso.titulo}
          </div>
          <code className="font-mono text-xs text-muted-foreground mt-1 block">{caso.codigo}</code>
        </Link>
      </SwissTableCell>
      <SwissTableCell className="py-4">
        <div className="flex items-center gap-2">
          {caso.assistidos.slice(0, 2).map((a) => (
            <Avatar key={a.id} className={cn(
              "w-8 h-8 ring-2 ring-background",
              a.preso ? "ring-rose-500" : "ring-muted"
            )}>
              <AvatarFallback className="text-xs font-medium">
                {a.nome.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
          {caso.assistidos.length > 2 && (
            <span className="text-xs text-muted-foreground font-medium">+{caso.assistidos.length - 2}</span>
          )}
        </div>
      </SwissTableCell>
      <SwissTableCell className="py-4">
        <Badge className={cn("text-xs", faseConfig.color)}>
          {faseConfig.icon} {faseConfig.label}
        </Badge>
      </SwissTableCell>
      <SwissTableCell className="text-center py-4">
        <span className="font-semibold text-sm text-foreground">
          {caso.processos.length}
        </span>
      </SwissTableCell>
      <SwissTableCell className="text-center py-4">
        <span className={cn(
          "font-semibold text-sm",
          caso.demandasPendentes.length > 0 
            ? "text-amber-600 dark:text-amber-400" 
            : "text-muted-foreground"
        )}>
          {caso.demandasPendentes.length}
        </span>
      </SwissTableCell>
      <SwissTableCell className="text-center py-4">
        <span className={cn(
          "font-semibold text-sm",
          caso.teoriaCompleta 
            ? "text-emerald-600 dark:text-emerald-400" 
            : "text-muted-foreground"
        )}>
          {caso.teoriaCompleta ? "✓" : "○"}
        </span>
      </SwissTableCell>
      <SwissTableCell className="text-right py-4">
        <Link href={`/admin/casos/${caso.id}`}>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5">
            <Eye className="w-4 h-4" /> Ver
          </Button>
        </Link>
      </SwissTableCell>
    </SwissTableRow>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function CasosPage() {
  const { currentAssignment } = useAssignment();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFase, setFilterFase] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAtribuicao, setFilterAtribuicao] = useState<string>("all");

  const filteredCasos = useMemo(() => {
    return MOCK_CASOS.filter((caso) => {
      // Filtro por workspace
      const matchesWorkspace = filterAtribuicao === "all" || caso.atribuicao === filterAtribuicao;

      // Filtro por busca
      const matchesSearch =
        !searchTerm ||
        caso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caso.assistidos.some(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro por fase
      const matchesFase = filterFase === "all" || caso.faseNome === filterFase;

      // Filtro por status
      const matchesStatus = filterStatus === "all" || caso.status === filterStatus;

      return matchesWorkspace && matchesSearch && matchesFase && matchesStatus;
    });
  }, [searchTerm, filterFase, filterStatus, filterAtribuicao]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredCasos.length;
    const reuPreso = filteredCasos.filter(c => c.assistidos.some(a => a.preso)).length;
    const demandasPendentes = filteredCasos.reduce((acc, c) => acc + c.demandasPendentes.length, 0);
    const teoriaCompleta = filteredCasos.filter(c => c.teoriaCompleta).length;
    const audienciasProximas = filteredCasos.filter(c => c.proximaAudiencia).length;
    return { total, reuPreso, demandasPendentes, teoriaCompleta, audienciasProximas };
  }, [filteredCasos]);

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[filterAtribuicao] || ATRIBUICAO_COLORS.all;

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumbs className="mb-2" />
        
        {/* Page Header */}
        <PageHeader
          title="Casos Ativos"
          description="Dossiês expansíveis com teoria do caso integrada"
          actions={
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Caso</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          }
        />

        {/* Filtros por Atribuição - Filter Chips */}
        <FilterChipGroup label="Filtrar por Atribuição">
          {ATRIBUICAO_OPTIONS.map((option) => {
            const count = option.value === "all" 
              ? MOCK_CASOS.length 
              : MOCK_CASOS.filter(c => c.atribuicao === option.value).length;
            
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                value={option.value}
                selected={filterAtribuicao === option.value}
                onSelect={setFilterAtribuicao}
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
            icon={Briefcase}
            variant="default"
            size="sm"
          />
          <StatsCard
            label="Réu Preso"
            value={stats.reuPreso}
            icon={Lock}
            variant={stats.reuPreso > 0 ? "danger" : "default"}
            size="sm"
          />
          <StatsCard
            label="Demandas"
            value={stats.demandasPendentes}
            icon={Clock}
            variant={stats.demandasPendentes > 0 ? "warning" : "default"}
            size="sm"
          />
          <StatsCard
            label="Teoria OK"
            value={stats.teoriaCompleta}
            icon={Scale}
            variant="success"
            size="sm"
            className="hidden sm:flex"
          />
          <StatsCard
            label="Audiências"
            value={stats.audienciasProximas}
            icon={Calendar}
            variant="info"
            size="sm"
            className="hidden lg:flex"
          />
        </StatsGrid>

        {/* Search & Filters - Padronizado */}
        <SearchToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por título, código ou assistido..."
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={
            <>
              <FilterSelect
                label="Fase"
                value={filterFase}
                onValueChange={setFilterFase}
                options={[
                  { value: "all", label: "Todas fases" },
                  ...Object.entries(FASES_CASO).map(([key, val]) => ({
                    value: key,
                    label: `${val.icon} ${val.label}`,
                  })),
                ]}
                width="md"
              />
              <FilterSelect
                label="Status"
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "ativo", label: "Ativos" },
                  { value: "suspenso", label: "Suspensos" },
                  { value: "arquivado", label: "Arquivados" },
                ]}
                width="sm"
              />
            </>
          }
          activeFiltersCount={
            (filterFase !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0)
          }
          onClearFilters={() => {
            setFilterFase("all");
            setFilterStatus("all");
          }}
        />

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCasos.map((caso) => (
              <CasoCardDossier key={caso.id} caso={caso} />
            ))}
          </div>
        ) : (
          <SwissTableContainer className="max-h-[calc(100vh-320px)]">
            <SwissTable>
              <SwissTableHeader>
                <SwissTableRow className="bg-muted/50">
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Caso</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Assistidos</SwissTableHead>
                  <SwissTableHead className="font-semibold text-xs uppercase tracking-wider">Fase</SwissTableHead>
                  <SwissTableHead className="text-center font-semibold text-xs uppercase tracking-wider">Proc.</SwissTableHead>
                  <SwissTableHead className="text-center font-semibold text-xs uppercase tracking-wider">Dem.</SwissTableHead>
                  <SwissTableHead className="text-center font-semibold text-xs uppercase tracking-wider">Teoria</SwissTableHead>
                  <SwissTableHead className="text-right font-semibold text-xs uppercase tracking-wider">Ações</SwissTableHead>
                </SwissTableRow>
              </SwissTableHeader>
              <SwissTableBody>
                {filteredCasos.map((caso) => (
                  <CasoTableRow key={caso.id} caso={caso} />
                ))}
              </SwissTableBody>
            </SwissTable>
          </SwissTableContainer>
        )}

        {/* Empty State */}
        {filteredCasos.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="Nenhum caso encontrado"
            description="Crie um novo caso ou ajuste os filtros de busca."
            action={{
              label: "Criar Primeiro Caso",
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
