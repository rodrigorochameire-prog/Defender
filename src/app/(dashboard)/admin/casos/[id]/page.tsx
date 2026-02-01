"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrisonerIndicator, StatusPrisionalDot } from "@/components/shared/prisoner-indicator";
import {
  Briefcase,
  ArrowLeft,
  ArrowRight,
  Scale,
  Users,
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  Plus,
  MoreHorizontal,
  MapPin,
  CheckCircle2,
  Gavel,
  AlertTriangle,
  Activity,
  FileSearch,
  User,
  Swords,
  Shield,
  Scroll,
  BookOpen,
  Save,
  Edit3,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ==========================================
// CONSTANTES
// ==========================================

const FASES_CASO: Record<string, { label: string; color: string }> = {
  inquerito: { label: "Inquérito", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  instrucao: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  plenario: { label: "Plenário", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  recurso: { label: "Recurso", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  execucao: { label: "Execução", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

const ATRIBUICAO_LABELS: Record<string, string> = {
  JURI_CAMACARI: "Tribunal do Júri",
  VVD_CAMACARI: "V. Doméstica",
  EXECUCAO_PENAL: "Execução Penal",
  SUBSTITUICAO: "Substituição",
  GRUPO_JURI: "Grupo Júri",
  SUBSTITUICAO_CIVEL: "Cível",
};

// ==========================================
// DADOS MOCKADOS (REMOVER DEPOIS)
// ==========================================

const MOCK_CASOS_DETAIL: Record<number, any> = {
  1: {
    id: 1,
    titulo: "Homicídio Qualificado - Art. 121, §2º, I e IV do CP",
    codigo: "CASO-2024-001",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "plenario",
    prioridade: "REU_PRESO",
    tags: '["homicídio","júri","preso","qualificado"]',
    linkDrive: "https://drive.google.com/folder/exemplo1",
    createdAt: new Date("2024-01-15"),
    observacoes: "Caso de alta complexidade. Julgamento pelo Tribunal do Júri agendado. Tese principal: legítima defesa. Subsidiária: desclassificação para homicídio culposo.",
    teoriaFatos: "O assistido, na data dos fatos, encontrava-se em sua residência quando foi surpreendido pela vítima, que invadiu o local portando arma branca. Diante da agressão iminente, o assistido reagiu em legítima defesa, utilizando instrumento que estava ao seu alcance.",
    teoriaProvas: "1. Laudo pericial demonstra lesões defensivas no assistido\n2. Testemunhas confirmam o comportamento agressivo prévio da vítima\n3. Exame toxicológico revela que a vítima estava sob efeito de entorpecentes\n4. Imagens de câmeras de segurança corroboram a versão defensiva",
    teoriaDireito: "Art. 23, II do CP - Legítima Defesa\n\nRequisitos presentes:\n- Agressão injusta e atual\n- Uso moderado dos meios necessários\n- Defesa de direito próprio (vida e integridade física)\n\nSubsidiariamente: Art. 121, §3º do CP - Homicídio culposo",
    assistidos: [
      { 
        id: 1, 
        nome: "Nathan Gonçalves dos Santos", 
        preso: true, 
        localPrisao: "Conjunto Penal de Feira de Santana",
        photoUrl: null 
      },
    ],
    processos: [
      {
        id: 1,
        numeroAutos: "6005582-31.2024.8.05.0039",
        vara: "1ª Vara do Tribunal do Júri",
        comarca: "Camaçari",
        fase: "Plenário",
      },
    ],
    audiencias: [
      { id: 1, tipo: "Plenário do Júri", data: new Date("2024-03-15") },
    ],
  },
  2: {
    id: 2,
    titulo: "Tentativa de Homicídio - Legítima Defesa",
    codigo: "CASO-2024-002",
    atribuicao: "JURI_CAMACARI",
    status: "ativo",
    fase: "instrucao",
    prioridade: null,
    tags: '["tentativa","legítima defesa"]',
    linkDrive: "https://drive.google.com/folder/exemplo2",
    createdAt: new Date("2024-02-20"),
    observacoes: "Fase de instrução. Aguardando oitiva das testemunhas de defesa.",
    teoriaFatos: "O assistido foi abordado de forma agressiva pela vítima em via pública, sendo necessário reagir para defender sua integridade física.",
    teoriaProvas: null,
    teoriaDireito: "Art. 23, II c/c Art. 14, II do CP",
    assistidos: [
      { id: 2, nome: "Carlos Alberto Ferreira", preso: false, localPrisao: null, photoUrl: null },
    ],
    processos: [
      {
        id: 2,
        numeroAutos: "0012345-67.2024.8.05.0039",
        vara: "2ª Vara do Tribunal do Júri",
        comarca: "Camaçari",
        fase: "Instrução",
      },
    ],
    audiencias: [
      { id: 2, tipo: "Instrução e Julgamento", data: new Date("2024-04-10") },
    ],
  },
  3: {
    id: 3,
    titulo: "Feminicídio Tentado - Art. 121, §2º-A do CP",
    codigo: "CASO-2024-003",
    atribuicao: "VVD_CAMACARI",
    status: "ativo",
    fase: "instrucao",
    prioridade: "REU_PRESO",
    tags: '["feminicídio","maria da penha","preso"]',
    linkDrive: null,
    createdAt: new Date("2024-03-10"),
    observacoes: "Caso sensível. Medidas protetivas deferidas. Réu preso preventivamente.",
    teoriaFatos: "Conflito conjugal que resultou em lesões. A defesa sustenta ausência de animus necandi.",
    teoriaProvas: "1. Laudo pericial das lesões\n2. Depoimento da vítima\n3. Histórico de conflitos anteriores",
    teoriaDireito: null,
    assistidos: [
      { id: 3, nome: "José Maria da Silva", preso: true, localPrisao: "Presídio de Salvador", photoUrl: null },
    ],
    processos: [
      {
        id: 3,
        numeroAutos: "8004123-45.2026.8.05.0039",
        vara: "Juizado de Violência Doméstica",
        comarca: "Camaçari",
        fase: "Instrução",
      },
    ],
    audiencias: [],
  },
};

const MOCK_TIMELINE = [
  { id: 1, type: "audiencia", title: "Audiência de Instrução", description: "Oitiva das testemunhas de acusação", date: new Date("2024-02-15") },
  { id: 2, type: "demanda", title: "Resposta à Acusação", description: "Apresentada resposta à acusação tempestivamente", date: new Date("2024-02-01") },
  { id: 3, type: "documento", title: "Laudo Pericial", description: "Juntada de laudo pericial necroscópico", date: new Date("2024-01-25") },
  { id: 4, type: "movimentacao", title: "Citação", description: "Citação do réu realizada", date: new Date("2024-01-20") },
  { id: 5, type: "nota", title: "Observação", description: "Verificar se há testemunhas de defesa a arrolar", date: new Date("2024-01-18") },
];

const MOCK_PERSONAS = [
  { id: 1, nome: "João Carlos de Souza", tipo: "Testemunha de Defesa", status: "pendente", observacoes: "Vizinho do assistido, presenciou os fatos" },
  { id: 2, nome: "Maria Helena Costa", tipo: "Testemunha de Defesa", status: "ouvida", observacoes: "Colega de trabalho, comprova o bom comportamento" },
  { id: 3, nome: "Dr. Roberto Almeida", tipo: "Perito", status: "ouvida", observacoes: "Perito médico legista responsável pelo laudo" },
];

// ==========================================
// COMPONENTE DE TEORIA EDITÁVEL
// ==========================================

function TeoriaSection({ 
  casoId, 
  field, 
  title, 
  icon: Icon, 
  value,
  colorClass,
  refetch 
}: { 
  casoId: number;
  field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito";
  title: string;
  icon: React.ElementType;
  value: string | null;
  colorClass: string;
  refetch: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  
  const updateMutation = trpc.casos.updateTeoria.useMutation({
    onSuccess: () => {
      toast.success("Teoria atualizada!");
      setIsEditing(false);
      refetch();
    },
    onError: () => {
      toast.error("Erro ao atualizar");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      casoId,
      field,
      value: editValue,
    });
  };

  return (
    <Card className={cn("p-5", colorClass)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", colorClass.replace("border-", "bg-").replace("/30", "/50"))}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => {
            if (isEditing) {
              setEditValue(value || "");
            }
            setIsEditing(!isEditing);
          }}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </Button>
      </div>
      
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`Descreva ${title.toLowerCase()}...`}
            className="min-h-[100px] text-sm"
          />
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setEditValue(value || "");
                setIsEditing(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className={cn(
          "text-sm leading-relaxed",
          value ? "text-foreground" : "text-muted-foreground italic"
        )}>
          {value || "Clique no ícone de edição para adicionar..."}
        </p>
      )}
    </Card>
  );
}

// ==========================================
// COMPONENTE DE TIMELINE
// ==========================================

function TimelineItem({ item }: { item: any }) {
  const iconConfig: Record<string, { icon: React.ElementType; color: string }> = {
    audiencia: { icon: Users, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
    demanda: { icon: Clock, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
    nota: { icon: FileText, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    documento: { icon: FileSearch, color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
    movimentacao: { icon: Gavel, color: "text-zinc-500 bg-zinc-50 dark:bg-zinc-800" },
  };
  
  const config = iconConfig[item.type] || iconConfig.movimentacao;
  const Icon = config.icon;
  
  return (
    <div className="relative pl-10">
      <div className={cn(
        "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center",
        config.color.split(" ").slice(1).join(" ")
      )}>
        <Icon className={cn("w-3 h-3", config.color.split(" ")[0])} />
      </div>
      
      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {item.title}
            </h4>
            {item.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <span className="text-xs font-mono text-zinc-400 flex-shrink-0">
            {item.date ? format(new Date(item.date), "dd/MM/yyyy") : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CasoDetailPage() {
  const params = useParams();
  const casoId = Number(params.id);
  const [activeTab, setActiveTab] = useState("resumo");

  // Query do caso
  const { data: casoFromDB, isLoading, refetch } = trpc.casos.getById.useQuery(
    { id: casoId },
    { enabled: !isNaN(casoId) }
  );

  // Query da timeline
  const { data: timelineFromDB = [] } = trpc.casos.listTimeline.useQuery(
    { casoId },
    { enabled: !isNaN(casoId) }
  );

  // Query das personas
  const { data: personasFromDB = [] } = trpc.casos.listPersonas.useQuery(
    { casoId },
    { enabled: !isNaN(casoId) }
  );

  // ==========================================
  // USAR MOCK DATA SE O BANCO ESTIVER VAZIO
  // ==========================================
  const useMockData = !casoFromDB && !isLoading;
  const caso = useMockData ? MOCK_CASOS_DETAIL[casoId] : casoFromDB;
  const timeline = useMockData ? MOCK_TIMELINE : timelineFromDB;
  const personas = useMockData ? MOCK_PERSONAS : personasFromDB;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Caso não encontrado
        </h1>
        <Link href="/admin/casos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </Link>
      </div>
    );
  }

  const faseConfig = caso.fase ? FASES_CASO[caso.fase.toLowerCase()] : null;
  const isReuPreso = caso.prioridade === "REU_PRESO";
  const assistidosPresos = caso.assistidos?.filter((a: { preso?: boolean }) => a.preso)?.length || 0;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
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
                {faseConfig && (
                  <Badge variant="secondary" className={cn("text-xs font-normal", faseConfig.color)}>
                    {faseConfig.label}
                  </Badge>
                )}
                {caso.codigo && (
                  <span className="text-xs font-mono text-zinc-400">{caso.codigo}</span>
                )}
                {isReuPreso && (
                  <span className="flex items-center gap-1.5 text-xs text-rose-500">
                    <StatusPrisionalDot preso={true} size="sm" />
                    Réu preso
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight tracking-tight">
                {caso.titulo}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> 
                  {formatDistanceToNow(new Date(caso.createdAt), { locale: ptBR, addSuffix: true })}
                </span>
                {caso.assistidos?.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> 
                    {caso.assistidos.length} assistido{caso.assistidos.length > 1 ? "s" : ""}
                  </span>
                )}
                {caso.processos?.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> 
                    {caso.processos.length} processo{caso.processos.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Avatares dos Assistidos */}
          {caso.assistidos && caso.assistidos.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Assistidos:</span>
              <div className="flex -space-x-2">
                {caso.assistidos.slice(0, 5).map((assistido: { id: number; nome: string; photoUrl?: string | null; preso?: boolean; localPrisao?: string | null }) => (
                  <Tooltip key={assistido.id}>
                    <TooltipTrigger>
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-950">
                          <AvatarImage src={assistido.photoUrl || undefined} />
                          <AvatarFallback className="text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {getInitials(assistido.nome)}
                          </AvatarFallback>
                        </Avatar>
                        {assistido.preso && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-zinc-950">
                            <StatusPrisionalDot preso={true} size="sm" />
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <p className="font-medium">{assistido.nome}</p>
                        {assistido.localPrisao && (
                          <p className="text-xs text-muted-foreground">{assistido.localPrisao}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {caso.assistidos.length > 5 && (
                  <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 border-2 border-white dark:border-zinc-950">
                    +{caso.assistidos.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 h-auto flex-wrap w-full justify-start">
            <TabsTrigger value="resumo" className="gap-2">
              <BookOpen className="w-4 h-4" /> Resumo
            </TabsTrigger>
            <TabsTrigger value="teoria" className="gap-2">
              <Shield className="w-4 h-4" /> Teoria do Caso
            </TabsTrigger>
            <TabsTrigger value="envolvidos" className="gap-2">
              <Users className="w-4 h-4" /> Envolvidos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Activity className="w-4 h-4" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="processos" className="gap-2">
              <Scale className="w-4 h-4" /> Processos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumo */}
          <TabsContent value="resumo" className="mt-6 space-y-6">
            {/* Stats Cards - Design Defender */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Assistidos */}
              <div className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Assistidos</span>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
                      {caso.assistidos?.length || 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-900/10 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-rose-500" />
                  </div>
                </div>
                {assistidosPresos > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      {assistidosPresos} preso{assistidosPresos > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Processos */}
              <div className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Processos</span>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
                      {caso.processos?.length || 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 group-hover:scale-105 transition-transform">
                    <Scale className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>
              
              {/* Audiências */}
              <div className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Audiências</span>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
                      {caso.audiencias?.length || 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>
              </div>
              
              {/* Personas */}
              <div className="group relative bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-900/50 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Personas</span>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 tracking-tight">
                      {personas.length}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-900/10 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 text-violet-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            {caso.observacoes && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Observações</h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{caso.observacoes}</p>
              </div>
            )}

            {/* Tags */}
            {caso.tags && (
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    const tags = JSON.parse(caso.tags);
                    return Array.isArray(tags) ? tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    )) : null;
                  } catch {
                    return null;
                  }
                })()}
              </div>
            )}
          </TabsContent>

          {/* Tab: Teoria do Caso */}
          <TabsContent value="teoria" className="mt-6 space-y-4">
            <TeoriaSection
              casoId={casoId}
              field="teoriaFatos"
              title="Fatos"
              icon={FileText}
              value={caso.teoriaFatos}
              colorClass="border-blue-100 dark:border-blue-900/30"
              refetch={refetch}
            />
            <TeoriaSection
              casoId={casoId}
              field="teoriaProvas"
              title="Provas"
              icon={FileSearch}
              value={caso.teoriaProvas}
              colorClass="border-amber-100 dark:border-amber-900/30"
              refetch={refetch}
            />
            <TeoriaSection
              casoId={casoId}
              field="teoriaDireito"
              title="Direito"
              icon={Scale}
              value={caso.teoriaDireito}
              colorClass="border-emerald-100 dark:border-emerald-900/30"
              refetch={refetch}
            />
          </TabsContent>

          {/* Tab: Envolvidos (Assistidos + Personas) */}
          <TabsContent value="envolvidos" className="mt-6 space-y-8">
            {/* Assistidos */}
            {caso.assistidos && caso.assistidos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                    <User className="w-4 h-4 text-rose-500" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Assistidos
                  </h3>
                  <span className="text-xs text-zinc-400 ml-1">({caso.assistidos.length})</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {caso.assistidos.map((assistido: { id: number; nome: string; photoUrl?: string | null; preso?: boolean; localPrisao?: string | null; statusPrisional?: string; vulgo?: string; dataPrisao?: string | null }) => (
                    <div 
                      key={assistido.id} 
                      className={cn(
                        "group bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden",
                        "hover:shadow-md transition-all duration-200 cursor-pointer",
                        assistido.preso 
                          ? "border-l-[3px] border-l-red-500 border-zinc-200 dark:border-zinc-800" 
                          : "border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 border-2 border-zinc-100 dark:border-zinc-800">
                            <AvatarImage src={assistido.photoUrl || undefined} />
                            <AvatarFallback className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              {getInitials(assistido.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                              {assistido.nome}
                            </h4>
                            <PrisonerIndicator 
                              preso={!!assistido.preso} 
                              localPrisao={assistido.localPrisao || undefined}
                              size="sm" 
                            />
                          </div>
                        </div>
                      </div>
                      {assistido.preso && assistido.localPrisao && (
                        <div className="px-4 py-2.5 bg-red-50/50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/20">
                          <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{assistido.localPrisao}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personas */}
            {personas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                    <Users className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Outras Personas
                  </h3>
                  <span className="text-xs text-zinc-400 ml-1">({personas.length})</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {personas.map((persona) => {
                    const tipoColors: Record<string, string> = {
                      vitima: "border-l-amber-500",
                      testemunha: "border-l-blue-500",
                      perito: "border-l-emerald-500",
                      outro: "border-l-zinc-400",
                    };
                    return (
                      <div 
                        key={persona.id} 
                        className={cn(
                          "group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden",
                          "hover:shadow-md transition-all duration-200",
                          "border-l-[3px]",
                          tipoColors[persona.tipo?.toLowerCase()] || tipoColors.outro
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {persona.nome}
                              </h4>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mt-0.5 block">
                                {persona.tipo}
                              </span>
                            </div>
                            {persona.status && (
                              <Badge 
                                className={cn(
                                  "text-[10px] font-medium border-0",
                                  persona.status === "ouvida" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                  persona.status === "pendente" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                )}
                              >
                                {persona.status}
                              </Badge>
                            )}
                          </div>
                          {persona.observacoes && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                              {persona.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!caso.assistidos || caso.assistidos.length === 0) && personas.length === 0 && (
              <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                  <Users className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Nenhum envolvido cadastrado</p>
                <p className="text-xs text-zinc-400 mt-1">Adicione assistidos e testemunhas ao caso</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Timeline */}
          <TabsContent value="timeline" className="mt-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <Activity className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Linha do Tempo
                </h3>
                <span className="text-xs text-zinc-400 ml-1">({timeline.length})</span>
              </div>
              
              {timeline.length === 0 ? (
                <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                    <Activity className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Nenhum evento registrado</p>
                  <p className="text-xs text-zinc-400 mt-1">Os eventos aparecerão aqui conforme o caso evolui</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-200 via-blue-200 to-zinc-200 dark:from-emerald-900 dark:via-blue-900 dark:to-zinc-800 rounded-full" />
                  <div className="space-y-3">
                    {timeline.slice(0, 20).map((item) => (
                      <TimelineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Processos */}
          <TabsContent value="processos" className="mt-6">
            <div className="space-y-3">
              {caso.processos && caso.processos.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Scale className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Processos Vinculados
                    </h3>
                    <span className="text-xs text-zinc-400 ml-1">({caso.processos.length})</span>
                  </div>
                  {caso.processos.map((processo: { id: number; numeroAutos: string; vara: string; comarca: string; fase?: string; demandasAbertas?: number }) => (
                    <div 
                      key={processo.id} 
                      className="group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 border-l-[3px] border-l-blue-500 overflow-hidden hover:shadow-md transition-all duration-200"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                              {processo.numeroAutos}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {processo.vara} • {processo.comarca}
                            </p>
                            {processo.fase && (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] mt-2.5 font-medium bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                              >
                                {processo.fase}
                              </Badge>
                            )}
                          </div>
                          <Link href={`/admin/processos/${processo.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            >
                              Ver <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-16 bg-zinc-50/50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                    <Scale className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Nenhum processo vinculado</p>
                  <p className="text-xs text-zinc-400 mt-1 mb-4">Vincule processos para acompanhamento integrado</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Vincular processo
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
