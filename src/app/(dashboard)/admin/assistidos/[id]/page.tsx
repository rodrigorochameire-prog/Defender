"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  ArrowLeft,
  Edit,
  Phone,
  User,
  Activity,
  History,
  Target,
  FolderOpen,
  Plus,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Lock,
  Unlock,
  MapPin,
  Scale,
  Clock,
  Calendar,
  FileText,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Link as LinkIcon,
  Gavel,
  Shield,
  File,
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
// DADOS MOCK (Updated)
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
  casoId: 1,
  casoTitulo: "Homicídio Qualificado - Operação Reuso",
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
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    processoNumero: "8012906-74.2025.8.05.0039",
  },
  // ... more timeline events
];

const timelineStyleMap: Record<string, { icon: React.ReactNode; color: string }> = {
  audiencia: { icon: <Calendar className="w-4 h-4" />, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
  demanda: { icon: <Clock className="w-4 h-4" />, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  documento: { icon: <FolderOpen className="w-4 h-4" />, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
  movimentacao: { icon: <FileText className="w-4 h-4" />, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  nota: { icon: <MessageCircle className="w-4 h-4" />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  default: { icon: <History className="w-4 h-4" />, color: "text-zinc-500 bg-zinc-50 dark:bg-zinc-800" },
};

const statusConfig: Record<string, { label: string; variant: "reuPreso" | "success" | "warning" | "default" }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", variant: "reuPreso" },
  PENITENCIARIA: { label: "Penitenciária", variant: "reuPreso" },
  COP: { label: "COP", variant: "reuPreso" },
  SOLTO: { label: "Solto", variant: "success" },
  MONITORADO: { label: "Monitorado", variant: "warning" },
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
    <Card className="p-4 bg-muted/20 border-border/50 shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Health Score
        </h3>
        <span className={cn("text-2xl font-bold", getScoreColor(score.overall))}>
          {score.overall}%
        </span>
      </div>
      
      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden mb-4">
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
          <p className="text-[10px] text-muted-foreground uppercase">Prazos</p>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{score.processos}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Processos</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-600">{score.audiencias}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Audiências</p>
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
          <div className="w-0.5 flex-1 bg-border/50 mt-2" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-foreground">
              {event.title}
            </h4>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            )}
            {event.processoNumero && (
              <Badge variant="outline" className="mt-2 text-[10px] font-mono">
                {event.processoNumero}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(event.date, { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
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
  
  // Health Score calculado
  const healthScore: HealthScore = {
    overall: isPreso ? 45 : 78,
    prazos: mockDemandas.some(d => d.urgente) ? "warning" : "ok",
    prisao: isPreso ? "preso" : "solto",
    processos: mockProcessos.length,
    demandas: mockDemandas.length,
    audiencias: mockAudiencias.length,
  };

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
                  isPreso ? "ring-rose-500/20" : "ring-emerald-500/20"
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
                  "absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-background",
                  isPreso ? "bg-rose-500" : "bg-emerald-500"
                )}>
                  {isPreso ? (
                    <Lock className="w-3 h-3 text-white" />
                  ) : (
                    <Unlock className="w-3 h-3 text-white" />
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">
                    {assistido.nome}
                  </h1>
                  <Badge variant={status.variant as any}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {idade} anos • {assistido.naturalidade}
                </p>
                {assistido.casoTitulo && (
                  <Link 
                    href={`/admin/casos/${assistido.casoId}`}
                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
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
            <Button size="sm">
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
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none hover:border-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Scale className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{mockProcessos.length}</p>
                <p className="text-xs text-muted-foreground">Processos</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none hover:border-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{mockDemandas.length}</p>
                <p className="text-xs text-muted-foreground">Prazos</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none hover:border-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{mockAudiencias.length}</p>
                <p className="text-xs text-muted-foreground">Audiências</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-muted/20 border-border/50 shadow-none hover:border-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Documentos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs de Navegação Interna */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1">
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
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados Pessoais
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">CPF</p>
                    <p className="font-mono text-sm">{assistido.cpf}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">RG</p>
                    <p className="font-mono text-sm">{assistido.rg}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Data de Nascimento</p>
                    <p className="text-sm">
                      {format(parseISO(assistido.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Mãe</p>
                    <p className="text-sm">{assistido.nomeMae}</p>
                  </div>
                </div>
              </Card>

              {/* Coluna 2: Situação Prisional */}
              <Card className={cn(
                "p-5",
                isPreso && "border-l-[3px] border-l-rose-500"
              )}>
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  {isPreso ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                  Situação Prisional
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <Badge variant={status.variant as any} className="mt-1">
                      {status.label}
                    </Badge>
                  </div>
                  {assistido.unidadePrisional && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Unidade</p>
                      <p className="text-sm">{assistido.unidadePrisional}</p>
                    </div>
                  )}
                  {assistido.dataPrisao && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Data da Prisão</p>
                      <p className="text-sm">
                        {format(parseISO(assistido.dataPrisao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Coluna 3: Contato */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Telefone</p>
                    <p className="text-sm">{assistido.telefone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Contato Familiar</p>
                    <p className="text-sm">{assistido.nomeContato}</p>
                    <p className="text-xs text-muted-foreground">{assistido.telefoneContato}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Endereço</p>
                    <p className="text-sm">{assistido.endereco}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Processos Vinculados */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Histórico Criminal
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
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        processo.isJuri 
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" 
                          : "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      )}>
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-mono text-sm text-foreground">
                          {processo.numeroAutos}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {processo.vara} - {processo.comarca}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {processo.fase}
                      </Badge>
                      {processo.isJuri && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800 text-[10px]">
                          Júri
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>

            {/* Prazos Pendentes */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                        : "bg-muted/30"
                    )}
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {demanda.ato}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {demanda.processo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {demanda.urgente && (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      )}
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        demanda.urgente && "border-rose-300 text-rose-700 dark:text-rose-400"
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
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico Completo
                </h3>
                <p className="text-sm text-muted-foreground">
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
              onUpdate={async () => {}}
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
