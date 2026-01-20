"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Scale,
  Clock,
  FileText,
  MessageCircle,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Gavel,
  MoreHorizontal,
  Lock,
  Unlock,
  Heart,
  Activity,
  History,
  Target,
  BookOpen,
  Link2,
  ExternalLink,
  FolderOpen,
  Plus,
  ChevronRight,
  Send,
  Bell,
  Camera,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, cn } from "@/lib/utils";
import { format, differenceInYears, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";
import { TeoriaDoCaso } from "@/components/casos/teoria-do-caso";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import { MentionTextarea, renderMentions } from "@/components/shared/mention-textarea";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// TIPOS
// ==========================================

interface HealthScore {
  overall: number; // 0-100
  prazos: "ok" | "warning" | "critical";
  prisao: "solto" | "monitorado" | "preso";
  processos: number;
  demandas: number;
  audiencias: number;
}

interface TimelineEvent {
  id: string;
  type:
    | "audiencia"
    | "documento"
    | "demanda"
    | "movimentacao"
    | "nota"
    | "peticao"
    | "decisao"
    | "atendimento"
    | "whatsapp"
    | "notificacao";
  title: string;
  description?: string;
  date: Date;
  icon: React.ReactNode;
  color: string;
  processoNumero?: string;
}

// ==========================================
// DADOS MOCK
// ==========================================

const mockAssistido = {
  id: 5,
  nome: "Diego Bonfim Almeida",
  cpf: "123.456.789-00",
  rg: "12.345.678-90",
  dataNascimento: "1990-05-15",
  nomeMae: "Maria Almeida Santos",
  naturalidade: "Salvador/BA",
  nacionalidade: "Brasileira",
  statusPrisional: "CADEIA_PUBLICA",
  unidadePrisional: "Cadeia Pública de Candeias",
  dataPrisao: "2024-11-20",
  telefone: "(71) 99999-1234",
  telefoneContato: "(71) 98888-5678",
  nomeContato: "Maria (Mãe)",
  parentescoContato: "Mãe",
  endereco: "Rua das Flores, 123 - Centro, Camaçari/BA",
  defensor: "Dr. Rodrigo",
  photoUrl: null,
  observacoes: "Réu em processo de júri. Acompanhamento prioritário.",
  createdAt: "2024-06-15",
  // Caso vinculado
  casoId: 1,
  casoTitulo: "Homicídio Qualificado - Operação Reuso",
  // Teoria do caso
  teoriaFatos: "O assistido estava em sua residência quando foi surpreendido pela polícia em operação não identificada. Não houve mandado de busca e apreensão.",
  teoriaProvas: "- Câmeras de segurança do vizinho\n- Testemunha confirma ausência de mandado\n- Laudo pericial inconclusivo",
  teoriaDireito: null,
  linkDrive: "https://drive.google.com/drive/folders/example",
};

const mockProcessos = [
  {
    id: 1,
    numeroAutos: "8012906-74.2025.8.05.0039",
    vara: "1ª Vara do Júri",
    comarca: "Camaçari",
    area: "JURI",
    fase: "Instrução",
    situacao: "ativo",
    isJuri: true,
  },
  {
    id: 2,
    numeroAutos: "0001234-56.2025.8.05.0039",
    vara: "VEC",
    comarca: "Camaçari",
    area: "EXECUCAO_PENAL",
    fase: "Execução",
    situacao: "ativo",
    isJuri: false,
  },
];

const mockDemandas = [
  {
    id: 1,
    ato: "Resposta à Acusação",
    prazo: "2026-01-20",
    status: "2_ATENDER",
    processo: "8012906-74.2025.8.05.0039",
    urgente: true,
  },
  {
    id: 2,
    ato: "Alegações Finais",
    prazo: "2026-02-15",
    status: "5_FILA",
    processo: "8012906-74.2025.8.05.0039",
    urgente: false,
  },
];

const mockAudiencias: any[] = [
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
    resumoDefesa: "Focar na nulidade da busca domiciliar",
    assistidoId: 5,
    assistidoNome: "Diego Bonfim Almeida",
    assistidoPreso: true,
    processoId: 1,
    numeroAutos: "8012906-74.2025.8.05.0039",
    defensorNome: "Dr. Rodrigo",
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: "mov-1",
    type: "movimentacao",
    title: "Resposta à Acusação protocolada",
    description: "Petição protocolada no sistema PJe",
    date: new Date("2026-01-15T10:30:00"),
    icon: <FileText className="w-4 h-4" />,
    color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
    processoNumero: "8012906-74.2025.8.05.0039",
  },
  {
    id: "nota-2",
    type: "nota",
    title: "Mensagem enviada para familiar",
    description: "Notificação de audiência enviada para Maria (Mãe)",
    date: new Date("2026-01-14T15:20:00"),
    icon: <MessageCircle className="w-4 h-4" />,
    color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    id: "nota-3",
    type: "nota",
    title: "Atendimento presencial",
    description: "Orientação sobre procedimentos da audiência de instrução",
    date: new Date("2026-01-10T14:00:00"),
    icon: <User className="w-4 h-4" />,
    color: "text-violet-500 bg-violet-100 dark:bg-violet-900/30",
  },
  {
    id: "aud-4",
    type: "audiencia",
    title: "Decisão de designação de audiência",
    description: "Audiência de instrução designada para 25/01/2026",
    date: new Date("2026-01-08T09:45:00"),
    icon: <Gavel className="w-4 h-4" />,
    color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
    processoNumero: "8012906-74.2025.8.05.0039",
  },
  {
    id: "doc-5",
    type: "documento",
    title: "Novo documento anexado",
    description: "RG e Comprovante de Residência",
    date: new Date("2026-01-05T11:00:00"),
    icon: <FolderOpen className="w-4 h-4" />,
    color: "text-rose-500 bg-rose-100 dark:bg-rose-900/30",
  },
  {
    id: "dem-6",
    type: "demanda",
    title: "Prazo cadastrado",
    description: "Resposta à Acusação - vence em 20/01/2026",
    date: new Date("2026-01-03T08:30:00"),
    icon: <Bell className="w-4 h-4" />,
    color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800",
  },
];

const timelineStyleMap: Record<string, { icon: React.ReactNode; color: string }> = {
  audiencia: { icon: <Calendar className="w-4 h-4" />, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  demanda: { icon: <Clock className="w-4 h-4" />, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  documento: { icon: <FolderOpen className="w-4 h-4" />, color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30" },
  movimentacao: { icon: <FileText className="w-4 h-4" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  nota: { icon: <MessageCircle className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  peticao: { icon: <FileText className="w-4 h-4" />, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  decisao: { icon: <Gavel className="w-4 h-4" />, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  atendimento: { icon: <User className="w-4 h-4" />, color: "text-violet-600 bg-violet-100 dark:bg-violet-900/30" },
  whatsapp: { icon: <MessageCircle className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
  notificacao: { icon: <Bell className="w-4 h-4" />, color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800" },
  default: { icon: <History className="w-4 h-4" />, color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800" },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  COP: { label: "COP", color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  MONITORADO: { label: "Monitorado", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20" },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-500", bgColor: "bg-orange-50 dark:bg-orange-900/20" },
  SOLTO: { label: "Solto", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
};

// ==========================================
// COMPONENTES
// ==========================================

function HealthScoreCard({ score }: { score: HealthScore }) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (value >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-emerald-500";
    if (value >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Health Score
        </h3>
        <span className={cn("text-2xl font-bold", getScoreColor(score.overall))}>
          {score.overall}%
        </span>
      </div>
      
      <div className="relative h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4">
        <div 
          className={cn("h-full transition-all duration-500", getProgressColor(score.overall))}
          style={{ width: `${score.overall}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className={cn(
            "text-lg font-bold",
            score.prazos === "ok" ? "text-emerald-600" : 
            score.prazos === "warning" ? "text-amber-600" : "text-rose-600"
          )}>
            {score.demandas}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Prazos</p>
        </div>
        <div>
          <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{score.processos}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Processos</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600">{score.audiencias}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Audiências</p>
        </div>
      </div>
    </Card>
  );
}

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div className={cn("p-2 rounded-full", event.color)}>
          {event.icon}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-2" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {event.title}
            </h4>
            {event.description && (
              <p className="text-xs text-zinc-500 mt-0.5">{event.description}</p>
            )}
            {event.processoNumero && (
              <Badge variant="outline" className="mt-2 text-[10px] font-mono">
                {event.processoNumero}
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-400 flex-shrink-0">
            {formatDistanceToNow(event.date, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({ 
  icon, 
  label, 
  value, 
  color,
  onClick,
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer hover:shadow-md transition-shadow",
        onClick && "hover:border-zinc-300 dark:hover:border-zinc-600"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", color)}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function AssistidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { config } = useAssignment();
  const [activeTab, setActiveTab] = useState("resumo");
  const [noteText, setNoteText] = useState("");
  const assistidoId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const { data: timelineData } = trpc.assistidos.listTimeline.useQuery(
    { assistidoId },
    { enabled: Number.isFinite(assistidoId) }
  );

  const assistido = mockAssistido;
  const idade = assistido.dataNascimento
    ? differenceInYears(new Date(), parseISO(assistido.dataNascimento))
    : null;

  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const isPreso = !["SOLTO", "MONITORADO"].includes(assistido.statusPrisional);
  const mentionSuggestions = useMemo(() => {
    return [
      { id: `p-${assistido.id}`, label: assistido.nome, type: "pessoa" as const },
      ...mockProcessos.map((processo) => ({
        id: `d-${processo.id}`,
        label: processo.numeroAutos,
        type: "documento" as const,
      })),
      ...mockDemandas.map((demanda) => ({
        id: `f-${demanda.id}`,
        label: demanda.ato,
        type: "fato" as const,
      })),
      ...mockAudiencias.map((audiencia) => ({
        id: `f-aud-${audiencia.id}`,
        label: `Audiência ${audiencia.tipo}`,
        type: "fato" as const,
      })),
    ];
  }, [assistido.id, assistido.nome]);

  const timelineSource = useMemo<TimelineEvent[]>(() => {
    if (!timelineData || timelineData.length === 0) return mockTimeline;
    return timelineData.map((item) => {
      const style = timelineStyleMap[item.type] || timelineStyleMap.default;
      return {
        id: item.id,
        type: item.type as TimelineEvent["type"],
        title: item.title,
        description: item.description || undefined,
        date: new Date(item.date as any),
        icon: style.icon,
        color: style.color,
        processoNumero: "processoNumero" in item ? item.processoNumero : undefined,
      };
    });
  }, [timelineData]);

  // Health Score calculado
  const healthScore: HealthScore = {
    overall: isPreso ? 45 : 78,
    prazos: mockDemandas.some(d => d.urgente) ? "warning" : "ok",
    prisao: isPreso ? "preso" : "solto",
    processos: mockProcessos.length,
    demandas: mockDemandas.length,
    audiencias: mockAudiencias.length,
  };

  const handleTeoriaUpdate = async (
    field: "teoriaFatos" | "teoriaProvas" | "teoriaDireito",
    value: string
  ) => {
    console.log("Atualizando", field, "com:", value);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Avatar e Info Básica */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className={cn(
                  "h-20 w-20 ring-4",
                  isPreso ? "ring-rose-500/30" : "ring-emerald-500/30"
                )}>
                  <AvatarImage src={assistido.photoUrl || undefined} />
                  <AvatarFallback
                    className="text-xl font-bold"
                    style={{
                      background: isPreso ? "hsl(350, 55%, 95%)" : config.accentColorLight,
                      color: isPreso ? "hsl(350, 55%, 50%)" : config.accentColor,
                    }}
                  >
                    {getInitials(assistido.nome)}
                  </AvatarFallback>
                </Avatar>
                {/* Status Indicator */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-white dark:border-zinc-900",
                  isPreso ? "bg-rose-500" : "bg-emerald-500"
                )}>
                  {isPreso ? (
                    <Lock className="w-3 h-3 text-white" />
                  ) : (
                    <Unlock className="w-3 h-3 text-white" />
                  )}
                </div>
                {/* Photo Edit Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute -bottom-1 -left-1 h-6 w-6 p-0 rounded-full"
                    >
                      <Camera className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alterar foto</TooltipContent>
                </Tooltip>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {assistido.nome}
                  </h1>
                  <Badge className={cn("text-xs", status.bgColor, status.color)}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {idade} anos • {assistido.naturalidade}
                </p>
                {assistido.casoTitulo && (
                  <Link 
                    href={`/admin/casos/${assistido.casoId}`}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    <Target className="w-3 h-3" />
                    {assistido.casoTitulo}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button size="sm" style={{ backgroundColor: config.accentColor }}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendar Atendimento
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4">
          <HealthScoreCard score={healthScore} />
          
          <QuickStatCard
            icon={<Scale className="w-5 h-5 text-blue-600" />}
            label="Processos"
            value={mockProcessos.length}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <QuickStatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label="Prazos Pendentes"
            value={mockDemandas.length}
            color="bg-amber-100 dark:bg-amber-900/30"
          />
          <QuickStatCard
            icon={<Calendar className="w-5 h-5 text-violet-600" />}
            label="Audiências"
            value={mockAudiencias.length}
            color="bg-violet-100 dark:bg-violet-900/30"
          />
          <QuickStatCard
            icon={<FolderOpen className="w-5 h-5 text-emerald-600" />}
            label="Documentos"
            value={12}
            color="bg-emerald-100 dark:bg-emerald-900/30"
          />
        </div>

        {/* Tabs de Navegação Interna */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1">
            <TabsTrigger value="resumo" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Linha do Tempo
            </TabsTrigger>
            <TabsTrigger value="teoria" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Teoria do Caso
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Audiências
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumo (Briefing) */}
          <TabsContent value="resumo" className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Coluna 1: Dados Pessoais */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados Pessoais
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">CPF</p>
                    <p className="font-mono text-sm">{assistido.cpf}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">RG</p>
                    <p className="font-mono text-sm">{assistido.rg}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Data de Nascimento</p>
                    <p className="text-sm">
                      {format(parseISO(assistido.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Mãe</p>
                    <p className="text-sm">{assistido.nomeMae}</p>
                  </div>
                </div>
              </Card>

              {/* Coluna 2: Situação Prisional */}
              <Card className={cn(
                "p-5",
                isPreso && "border-l-[3px] border-l-rose-500"
              )}>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  {isPreso ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                  Situação Prisional
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Status</p>
                    <Badge className={cn("mt-1", status.bgColor, status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                  {assistido.unidadePrisional && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Unidade</p>
                      <p className="text-sm">{assistido.unidadePrisional}</p>
                    </div>
                  )}
                  {assistido.dataPrisao && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Data da Prisão</p>
                      <p className="text-sm">
                        {format(parseISO(assistido.dataPrisao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Coluna 3: Contato */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Telefone</p>
                    <p className="text-sm">{assistido.telefone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Contato Familiar</p>
                    <p className="text-sm">{assistido.nomeContato}</p>
                    <p className="text-xs text-zinc-500">{assistido.telefoneContato}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Endereço</p>
                    <p className="text-sm">{assistido.endereco}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-5 border-dashed">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Nota Integrada
                </h3>
                <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em]">
                  Menções
                </Badge>
              </div>
              <div className="space-y-4">
                <MentionTextarea
                  value={noteText}
                  onChange={setNoteText}
                  suggestions={mentionSuggestions}
                  placeholder="Use @ para pessoa, # para documento e $ para fato."
                />
                <div className="rounded-sm border border-slate-200 dark:border-slate-800 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Pré-visualização
                  </p>
                  <div className="text-sm text-slate-700 dark:text-slate-300 space-x-1">
                    {noteText ? renderMentions(noteText) : "Sua nota aparecerá aqui."}
                  </div>
                </div>
              </div>
            </Card>

            {/* Processos Vinculados */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Processos Vinculados
                </h3>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Processo
                </Button>
              </div>
              <div className="space-y-2">
                {mockProcessos.map((processo) => (
                  <Link
                    key={processo.id}
                    href={`/admin/processos/${processo.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
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
                      <div>
                        <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                          {processo.numeroAutos}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {processo.vara} - {processo.comarca}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {processo.fase}
                      </Badge>
                      {processo.isJuri && (
                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">
                          Júri
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Prazos Pendentes */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Prazos Pendentes
                </h3>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Demanda
                </Button>
              </div>
              <div className="space-y-2">
                {mockDemandas.map((demanda) => (
                  <div
                    key={demanda.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      demanda.urgente 
                        ? "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"
                        : "bg-zinc-50 dark:bg-zinc-900"
                    )}
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {demanda.ato}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">
                        {demanda.processo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {demanda.urgente && (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      )}
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        demanda.urgente && "border-rose-300 text-rose-700"
                      )}>
                        {format(parseISO(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Linha do Tempo */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico Completo
                </h3>
                <p className="text-sm text-zinc-500">
                  {timelineSource.length} eventos registrados
                </p>
              </div>
              
              <div className="space-y-0">
                {timelineSource.map((event, idx) => (
                  <TimelineItem 
                    key={event.id} 
                    event={event} 
                    isLast={idx === timelineSource.length - 1}
                  />
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Tab: Teoria do Caso */}
          <TabsContent value="teoria" className="mt-6">
            <TeoriaDoCaso
              casoId={assistido.casoId || 0}
              teoriaFatos={assistido.teoriaFatos}
              teoriaProvas={assistido.teoriaProvas}
              teoriaDireito={assistido.teoriaDireito}
              linkDrive={assistido.linkDrive}
              onUpdate={handleTeoriaUpdate}
            />
          </TabsContent>

          {/* Tab: Audiências */}
          <TabsContent value="audiencias" className="mt-6">
            <AudienciasHub audiencias={mockAudiencias} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
