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
  FileUp,
  Hammer,
  ArrowUpRight,
  RefreshCw,
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

// Ato Processual para Timeline
interface AtoProcessual {
  id: number;
  tipo: "audiencia" | "peticao" | "decisao" | "sentenca" | "recurso" | "cumprimento" | "generico";
  descricao: string;
  data: Date;
  importante: boolean;
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
  // Timeline de Atos Processuais
  atosProcessuais?: AtoProcessual[];
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
          "group bg-white dark:bg-card",
          "border border-neutral-200 dark:border-border",
          "transition-all duration-300",
          "hover:shadow-md hover:border-neutral-300 dark:hover:border-border",
          "border-l-[3px]",
          themeColors.border
        )}
      >
        {/* ==========================================
            CAMADA A: CABEÇALHO (Sempre Visível)
            ========================================== */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Topo: Badge + Título + Ações */}
          <div className="flex justify-between items-start gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
              {/* Badges de Status - Organizado em linha */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                {/* Badge de Atribuição */}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs sm:text-sm font-mono tracking-wide uppercase px-2 py-0.5",
                    themeColors.bg, themeColors.text
                  )}
                >
                  {atribuicaoLabel}
                </Badge>
                
                {/* Código do Caso */}
                {data.codigo && (
                  <span className="text-xs sm:text-sm font-mono text-muted-foreground hidden sm:inline">
                    {data.codigo}
                  </span>
                )}

                {/* Indicador de Audiência Hoje (Pulsante) */}
                {hasAudienciaHoje && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-rose-500" />
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Hoje
                    </span>
                  </span>
                )}

                {hasAudienciaAmanha && !hasAudienciaHoje && (
                  <Badge className="bg-neutral-200 text-neutral-600 dark:bg-muted dark:text-foreground/80 text-xs sm:text-sm px-2 py-0.5">
                    Amanhã
                  </Badge>
                )}

                {/* Indicador de Prazo Urgente */}
                {prazoUrgente && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Prazo Urgente</TooltipContent>
                  </Tooltip>
                )}

                {/* Indicador de Réu Preso - Cadeado sutil */}
                {hasReupPreso && (
                  <PrisonerIndicator preso={true} size="xs" showTooltip={true} />
                )}

                {/* Estratégia Completa */}
                {data.teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Estratégia da Defesa Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título do Caso (Serifada) */}
              <Link href={`/admin/casos/${data.id}`}>
                <h3 className="font-serif text-lg sm:text-xl font-medium text-foreground leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer line-clamp-2">
                  {data.titulo}
                </h3>
              </Link>

              {/* Meta-dados: Localização e Data - Responsivo */}
              <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-muted-foreground font-medium flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 sm:gap-2 hover:text-foreground transition-colors">
                      <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-[180px]">
                        {data.vara ? `${data.vara}` : data.comarca}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{data.vara} - {data.comarca}</TooltipContent>
                </Tooltip>

                <span className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Há </span><span>{tempoDecorrido}</span>
                </span>

                {data.defensorNome && (
                  <span className="flex items-center gap-1.5 sm:gap-2 hidden sm:flex">
                    <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 flex-shrink-0" />
                    <span className="truncate max-w-[100px] sm:max-w-[120px]">{data.defensorNome}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas - Visíveis sempre no mobile */}
            <div className="flex gap-1 sm:gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/admin/casos/${data.id}`}>
                    <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                      <Eye className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ver Detalhes</TooltipContent>
              </Tooltip>

              {data.linkDrive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={data.linkDrive} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground hidden sm:flex">
                        <FolderOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                      </Button>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Abrir no Drive</TooltipContent>
                </Tooltip>
              )}

              <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>

          {/* ==========================================
              CAMADA B: CONEXÕES (Integrado) - Design Suíço
              ========================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 sm:py-5 gap-4 sm:gap-5 border-t border-border">
            {/* Assistidos (Avatares Clean) */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <div className="flex -space-x-2 sm:-space-x-2.5">
                {data.assistidos.slice(0, 3).map((assistido) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar
                          className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-white dark:border-background transition-transform hover:scale-110 hover:z-10"
                        >
                          <AvatarImage src={assistido.foto || undefined} />
                          <AvatarFallback className="text-xs sm:text-sm font-bold bg-neutral-100 text-neutral-600 dark:bg-muted dark:text-foreground/80">
                            {assistido.nome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Indicador de status prisional sutil */}
                        {assistido.preso && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-card">
                            <StatusPrisionalDot preso={true} size="xs" />
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <p className="font-medium text-sm">{assistido.nome}</p>
                          <PrisonerIndicator preso={assistido.preso} size="xs" showTooltip={false} />
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {data.assistidos.length > 3 && (
                  <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full border-2 border-white dark:border-background bg-neutral-100 dark:bg-muted flex items-center justify-center text-xs sm:text-sm font-bold text-neutral-500">
                    +{data.assistidos.length - 3}
                  </div>
                )}
              </div>
              
              {data.assistidos.length === 1 && (
                <span className="text-sm sm:text-base text-neutral-600 dark:text-muted-foreground font-medium truncate max-w-[140px] sm:max-w-none">
                  {data.assistidos[0].nome}
                </span>
              )}
            </div>

            {/* Badges de Processos (Clicáveis) - Horizontal scroll no mobile */}
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scrollbar-hide flex-shrink min-w-0">
              {data.processos.slice(0, 2).map((processo) => (
                <Tooltip key={processo.id}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs sm:text-sm cursor-pointer transition-colors flex-shrink-0 px-2.5 py-1",
                        "border-neutral-300 dark:border-border text-neutral-600 dark:text-muted-foreground",
                        "hover:border-neutral-400 hover:text-neutral-700 dark:hover:text-foreground/80",
                        copiedCNJ === processo.numeroAutos && "border-emerald-500 text-emerald-600"
                      )}
                      onClick={() => handleCopyCNJ(processo.numeroAutos)}
                    >
                      {copiedCNJ === processo.numeroAutos ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> OK
                        </span>
                      ) : (
                        <>
                          {processo.isJuri && <Gavel className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />}
                          <span className="hidden sm:inline">{processo.numeroAutos.split('.')[0]}...</span>
                          <span className="sm:hidden">{processo.numeroAutos.split('-')[0]}</span>
                        </>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <Copy className="w-3.5 h-3.5" />
                      <span className="font-mono text-sm">{processo.numeroAutos}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {data.processos.length > 2 && (
                <span className="text-xs sm:text-sm text-neutral-400 flex-shrink-0">+{data.processos.length - 2}</span>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Caso */}
          <div className="space-y-2">
            {/* Labels só no desktop */}
            <div className="hidden sm:flex justify-between text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              {FASE_LABELS.map((label, idx) => (
                <span 
                  key={label}
                  className={cn(
                    (data.fase / 100) * (FASE_LABELS.length - 1) >= idx && "text-neutral-600 dark:text-foreground/80"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            {/* No mobile, mostra só a fase atual */}
            <div className="flex sm:hidden items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span className="font-medium">{data.faseNome}</span>
              <span className="font-mono">{data.fase}%</span>
            </div>
            <Progress 
              value={data.fase} 
              className="h-1.5 sm:h-2 bg-neutral-100 dark:bg-muted" 
            />
          </div>
        </div>

        {/* ==========================================
            CAMADA C: GAVETA EXPANSÍVEL - DESIGN SUÍÇO
            Organização em containers com informações ricas
            ========================================== */}
        <CollapsibleContent>
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-4 sm:space-y-5 border-t border-border bg-gradient-to-b from-neutral-50/50 to-white dark:from-muted/30 dark:to-card">
            
            {/* ========================================
                SEÇÃO 1: ESTRATÉGIA DA DEFESA (Principal)
                Design limpo com borda lateral como indicador
                ======================================== */}
            {data.teoriaResumo && (
              <div className="mt-4 sm:mt-5 pl-4 sm:pl-5 py-3 sm:py-4 border-l-2 border-neutral-300 dark:border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Estratégia da Defesa
                </h4>
                <p className="text-base sm:text-lg text-foreground leading-relaxed font-serif italic">
                  &ldquo;{data.teoriaResumo}&rdquo;
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 2: TESE DA ACUSAÇÃO (Oposição)
                ======================================== */}
            {data.teseAcusacao && (
              <div className="pl-4 sm:pl-5 py-3 sm:py-4 border-l-2 border-neutral-300 dark:border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-2">
                  <Swords className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Tese da Acusação
                </h4>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  {data.teseAcusacao}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 3: VERSÃO DO RÉU NO ATENDIMENTO
                ======================================== */}
            {data.versaoReu && (
              <div className="pl-4 sm:pl-5 py-3 sm:py-4 border-l-2 border-neutral-300 dark:border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Versão do Réu
                </h4>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  {data.versaoReu}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 4: TESTEMUNHAS - Grid estruturado
                ======================================== */}
            {data.testemunhas && data.testemunhas.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Testemunhas
                  <span className="font-mono text-muted-foreground">
                    {data.testemunhas.filter(t => t.ouvida).length}/{data.testemunhas.length}
                  </span>
                </h4>
                
                {/* Status em linha */}
                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                  <span className="flex items-center gap-1.5 text-foreground/80">
                    <CircleDot className="w-3.5 h-3.5 text-neutral-500" />
                    {data.testemunhas.filter(t => t.ouvida).length} ouvidas
                  </span>
                  <span className="flex items-center gap-1.5 text-foreground/80">
                    <Circle className="w-3.5 h-3.5 text-neutral-400" />
                    {data.testemunhas.filter(t => !t.ouvida).length} pendentes
                  </span>
                  {data.interrogatorioRealizado !== undefined && (
                    <span className="flex items-center gap-1.5 text-foreground/80">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.interrogatorioRealizado ? "Interrogado" : "Interrog. Pendente"}
                    </span>
                  )}
                </div>

                {/* Lista de testemunhas */}
                <div className="space-y-1 max-h-[140px] overflow-y-auto">
                  {data.testemunhas.slice(0, 5).map((testemunha) => (
                    <div
                      key={testemunha.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-neutral-100 dark:hover:bg-muted/50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {testemunha.ouvida ? (
                          <CircleDot className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "font-medium truncate",
                          testemunha.ouvida ? "text-foreground" : "text-muted-foreground"
                        )}>{testemunha.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-neutral-400 uppercase">
                          {testemunha.tipo === "defesa" ? "DEF" : testemunha.tipo === "acusacao" ? "ACUS" : "INFO"}
                        </span>
                        {testemunha.dataOitiva && (
                          <span className="font-mono text-xs text-neutral-400">
                            {format(testemunha.dataOitiva, "dd/MM")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {data.testemunhas.length > 5 && (
                    <p className="text-sm text-neutral-400 text-center py-1.5">
                      +{data.testemunhas.length - 5} mais
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 5: PROVAS E LAUDOS - Layout horizontal
                ======================================== */}
            {((data.provas && data.provas.length > 0) || (data.laudos && data.laudos.length > 0)) && (
              <div className="pt-4 border-t border-border">
                <div className="flex flex-wrap gap-6 sm:gap-10">
                  {/* Provas */}
                  {data.provas && data.provas.length > 0 && (
                    <div className="flex items-center gap-3">
                      <FileSearch className="w-5 h-5 text-neutral-400" />
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-foreground">
                            {data.provas.filter(p => p.status === "juntada").length}
                          </span>
                          <span className="text-sm text-neutral-400">/{data.provas.length}</span>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-neutral-500">Provas</span>
                      </div>
                    </div>
                  )}

                  {/* Laudos */}
                  {data.laudos && data.laudos.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Microscope className="w-5 h-5 text-neutral-400" />
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold font-mono text-foreground">
                            {data.laudos.length}
                          </span>
                          {data.laudos.filter(l => l.favoravel === true).length > 0 && (
                            <span className="text-sm text-neutral-500">
                              ({data.laudos.filter(l => l.favoravel === true).length} fav.)
                            </span>
                          )}
                        </div>
                        <span className="text-xs uppercase tracking-wide text-neutral-500">Laudos</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 6: INVESTIGAÇÃO DEFENSIVA
                ======================================== */}
            {data.investigacaoDefensiva && (
              <div className="pl-4 sm:pl-5 py-3 sm:py-4 border-l-2 border-neutral-300 dark:border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-2">
                  <FileSearch className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Investigação Defensiva
                </h4>
                <p className="text-base sm:text-lg text-foreground leading-relaxed">
                  {data.investigacaoDefensiva}
                </p>
              </div>
            )}

            {/* ========================================
                SEÇÃO 7: PRÓXIMA AUDIÊNCIA
                ======================================== */}
            {data.proximaAudiencia && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-neutral-400" />
                  <div>
                    <span className="text-xs uppercase tracking-wide text-neutral-500 block">Próxima Audiência</span>
                    <p className="text-base sm:text-lg text-foreground">
                      <span className="font-medium">{data.proximaAudiencia.tipo}</span>
                      <span className="mx-2 text-neutral-300 dark:text-border">•</span>
                      <span className="font-mono">{format(data.proximaAudiencia.data, "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                      {data.proximaAudiencia.local && (
                        <span className="hidden sm:inline text-neutral-500 ml-2">({data.proximaAudiencia.local})</span>
                      )}
                    </p>
                  </div>
                  {hasAudienciaHoje && (
                    <span className="ml-auto px-2 py-1 text-xs font-semibold uppercase bg-neutral-200 dark:bg-muted text-neutral-700 dark:text-foreground rounded">
                      Hoje
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 8: TIMELINE DE ATOS PROCESSUAIS
                ======================================== */}
            {data.atosProcessuais && data.atosProcessuais.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-4">
                  <ScrollText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Timeline Processual
                  <span className="font-mono text-neutral-400">({data.atosProcessuais.length})</span>
                </h4>
                
                {/* Timeline Visual */}
                <div className="relative">
                  {/* Linha vertical */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400 via-neutral-300 to-neutral-200 dark:from-emerald-500 dark:via-border dark:to-border" />
                  
                  <div className="space-y-3">
                    {data.atosProcessuais.slice(0, 5).map((ato, idx) => {
                      const isFirst = idx === 0;
                      const atoIcons: Record<string, any> = {
                        audiencia: Gavel,
                        peticao: FileUp,
                        decisao: Hammer,
                        sentenca: Scale,
                        recurso: ArrowUpRight,
                        cumprimento: CheckCircle2,
                        generico: FileText,
                      };
                      const AtoIcon = atoIcons[ato.tipo] || FileText;
                      
                      return (
                        <div key={ato.id} className="relative flex items-start gap-3 pl-1">
                          {/* Dot/Icon */}
                          <div className={cn(
                            "relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                            isFirst 
                              ? "bg-emerald-500 border-emerald-400 text-white" 
                              : ato.importante 
                                ? "bg-neutral-100 dark:bg-muted border-neutral-300 dark:border-border"
                                : "bg-white dark:bg-background border-border"
                          )}>
                            <AtoIcon className={cn(
                              "w-3 h-3",
                              isFirst ? "text-white" : "text-muted-foreground"
                            )} />
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm leading-snug",
                                isFirst ? "font-medium text-foreground" : "text-muted-foreground"
                              )}>
                                {ato.descricao}
                              </p>
                              <span className={cn(
                                "text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded",
                                isFirst 
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                                  : "bg-neutral-100 dark:bg-muted text-muted-foreground"
                              )}>
                                {format(ato.data, "dd/MM/yy", { locale: ptBR })}
                              </span>
                            </div>
                            {ato.importante && !isFirst && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Importante
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {data.atosProcessuais.length > 5 && (
                    <Link href={`/admin/casos/${data.id}`}>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-neutral-500 hover:text-neutral-700">
                        Ver todos os {data.atosProcessuais.length} atos
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* ========================================
                SEÇÃO 9: PRAZOS PENDENTES
                ======================================== */}
            {data.demandasPendentes.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-xs sm:text-sm uppercase font-semibold text-muted-foreground tracking-wide flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  Próximos Prazos
                  <span className="font-mono text-neutral-400">({data.demandasPendentes.length})</span>
                </h4>
                <div className="space-y-1">
                  {data.demandasPendentes.slice(0, 3).map((demanda) => {
                    const dias = differenceInDays(demanda.prazo, new Date());
                    const isUrgente = dias <= 3;
                    return (
                      <div
                        key={demanda.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-neutral-100 dark:hover:bg-muted/50 transition-colors"
                      >
                        <span className={cn(
                          "font-medium truncate max-w-[200px] sm:max-w-[280px] text-sm",
                          isUrgente ? "text-foreground" : "text-foreground/80"
                        )}>{demanda.ato}</span>
                        <span className={cn(
                          "font-mono text-sm flex-shrink-0 ml-3",
                          isUrgente ? "font-bold text-foreground" : "text-muted-foreground"
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
              <div className="flex flex-wrap gap-2 pt-2 sm:pt-3">
                {data.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 border-dashed border-neutral-300 dark:border-border"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Ações de Integração - Responsivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-3">
              <Link href={`/admin/casos/${data.id}`} className="col-span-2 sm:col-span-1">
                <Button variant="outline" className="w-full h-10 sm:h-11 text-xs sm:text-sm border-neutral-300 dark:border-border">
                  <Target className="w-4 h-4 mr-2 text-muted-foreground" />
                  Ver Caso
                </Button>
              </Link>
              {data.linkDrive && (
                <a href={data.linkDrive} target="_blank" rel="noopener noreferrer" className="col-span-1">
                  <Button variant="outline" className="w-full h-10 sm:h-11 text-xs sm:text-sm border-neutral-300 dark:border-border">
                    <FolderOpen className="w-4 h-4 sm:mr-2 text-muted-foreground" />
                    <span className="hidden sm:inline">Drive</span>
                  </Button>
                </a>
              )}
              <Button variant="outline" className="col-span-1 h-10 sm:h-11 text-xs sm:text-sm border-neutral-300 dark:border-border">
                <MessageCircle className="w-4 h-4 sm:mr-2 text-muted-foreground" />
                <span className="hidden sm:inline">Contato</span>
              </Button>
            </div>
          </div>
        </CollapsibleContent>

        {/* Trigger de Expansão */}
        <CollapsibleTrigger asChild>
          <div className="flex justify-center py-2.5 sm:py-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-muted transition-colors border-t border-border">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
              {isOpen ? (
                <>
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Recolher</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
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
