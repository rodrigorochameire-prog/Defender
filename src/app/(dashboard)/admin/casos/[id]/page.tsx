"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TeoriaDoCaso } from "@/components/casos/teoria-do-caso";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import { PrisonerIndicator, StatusPrisionalDot } from "@/components/shared/prisoner-indicator";
import {
  Briefcase,
  ArrowLeft,
  Scale,
  Users,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  FolderOpen,
  Lock,
  Plus,
  MoreHorizontal,
  MapPin,
  CheckCircle2,
  MessageCircle,
  Gavel,
  AlertTriangle,
  Target,
  Activity,
  FileSearch,
  User,
  UserCheck,
  Swords,
  Shield,
  Eye,
  Scroll,
  AlertCircle,
  Circle,
  CircleDot,
  ChevronRight,
  Mic,
  Camera,
  FileQuestion,
  Bookmark,
  Copy,
  BookOpen,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, formatDistanceToNow, isToday, isTomorrow, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface Envolvido {
  id: number;
  nome: string;
  tipo: "reu" | "correu" | "testemunha_defesa" | "testemunha_acusacao" | "vitima" | "perito" | "informante";
  foto: string | null;
  preso: boolean;
  localPrisao?: string | null;
  status: "pendente" | "localizada" | "intimada" | "ouvida" | "falecido";
  descricao?: string | null;
  oitiva?: {
    data: Date | null;
    resumo: string | null;
  } | null;
}

interface ProcessoVinculado {
  id: number;
  numeroAutos: string;
  vara: string;
  fase: "INQUERITO" | "INSTRUCAO" | "PLENARIO" | "RECURSO" | "EXECUCAO";
  status: string;
  reus: string[];
  proximaAudiencia?: Date | null;
  proximoPrazo?: Date | null;
}

interface MovimentacaoProcessual {
  id: string;
  data: Date;
  tipo: "intimacao" | "decisao" | "despacho" | "audiencia" | "peticao" | "juntada" | "sentenca" | "acordao";
  titulo: string;
  descricao: string;
  processoId?: number;
  processoNumero?: string;
  urgente?: boolean;
  prazo?: Date | null;
}

interface PecaImportante {
  id: number;
  nome: string;
  tipo: "denuncia" | "resposta_acusacao" | "alegacoes_finais" | "laudo" | "interrogatorio" | "oitiva" | "decisao" | "sentenca" | "recurso";
  data: Date;
  resumo?: string | null;
  linkDrive?: string | null;
  favoravel?: boolean | null;
}

interface Diligencia {
  id: number;
  tipo: string;
  descricao: string;
  status: "pendente" | "em_andamento" | "concluida" | "frustrada";
  responsavel?: string | null;
  resultado?: string | null;
  dataLimite?: Date | null;
}

interface Laudo {
  id: number;
  tipo: string;
  descricao: string;
  data?: Date | null;
  perito?: string | null;
  conclusao?: string | null;
  favoravel?: boolean | null;
  linkDrive?: string | null;
}

interface Caso {
  id: number;
  titulo: string;
  codigo?: string | null;
  atribuicao: string;
  comarca: string;
  vara?: string | null;
  status: "ativo" | "suspenso" | "arquivado";
  fase: string;
  faseProgresso: number;
  prioridade: string;
  tags?: string[];
  // Teoria do Caso
  teseAcusacao?: string | null;
  versaoReu?: string | null;
  teoriaDefesa?: string | null;
  pontosFortes?: string[];
  pontosFracos?: string[];
  // Dados
  envolvidos: Envolvido[];
  processos: ProcessoVinculado[];
  movimentacoes: MovimentacaoProcessual[];
  pecas: PecaImportante[];
  diligencias: Diligencia[];
  laudos: Laudo[];
  // Meta
  linkDrive?: string | null;
  defensorNome?: string | null;
  observacoes?: string | null;
  createdAt: Date;
}

// ==========================================
// CONSTANTES
// ==========================================

const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", progress: 35 },
  PLENARIO: { label: "Plenário", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", progress: 60 },
  RECURSO: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", progress: 80 },
  EXECUCAO: { label: "Execução", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", progress: 100 },
};

const TIPO_ENVOLVIDO_CONFIG = {
  reu: { label: "Réu", color: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: User },
  correu: { label: "Corréu", color: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: Users },
  testemunha_defesa: { label: "Testemunha (Defesa)", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: UserCheck },
  testemunha_acusacao: { label: "Testemunha (Acusação)", color: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: User },
  vitima: { label: "Vítima", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertCircle },
  perito: { label: "Perito", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FileSearch },
  informante: { label: "Informante", color: "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400", icon: MessageCircle },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  VVD_CAMACARI: "V. Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// ==========================================
// DADOS MOCK - ESTUDO DE CASO COMPLETO
// ==========================================

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
  tags: ["NulidadeBusca", "ExcessoPrazo", "LegitimaDefesa"],
  
  // Teoria do Caso
  teseAcusacao: "O Ministério Público sustenta que o réu, de forma premeditada e mediante recurso que impossibilitou a defesa da vítima, desferiu golpes de arma branca que resultaram no óbito. Alega motivo torpe relacionado a desavenças por dívida de drogas.",
  versaoReu: "O assistido alega legítima defesa própria. Afirma que foi surpreendido pela vítima em sua residência, armada com uma faca, e que apenas reagiu para defender sua vida. Sustenta não haver premeditação e que a discussão foi iniciada pela vítima.",
  teoriaDefesa: "Legítima defesa real. Ausência de provas de premeditação. Nulidade da busca domiciliar por ausência de mandado judicial. Excesso de prazo na instrução criminal com réu preso.",
  pontosFortes: [
    "Vítima tinha histórico de violência e ameaças ao réu",
    "Depoimento de vizinha corrobora versão de que vítima iniciou agressão",
    "Busca domiciliar sem mandado - possível nulidade",
    "Réu preso há mais de 90 dias sem instrução concluída"
  ],
  pontosFracos: [
    "Réu não acionou a polícia imediatamente",
    "Arma do crime era do próprio réu",
    "Algumas testemunhas de acusação são consistentes"
  ],

  // Envolvidos
  envolvidos: [
    { 
      id: 1, 
      nome: "José Carlos da Silva", 
      tipo: "reu", 
      foto: null, 
      preso: true, 
      localPrisao: "Cadeia Pública de Candeias",
      status: "ouvida",
      descricao: "Réu principal. 32 anos, pedreiro. Primeiro processo criminal.",
      oitiva: { data: new Date("2025-01-15"), resumo: "Manteve versão de legítima defesa. Demonstrou-se nervoso mas coerente." }
    },
    { 
      id: 2, 
      nome: "Pedro Oliveira Santos", 
      tipo: "correu", 
      foto: null, 
      preso: true, 
      localPrisao: "Penitenciária Lemos Brito",
      status: "pendente",
      descricao: "Corréu em processo desmembrado. Acusado de participação no crime."
    },
    { 
      id: 3, 
      nome: "Maria Aparecida Lima", 
      tipo: "testemunha_defesa", 
      foto: null, 
      preso: false,
      status: "ouvida",
      descricao: "Vizinha. Presenciou início da discussão.",
      oitiva: { data: new Date("2025-01-10"), resumo: "Confirmou que vítima estava alterada e iniciou agressão verbal." }
    },
    { 
      id: 4, 
      nome: "Antonio Ferreira", 
      tipo: "testemunha_acusacao", 
      foto: null, 
      preso: false,
      status: "ouvida",
      descricao: "Amigo da vítima. Versão conflitante.",
      oitiva: { data: new Date("2025-01-10"), resumo: "Afirmou que réu tinha desavenças antigas com vítima. Contradições sobre horário." }
    },
    { 
      id: 5, 
      nome: "João Souza Almeida", 
      tipo: "vitima", 
      foto: null, 
      preso: false,
      status: "falecido",
      descricao: "Vítima fatal. 28 anos. Histórico de violência e processos por lesão corporal."
    },
    { 
      id: 6, 
      nome: "Carla Regina Santos", 
      tipo: "testemunha_defesa", 
      foto: null, 
      preso: false,
      status: "pendente",
      descricao: "Irmã do réu. Testemunha de caráter e conduta."
    },
  ],

  // Processos Vinculados
  processos: [
    { 
      id: 1, 
      numeroAutos: "8002341-90.2025.8.05.0039", 
      vara: "1ª Vara do Júri - Camaçari",
      fase: "INSTRUCAO", 
      status: "Aguardando Audiência de Instrução",
      reus: ["José Carlos da Silva"],
      proximaAudiencia: new Date("2025-01-25"),
      proximoPrazo: new Date("2025-01-20")
    },
    { 
      id: 2, 
      numeroAutos: "8002342-75.2025.8.05.0039", 
      vara: "1ª Vara do Júri - Camaçari",
      fase: "INQUERITO", 
      status: "Desmembrado - Aguardando Denúncia",
      reus: ["Pedro Oliveira Santos"],
      proximoPrazo: new Date("2025-02-15")
    },
  ],

  // Movimentações (Linha do Tempo)
  movimentacoes: [
    { id: "1", data: new Date("2025-01-18"), tipo: "intimacao", titulo: "Intimação para Audiência", descricao: "Intimação do réu José Carlos para audiência de instrução designada para 25/01/2025 às 09:00.", processoId: 1, processoNumero: "8002341-90.2025", urgente: true, prazo: new Date("2025-01-25") },
    { id: "2", data: new Date("2025-01-15"), tipo: "audiencia", titulo: "Interrogatório do Réu", descricao: "Realizado interrogatório de José Carlos. Manteve versão de legítima defesa. Próxima audiência para oitiva de testemunhas.", processoId: 1, processoNumero: "8002341-90.2025" },
    { id: "3", data: new Date("2025-01-10"), tipo: "audiencia", titulo: "Oitiva de Testemunhas", descricao: "Ouvidas testemunhas Maria Aparecida (defesa) e Antonio Ferreira (acusação).", processoId: 1, processoNumero: "8002341-90.2025" },
    { id: "4", data: new Date("2025-01-05"), tipo: "peticao", titulo: "Resposta à Acusação Protocolada", descricao: "Apresentada resposta à acusação com pedido de absolvição sumária por legítima defesa.", processoId: 1, processoNumero: "8002341-90.2025" },
    { id: "5", data: new Date("2024-12-20"), tipo: "decisao", titulo: "Recebimento da Denúncia", descricao: "Juiz recebeu a denúncia e determinou citação do réu.", processoId: 1, processoNumero: "8002341-90.2025" },
    { id: "6", data: new Date("2024-12-15"), tipo: "juntada", titulo: "Laudo de Exame de Corpo de Delito", descricao: "Juntado laudo pericial apontando causa da morte por perfuração.", processoId: 1, processoNumero: "8002341-90.2025" },
    { id: "7", data: new Date("2024-11-20"), tipo: "decisao", titulo: "Prisão Preventiva Decretada", descricao: "Decretada prisão preventiva do réu por garantia da ordem pública.", processoId: 1, processoNumero: "8002341-90.2025", urgente: true },
  ],

  // Peças Importantes
  pecas: [
    { id: 1, nome: "Denúncia", tipo: "denuncia", data: new Date("2024-12-15"), resumo: "Homicídio qualificado por motivo torpe e recurso que dificultou defesa (Art. 121, §2º, I e IV, CP).", linkDrive: "#", favoravel: false },
    { id: 2, nome: "Resposta à Acusação", tipo: "resposta_acusacao", data: new Date("2025-01-05"), resumo: "Alegada legítima defesa, nulidade da busca, excesso de prazo.", linkDrive: "#", favoravel: true },
    { id: 3, nome: "Laudo de Necropsia", tipo: "laudo", data: new Date("2024-12-10"), resumo: "Morte por perfuração no tórax. Três golpes identificados.", linkDrive: "#", favoravel: null },
    { id: 4, nome: "Auto de Prisão em Flagrante", tipo: "decisao", data: new Date("2024-11-20"), resumo: "Prisão do réu no local dos fatos.", linkDrive: "#", favoravel: false },
    { id: 5, nome: "Interrogatório Policial", tipo: "interrogatorio", data: new Date("2024-11-20"), resumo: "Réu manteve silêncio, mas afirmou que se defendeu.", linkDrive: "#", favoravel: null },
    { id: 6, nome: "Termo de Oitiva - Maria Aparecida", tipo: "oitiva", data: new Date("2025-01-10"), resumo: "Testemunha da defesa confirmou agressão iniciada pela vítima.", linkDrive: "#", favoravel: true },
  ],

  // Diligências
  diligencias: [
    { id: 1, tipo: "Busca de Câmeras", descricao: "Localizar câmeras de segurança nas proximidades do local dos fatos", status: "concluida", resultado: "Localizadas 2 câmeras. Uma sem imagens do horário. Outra com imagens parciais - já anexadas.", responsavel: "Defensor" },
    { id: 2, tipo: "Localização de Testemunha", descricao: "Encontrar Carla Regina Santos (irmã do réu) para intimação", status: "em_andamento", responsavel: "Oficial de Justiça", dataLimite: new Date("2025-01-22") },
    { id: 3, tipo: "Antecedentes da Vítima", descricao: "Obter certidões criminais da vítima para demonstrar histórico de violência", status: "concluida", resultado: "Vítima tinha 2 processos por lesão corporal e 1 por ameaça. Anexado aos autos.", responsavel: "Defensor" },
    { id: 4, tipo: "Exame Complementar", descricao: "Solicitar exame de local de crime complementar", status: "pendente", dataLimite: new Date("2025-02-01") },
  ],

  // Laudos
  laudos: [
    { id: 1, tipo: "Necropsia", descricao: "Exame de corpo de delito cadavérico", data: new Date("2024-12-10"), perito: "Dr. Paulo Mendes", conclusao: "Morte por hemorragia interna causada por perfuração torácica", favoravel: null, linkDrive: "#" },
    { id: 2, tipo: "Local de Crime", descricao: "Perícia no local dos fatos", data: new Date("2024-11-21"), perito: "Dr. Carlos Ferraz", conclusao: "Sinais de luta. Vestígios de sangue na entrada e sala.", favoravel: null, linkDrive: "#" },
    { id: 3, tipo: "Papiloscopia", descricao: "Exame de impressões digitais na arma", data: new Date("2024-12-05"), perito: "Dra. Maria Santos", conclusao: "Digitais do réu e da vítima identificadas na arma", favoravel: true, linkDrive: "#" },
  ],

  // Meta
  linkDrive: "https://drive.google.com/drive/folders/example",
  defensorNome: "Dr. Rodrigo Rocha",
  observacoes: "Caso prioritário - réu preso com excesso de prazo iminente.",
  createdAt: new Date("2024-11-20"),
};

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

// Card de Envolvido
function EnvolvidoCard({ envolvido }: { envolvido: Envolvido }) {
  const config = TIPO_ENVOLVIDO_CONFIG[envolvido.tipo];
  const Icon = config.icon;
  
  return (
    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border border-zinc-200 dark:border-zinc-700">
            <AvatarImage src={envolvido.foto || undefined} />
            <AvatarFallback className="text-sm font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {getInitials(envolvido.nome)}
            </AvatarFallback>
          </Avatar>
          {envolvido.preso && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700">
              <Lock className="w-2.5 h-2.5 text-rose-500" />
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {envolvido.nome}
            </h4>
            <PrisonerIndicator preso={envolvido.preso} localPrisao={envolvido.localPrisao} size="xs" />
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-0", config.color)}>
              {config.label}
            </Badge>
            {envolvido.status === "ouvida" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                ✓ Ouvida
              </Badge>
            )}
            {envolvido.status === "pendente" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                Pendente
              </Badge>
            )}
            {envolvido.status === "falecido" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 border-0">
                Falecido
              </Badge>
            )}
          </div>
          
          {envolvido.descricao && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">
              {envolvido.descricao}
            </p>
          )}
          
          {envolvido.oitiva && (
            <div className="mt-2 p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-xs">
              <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 mb-0.5">
                <Mic className="w-3 h-3" />
                <span>Oitiva em {envolvido.oitiva.data ? format(envolvido.oitiva.data, "dd/MM/yyyy") : "N/A"}</span>
              </div>
              {envolvido.oitiva.resumo && (
                <p className="text-zinc-600 dark:text-zinc-300 line-clamp-2">{envolvido.oitiva.resumo}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Timeline de Movimentações
function TimelineMovimentacoes({ movimentacoes }: { movimentacoes: MovimentacaoProcessual[] }) {
  const tipoConfig = {
    intimacao: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    decisao: { icon: Gavel, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    despacho: { icon: FileText, color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
    audiencia: { icon: Users, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    peticao: { icon: FileText, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20" },
    juntada: { icon: Plus, color: "text-zinc-500", bg: "bg-zinc-50 dark:bg-zinc-900" },
    sentenca: { icon: Scale, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
    acordao: { icon: Scale, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  };

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
      
      <div className="space-y-4">
        {movimentacoes.map((mov, idx) => {
          const config = tipoConfig[mov.tipo] || tipoConfig.despacho;
          const Icon = config.icon;
          const isUrgente = mov.urgente || (mov.prazo && differenceInDays(mov.prazo, new Date()) <= 3);
          
          return (
            <div key={mov.id} className="relative pl-12">
              {/* Ícone no timeline */}
              <div className={cn(
                "absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950",
                config.bg
              )}>
                <Icon className={cn("w-3 h-3", config.color)} />
              </div>
              
              {/* Conteúdo */}
              <div className={cn(
                "p-3 rounded-lg border",
                isUrgente 
                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10" 
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {mov.titulo}
                      </h4>
                      {isUrgente && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-500 text-white">
                          Urgente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {mov.descricao}
                    </p>
                    {mov.processoNumero && (
                      <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-1">
                        Autos: {mov.processoNumero}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {format(mov.data, "dd/MM/yyyy")}
                    </p>
                    {mov.prazo && (
                      <p className={cn(
                        "text-xs font-medium mt-0.5",
                        differenceInDays(mov.prazo, new Date()) <= 0 
                          ? "text-rose-500" 
                          : differenceInDays(mov.prazo, new Date()) <= 3 
                            ? "text-amber-500" 
                            : "text-zinc-400"
                      )}>
                        Prazo: {format(mov.prazo, "dd/MM")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Card de Peça
function PecaCard({ peca }: { peca: PecaImportante }) {
  const tipoIcon = {
    denuncia: Swords,
    resposta_acusacao: Shield,
    alegacoes_finais: FileText,
    laudo: FileSearch,
    interrogatorio: Mic,
    oitiva: Users,
    decisao: Gavel,
    sentenca: Scale,
    recurso: FileText,
  };
  
  const Icon = tipoIcon[peca.tipo] || FileText;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border transition-colors",
      peca.favoravel === true && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10",
      peca.favoravel === false && "border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/10",
      peca.favoravel === null && "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-md",
          peca.favoravel === true && "bg-emerald-100 dark:bg-emerald-900/30",
          peca.favoravel === false && "bg-rose-100 dark:bg-rose-900/30",
          peca.favoravel === null && "bg-zinc-100 dark:bg-zinc-800"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            peca.favoravel === true && "text-emerald-600 dark:text-emerald-400",
            peca.favoravel === false && "text-rose-600 dark:text-rose-400",
            peca.favoravel === null && "text-zinc-600 dark:text-zinc-400"
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {peca.nome}
            </h4>
            <span className="text-xs font-mono text-zinc-400">
              {format(peca.data, "dd/MM/yyyy")}
            </span>
          </div>
          
          {peca.resumo && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
              {peca.resumo}
            </p>
          )}
          
          {peca.linkDrive && (
            <a 
              href={peca.linkDrive} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
            >
              <FolderOpen className="w-3 h-3" />
              Abrir no Drive
            </a>
          )}
        </div>
        
        {peca.favoravel !== null && (
          <div className="flex-shrink-0">
            {peca.favoravel ? (
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </TooltipTrigger>
                <TooltipContent>Favorável à defesa</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </TooltipTrigger>
                <TooltipContent>Desfavorável</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CasoDetailPage() {
  const params = useParams();
  const caso = MOCK_CASO;
  const faseConfig = FASES_CASO[caso.fase as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;
  const [activeTab, setActiveTab] = useState("estudo");

  // Contadores
  const reusCount = caso.envolvidos.filter(e => e.tipo === "reu" || e.tipo === "correu").length;
  const reusPresos = caso.envolvidos.filter(e => (e.tipo === "reu" || e.tipo === "correu") && e.preso).length;
  const testemunhasOuvidas = caso.envolvidos.filter(e => (e.tipo === "testemunha_defesa" || e.tipo === "testemunha_acusacao") && e.status === "ouvida").length;
  const testemunhasTotal = caso.envolvidos.filter(e => e.tipo === "testemunha_defesa" || e.tipo === "testemunha_acusacao").length;
  const diligenciasConcluidas = caso.diligencias.filter(d => d.status === "concluida").length;
  const diligenciasTotal = caso.diligencias.length;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* ========================================
            HEADER LIMPO
            ======================================== */}
        <div className="flex flex-col gap-5">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Link href="/admin/casos">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Casos
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {caso.linkDrive && (
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                    <FolderOpen className="w-3.5 h-3.5" /> Drive
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Título e Meta */}
          <div className="flex items-start gap-5">
            <div className="p-3 rounded-xl bg-primary/10 hidden sm:block">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className="text-xs font-normal">
                  {ATRIBUICAO_LABELS[caso.atribuicao] || caso.atribuicao}
                </Badge>
                <Badge variant="secondary" className={cn("text-xs font-normal", faseConfig.color)}>
                  {faseConfig.label}
                </Badge>
                {caso.codigo && (
                  <span className="text-xs font-mono text-zinc-400">{caso.codigo}</span>
                )}
                {reusPresos > 0 && (
                  <span className="flex items-center gap-1 text-xs text-rose-500">
                    <Lock className="w-3 h-3" />
                    {reusPresos} preso{reusPresos > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                {caso.titulo}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {caso.vara} • {caso.comarca}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {caso.defensorNome}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {formatDistanceToNow(caso.createdAt, { locale: ptBR, addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Avatares dos Réus */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Réus:</span>
            <div className="flex -space-x-2">
              {caso.envolvidos.filter(e => e.tipo === "reu" || e.tipo === "correu").map((reu) => (
                <Tooltip key={reu.id}>
                  <TooltipTrigger>
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-950">
                        <AvatarImage src={reu.foto || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {getInitials(reu.nome)}
                        </AvatarFallback>
                      </Avatar>
                      {reu.preso && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-zinc-950">
                          <StatusPrisionalDot preso={true} size="sm" />
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <p className="font-medium">{reu.nome}</p>
                        <PrisonerIndicator preso={reu.preso} size="xs" />
                      </div>
                      {reu.localPrisao && (
                        <p className="text-xs text-muted-foreground">{reu.localPrisao}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] uppercase font-semibold text-muted-foreground tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span key={label} className={cn((caso.faseProgresso / 100) * (FASE_LABELS.length - 1) >= idx && "text-primary")}>
                  {label}
                </span>
              ))}
            </div>
            <Progress value={caso.faseProgresso} className="h-1.5 bg-muted" />
          </div>
        </div>

        {/* ========================================
            TABS DE CONTEÚDO
            ======================================== */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 h-auto flex-wrap w-full justify-start">
            <TabsTrigger value="estudo" className="gap-2">
              <BookOpen className="w-4 h-4" /> Estudo de Caso
            </TabsTrigger>
            <TabsTrigger value="envolvidos" className="gap-2">
              <Users className="w-4 h-4" /> Envolvidos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Activity className="w-4 h-4" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="pecas" className="gap-2">
              <FileText className="w-4 h-4" /> Peças
            </TabsTrigger>
            <TabsTrigger value="diligencias" className="gap-2">
              <FileSearch className="w-4 h-4" /> Diligências
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="gap-2">
              <Calendar className="w-4 h-4" /> Audiências
            </TabsTrigger>
          </TabsList>

          {/* ========================================
              TAB: ESTUDO DE CASO (Principal)
              ======================================== */}
          <TabsContent value="estudo" className="mt-6 space-y-6">
            {/* Cards de Estatísticas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Réus</p>
                    <p className="text-2xl font-bold mt-1">{reusCount}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                    <User className="w-5 h-5 text-rose-500" />
                  </div>
                </div>
                {reusPresos > 0 && (
                  <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {reusPresos} preso{reusPresos > 1 ? "s" : ""}
                  </p>
                )}
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Testemunhas</p>
                    <p className="text-2xl font-bold mt-1">{testemunhasOuvidas}/{testemunhasTotal}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
                <p className="text-xs text-emerald-500 mt-2">
                  {testemunhasTotal - testemunhasOuvidas} pendentes
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Diligências</p>
                    <p className="text-2xl font-bold mt-1">{diligenciasConcluidas}/{diligenciasTotal}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <FileSearch className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <Progress value={(diligenciasConcluidas / diligenciasTotal) * 100} className="h-1 mt-3" />
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Laudos</p>
                    <p className="text-2xl font-bold mt-1">{caso.laudos.length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                    <Scroll className="w-5 h-5 text-violet-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {caso.laudos.filter(l => l.favoravel === true).length} favoráveis
                </p>
              </Card>
            </div>

            {/* Tese vs Versão - Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Tese da Acusação */}
              <Card className="p-5 border-rose-100 dark:border-rose-900/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-900/30">
                    <Swords className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <h3 className="font-semibold text-sm">Tese da Acusação</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caso.teseAcusacao || "Não documentada"}
                </p>
              </Card>
              
              {/* Versão do Réu */}
              <Card className="p-5 border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-sm">Versão do Réu</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caso.versaoReu || "Não documentada"}
                </p>
              </Card>
            </div>

            {/* Teoria da Defesa */}
            <Card className="p-5 border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-950">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-sm">Teoria da Defesa</h3>
              </div>
              <p className="text-sm text-foreground leading-relaxed font-medium italic">
                &ldquo;{caso.teoriaDefesa || "Em desenvolvimento"}&rdquo;
              </p>
            </Card>

            {/* Pontos Fortes e Fracos */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pontos Fortes */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-sm">Pontos Fortes da Defesa</h3>
                </div>
                <ul className="space-y-2">
                  {(caso.pontosFortes || []).map((ponto, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-muted-foreground">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              
              {/* Pontos Fracos */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">Pontos de Atenção</h3>
                </div>
                <ul className="space-y-2">
                  {(caso.pontosFracos || []).map((ponto, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        !
                      </span>
                      <span className="text-muted-foreground">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Processos Vinculados */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Processos Vinculados</h3>
                </div>
              </div>
              
              <div className="space-y-3">
                {caso.processos.map((proc) => (
                  <div key={proc.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm font-medium">{proc.numeroAutos}</p>
                          <Badge variant="outline" className="text-[9px]">
                            {FASES_CASO[proc.fase]?.label || proc.fase}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{proc.vara}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Réus: {proc.reus.join(", ")}
                        </p>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{proc.status}</p>
                        {proc.proximaAudiencia && (
                          <p className={cn(
                            "text-xs font-medium mt-1 flex items-center gap-1 justify-end",
                            isToday(proc.proximaAudiencia) && "text-rose-500",
                            isTomorrow(proc.proximaAudiencia) && "text-amber-500"
                          )}>
                            <Calendar className="w-3 h-3" />
                            {isToday(proc.proximaAudiencia) ? "HOJE" : format(proc.proximaAudiencia, "dd/MM")}
                          </p>
                        )}
                        {proc.proximoPrazo && (
                          <p className={cn(
                            "text-xs font-medium mt-1 flex items-center gap-1 justify-end",
                            differenceInDays(proc.proximoPrazo, new Date()) <= 3 && "text-amber-500"
                          )}>
                            <Clock className="w-3 h-3" />
                            Prazo: {format(proc.proximoPrazo, "dd/MM")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tags */}
            {caso.tags && caso.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Bookmark className="w-4 h-4 text-muted-foreground" />
                {caso.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs border-dashed">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========================================
              TAB: ENVOLVIDOS
              ======================================== */}
          <TabsContent value="envolvidos" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caso.envolvidos.map((envolvido) => (
                <EnvolvidoCard key={envolvido.id} envolvido={envolvido} />
              ))}
            </div>
          </TabsContent>

          {/* ========================================
              TAB: TIMELINE
              ======================================== */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Linha do Tempo Processual
                </h3>
              </div>
              <TimelineMovimentacoes movimentacoes={caso.movimentacoes} />
            </Card>
          </TabsContent>

          {/* ========================================
              TAB: PEÇAS IMPORTANTES
              ======================================== */}
          <TabsContent value="pecas" className="mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {caso.pecas.map((peca) => (
                <PecaCard key={peca.id} peca={peca} />
              ))}
            </div>
          </TabsContent>

          {/* ========================================
              TAB: DILIGÊNCIAS
              ======================================== */}
          <TabsContent value="diligencias" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileSearch className="w-5 h-5" /> Diligências Investigativas
                </h3>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Nova Diligência
                </Button>
              </div>
              
              <div className="space-y-4">
                {caso.diligencias.map((dil) => {
                  const statusConfig = {
                    pendente: { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", label: "Pendente" },
                    em_andamento: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Em Andamento" },
                    concluida: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Concluída" },
                    frustrada: { color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", label: "Frustrada" },
                  };
                  const config = statusConfig[dil.status];
                  
                  return (
                    <div key={dil.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{dil.tipo}</h4>
                          <Badge variant="outline" className={cn("text-[9px] border-0", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{dil.descricao}</p>
                        {dil.resultado && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                            <strong>Resultado:</strong> {dil.resultado}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right flex-shrink-0 ml-4">
                        {dil.responsavel && (
                          <p className="text-xs text-muted-foreground">{dil.responsavel}</p>
                        )}
                        {dil.dataLimite && (
                          <p className={cn(
                            "text-xs font-medium mt-1",
                            differenceInDays(dil.dataLimite, new Date()) <= 3 && "text-amber-500"
                          )}>
                            Limite: {format(dil.dataLimite, "dd/MM")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Laudos */}
              <Separator className="my-6" />
              
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5" /> Laudos Periciais
              </h3>
              
              <div className="space-y-3">
                {caso.laudos.map((laudo) => (
                  <div key={laudo.id} className={cn(
                    "p-4 rounded-lg border",
                    laudo.favoravel === true && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10",
                    laudo.favoravel === false && "border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/10",
                    laudo.favoravel === null && "border-zinc-200 dark:border-zinc-800"
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{laudo.tipo}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{laudo.descricao}</p>
                        {laudo.perito && (
                          <p className="text-xs text-muted-foreground mt-1">Perito: {laudo.perito}</p>
                        )}
                        {laudo.conclusao && (
                          <p className="text-xs mt-2 p-2 bg-muted/50 rounded">
                            <strong>Conclusão:</strong> {laudo.conclusao}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {laudo.favoravel === true && (
                          <Badge className="text-[9px] bg-emerald-500 text-white">Favorável</Badge>
                        )}
                        {laudo.favoravel === false && (
                          <Badge className="text-[9px] bg-rose-500 text-white">Desfavorável</Badge>
                        )}
                        {laudo.linkDrive && (
                          <a href={laudo.linkDrive} target="_blank" rel="noopener noreferrer">
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ========================================
              TAB: AUDIÊNCIAS (Reutilizado)
              ======================================== */}
          <TabsContent value="audiencias" className="mt-6">
            <AudienciasHub audiencias={[]} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
