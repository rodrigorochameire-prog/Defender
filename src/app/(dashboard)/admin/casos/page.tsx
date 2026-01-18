"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";
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

interface Caso {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  comarca: string;
  vara?: string | null;
  dataInicio: Date;
  fase: number; // 0-100 (progresso)
  faseNome: string;
  status: "ativo" | "suspenso" | "arquivado";
  prioridade: string;
  // Conexões
  assistidos: Assistido[];
  processos: Processo[];
  demandasPendentes: Demanda[];
  proximaAudiencia?: Audiencia | null;
  // Teoria do Caso
  teoriaResumo?: string | null;
  teoriaCompleta: boolean;
  // Links
  linkDrive?: string | null;
  // Meta
  defensorNome?: string | null;
  tags?: string[];
}

// ==========================================
// CONSTANTES
// ==========================================

const ATRIBUICAO_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  JURI_CAMACARI: { 
    border: "border-l-emerald-600 dark:border-l-emerald-500", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400"
  },
  VVD_CAMACARI: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400"
  },
  SUBSTITUICAO: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400"
  },
  GRUPO_JURI: { 
    border: "border-l-orange-600 dark:border-l-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400"
  },
  SUBSTITUICAO_CIVEL: { 
    border: "border-l-purple-600 dark:border-l-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400"
  },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Júri",
  VVD_CAMACARI: "VVD",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Subst.",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: "🔍", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "⚖️", progress: 35 },
  PLENARIO: { label: "Plenário", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "🎭", progress: 60 },
  RECURSO: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📤", progress: 80 },
  EXECUCAO: { label: "Execução", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏱️", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: "📁", progress: 100 },
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// Dados de exemplo mais completos
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
    vara: "Vara de VVD",
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
        
        {/* CAMADA A: CABEÇALHO */}
        <div className="p-5 space-y-4">
          {/* Topo */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Badges de Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-mono tracking-wider uppercase",
                    themeColors.bg, themeColors.text
                  )}
                >
                  {atribuicaoLabel}
                </Badge>
                
                {caso.codigo && (
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {caso.codigo}
                  </span>
                )}

                {hasAudienciaHoje && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Hoje
                    </span>
                  </span>
                )}

                {hasAudienciaAmanha && !hasAudienciaHoje && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                    Amanhã
                  </Badge>
                )}

                {hasReuPreso && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                    </TooltipTrigger>
                    <TooltipContent>Réu Preso</TooltipContent>
                  </Tooltip>
                )}

                {caso.teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Teoria do Caso Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título (Serifada) */}
              <Link href={`/admin/casos/${caso.id}`}>
                <h3 className="font-serif text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                  {caso.titulo}
                </h3>
              </Link>

              {/* Meta-dados */}
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">
                        {caso.vara ? `${caso.vara}` : caso.comarca}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{caso.vara} - {caso.comarca}</TooltipContent>
                </Tooltip>

                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Há {tempoDecorrido}</span>
                </span>

                {caso.defensorNome && (
                  <span className="flex items-center gap-1.5 hidden sm:flex">
                    <Users className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{caso.defensorNome}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

          {/* CAMADA B: CONEXÕES */}
          <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Assistidos (Avatares) */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {caso.assistidos.slice(0, 4).map((assistido) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger asChild>
                      <Avatar className={cn(
                        "h-9 w-9 border-2 border-white dark:border-zinc-950 transition-transform hover:scale-110 hover:z-10",
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
                            <Lock className="w-3 h-3" /> Preso
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {caso.assistidos.length > 4 && (
                  <div className="h-9 w-9 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    +{caso.assistidos.length - 4}
                  </div>
                )}
              </div>
              
              {caso.assistidos.length === 1 && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[120px]">
                  {caso.assistidos[0].nome}
                </span>
              )}
            </div>

            {/* Badges de Processos (Clicáveis) */}
            <div className="flex items-center gap-2">
              {caso.processos.slice(0, 2).map((processo) => (
                <Tooltip key={processo.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] cursor-pointer transition-colors",
                        "border-zinc-200 dark:border-zinc-800 text-zinc-500",
                        "hover:border-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
                        copiedCNJ === processo.numeroAutos && "border-emerald-500 text-emerald-600"
                      )}
                      onClick={() => handleCopyCNJ(processo.numeroAutos)}
                    >
                      {copiedCNJ === processo.numeroAutos ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Copiado
                        </span>
                      ) : (
                        <>
                          {processo.isJuri && <Gavel className="w-3 h-3 mr-1" />}
                          {processo.numeroAutos.split('.')[0]}...
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
                <span className="text-xs text-zinc-400">+{caso.processos.length - 2}</span>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest">
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
            <Progress 
              value={caso.fase} 
              className="h-1.5 bg-zinc-100 dark:bg-zinc-800" 
            />
          </div>
        </div>

        {/* CAMADA C: GAVETA EXPANSÍVEL */}
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/30 dark:to-zinc-950">
            {/* Teoria do Caso */}
            {caso.teoriaResumo && (
              <div className="mt-4 space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
                  <Scale className="w-3 h-3" /> Teoria da Defesa
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-serif italic">
                  &ldquo;{caso.teoriaResumo}&rdquo;
                </p>
              </div>
            )}

            {/* Próxima Audiência */}
            {caso.proximaAudiencia && (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                hasAudienciaHoje 
                  ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                  : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              )}>
                <AlertTriangle className={cn(
                  "w-5 h-5 flex-shrink-0",
                  hasAudienciaHoje ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                )} />
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-xs font-bold",
                    hasAudienciaHoje ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                  )}>
                    Próxima Audiência
                  </span>
                  <p className={cn(
                    "text-xs truncate",
                    hasAudienciaHoje ? "text-rose-600 dark:text-rose-500" : "text-amber-600 dark:text-amber-500"
                  )}>
                    {caso.proximaAudiencia.tipo} • {format(caso.proximaAudiencia.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {caso.proximaAudiencia.local && ` • ${caso.proximaAudiencia.local}`}
                  </p>
                </div>
              </div>
            )}

            {/* Prazos Pendentes */}
            {caso.demandasPendentes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Próximos Prazos ({caso.demandasPendentes.length})
                </h4>
                <div className="space-y-1.5">
                  {caso.demandasPendentes.slice(0, 3).map((demanda) => (
                    <div
                      key={demanda.id}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded text-xs",
                        demanda.urgente 
                          ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                          : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <span className="font-medium truncate max-w-[200px]">{demanda.ato}</span>
                      <span className="font-mono text-[10px]">
                        {format(demanda.prazo, "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {caso.tags && caso.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {caso.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-[10px] px-2 py-0.5 border-dashed border-zinc-300 dark:border-zinc-700"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Link href={`/admin/casos/${caso.id}`}>
                <Button variant="outline" className="w-full h-9 text-xs border-zinc-200 dark:border-zinc-700">
                  <Target className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Ver Caso
                </Button>
              </Link>
              {caso.linkDrive && (
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full h-9 text-xs border-zinc-200 dark:border-zinc-700">
                    <FolderOpen className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                    Drive
                  </Button>
                </a>
              )}
              <Button variant="outline" className="h-9 text-xs border-zinc-200 dark:border-zinc-700">
                <MessageCircle className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                Contato
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
    <TableRow className={cn(
      "group transition-colors cursor-pointer",
      hasReuPreso && "border-l-[3px] border-l-rose-500"
    )}>
      <TableCell>
        <Link href={`/admin/casos/${caso.id}`} className="block">
          <div className="font-serif font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {caso.titulo}
          </div>
          <div className="font-mono text-[10px] text-zinc-400">{caso.codigo}</div>
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {caso.assistidos.slice(0, 2).map((a) => (
            <Avatar key={a.id} className={cn(
              "w-6 h-6 ring-1",
              a.preso ? "ring-rose-500" : "ring-emerald-500"
            )}>
              <AvatarFallback className="text-[10px]">
                {a.nome.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
          {caso.assistidos.length > 2 && (
            <span className="text-[10px] text-zinc-400">+{caso.assistidos.length - 2}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={cn("text-xs", faseConfig.color)}>
          {faseConfig.icon} {faseConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {caso.processos.length}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          "font-medium",
          caso.demandasPendentes.length > 0 
            ? "text-amber-600 dark:text-amber-400" 
            : "text-zinc-400"
        )}>
          {caso.demandasPendentes.length}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          "font-medium",
          caso.teoriaCompleta 
            ? "text-emerald-600 dark:text-emerald-400" 
            : "text-zinc-400"
        )}>
          {caso.teoriaCompleta ? "✓" : "○"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/admin/casos/${caso.id}`}>
          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-4 h-4 mr-1" /> Ver
          </Button>
        </Link>
      </TableCell>
    </TableRow>
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

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30">
              <Briefcase className="w-6 h-6 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Casos Ativos
                <Tooltip>
                  <TooltipTrigger>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>Gestão Inteligente com Teoria do Caso</TooltipContent>
                </Tooltip>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Dossiês expansíveis • Visual suíço • Dados integrados
              </p>
            </div>
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Caso
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Briefcase className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Lock className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{stats.reuPreso}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400">Réus Presos</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.demandasPendentes}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Demandas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Scale className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.teoriaCompleta}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Teoria OK</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.audienciasProximas}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Audiências</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por título, código ou assistido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-950"
            />
          </div>

          <Select value={filterAtribuicao} onValueChange={setFilterAtribuicao}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Atribuição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ATRIBUICAO_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              {Object.entries(FASES_CASO).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.icon} {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="suspenso">Suspensos</SelectItem>
              <SelectItem value="arquivado">Arquivados</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Grade</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Lista</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCasos.map((caso) => (
              <CasoCardDossier key={caso.id} caso={caso} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider">Caso</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider">Assistidos</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider">Fase</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider text-center">Proc.</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider text-center">Dem.</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider text-center">Teoria</TableHead>
                  <TableHead className="text-[10px] uppercase text-zinc-500 font-medium tracking-wider text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCasos.map((caso) => (
                  <CasoTableRow key={caso.id} caso={caso} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {filteredCasos.length === 0 && (
          <Card className="border-dashed">
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Nenhum caso encontrado
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Crie um novo caso ou ajuste os filtros de busca.
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Caso
              </Button>
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
