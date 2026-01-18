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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

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
  // Teoria do Caso
  teoriaResumo?: string | null;
  teoriaCompleta: boolean; // Se tem Fatos + Provas + Direito
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
          "hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700",
          "border-l-[4px]",
          themeColors.border,
          hasReupPreso && "ring-1 ring-rose-200 dark:ring-rose-900"
        )}
      >
        {/* ==========================================
            CAMADA A: CABEÇALHO (Sempre Visível)
            ========================================== */}
        <div className="p-5 space-y-4">
          {/* Topo: Badge + Título + Ações */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Badges de Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Badge de Atribuição */}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-mono tracking-wider uppercase",
                    themeColors.bg, themeColors.text
                  )}
                >
                  {atribuicaoLabel}
                </Badge>
                
                {/* Código do Caso */}
                {data.codigo && (
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {data.codigo}
                  </span>
                )}

                {/* Indicador de Audiência Hoje (Pulsante) */}
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

                {/* Indicador de Réu Preso */}
                {hasReupPreso && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                    </TooltipTrigger>
                    <TooltipContent>Réu Preso</TooltipContent>
                  </Tooltip>
                )}

                {/* Teoria Completa */}
                {data.teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Teoria do Caso Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título do Caso (Serifada) */}
              <Link href={`/admin/casos/${data.id}`}>
                <h3 className="font-serif text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                  {data.titulo}
                </h3>
              </Link>

              {/* Meta-dados: Localização e Data */}
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1.5 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">
                        {data.vara ? `${data.vara} - ${data.comarca}` : data.comarca}
                      </span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{data.vara} - {data.comarca}</TooltipContent>
                </Tooltip>

                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Há {tempoDecorrido}</span>
                </span>

                {data.defensorNome && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{data.defensorNome}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/admin/casos/${data.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Ver Detalhes</TooltipContent>
              </Tooltip>

              {data.linkDrive && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a href={data.linkDrive} target="_blank" rel="noopener noreferrer">
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

          {/* ==========================================
              CAMADA B: CONEXÕES (Integrado)
              ========================================== */}
          <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Assistidos (Avatares Sobrepostos) */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {data.assistidos.slice(0, 4).map((assistido) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger asChild>
                      <Avatar
                        className={cn(
                          "h-9 w-9 border-2 border-white dark:border-zinc-950 transition-transform hover:scale-110 hover:z-10",
                          assistido.preso && "ring-2 ring-rose-500"
                        )}
                      >
                        <AvatarImage src={assistido.foto || undefined} />
                        <AvatarFallback
                          className={cn(
                            "text-xs font-bold",
                            assistido.preso 
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          )}
                        >
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
                {data.assistidos.length > 4 && (
                  <div className="h-9 w-9 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                    +{data.assistidos.length - 4}
                  </div>
                )}
              </div>
              
              {data.assistidos.length === 1 && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  {data.assistidos[0].nome}
                </span>
              )}
            </div>

            {/* Badges de Processos (Clicáveis) */}
            <div className="flex items-center gap-2">
              {data.processos.slice(0, 2).map((processo) => (
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
              {data.processos.length > 2 && (
                <span className="text-xs text-zinc-400">+{data.processos.length - 2}</span>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Caso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest">
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
            <Progress 
              value={data.fase} 
              className="h-1.5 bg-zinc-100 dark:bg-zinc-800" 
            />
          </div>
        </div>

        {/* ==========================================
            CAMADA C: GAVETA EXPANSÍVEL
            ========================================== */}
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-zinc-100 dark:border-zinc-800/50 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/30 dark:to-zinc-950">
            {/* Teoria do Caso (Resumo) */}
            {data.teoriaResumo && (
              <div className="mt-4 space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
                  <Scale className="w-3 h-3" /> Teoria da Defesa
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-serif italic">
                  &ldquo;{data.teoriaResumo}&rdquo;
                </p>
              </div>
            )}

            {/* Próxima Audiência */}
            {data.proximaAudiencia && (
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
                    {data.proximaAudiencia.tipo} • {format(data.proximaAudiencia.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    {data.proximaAudiencia.local && ` • ${data.proximaAudiencia.local}`}
                  </p>
                </div>
              </div>
            )}

            {/* Prazos Pendentes */}
            {data.demandasPendentes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Próximos Prazos ({data.demandasPendentes.length})
                </h4>
                <div className="space-y-1.5">
                  {data.demandasPendentes.slice(0, 3).map((demanda) => (
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
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {data.tags.map((tag, idx) => (
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

            {/* Ações de Integração */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Link href={`/admin/casos/${data.id}`}>
                <Button variant="outline" className="w-full h-9 text-xs border-zinc-200 dark:border-zinc-700">
                  <Target className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Ver Caso
                </Button>
              </Link>
              {data.linkDrive && (
                <a href={data.linkDrive} target="_blank" rel="noopener noreferrer">
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

        {/* Trigger de Expansão */}
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
