"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  ClipboardList,
  MessageCircle,
  Sparkles,
  Gavel,
  AlertTriangle,
  Target,
  Brain,
  BookOpen,
  Hash,
  Link as LinkIcon,
  Shield,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EntityLink } from "@/components/shared/entity-link";
import { MentionTextarea, renderMentions } from "@/components/shared/mention-textarea";
import { trpc } from "@/lib/trpc/client";

// ... (Interfaces remain similar, but updated for visual consistency)

interface Assistido {
  id: number;
  nome: string;
  foto?: string | null;
  preso: boolean;
  localPrisao?: string | null;
  crimePrincipal?: string | null;
  proximoPrazo?: Date | null;
}

interface ProcessoRelacionado {
  id: number;
  numeroAutos: string;
  classeProcessual: string; // 'Ação Penal', 'Inquérito', 'Habeas Corpus'
  tipo: "conexao" | "apenso" | "origem" | "recurso";
}

interface Processo {
  id: number;
  numeroAutos: string;
  vara?: string | null;
  comarca?: string | null;
  fase?: string | null;
  isJuri: boolean | null;
  processosRelacionados?: ProcessoRelacionado[]; // AP, IP, HC, etc.
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

// ... (Other interfaces kept for brevity, assume they exist)

// CONSTANTS (Updated Colors to Swiss Neutrality)
const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: "🔍", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "⚖️", progress: 35 },
  PLENARIO: { label: "Plenário", color: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "🎭", progress: 60 },
  RECURSO: { label: "Recurso", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📤", progress: 80 },
  EXECUCAO: { label: "Execução", color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏱️", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400", icon: "📁", progress: 100 },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  VVD_CAMACARI: "V. Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição",
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// MOCK DATA (Updated to reflect request: aggregated processes)
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
    { 
      id: 1, 
      numeroAutos: "8002341-90.2025.8.05.0039", 
      vara: "Vara do Júri", 
      comarca: "Camaçari", 
      fase: "instrucao", 
      isJuri: true,
      processosRelacionados: [
        { id: 101, numeroAutos: "0001111-22.2025.8.05.0039", classeProcessual: "Inquérito Policial", tipo: "origem" },
        { id: 102, numeroAutos: "8005555-44.2025.8.05.0000", classeProcessual: "Habeas Corpus", tipo: "recurso" }
      ]
    },
    { 
      id: 2, 
      numeroAutos: "8002342-75.2025.8.05.0039", 
      vara: "Vara do Júri", 
      comarca: "Camaçari", 
      fase: "instrucao", 
      isJuri: true,
      processosRelacionados: [] // Co-réu desmembrado
    },
    { 
      id: 3, 
      numeroAutos: "8002500-10.2025.8.05.0000", 
      vara: "Câmara Criminal", 
      comarca: "Salvador", 
      fase: "recurso", 
      isJuri: false,
      processosRelacionados: []
    },
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
    // ...
  ],
  demandasPendentes: [
    { id: 1, ato: "Rol de Testemunhas", prazo: new Date("2026-01-22"), urgente: true },
    { id: 2, ato: "Memoriais", prazo: new Date("2026-02-05"), urgente: false },
  ],
  createdAt: new Date("2025-01-10"),
};

// ... (Other MOCK data kept as placeholders)

// ==========================================
// COMPONENTES AUXILIARES (Refined)
// ==========================================

function AssistidoCardSophisticated({ assistido, showExtras = true }: { assistido: Assistido; showExtras?: boolean }) {
  const diasRestantes = assistido.proximoPrazo 
    ? differenceInDays(assistido.proximoPrazo, new Date())
    : null;
  const prazoUrgente = diasRestantes !== null && diasRestantes <= 3;

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-200",
      "bg-card border-border hover:shadow-sm",
      "border-l-[3px]",
      assistido.preso ? "border-l-rose-500" : "border-l-emerald-500"
    )}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className={cn(
            "w-10 h-10 ring-1 transition-transform group-hover:scale-105",
            assistido.preso ? "ring-rose-500/30" : "ring-emerald-500/30"
          )}>
            <AvatarImage src={assistido.foto || undefined} />
            <AvatarFallback className={cn(
              "text-xs font-bold",
              assistido.preso 
                ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            )}>
              {assistido.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h4 className="font-semibold text-sm text-foreground truncate hover:text-primary transition-colors">
                {assistido.nome}
              </h4>
            </Link>
            
            <div className="flex items-center gap-2 mt-1">
              {assistido.preso ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400 font-normal">
                  <Lock className="w-2.5 h-2.5 mr-1" /> Preso
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400 font-normal">
                  <Unlock className="w-2.5 h-2.5 mr-1" /> Solto
                </Badge>
              )}
              
              {assistido.localPrisao && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px] flex items-center">
                  <MapPin className="w-2.5 h-2.5 mr-0.5" />
                  {assistido.localPrisao}
                </span>
              )}
            </div>
          </div>
          
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {showExtras && (
          <>
            {assistido.crimePrincipal && (
              <div className="py-2 border-t border-border/40">
                <div className="flex items-start gap-2">
                  <Gavel className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-legal text-muted-foreground">
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
                  : "bg-muted text-muted-foreground"
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
    <Card className="group overflow-hidden transition-all duration-200 bg-card border-border hover:shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2.5 rounded-xl flex-shrink-0",
            processo.isJuri ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          )}>
            <Scale className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={handleCopy}>
                {processo.numeroAutos}
              </p>
              {copied && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {processo.vara} • {processo.comarca}
            </p>
            
            {/* Processos Relacionados */}
            {processo.processosRelacionados && processo.processosRelacionados.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Processos Associados</p>
                {processo.processosRelacionados.map((rel) => (
                  <div key={rel.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border border-border/50 text-xs">
                    <LinkIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="font-mono text-foreground/80">{rel.numeroAutos}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">{rel.classeProcessual}</Badge>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0 capitalize">{rel.tipo}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2">
            {processo.isJuri && (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400 text-[10px]">
                Júri
              </Badge>
            )}
            
            <Link href={`/admin/processos/${processo.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ... (Rest of components kept similar but visual tweaks for neutrality)

export default function CasoDetailPage() {
  const params = useParams();
  const casoId = params.id as string;
  const [activeTab, setActiveTab] = useState("teoria");
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const caso = MOCK_CASO; // Using mock for now
  const faseConfig = FASES_CASO[caso.fase as keyof typeof FASES_CASO] || FASES_CASO.INSTRUCAO;
  const tags = caso.tags ? JSON.parse(caso.tags) : [];
  const tempoDecorrido = formatDistanceToNow(caso.createdAt, { locale: ptBR });
  
  // Teoria Completa Check
  const teoriaCompleta = caso.teoriaFatos && caso.teoriaProvas && caso.teoriaDireito;
  const teoriaProgresso = [caso.teoriaFatos, caso.teoriaProvas, caso.teoriaDireito].filter(Boolean).length;

  const proximaAudiencia = caso.audiencias.find(a => a.status === "DESIGNADA");
  const hasAudienciaHoje = proximaAudiencia && isToday(proximaAudiencia.dataAudiencia);
  const hasAudienciaAmanha = proximaAudiencia && isTomorrow(proximaAudiencia.dataAudiencia);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Clean */}
        <div className="flex flex-col gap-6">
          {/* Navigation & Actions */}
          <div className="flex items-center justify-between">
            <Link href="/admin/casos">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Casos
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              {caso.linkDrive && (
                <a href={caso.linkDrive} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Drive
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Título e Meta-dados */}
          <div className="flex items-start gap-5">
            <div className="p-3 rounded-xl bg-primary/10">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {caso.codigo && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {caso.codigo}
                  </span>
                )}
                
                <Badge variant="outline" className="text-[10px] font-normal">
                  {ATRIBUICAO_LABELS[caso.atribuicao] || caso.atribuicao}
                </Badge>
                
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {faseConfig.label}
                </Badge>
                
                <Badge variant="outline" className="text-[10px] capitalize font-normal">
                  {caso.status}
                </Badge>

                {hasAudienciaHoje && (
                  <Badge variant="urgent" className="text-[10px]">Audiência Hoje</Badge>
                )}
              </div>

              {/* Título */}
              <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                {caso.titulo}
              </h1>

              {/* Meta-dados */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
                      variant="secondary" 
                      className="text-[10px] px-2 py-0 font-normal bg-muted/50 hover:bg-muted"
                    >
                      <Hash className="w-2.5 h-2.5 mr-1 opacity-50" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso do Caso */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] uppercase font-semibold text-muted-foreground tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span 
                  key={label}
                  className={cn(
                    (caso.faseProgresso / 100) * (FASE_LABELS.length - 1) >= idx && "text-primary"
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
            <Progress 
              value={caso.faseProgresso} 
              className="h-1.5 bg-muted" 
            />
          </div>
        </div>

        {/* Stats Cards - Clean */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {caso.assistidos.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Assistidos
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {caso.processos.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Processos
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {caso.demandasPendentes.length}
                </p>
                <p className="text-xs text-muted-foreground">Demandas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {caso.audiencias.filter(a => a.status === "DESIGNADA").length}
                </p>
                <p className="text-xs text-muted-foreground">Audiências</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {teoriaProgresso}/3
                </p>
                <p className="text-xs text-muted-foreground">Teoria</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 h-auto flex-wrap w-full justify-start">
            <TabsTrigger value="teoria" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              <span>Teoria</span>
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Audiências</span>
            </TabsTrigger>
            <TabsTrigger value="assistidos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Assistidos</span>
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Processos</span>
            </TabsTrigger>
            <TabsTrigger value="conexoes" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span>Conexões</span>
            </TabsTrigger>
            <TabsTrigger value="integracao" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              <span>Integração</span>
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
              onUpdate={async () => {}} // Placeholder
            />
          </TabsContent>

          {/* Tab: Audiências */}
          <TabsContent value="audiencias" className="mt-6" id="audiencias">
            <AudienciasHub
              audiencias={caso.audiencias as any}
              onAudienciaUpdate={async () => {}}
              onCreateTask={() => {}}
            />
          </TabsContent>

          {/* Tab: Assistidos */}
          <TabsContent value="assistidos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Assistidos Vinculados
                  </h3>
                  <p className="text-sm text-muted-foreground">
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
                  <h3 className="text-lg font-semibold text-foreground">
                    Processos Vinculados
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Agregação de autos principais, inquéritos e recursos.
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

          {/* Tab: Conexões (Placeholder for brevity) */}
          <TabsContent value="conexoes" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              Implementação de conexões em breve...
            </div>
          </TabsContent>

          {/* Tab: Integração (Placeholder for brevity) */}
          <TabsContent value="integracao" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              Integração de fatos e personas em breve...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
