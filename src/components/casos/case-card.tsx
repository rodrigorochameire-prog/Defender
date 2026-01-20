"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Scale,
  AlertTriangle,
  ExternalLink,
  MoreHorizontal,
  Clock,
  Copy,
  MessageCircle,
  FolderOpen,
  Lock,
  CheckCircle2,
  Target,
  Gavel,
  Eye,
  User,
  UserCheck,
  UserX,
  FileSearch,
  Shield,
  Swords,
  Microscope,
  ScrollText,
  CircleDot,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { PrisonerIndicator, StatusPrisionalDot } from "@/components/shared/prisoner-indicator";

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

// Testemunha
interface Testemunha {
  id: number;
  nome: string;
  tipo: "defesa" | "acusacao" | "informante";
  ouvida: boolean;
  dataOitiva?: Date | null;
}

// Prova
interface Prova {
  id: number;
  tipo: "documental" | "pericial" | "testemunhal" | "material";
  descricao: string;
  status: "juntada" | "pendente" | "requerida" | "indeferida";
}

// Laudo
interface Laudo {
  id: number;
  tipo: string;
  descricao: string;
  data?: Date | null;
  favoravel?: boolean | null;
}

export interface CaseCardProps {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  comarca: string;
  vara?: string | null;
  dataInicio: Date;
  fase: number; // 0-100 (progresso)
  faseNome: string; // "Inquérito", "Instrução", "Plenário", etc.
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
  VVD_CAMACARI: "V.D.",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "Subst.",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário/Sentença", "Recurso", "Execução"];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function CaseCard({ data }: { data: CaseCardProps }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCNJ, setCopiedCNJ] = useState<string | null>(null);

  const themeColors = ATRIBUICAO_COLORS[data.atribuicao] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const atribuicaoLabel = ATRIBUICAO_LABELS[data.atribuicao] || data.atribuicao;

  // Calcular se tem audiência hoje ou amanhã
  const hasAudienciaHoje = data.proximaAudiencia && isToday(data.proximaAudiencia.data);
  const hasAudienciaAmanha = data.proximaAudiencia && isTomorrow(data.proximaAudiencia.data);
  const hasReupPreso = data.assistidos.some(a => a.preso);

  // Calcular urgência de prazos
  const prazoUrgente = data.demandasPendentes.some(d => {
    const dias = differenceInDays(d.prazo, new Date());
    return dias <= 3;
  });

  // Tempo decorrido desde início
  const tempoDecorrido = formatDistanceToNow(data.dataInicio, { locale: ptBR });

  // Copiar CNJ
  const handleCopyCNJ = (cnj: string) => {
    navigator.clipboard.writeText(cnj);
    setCopiedCNJ(cnj);
    setTimeout(() => setCopiedCNJ(null), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card
        className={cn(
          "group bg-white dark:bg-zinc-950",
          "border border-zinc-200 dark:border-zinc-800",
          "transition-all duration-300",
          "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700",
          "border-l-[3px]",
          themeColors.border
        )}
      >
        {/* ==========================================
            CAMADA A: CABEÇALHO (Sempre Visível)
            ========================================== */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Topo: Badge + Título + Ações */}
          <div className="flex justify-between items-start gap-2 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
              {/* Badges de Status - Organizado em linha */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Badge de Atribuição */}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[9px] sm:text-[10px] font-mono tracking-wider uppercase px-1.5 py-0",
                    themeColors.bg, themeColors.text
                  )}
                >
                  {atribuicaoLabel}
                </Badge>
                
                {/* Código do Caso */}
                {data.codigo && (
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                    {data.codigo}
                  </span>
                )}

                {/* Indicador de Audiência Hoje (Pulsante) */}
                {hasAudienciaHoje && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-500" />
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Hoje
                    </span>
                  </span>
                )}

                {hasAudienciaAmanha && !hasAudienciaHoje && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] sm:text-[10px] px-1.5 py-0">
                    Amanhã
                  </Badge>
                )}

                {/* Indicador de Prazo Urgente */}
                {prazoUrgente && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Prazo Urgente</TooltipContent>
                  </Tooltip>
                )}

                {/* Indicador de Réu Preso - Cadeado sutil */}
                {hasReupPreso && (
                  <PrisonerIndicator preso={true} size="xs" showTooltip={true} />
                )}

                {/* Teoria Completa */}
                {data.teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Teoria do Caso Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título do Caso (Serifada) */}
              <Link href={`/admin/casos/${data.id}`}>
                <h3 className="font-serif text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer line-clamp-2">
                  {data.titulo}
                </h3>
              </Link>

              {/* Meta-dados: Localização e Data - Responsivo */}
              <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 sm:gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[100px] sm:max-w-[150px]">
                        {data.vara ? `${data.vara}` : data.comarca}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{data.vara} - {data.comarca}</TooltipContent>
                </Tooltip>

                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Há </span><span>{tempoDecorrido}</span>
                </span>

                {data.defensorNome && (
                  <span className="flex items-center gap-1 sm:gap-1.5 hidden sm:flex">
                    <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[80px] sm:max-w-[100px]">{data.defensorNome}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas - Visíveis sempre no mobile */}
            <div className="flex gap-0.5 sm:gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/admin/casos/${data.id}`}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ver Detalhes</TooltipContent>
              </Tooltip>

              {data.linkDrive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={data.linkDrive} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hidden sm:flex">
                        <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Abrir no Drive</TooltipContent>
                </Tooltip>
              )}

              <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>

          {/* ==========================================
              CAMADA B: CONEXÕES (Integrado) - Design Suíço
              ========================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 gap-3 sm:gap-4 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Assistidos (Avatares Clean) */}
            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              <div className="flex -space-x-1.5 sm:-space-x-2">
                {data.assistidos.slice(0, 3).map((assistido) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar
                          className="h-7 w-7 sm:h-9 sm:w-9 border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-110 hover:z-10"
                        >
                          <AvatarImage src={assistido.foto || undefined} />
                          <AvatarFallback className="text-[10px] sm:text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {assistido.nome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador de status prisional sutil */}
                        {assistido.preso && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-white dark:bg-zinc-950">
                            <StatusPrisionalDot preso={true} size="xs" />
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <p className="font-medium">{assistido.nome}</p>
                          {assistido.preso && (
                            <Lock className="w-3 h-3 text-rose-500" />
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {data.assistidos.length > 3 && (
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-zinc-500">
                    +{data.assistidos.length - 3}
                  </div>
                )}
              </div>
              
              {data.assistidos.length === 1 && (
                <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[120px] sm:max-w-none">
                  {data.assistidos[0].nome}
                </span>
              )}
            </div>

            {/* Badges de Processos (Clicáveis) - Horizontal scroll no mobile */}
            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-hide flex-shrink min-w-0">
              {data.processos.slice(0, 2).map((processo) => (
                <Tooltip key={processo.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[9px] sm:text-[10px] cursor-pointer transition-colors flex-shrink-0 px-1.5 py-0",
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
              {data.processos.length > 2 && (
                <span className="text-[10px] sm:text-xs text-zinc-400 flex-shrink-0">+{data.processos.length - 2}</span>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Caso */}
          <div className="space-y-1">
            {/* Labels só no desktop */}
            <div className="hidden sm:flex justify-between text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span 
                  key={label}
                  className={cn(
                    (data.fase / 100) * (FASE_LABELS.length - 1) >= idx && "text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            {/* No mobile, mostra só a fase atual */}
            <div className="flex sm:hidden items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">{data.faseNome}</span>
              <span className="font-mono">{data.fase}%</span>
            </div>
            <Progress 
              value={data.fase} 
              className="h-1 sm:h-1.5 bg-zinc-100 dark:bg-zinc-800" 
            />
          </div>
        </div>

        {/* ==========================================
            CAMADA C: GAVETA EXPANSÍVEL - DESIGN SUÍÇO
            Organização em containers com informações ricas
            ========================================== */}
        <CollapsibleContent>
          <div className="px-3 sm:px-5 pb-4 sm:pb-5 space-y-3 sm:space-y-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/30 dark:to-zinc-950">
            
            {/* ========================================
                SEÇÃO 1: TEORIA DA DEFESA (Principal)
                ======================================== */}
            {data.teoriaResumo && (
              <div className="mt-3 sm:mt-4 p-3 rounded-lg bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Shield className="w-3 h-3" /> Teoria da Defesa
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-serif italic">
                  &ldquo;{data.teoriaResumo}&rdquo;
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 2: TESE DA ACUSAÇÃO (Oposição)
                ======================================== */}
            {data.teseAcusacao && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border border-rose-100 dark:border-rose-900/50">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <Swords className="w-3 h-3" /> Tese da Acusação
                </h4>
                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
                  {data.teseAcusacao}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 3: VERSÃO DO RÉU NO ATENDIMENTO
                ======================================== */}
            {data.versaoReu && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <User className="w-3 h-3" /> Versão do Réu
                </h4>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                  {data.versaoReu}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 4: TESTEMUNHAS - Grid de status
                ======================================== */}
            {data.testemunhas && data.testemunhas.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2 mb-2">
                  <Users className="w-3 h-3" /> 
                  Testemunhas ({data.testemunhas.filter(t => t.ouvida).length}/{data.testemunhas.length})
                </h4>
                
                {/* Pills de status */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] sm:text-[10px] font-medium">
                    <UserCheck className="w-2.5 h-2.5" />
                    {data.testemunhas.filter(t => t.ouvida).length} ouvidas
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] sm:text-[10px] font-medium">
                    <UserX className="w-2.5 h-2.5" />
                    {data.testemunhas.filter(t => !t.ouvida).length} pendentes
                  </span>
                  {data.interrogatorioRealizado !== undefined && (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium",
                      data.interrogatorioRealizado 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                    )}>
                      <User className="w-2.5 h-2.5" />
                      {data.interrogatorioRealizado ? "Interrogado" : "Interrog. Pendente"}
                    </span>
                  )}
                </div>

                {/* Lista de testemunhas */}
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {data.testemunhas.slice(0, 5).map((testemunha) => (
                    <div
                      key={testemunha.id}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-2 rounded text-[10px] sm:text-xs",
                        testemunha.ouvida 
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {testemunha.ouvida ? (
                          <CircleDot className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">{testemunha.nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="outline" className={cn(
                          "text-[8px] px-1 py-0",
                          testemunha.tipo === "defesa" && "border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400",
                          testemunha.tipo === "acusacao" && "border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400",
                          testemunha.tipo === "informante" && "border-zinc-200 text-zinc-500 dark:border-zinc-700"
                        )}>
                          {testemunha.tipo === "defesa" ? "DEF" : testemunha.tipo === "acusacao" ? "ACUS" : "INFO"}
                        </Badge>
                        {testemunha.dataOitiva && (
                          <span className="font-mono text-[9px] text-zinc-400">
                            {format(testemunha.dataOitiva, "dd/MM")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {data.testemunhas.length > 5 && (
                    <p className="text-[10px] text-zinc-400 text-center py-1">
                      +{data.testemunhas.length - 5} mais
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 5: PROVAS E LAUDOS - Grid de cards
                ======================================== */}
            {((data.provas && data.provas.length > 0) || (data.laudos && data.laudos.length > 0)) && (
              <div className="grid grid-cols-2 gap-2">
                {/* Provas Documentais */}
                {data.provas && data.provas.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FileSearch className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Provas</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-xl font-bold font-mono text-zinc-700 dark:text-zinc-300">
                        {data.provas.filter(p => p.status === "juntada").length}
                      </span>
                      <span className="text-[10px] text-zinc-400">/{data.provas.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.provas.filter(p => p.status === "juntada").slice(0, 2).map((prova, idx) => (
                        <Badge key={idx} variant="outline" className="text-[8px] px-1 py-0 border-zinc-200 dark:border-zinc-700">
                          {prova.tipo === "documental" ? "📄" : prova.tipo === "pericial" ? "🔬" : prova.tipo === "testemunhal" ? "👥" : "📦"}
                        </Badge>
                      ))}
                      {data.provas.filter(p => p.status === "pendente").length > 0 && (
                        <Badge className="text-[8px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {data.provas.filter(p => p.status === "pendente").length} pend.
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Laudos Periciais */}
                {data.laudos && data.laudos.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Microscope className="w-3 h-3 text-zinc-400" />
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Laudos</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-xl font-bold font-mono text-zinc-700 dark:text-zinc-300">
                        {data.laudos.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.laudos.filter(l => l.favoravel === true).length > 0 && (
                        <Badge className="text-[8px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          ✓ {data.laudos.filter(l => l.favoravel === true).length} fav.
                        </Badge>
                      )}
                      {data.laudos.filter(l => l.favoravel === false).length > 0 && (
                        <Badge className="text-[8px] px-1 py-0 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                          ✗ {data.laudos.filter(l => l.favoravel === false).length} desfav.
                        </Badge>
                      )}
                      {data.laudos.filter(l => l.favoravel === null || l.favoravel === undefined).length > 0 && (
                        <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-200 dark:border-zinc-700">
                          {data.laudos.filter(l => l.favoravel === null || l.favoravel === undefined).length} neutros
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================
                SEÇÃO 6: INVESTIGAÇÃO DEFENSIVA
                ======================================== */}
            {data.investigacaoDefensiva && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-violet-50/80 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border border-violet-100 dark:border-violet-900/50">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 tracking-wider flex items-center gap-2 mb-1.5">
                  <FileSearch className="w-3 h-3" /> Investigação Defensiva
                </h4>
                <p className="text-xs sm:text-sm text-violet-700 dark:text-violet-300 leading-relaxed">
                  {data.investigacaoDefensiva}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 7: PRÓXIMA AUDIÊNCIA - Card de alerta
                ======================================== */}
            {data.proximaAudiencia && (
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
                    "text-[10px] sm:text-xs font-bold block",
                    hasAudienciaHoje ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                  )}>
                    Próxima Audiência
                  </span>
                  <p className={cn(
                    "text-[10px] sm:text-xs",
                    hasAudienciaHoje ? "text-rose-600 dark:text-rose-500" : "text-amber-600 dark:text-amber-500"
                  )}>
                    <span className="font-medium">{data.proximaAudiencia.tipo}</span>
                    <span className="hidden sm:inline"> • </span>
                    <br className="sm:hidden" />
                    <span className="font-mono">{format(data.proximaAudiencia.data, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                    {data.proximaAudiencia.local && (
                      <span className="hidden sm:inline truncate"> • {data.proximaAudiencia.local}</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 8: PRAZOS PENDENTES
                ======================================== */}
            {data.demandasPendentes.length > 0 && (
              <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                <h4 className="text-[9px] sm:text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3" /> Próximos Prazos ({data.demandasPendentes.length})
                </h4>
                <div className="space-y-1">
                  {data.demandasPendentes.slice(0, 3).map((demanda) => {
                    const dias = differenceInDays(demanda.prazo, new Date());
                    const isUrgente = dias <= 3;
                    return (
                      <div
                        key={demanda.id}
                        className={cn(
                          "flex items-center justify-between py-1.5 px-2 rounded text-[10px] sm:text-xs",
                          isUrgente 
                            ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                            : "bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{demanda.ato}</span>
                        <span className={cn(
                          "font-mono text-[9px] sm:text-[10px] flex-shrink-0 ml-2",
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
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-1.5 pt-1 sm:pt-2">
                {data.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0 border-dashed border-zinc-300 dark:border-zinc-700"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ações de Integração - Responsivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 pt-2">
              <Link href={`/admin/casos/${data.id}`} className="col-span-2 sm:col-span-1">
                <Button variant="outline" className="w-full h-8 sm:h-9 text-[10px] sm:text-xs border-zinc-200 dark:border-zinc-700">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                  Ver Caso
                </Button>
              </Link>
              {data.linkDrive && (
                <a href={data.linkDrive} target="_blank" rel="noopener noreferrer" className="col-span-1">
                  <Button variant="outline" className="w-full h-8 sm:h-9 text-[10px] sm:text-xs border-zinc-200 dark:border-zinc-700">
                    <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                    <span className="hidden sm:inline">Drive</span>
                    <span className="sm:hidden">📁</span>
                  </Button>
                </a>
              )}
              <Button variant="outline" className="col-span-1 h-8 sm:h-9 text-[10px] sm:text-xs border-zinc-200 dark:border-zinc-700">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-2 text-zinc-400" />
                <span className="hidden sm:inline">Contato</span>
                <span className="sm:hidden">💬</span>
              </Button>
            </div>
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão */}
        <CollapsibleTrigger asChild>
          <div className="flex justify-center py-1.5 sm:py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-zinc-400">
              {isOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Recolher</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
