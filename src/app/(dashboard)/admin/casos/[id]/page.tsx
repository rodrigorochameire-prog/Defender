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
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow, isToday, isTomorrow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EntityLink } from "@/components/shared/entity-link";
import { MentionTextarea, renderMentions } from "@/components/shared/mention-textarea";
import { trpc } from "@/lib/trpc/client";

// ... (Interfaces remain similar)

// MOCK DATA (Updated with requested structure)
const MOCK_CASO = {
  // ... existing fields
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
  teoriaFatos: "O assistido estava em sua residência...",
  linkDrive: "https://drive.google.com/drive/folders/example",
  defensorNome: "Dr. Rodrigo Rocha",
  
  // 360º View Data
  envolvidos: [
    { id: 1, nome: "José Carlos", tipo: "Réu", foto: null, status: "Preso" },
    { id: 2, nome: "Pedro Oliveira", tipo: "Réu (Desmembrado)", foto: null, status: "Preso" },
    { id: 3, nome: "Maria Silva", tipo: "Testemunha", foto: null, status: "Ouvida" },
    { id: 4, nome: "João Souza", tipo: "Vítima", foto: null, status: "Falecido" },
  ],
  processosDetalhados: [
    { id: 1, autos: "8002341-90.2025.8.05.0039", fase: "Plenário", reus: ["José Carlos"], status: "Aguardando Julgamento" },
    { id: 2, autos: "8002342-75.2025.8.05.0039", fase: "Instrução", reus: ["Pedro Oliveira"], status: "Audiência Designada" },
  ],
  diligencias: [
    { id: 1, tipo: "Busca de Câmeras", status: "Concluída", resultado: "Vídeo anexado" },
    { id: 2, tipo: "Localização de Testemunha", status: "Em Andamento", resultado: "Pendente" },
  ],
  atendimentos: [
    { id: 1, data: "2025-01-10", pessoa: "José Carlos", tipo: "Presencial", resumo: "Orientação pré-audiência" },
    { id: 2, data: "2025-01-12", pessoa: "Mãe do Réu", tipo: "Telefone", resumo: "Informações sobre estado de saúde" },
  ],
  
  // Existing arrays...
  assistidos: [], // ...
  processos: [], // ...
  audiencias: [], // ...
  demandasPendentes: [], // ...
  createdAt: new Date("2025-01-10"),
};

// ... (Constants)
// Fases NEUTRAS para reduzir poluição visual - com contraste melhorado
const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-700", icon: "🔍", progress: 10 },
  INSTRUCAO: { label: "Instrução", color: "text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-700", icon: "⚖️", progress: 35 },
  PLENARIO: { label: "Plenário", color: "text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-700", icon: "🎭", progress: 60 },
  RECURSO: { label: "Recurso", color: "text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-700", icon: "📤", progress: 80 },
  EXECUCAO: { label: "Execução", color: "text-zinc-700 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-700", icon: "⏱️", progress: 90 },
  ARQUIVADO: { label: "Arquivado", color: "text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800", icon: "📁", progress: 100 },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  VVD_CAMACARI: "V. Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição",
};

const FASE_LABELS = ["Inquérito", "Instrução", "Plenário", "Recurso", "Execução"];

// ... (Helper Components)

function EnvolvidosList({ envolvidos }: { envolvidos: any[] }) {
  return (
    <div className="flex -space-x-3 overflow-hidden p-1">
      {envolvidos.map((pessoa) => (
        <Tooltip key={pessoa.id}>
          <TooltipTrigger>
            <Avatar className={cn(
              "inline-block h-10 w-10 rounded-full ring-2 ring-background transition-transform hover:scale-110 hover:z-10",
              pessoa.tipo.includes("Réu") ? "ring-rose-100 dark:ring-rose-900" : "ring-zinc-100 dark:ring-zinc-800"
            )}>
              <AvatarImage src={pessoa.foto} />
              <AvatarFallback className={cn(
                "text-xs font-bold",
                pessoa.tipo.includes("Réu") 
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" 
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}>
                {pessoa.nome.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-semibold">{pessoa.nome}</p>
            <p className="text-xs text-muted-foreground">{pessoa.tipo} • {pessoa.status}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      <div className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-background bg-muted text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer">
        +2
      </div>
    </div>
  );
}

// ... (Main Page Component)

export default function CasoDetailPage() {
  const params = useParams();
  const caso = MOCK_CASO;
  const faseConfig = FASES_CASO.INSTRUCAO;
  const tags = JSON.parse(caso.tags);
  const [activeTab, setActiveTab] = useState("visao-geral");

  // ... (Hooks and calculations)

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header Clean */}
        <div className="flex flex-col gap-6">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Link href="/admin/casos">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                <FolderOpen className="w-3.5 h-3.5" /> Drive
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Title Area */}
          <div className="flex items-start gap-5">
            <div className="p-3 rounded-xl bg-primary/10">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className="text-[10px] font-normal">{ATRIBUICAO_LABELS[caso.atribuicao]}</Badge>
                <Badge variant="secondary" className="text-[10px] font-normal">{faseConfig.label}</Badge>
                {caso.prioridade === "REU_PRESO" && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="w-4 h-4 text-rose-500" />
                    </TooltipTrigger>
                    <TooltipContent>Réu Preso</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">{caso.titulo}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {caso.vara} • {caso.comarca}</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {caso.defensorNome}</span>
              </div>
            </div>
            <div className="hidden md:block">
              <EnvolvidosList envolvidos={caso.envolvidos} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] uppercase font-semibold text-muted-foreground tracking-widest">
              {FASE_LABELS.map((label, idx) => (
                <span key={label} className={cn((caso.faseProgresso / 100) * (FASE_LABELS.length - 1) >= idx && "text-primary")}>{label}</span>
              ))}
            </div>
            <Progress value={caso.faseProgresso} className="h-1.5 bg-muted" />
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 h-auto flex-wrap w-full justify-start">
            <TabsTrigger value="visao-geral" className="gap-2"><Activity className="w-4 h-4" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="processos" className="gap-2"><FileText className="w-4 h-4" /> Processos</TabsTrigger>
            <TabsTrigger value="teoria" className="gap-2"><Target className="w-4 h-4" /> Teoria</TabsTrigger>
            <TabsTrigger value="diligencias" className="gap-2"><FileSearch className="w-4 h-4" /> Diligências</TabsTrigger>
            <TabsTrigger value="audiencias" className="gap-2"><Calendar className="w-4 h-4" /> Audiências</TabsTrigger>
          </TabsList>

          <TabsContent value="visao-geral" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Síntese Processual */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" /> Síntese Processual
                </h3>
                <div className="space-y-4">
                  {caso.processosDetalhados.map((proc) => (
                    <div key={proc.id} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-mono text-sm font-medium">{proc.autos}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Réus: {proc.reus.join(", ")}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{proc.fase}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 p-1.5 rounded">
                        <Activity className="w-3 h-3" /> Status: {proc.status}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Atendimentos Recentes */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" /> Atendimentos
                </h3>
                <div className="space-y-3">
                  {caso.atendimentos.map((atend) => (
                    <div key={atend.id} className="flex gap-3 text-sm">
                      <div className="w-16 text-xs text-muted-foreground text-right">{atend.data}</div>
                      <div className="w-px bg-border"></div>
                      <div className="flex-1 pb-2">
                        <p className="font-medium text-xs">{atend.tipo} - {atend.pessoa}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{atend.resumo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="diligencias" className="mt-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2"><FileSearch className="w-5 h-5" /> Diligências Investigativas</h3>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Diligência</Button>
              </div>
              <div className="space-y-4">
                {caso.diligencias.map((dil) => (
                  <div key={dil.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium">{dil.tipo}</p>
                      <p className="text-sm text-muted-foreground mt-1">Resultado: {dil.resultado}</p>
                    </div>
                    <Badge variant={dil.status === "Concluída" ? "success" : "warning"}>{dil.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Reuse other tabs components */}
          <TabsContent value="teoria" className="mt-6">
            <TeoriaDoCaso casoId={caso.id} teoriaFatos={caso.teoriaFatos} teoriaProvas={null} teoriaDireito={null} linkDrive={caso.linkDrive} onUpdate={async () => {}} />
          </TabsContent>
          <TabsContent value="audiencias" className="mt-6">
            <AudienciasHub audiencias={[]} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
