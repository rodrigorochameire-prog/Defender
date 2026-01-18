"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings,
  Link2,
  ExternalLink,
  FolderOpen,
  Lock,
  Unlock,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

// ==========================================
// TIPOS
// ==========================================

interface Assistido {
  id: number;
  nome: string;
  foto?: string | null;
  preso: boolean;
  localPrisao?: string | null;
}

interface Processo {
  id: number;
  numeroAutos: string;
  vara?: string | null;
  comarca?: string | null;
  fase?: string | null;
  isJuri: boolean;
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
  status: string;
  fase?: string | null;
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
  createdAt: Date;
}

// ==========================================
// CONSTANTES
// ==========================================

const FASES_CASO = {
  INQUERITO: { label: "Inquérito", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", icon: "🔍" },
  INSTRUCAO: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "⚖️" },
  PLENARIO: { label: "Plenário", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400", icon: "🎭" },
  RECURSO: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "📤" },
  EXECUCAO: { label: "Execução", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "⏱️" },
  ARQUIVADO: { label: "Arquivado", color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400", icon: "📁" },
};

// Dados de exemplo
const MOCK_CASO: Caso = {
  id: 1,
  titulo: "Homicídio Qualificado - Operação Reuso",
  codigo: "CASO-2025-001",
  atribuicao: "JURI_CAMACARI",
  status: "ativo",
  fase: "INSTRUCAO",
  prioridade: "REU_PRESO",
  tags: JSON.stringify(["NulidadeBusca", "ExcessoPrazo", "LegitimaDefesa"]),
  teoriaFatos: "O assistido estava em sua residência quando foi surpreendido pela polícia em operação não identificada. Não houve mandado de busca e apreensão. A abordagem ocorreu após denúncia anônima, sem investigação prévia.",
  teoriaProvas: "- Câmeras de segurança do vizinho mostram chegada abrupta da polícia\n- Testemunha (vizinho) confirma que não houve apresentação de mandado\n- Laudo pericial inconclusivo quanto à propriedade da arma",
  teoriaDireito: null, // Não preenchido ainda
  linkDrive: "https://drive.google.com/drive/folders/example",
  defensorNome: "Dr. João Silva",
  observacoes: "Caso complexo com múltiplos coautores. Priorizar tese de nulidade.",
  assistidos: [
    { id: 1, nome: "José Carlos Santos", preso: true, localPrisao: "Cadeia Pública de Camaçari" },
    { id: 2, nome: "Pedro Oliveira Lima", preso: true, localPrisao: "COP" },
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
      defensorNome: "Dr. João Silva",
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
      defensorNome: "Dr. João Silva",
    },
  ],
  createdAt: new Date("2025-01-10"),
};

// ==========================================
// COMPONENTES
// ==========================================

function AssistidoCard({ assistido }: { assistido: Assistido }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors",
      assistido.preso ? "border-l-[3px] border-l-rose-500" : "border-l-[3px] border-l-emerald-500"
    )}>
      <Avatar className={cn(
        "w-10 h-10 ring-2",
        assistido.preso ? "ring-rose-500" : "ring-emerald-500"
      )}>
        <AvatarImage src={assistido.foto || undefined} />
        <AvatarFallback>{assistido.nome.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {assistido.nome}
        </p>
        <div className="flex items-center gap-1">
          {assistido.preso ? (
            <>
              <Lock className="w-3 h-3 text-rose-500" />
              <span className="text-xs text-rose-600 dark:text-rose-400">
                {assistido.localPrisao || "Preso"}
              </span>
            </>
          ) : (
            <>
              <Unlock className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">Solto</span>
            </>
          )}
        </div>
      </div>
      <Link href={`/admin/assistidos/${assistido.id}`}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

function ProcessoCard({ processo }: { processo: Processo }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
    )}>
      <div className={cn(
        "p-2 rounded-lg",
        processo.isJuri 
          ? "bg-rose-100 dark:bg-rose-900/30" 
          : "bg-blue-100 dark:bg-blue-900/30"
      )}>
        <Scale className={cn(
          "w-4 h-4",
          processo.isJuri ? "text-rose-600" : "text-blue-600"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 truncate">
          {processo.numeroAutos}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {processo.vara} - {processo.comarca}
        </p>
      </div>
      {processo.isJuri && (
        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">
          Júri
        </Badge>
      )}
      <Link href={`/admin/processos/${processo.id}`}>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </Link>
    </div>
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
  const tags = caso.tags ? JSON.parse(caso.tags) : [];

  const handleTeoriaUpdate = async (
    field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito", 
    value: string
  ) => {
    // Implementar atualização via tRPC
    console.log("Atualizando", field, "com:", value);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link href="/admin/casos">
              <Button variant="ghost" size="sm" className="mt-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                {caso.codigo && (
                  <span className="font-mono text-sm text-zinc-400">
                    {caso.codigo}
                  </span>
                )}
                <Badge className={cn("text-xs", faseConfig.color)}>
                  {faseConfig.icon} {faseConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {caso.status}
                </Badge>
              </div>
              
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {caso.titulo}
              </h1>
              
              <div className="flex items-center gap-2 mt-2">
                {caso.defensorNome && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Responsável: <strong>{caso.defensorNome}</strong>
                  </span>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {tags.map((tag: string, idx: number) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs px-2 py-0.5 border-dashed cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-zinc-400">
                    <Plus className="w-3 h-3 mr-1" />
                    Tag
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {caso.linkDrive && (
              <a
                href={caso.linkDrive}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Pasta no Drive
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            )}
            <Button variant="outline" size="sm">
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20 border-0">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-rose-500" />
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
              <Scale className="w-5 h-5 text-blue-500" />
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
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  3
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Demandas Pendentes</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {caso.audiencias.filter(a => a.status === "DESIGNADA").length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Audiências Agendadas</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1">
            <TabsTrigger value="teoria" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Teoria do Caso
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Audiências
            </TabsTrigger>
            <TabsTrigger value="assistidos" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assistidos
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Processos
            </TabsTrigger>
            <TabsTrigger value="conexoes" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Conexões
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="audiencias" className="mt-6">
            <AudienciasHub
              audiencias={caso.audiencias as any}
              onAudienciaUpdate={handleAudienciaUpdate}
              onCreateTask={handleCreateTask}
            />
          </TabsContent>

          <TabsContent value="assistidos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Assistidos ({caso.assistidos.length})
                </h3>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Assistido
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {caso.assistidos.map((assistido) => (
                  <AssistidoCard key={assistido.id} assistido={assistido} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="processos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Processos ({caso.processos.length})
                </h3>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Vincular Processo
                </Button>
              </div>
              
              <div className="space-y-3">
                {caso.processos.map((processo) => (
                  <ProcessoCard key={processo.id} processo={processo} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conexoes" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Casos Conexos
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Casos relacionados por coautoria, fatos ou teses similares
                  </p>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Conectar Caso
                </Button>
              </div>

              <Card className="p-6 text-center">
                <Link2 className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Nenhum caso conectado
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  Conecte casos com teses similares para acessar rapidamente petições de sucesso e compartilhar estratégias.
                </p>
              </Card>

              {/* Sugestões baseadas em tags */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Sugestões baseadas nas suas tags
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Você tem <strong>5 outros casos</strong> com a tag #NulidadeBusca. Deseja ver as petições de sucesso desses casos?
                </p>
                <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                  Ver casos similares →
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
