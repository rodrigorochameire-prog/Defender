"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TeoriaDoCaso } from "@/components/casos/teoria-do-caso";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import {
  Briefcase,
  ArrowLeft,
  Scale,
  Users,
  Calendar,
  Clock,
  FileText,
  Link2,
  ExternalLink,
  FolderOpen,
  Lock,
  Unlock,
  Plus,
  MoreHorizontal,
  Edit3,
  Tag,
  MapPin,
  ChevronRight,
  Copy,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Gavel,
  AlertTriangle,
  Target,
  Brain,
  BookOpen,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  localPrisao?: string | null;
  crimePrincipal?: string | null;
  proximoPrazo?: Date | null;
}

interface Processo {
  id: number;
  numeroAutos: string;
  vara?: string | null;
  comarca?: string | null;
  fase?: string | null;
  isJuri: boolean;
}

interface Demanda {
  id: number;
  ato: string;
  prazo: Date;
  urgente: boolean;
}

interface Audiencia {
  id: number;
  dataAudiencia: Date;
  horario?: string | null;
  tipo: string;
  status: "A_DESIGNAR" | "DESIGNADA" | "REALIZADA" | "AGUARDANDO_ATA" | "CONCLUIDA" | "ADIADA" | "CANCELADA";
  sala?: string | null;
  local?: string | null;
  juiz?: string | null;
  promotor?: string | null;
  anotacoes?: string | null;
  resumoDefesa?: string | null;
  googleCalendarEventId?: string | null;
  casoId?: number | null;
  casoTitulo?: string | null;
  assistidoId?: number | null;
  assistidoNome?: string | null;
  assistidoFoto?: string | null;
  assistidoPreso?: boolean;
  processoId?: number | null;
  numeroAutos?: string | null;
  defensorNome?: string | null;
}

interface Caso {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  comarca: string;
  vara?: string | null;
  status: string;
  fase?: string | null;
  faseProgresso: number;
  prioridade: string;
  tags?: string | null;
  teoriaFatos?: string | null;
  teoriaProvas?: string | null;
  teoriaDireito?: string | null;
  linkDrive?: string | null;
  defensorNome?: string | null;
  observacoes?: string | null;
  assistidos: Assistido[];
  processos: Processo[];
  audiencias: Audiencia[];
  demandasPendentes: Demanda[];
  createdAt: Date;
}

interface CasoConexo {
  id: number;
  titulo: string;
  codigo?: string | null;
  tagComum: string;
  assistidoNome: string;
  preso: boolean;
}

// ==========================================
// CONSTANTES
// ==========================================

const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: "🔍", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "⚖️", progress: 35 },
  PLENARIO: { label: "Plenário", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "🎭", progress: 60 },
  RECURSO: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📤", progress: 80 },
  EXECUCAO: { label: "Execução", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏱️", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: "📁", progress: 100 },
};

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
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  VVD_CAMACARI: "Violência Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição",
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// Dados de exemplo
const MOCK_CASO: Caso = {
  id: 1,
  titulo: "Homicídio Qualificado - Operação Reuso",
  codigo: "CASO-2025-001",
  atribuicao: "JURI_CAMACARI",
  comarca: "Camaçari",
  vara: "1ª Vara do Júri",
  status: "ativo",
  fase: "INSTRUCAO",
  faseProgresso: 35,
  prioridade: "REU_PRESO",
  tags: JSON.stringify(["NulidadeBusca", "ExcessoPrazo", "LegitimaDefesa"]),
  teoriaFatos: "O assistido estava em sua residência quando foi surpreendido pela polícia em operação não identificada. Não houve mandado de busca e apreensão. A abordagem ocorreu após denúncia anônima, sem investigação prévia.",
  teoriaProvas: "- Câmeras de segurança do vizinho mostram chegada abrupta da polícia\n- Testemunha (vizinho) confirma que não houve apresentação de mandado\n- Laudo pericial inconclusivo quanto à propriedade da arma",
  teoriaDireito: null,
  linkDrive: "https://drive.google.com/drive/folders/example",
  defensorNome: "Dr. Rodrigo Rocha",
  observacoes: "Caso complexo com múltiplos coautores. Priorizar tese de nulidade.",
  assistidos: [
    { id: 1, nome: "José Carlos Santos", preso: true, localPrisao: "Cadeia Pública de Camaçari", crimePrincipal: "Homicídio Qualificado (Art. 121, §2º)", proximoPrazo: new Date("2026-01-25") },
    { id: 2, nome: "Pedro Oliveira Lima", preso: true, localPrisao: "COP", crimePrincipal: "Homicídio Qualificado (Art. 121, §2º)" },
  ],
  processos: [
    { id: 1, numeroAutos: "8002341-90.2025.8.05.0039", vara: "Vara do Júri", comarca: "Camaçari", fase: "instrucao", isJuri: true },
    { id: 2, numeroAutos: "8002342-75.2025.8.05.0039", vara: "Vara do Júri", comarca: "Camaçari", fase: "instrucao", isJuri: true },
    { id: 3, numeroAutos: "8002500-10.2025.8.05.0000", vara: "Câmara Criminal", comarca: "Salvador", fase: "recurso", isJuri: false },
  ],
  audiencias: [
    {
      id: 1,
      dataAudiencia: new Date("2026-01-25"),
      horario: "09:00",
      tipo: "INSTRUCAO",
      status: "DESIGNADA",
      sala: "3",
      local: "Fórum de Camaçari",
      juiz: "Dr. Carlos Mendes",
      promotor: "Dr. Fernando Costa",
      resumoDefesa: "Focar na nulidade da busca domiciliar sem mandado",
      assistidoId: 1,
      assistidoNome: "José Carlos Santos",
      assistidoPreso: true,
      processoId: 1,
      numeroAutos: "8002341-90.2025.8.05.0039",
      defensorNome: "Dr. Rodrigo Rocha",
    },
    {
      id: 2,
      dataAudiencia: new Date("2026-02-10"),
      horario: "14:00",
      tipo: "INSTRUCAO",
      status: "DESIGNADA",
      sala: "2",
      local: "Fórum de Camaçari",
      assistidoId: 2,
      assistidoNome: "Pedro Oliveira Lima",
      assistidoPreso: true,
      processoId: 2,
      numeroAutos: "8002342-75.2025.8.05.0039",
      defensorNome: "Dr. Rodrigo Rocha",
    },
  ],
  demandasPendentes: [
    { id: 1, ato: "Rol de Testemunhas", prazo: new Date("2026-01-22"), urgente: true },
    { id: 2, ato: "Memoriais", prazo: new Date("2026-02-05"), urgente: false },
  ],
  createdAt: new Date("2025-01-10"),
};

const MOCK_CONEXOS: CasoConexo[] = [
  { id: 5, titulo: "Homicídio Privilegiado - Bairro Centro", codigo: "CASO-2024-087", tagComum: "LegitimaDefesa", assistidoNome: "Maria Silva", preso: false },
  { id: 7, titulo: "Tentativa de Homicídio - Mercado", codigo: "CASO-2024-092", tagComum: "NulidadeBusca", assistidoNome: "Carlos Mendes", preso: true },
];

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function AssistidoCardSophisticated({ assistido, showExtras = true }: { assistido: Assistido; showExtras?: boolean }) {
  const [copied, setCopied] = useState(false);
  
  const diasRestantes = assistido.proximoPrazo 
    ? differenceInDays(assistido.proximoPrazo, new Date())
    : null;
  const prazoUrgente = diasRestantes !== null && diasRestantes <= 3;

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md",
      "border-l-[3px]",
      assistido.preso ? "border-l-rose-500" : "border-l-emerald-500"
    )}>
      <div className="p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <Avatar className={cn(
            "w-11 h-11 ring-2 transition-transform group-hover:scale-105",
            assistido.preso ? "ring-rose-500/50" : "ring-emerald-500/50"
          )}>
            <AvatarImage src={assistido.foto || undefined} />
            <AvatarFallback className={cn(
              "text-sm font-bold",
              assistido.preso 
                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
            )}>
              {assistido.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {assistido.nome}
              </h4>
            </Link>
            
            <div className="flex items-center gap-2 mt-1">
              {assistido.preso ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400">
                  <Lock className="w-2.5 h-2.5 mr-1" /> Preso
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400">
                  <Unlock className="w-2.5 h-2.5 mr-1" /> Solto
                </Badge>
              )}
              
              {assistido.localPrisao && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[100px] flex items-center">
                  <MapPin className="w-2.5 h-2.5 mr-0.5" />
                  {assistido.localPrisao}
                </span>
              )}
            </div>
          </div>
          
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Dados extras */}
        {showExtras && (
          <>
            {assistido.crimePrincipal && (
              <div className="py-2 border-t border-dashed border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-start gap-2">
                  <Gavel className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-legal text-zinc-600 dark:text-zinc-400">
                    {assistido.crimePrincipal}
                  </span>
                </div>
              </div>
            )}

            {assistido.proximoPrazo && (
              <div className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                prazoUrgente 
                  ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                  : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
              )}>
                <Clock className="w-3 h-3" />
                <span className="font-medium">
                  {diasRestantes === 0 ? "Prazo hoje" : diasRestantes === 1 ? "Prazo amanhã" : `Prazo em ${diasRestantes}d`}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function ProcessoCardSophisticated({ processo }: { processo: Processo }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
    )}>
      <div className="p-4 flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-xl",
          processo.isJuri 
            ? "bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-900/10" 
            : "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10"
        )}>
          <Scale className={cn(
            "w-5 h-5",
            processo.isJuri ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {processo.numeroAutos}
            </p>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-400" />
              )}
            </Button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {processo.vara} • {processo.comarca}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {processo.isJuri && (
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">
              <Gavel className="w-3 h-3 mr-1" /> Júri
            </Badge>
          )}
          
          <Link href={`/admin/processos/${processo.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function CasoConexoCard({ caso }: { caso: CasoConexo }) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md">
      <div className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Link2 className="w-4 h-4 text-zinc-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {caso.titulo}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-zinc-400">{caso.codigo}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed">
              #{caso.tagComum}
            </Badge>
          </div>
        </div>
        
        <Avatar className={cn("w-8 h-8 ring-1", caso.preso ? "ring-rose-500" : "ring-emerald-500")}>
          <AvatarFallback className="text-[10px]">
            {caso.assistidoNome.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <Link href={`/admin/casos/${caso.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function CasoDetailPage() {
  const params = useParams();
  const casoId = params.id as string;
  const [activeTab, setActiveTab] = useState("teoria");

  // Em produção, buscar dados do caso via tRPC
  const caso = MOCK_CASO;
  const faseConfig = FASES_CASO[caso.fase as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;
  const themeColors = ATRIBUICAO_COLORS[caso.atribuicao] || ATRIBUICAO_COLORS.SUBSTITUICAO;
  const tags = caso.tags ? JSON.parse(caso.tags) : [];
  const tempoDecorrido = formatDistanceToNow(caso.createdAt, { locale: ptBR });
  
  // Verificar teoria completa
  const teoriaCompleta = caso.teoriaFatos && caso.teoriaProvas && caso.teoriaDireito;
  const teoriaProgresso = [caso.teoriaFatos, caso.teoriaProvas, caso.teoriaDireito].filter(Boolean).length;

  // Verificar próxima audiência
  const proximaAudiencia = caso.audiencias.find(a => a.status === "DESIGNADA");
  const hasAudienciaHoje = proximaAudiencia && isToday(proximaAudiencia.dataAudiencia);
  const hasAudienciaAmanha = proximaAudiencia && isTomorrow(proximaAudiencia.dataAudiencia);

  const handleTeoriaUpdate = async (
    field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito", 
    value: string
  ) => {
    console.log("Atualizando", field, "com:", value);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleAudienciaUpdate = async (id: number, data: Partial<Audiencia>) => {
    console.log("Atualizando audiência", id, "com:", data);
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const handleCreateTask = (audiencia: Audiencia, taskType: string) => {
    console.log("Criando tarefa", taskType, "para audiência", audiencia.id);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Sofisticado */}
        <div className="flex flex-col gap-6">
          {/* Navigation & Actions */}
          <div className="flex items-center justify-between">
            <Link href="/admin/casos">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Casos
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              {caso.linkDrive && (
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Drive
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              )}
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Contato
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit3 className="w-4 h-4" />
                Editar
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Título e Meta-dados */}
          <div className="flex items-start gap-5">
            <div className={cn(
              "p-4 rounded-2xl",
              "bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30"
            )}>
              <Briefcase className="w-8 h-8 text-indigo-700 dark:text-indigo-400" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {caso.codigo && (
                  <span className="font-mono text-sm text-zinc-400 dark:text-zinc-500">
                    {caso.codigo}
                  </span>
                )}
                
                <Badge className={cn("text-xs", themeColors.bg, themeColors.text)}>
                  {ATRIBUICAO_LABELS[caso.atribuicao] || caso.atribuicao}
                </Badge>
                
                <Badge className={cn("text-xs", faseConfig.color)}>
                  {faseConfig.icon} {faseConfig.label}
                </Badge>
                
                <Badge variant="outline" className="text-xs capitalize border-zinc-300 dark:border-zinc-700">
                  {caso.status}
                </Badge>

                {hasAudienciaHoje && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                      Audiência Hoje
                    </span>
                  </span>
                )}

                {hasAudienciaAmanha && !hasAudienciaHoje && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                    Audiência Amanhã
                  </Badge>
                )}

                {teoriaCompleta && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </TooltipTrigger>
                    <TooltipContent>Teoria do Caso Completa</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Título */}
              <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                {caso.titulo}
              </h1>

              {/* Meta-dados */}
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {caso.vara} • {caso.comarca}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Há {tempoDecorrido}
                </span>
                {caso.defensorNome && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {caso.defensorNome}
                  </span>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((tag: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-[10px] px-2 py-0.5 border-dashed cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Tag className="w-2.5 h-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-zinc-400">
                    <Plus className="w-2.5 h-2.5 mr-1" />
                    Tag
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Caso */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span 
                  key={label}
                  className={cn(
                    (caso.faseProgresso / 100) * (FASE_LABELS.length - 1) >= idx && "text-zinc-600 dark:text-zinc-300"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            <Progress 
              value={caso.faseProgresso} 
              className="h-2 bg-zinc-100 dark:bg-zinc-800" 
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Users className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {caso.assistidos.length}
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Assistidos ({caso.assistidos.filter(a => a.preso).length} presos)
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Scale className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {caso.processos.length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Processos ({caso.processos.filter(p => p.isJuri).length} júri)
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {caso.demandasPendentes.length}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Demandas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Calendar className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {caso.audiencias.filter(a => a.status === "DESIGNADA").length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Audiências</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 border-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 shadow-sm">
                <Brain className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                  {teoriaProgresso}/3
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Teoria</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Alerta de Próxima Audiência */}
        {proximaAudiencia && (hasAudienciaHoje || hasAudienciaAmanha) && (
          <Card className={cn(
            "p-4 border-l-4",
            hasAudienciaHoje 
              ? "border-l-rose-500 bg-rose-50 dark:bg-rose-900/20" 
              : "border-l-amber-500 bg-amber-50 dark:bg-amber-900/20"
          )}>
            <div className="flex items-center gap-4">
              <AlertTriangle className={cn(
                "w-6 h-6",
                hasAudienciaHoje ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
              )} />
              <div className="flex-1">
                <p className={cn(
                  "font-semibold text-sm",
                  hasAudienciaHoje ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"
                )}>
                  Audiência {hasAudienciaHoje ? "Hoje" : "Amanhã"} às {proximaAudiencia.horario}
                </p>
                <p className={cn(
                  "text-xs",
                  hasAudienciaHoje ? "text-rose-600 dark:text-rose-500" : "text-amber-600 dark:text-amber-500"
                )}>
                  {proximaAudiencia.tipo} • {proximaAudiencia.assistidoNome} • {proximaAudiencia.local}
                </p>
              </div>
              <Link href="#audiencias">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("audiencias")}>
                  Ver Detalhes
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 h-auto flex-wrap">
            <TabsTrigger value="teoria" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Teoria do Caso</span>
              <span className="sm:hidden">Teoria</span>
              {!teoriaCompleta && (
                <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {teoriaProgresso}/3
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Audiências</span>
              <span className="sm:hidden">Aud.</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {caso.audiencias.filter(a => a.status === "DESIGNADA").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="assistidos" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Assistidos</span>
              <span className="sm:hidden">Ass.</span>
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Processos</span>
              <span className="sm:hidden">Proc.</span>
            </TabsTrigger>
            <TabsTrigger value="conexoes" className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Conexões</span>
              <span className="sm:hidden">Con.</span>
              {MOCK_CONEXOS.length > 0 && (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Teoria do Caso */}
          <TabsContent value="teoria" className="mt-6">
            <TeoriaDoCaso
              casoId={caso.id}
              teoriaFatos={caso.teoriaFatos}
              teoriaProvas={caso.teoriaProvas}
              teoriaDireito={caso.teoriaDireito}
              linkDrive={caso.linkDrive}
              onUpdate={handleTeoriaUpdate}
            />
          </TabsContent>

          {/* Tab: Audiências */}
          <TabsContent value="audiencias" className="mt-6" id="audiencias">
            <AudienciasHub
              audiencias={caso.audiencias as any}
              onAudienciaUpdate={handleAudienciaUpdate}
              onCreateTask={handleCreateTask}
            />
          </TabsContent>

          {/* Tab: Assistidos */}
          <TabsContent value="assistidos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Assistidos Vinculados
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {caso.assistidos.filter(a => a.preso).length} de {caso.assistidos.length} com restrição de liberdade
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Vincular
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caso.assistidos.map((assistido) => (
                  <AssistidoCardSophisticated key={assistido.id} assistido={assistido} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Processos */}
          <TabsContent value="processos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Processos Vinculados
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {caso.processos.filter(p => p.isJuri).length} processos do Júri
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Vincular
                </Button>
              </div>
              
              <div className="space-y-3">
                {caso.processos.map((processo) => (
                  <ProcessoCardSophisticated key={processo.id} processo={processo} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Conexões */}
          <TabsContent value="conexoes" className="mt-6">
            <div className="space-y-6">
              {/* Casos Conexos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Casos Conexos
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Relacionados por coautoria, fatos ou teses similares
                    </p>
                  </div>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Conectar
                  </Button>
                </div>

                {MOCK_CONEXOS.length > 0 ? (
                  <div className="space-y-3">
                    {MOCK_CONEXOS.map((conexo) => (
                      <CasoConexoCard key={conexo.id} caso={conexo} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <Link2 className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nenhum caso conectado
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      Conecte casos com teses similares para acessar rapidamente petições de sucesso.
                    </p>
                  </Card>
                )}
              </div>

              {/* Sugestões Inteligentes */}
              <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-300">
                      Sugestão Inteligente
                    </h4>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                      Encontramos <strong>5 outros casos</strong> com a tag #{tags[0] || "similar"}. 
                      Deseja ver as petições de sucesso desses casos?
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400">
                        <Target className="w-3 h-3 mr-1" />
                        Ver Casos Similares
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400">
                        <BookOpen className="w-3 h-3 mr-1" />
                        Ver Petições
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
