"use client";

import { useState, use, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Save,
  Edit,
  Trash2,
  Archive,
  MoreVertical,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Gavel,
  Scale,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  MessageSquare,
  Search,
  ExternalLink,
  FolderOpen,
  Send,
  Briefcase,
  Heart,
  Building2,
  ChevronRight,
  History,
  Timer,
  Target,
  Mic,
  PenLine,
  Info,
  ClipboardList,
  Users,
  Link2,
  Copy,
  Eye,
  TrendingUp,
  AlertCircle,
  Camera,
  Upload,
  Sparkles,
  Activity,
  BarChart3,
  CalendarDays,
  FileCheck,
  Siren,
  Shield,
  Bell,
  Zap,
  GripVertical,
  CircleDot,
  Ban,
  CheckCircle,
  CircleAlert,
  CircleDashed,
  ChevronDown,
  Star,
  Bookmark,
  Share2,
  Printer,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, differenceInYears, addDays, isBefore, isAfter, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { DiligenciasPanel } from "@/components/diligencias";

// ============================================
// TIPOS
// ============================================
interface Registro {
  id: string;
  tipo: "atendimento" | "diligencia" | "informacao" | "peticao" | "anotacao" | "audiencia" | "movimento" | "visita";
  titulo: string;
  descricao: string;
  data: string;
  autor: string;
  importante: boolean;
  processoId?: number;
}

interface Processo {
  id: number;
  numero: string;
  tipo: string;
  vara: string;
  fase: string;
  ultimaMovimentacao: string;
  proximaAudiencia?: string;
  status: "ativo" | "arquivado" | "suspenso";
  urgente?: boolean;
}

interface Audiencia {
  id: number;
  data: string;
  hora: string;
  tipo: string;
  vara: string;
  processoNumero: string;
  processoId: number;
  status: "agendada" | "realizada" | "adiada" | "cancelada";
  observacoes?: string;
}

interface Demanda {
  id: string;
  titulo: string;
  tipo: string;
  status: "pendente" | "em_andamento" | "concluida";
  prioridade: "baixa" | "media" | "alta" | "urgente";
  dataCriacao: string;
  dataLimite?: string;
  responsavel?: string;
}

// ============================================
// DADOS MOCKADOS
// ============================================
const assistidoMock = {
  id: 1,
  nome: "João Carlos da Silva Santos",
  cpf: "123.456.789-00",
  rg: "12.345.678-9",
  dataNascimento: "1985-05-15",
  naturalidade: "Salvador/BA",
  nomeMae: "Maria da Silva Santos",
  nomePai: "Carlos Antônio Santos",
  escolaridade: "Ensino Médio Completo",
  profissao: "Mecânico",
  estadoCivil: "Casado",

  // Contato
  telefone: "(71) 99999-8888",
  telefoneContato: "(71) 98888-7777",
  nomeContato: "Maria Santos (esposa)",
  parentescoContato: "Cônjuge",
  email: "joao.santos@email.com",

  // Endereço
  endereco: "Rua das Flores, 123",
  bairro: "Centro",
  cidade: "Camaçari",
  uf: "BA",
  cep: "42800-000",

  // Status
  statusPrisional: "CADEIA_PUBLICA",
  localPrisao: "Conjunto Penal de Camaçari",
  unidadePrisional: "CP Camaçari",
  dataPrisao: "2024-06-15",
  regimePrisional: "Fechado",

  // Processo
  crimePrincipal: "Roubo Majorado (Art. 157, §2º, II)",
  processoPrincipal: "0001234-56.2024.8.05.0039",
  atribuicao: "JURI",

  // Imagem
  photoUrl: "",

  // Metadados
  vulgo: "Carlinhos",
  observacoes: "Assistido colaborativo. Família presente nas visitas. Trabalhava como mecânico antes da prisão.",
  arquivado: false,
  favorito: true,
  createdAt: "2024-06-20",
  updatedAt: "2025-01-30",

  // Links
  driveLink: "https://drive.google.com/drive/folders/xxx",
};

const processosMock: Processo[] = [
  {
    id: 1,
    numero: "0001234-56.2024.8.05.0039",
    tipo: "Ação Penal",
    vara: "1ª Vara Criminal de Camaçari",
    fase: "Instrução",
    ultimaMovimentacao: "2025-01-28",
    proximaAudiencia: "2025-02-15",
    status: "ativo",
    urgente: true,
  },
  {
    id: 2,
    numero: "0005678-90.2024.8.05.0039",
    tipo: "Execução Penal",
    vara: "VEP Camaçari",
    fase: "Aguardando progressão",
    ultimaMovimentacao: "2025-01-20",
    status: "ativo",
  },
];

const audienciasMock: Audiencia[] = [
  {
    id: 1,
    data: "2025-02-15",
    hora: "09:00",
    tipo: "Instrução e Julgamento",
    vara: "1ª Vara Criminal de Camaçari",
    processoNumero: "0001234-56.2024.8.05.0039",
    processoId: 1,
    status: "agendada",
  },
  {
    id: 2,
    data: "2025-01-10",
    hora: "14:00",
    tipo: "Audiência de Custódia",
    vara: "Central de Custódia",
    processoNumero: "0001234-56.2024.8.05.0039",
    processoId: 1,
    status: "realizada",
  },
  {
    id: 3,
    data: "2025-03-20",
    hora: "10:00",
    tipo: "Audiência de Progressão",
    vara: "VEP Camaçari",
    processoNumero: "0005678-90.2024.8.05.0039",
    processoId: 2,
    status: "agendada",
    observacoes: "Levar documentos de trabalho",
  },
];

const registrosMock: Registro[] = [
  {
    id: "1",
    tipo: "atendimento",
    titulo: "Atendimento presencial",
    descricao: "Assistido compareceu acompanhado da esposa. Orientações sobre fase do processo e possibilidade de liberdade provisória.",
    data: "2025-01-30T10:30:00",
    autor: "Dr. Silva",
    importante: false,
  },
  {
    id: "2",
    tipo: "peticao",
    titulo: "Pedido de liberdade provisória",
    descricao: "Protocolada petição de liberdade provisória com argumentos de ausência de fundamentos para prisão preventiva.",
    data: "2025-01-28T15:00:00",
    autor: "Dr. Silva",
    importante: true,
    processoId: 1,
  },
  {
    id: "3",
    tipo: "diligencia",
    titulo: "Busca de documentos",
    descricao: "Solicitados antecedentes e comprovante de residência. Família vai providenciar.",
    data: "2025-01-25T11:00:00",
    autor: "Estagiário João",
    importante: false,
  },
  {
    id: "4",
    tipo: "informacao",
    titulo: "Atualização de contato",
    descricao: "Novo telefone de contato informado pela esposa: (71) 98888-7777",
    data: "2025-01-20T09:00:00",
    autor: "Servidor",
    importante: false,
  },
  {
    id: "5",
    tipo: "audiencia",
    titulo: "Audiência de Instrução agendada",
    descricao: "Audiência de instrução e julgamento designada para 15/02/2025 às 09:00.",
    data: "2025-01-15T16:00:00",
    autor: "Sistema",
    importante: true,
    processoId: 1,
  },
  {
    id: "6",
    tipo: "movimento",
    titulo: "Movimentação processual",
    descricao: "Ministério Público apresentou alegações finais no processo principal.",
    data: "2025-01-12T08:00:00",
    autor: "Sistema",
    importante: true,
    processoId: 1,
  },
  {
    id: "7",
    tipo: "visita",
    titulo: "Visita no presídio",
    descricao: "Realizada visita para coleta de assinatura e orientações sobre o processo.",
    data: "2025-01-08T14:00:00",
    autor: "Estagiário João",
    importante: false,
  },
];

const demandasMock: Demanda[] = [
  {
    id: "1",
    titulo: "Preparar documentos para audiência",
    tipo: "Preparação",
    status: "em_andamento",
    prioridade: "alta",
    dataCriacao: "2025-01-28",
    dataLimite: "2025-02-10",
    responsavel: "Dr. Silva",
  },
  {
    id: "2",
    titulo: "Solicitar certidões atualizadas",
    tipo: "Diligência",
    status: "pendente",
    prioridade: "media",
    dataCriacao: "2025-01-25",
  },
  {
    id: "3",
    titulo: "Elaborar pedido de progressão",
    tipo: "Petição",
    status: "pendente",
    prioridade: "alta",
    dataCriacao: "2025-01-20",
    dataLimite: "2025-02-28",
  },
];

// ============================================
// HELPERS
// ============================================
const tipoRegistroConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  atendimento: { label: "Atendimento", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/30", borderColor: "border-emerald-200 dark:border-emerald-800" },
  diligencia: { label: "Diligência", icon: <Search className="w-3.5 h-3.5" />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/30", borderColor: "border-blue-200 dark:border-blue-800" },
  informacao: { label: "Informação", icon: <Info className="w-3.5 h-3.5" />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/30", borderColor: "border-amber-200 dark:border-amber-800" },
  peticao: { label: "Petição", icon: <FileText className="w-3.5 h-3.5" />, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/30", borderColor: "border-purple-200 dark:border-purple-800" },
  anotacao: { label: "Anotação", icon: <PenLine className="w-3.5 h-3.5" />, color: "text-zinc-600", bgColor: "bg-zinc-50 dark:bg-zinc-800", borderColor: "border-zinc-200 dark:border-zinc-700" },
  audiencia: { label: "Audiência", icon: <Gavel className="w-3.5 h-3.5" />, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/30", borderColor: "border-rose-200 dark:border-rose-800" },
  movimento: { label: "Movimento", icon: <Activity className="w-3.5 h-3.5" />, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-900/30", borderColor: "border-indigo-200 dark:border-indigo-800" },
  visita: { label: "Visita", icon: <Users className="w-3.5 h-3.5" />, color: "text-cyan-600", bgColor: "bg-cyan-50 dark:bg-cyan-900/30", borderColor: "border-cyan-200 dark:border-cyan-800" },
};

const statusPrisionalConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", icon: <Lock className="w-3.5 h-3.5" /> },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", icon: <Lock className="w-3.5 h-3.5" /> },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/40", icon: <Lock className="w-3.5 h-3.5" /> },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/40", icon: <Activity className="w-3.5 h-3.5" /> },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-900/40", icon: <Building2 className="w-3.5 h-3.5" /> },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", icon: <Unlock className="w-3.5 h-3.5" /> },
};

const prioridadeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: "Baixa", color: "text-zinc-600", bgColor: "bg-zinc-100" },
  media: { label: "Média", color: "text-blue-600", bgColor: "bg-blue-100" },
  alta: { label: "Alta", color: "text-amber-600", bgColor: "bg-amber-100" },
  urgente: { label: "Urgente", color: "text-rose-600", bgColor: "bg-rose-100" },
};

const statusDemandaConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: "Pendente", color: "text-zinc-500", icon: <CircleDashed className="w-3.5 h-3.5" /> },
  em_andamento: { label: "Em Andamento", color: "text-blue-500", icon: <CircleDot className="w-3.5 h-3.5" /> },
  concluida: { label: "Concluída", color: "text-emerald-500", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

function calcularIdade(dataNascimento: string) {
  return differenceInYears(new Date(), parseISO(dataNascimento));
}

function calcularTempoPreso(dataPrisao: string) {
  const dias = differenceInDays(new Date(), parseISO(dataPrisao));
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  return `${anos}a ${mesesRestantes}m`;
}

function getProximaAudiencia(audiencias: Audiencia[]) {
  const agendadas = audiencias.filter(a => a.status === "agendada" && parseISO(a.data) >= new Date());
  if (agendadas.length === 0) return null;
  return agendadas.sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime())[0];
}

function getUrgentItems(audiencias: Audiencia[], demandas: Demanda[]) {
  const hoje = new Date();
  const em7Dias = addDays(hoje, 7);

  const audienciasProximas = audiencias.filter(a =>
    a.status === "agendada" &&
    isBefore(parseISO(a.data), em7Dias) &&
    isAfter(parseISO(a.data), hoje)
  );

  const demandasUrgentes = demandas.filter(d =>
    d.status !== "concluida" &&
    d.dataLimite &&
    isBefore(parseISO(d.dataLimite), em7Dias)
  );

  return { audienciasProximas, demandasUrgentes };
}

// ============================================
// COMPONENTES
// ============================================

// Navigation Sidebar
function NavigationSidebar({
  activeSection,
  onSectionChange,
  counts
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  counts: { processos: number; audiencias: number; demandas: number; registros: number };
}) {
  const sections = [
    { id: "visao-geral", label: "Visão Geral", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "dados", label: "Dados Pessoais", icon: <User className="w-4 h-4" /> },
    { id: "processos", label: "Processos", icon: <Scale className="w-4 h-4" />, count: counts.processos },
    { id: "audiencias", label: "Audiências", icon: <Gavel className="w-4 h-4" />, count: counts.audiencias },
    { id: "demandas", label: "Demandas", icon: <ClipboardList className="w-4 h-4" />, count: counts.demandas },
    { id: "diligencias", label: "Diligências", icon: <Search className="w-4 h-4" /> },
    { id: "timeline", label: "Timeline", icon: <History className="w-4 h-4" />, count: counts.registros },
    { id: "documentos", label: "Documentos", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <nav className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-6 space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeSection === section.id
                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            )}
          >
            <span className="flex items-center gap-2.5">
              {section.icon}
              {section.label}
            </span>
            {section.count !== undefined && section.count > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {section.count}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Mobile Navigation
function MobileNavigation({
  activeSection,
  onSectionChange
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const sections = [
    { id: "visao-geral", label: "Visão Geral", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "dados", label: "Dados", icon: <User className="w-4 h-4" /> },
    { id: "processos", label: "Processos", icon: <Scale className="w-4 h-4" /> },
    { id: "audiencias", label: "Audiências", icon: <Gavel className="w-4 h-4" /> },
    { id: "demandas", label: "Demandas", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "diligencias", label: "Diligências", icon: <Search className="w-4 h-4" /> },
    { id: "timeline", label: "Timeline", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto">
      <div className="flex gap-2 pb-2 min-w-max">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap",
              activeSection === section.id
                ? "bg-emerald-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "emerald",
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "emerald" | "amber" | "rose" | "blue" | "purple";
  onClick?: () => void;
}) {
  const colorConfig = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/20", icon: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", icon: "bg-purple-500", text: "text-purple-700 dark:text-purple-400" },
  };

  const config = colorConfig[color];

  return (
    <Card
      className={cn(
        "border-0 shadow-sm transition-all duration-200",
        config.bg,
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{title}</p>
            <p className={cn("text-2xl font-bold", config.text)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl text-white", config.icon)}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">+{trend.value}</span>
            <span className="text-xs text-zinc-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Action Button
function QuickActionButton({
  icon,
  label,
  onClick,
  variant = "default"
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
    success: "bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              variantStyles[variant]
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Novo Registro Modal
function NovoRegistroModal({ assistidoNome, assistidoId }: { assistidoNome: string; assistidoId: number }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("atendimento");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const tiposDisponiveis = ["atendimento", "diligencia", "informacao", "peticao", "anotacao", "visita"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25">
          <Plus className="w-4 h-4 mr-2" />
          Novo Registro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <PenLine className="w-4 h-4 text-emerald-600" />
            </div>
            Novo Registro
          </DialogTitle>
          <DialogDescription>
            Registrar atividade para {assistidoNome}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-xs font-medium text-zinc-500">Tipo de Registro</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {tiposDisponiveis.map((key) => {
                const config = tipoRegistroConfig[key];
                return (
                  <button
                    key={key}
                    onClick={() => setTipo(key)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all",
                      tipo === key
                        ? cn("border-2", config.borderColor, config.bgColor)
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <span className={config.color}>{config.icon}</span>
                    <span className="text-xs font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-zinc-500">Título</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo breve da atividade..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-zinc-500">Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do registro..."
              className="mt-1 min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              // TODO: Salvar registro via tRPC
              setOpen(false);
            }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Alert Card for urgent items
function AlertCard({
  type,
  title,
  items
}: {
  type: "audiencia" | "demanda";
  title: string;
  items: Array<{ id: string | number; label: string; date: string; sublabel?: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-300">{title}</h4>
          <Badge className="bg-amber-500 text-white text-[10px]">{items.length}</Badge>
        </div>
        <div className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900/50 border border-amber-200 dark:border-amber-800/50">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</p>
                {item.sublabel && <p className="text-xs text-zinc-500">{item.sublabel}</p>}
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                {item.date}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Process Card
function ProcessoCard({ processo }: { processo: Processo }) {
  const diasSemMovimentacao = differenceInDays(new Date(), parseISO(processo.ultimaMovimentacao));

  return (
    <Card className={cn(
      "group transition-all duration-200 hover:shadow-md dark:bg-zinc-900/80",
      processo.urgente && "border-amber-300 dark:border-amber-800"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {processo.urgente && (
              <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
              </div>
            )}
            <Badge variant="outline" className={
              processo.status === "ativo" ? "text-emerald-600 border-emerald-300" :
              processo.status === "suspenso" ? "text-amber-600 border-amber-300" :
              "text-zinc-500 border-zinc-300"
            }>
              {processo.status}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Copiar número
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir no PJe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm font-semibold">{processo.numero}</p>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{processo.tipo}</p>
          <p className="text-xs text-zinc-500">{processo.vara}</p>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">
              {processo.fase}
            </Badge>
            {diasSemMovimentacao > 30 && (
              <span className="text-[10px] text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {diasSemMovimentacao}d sem mov.
              </span>
            )}
          </div>
          {processo.proximaAudiencia && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
              <Gavel className="w-3 h-3 mr-1" />
              {format(parseISO(processo.proximaAudiencia), "dd/MM")}
            </Badge>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Link href={`/admin/processos/${processo.id}`}>
            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              Ver processo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Audiencia Card
function AudienciaCard({ audiencia }: { audiencia: Audiencia }) {
  const isPast = isBefore(parseISO(audiencia.data), new Date());
  const isNear = !isPast && differenceInDays(parseISO(audiencia.data), new Date()) <= 7;

  const statusConfig = {
    agendada: { color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: <Clock className="w-3 h-3" /> },
    realizada: { color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: <CheckCircle className="w-3 h-3" /> },
    adiada: { color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", icon: <RefreshCw className="w-3 h-3" /> },
    cancelada: { color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30", icon: <Ban className="w-3 h-3" /> },
  };

  const config = statusConfig[audiencia.status];

  return (
    <Card className={cn(
      "transition-all duration-200",
      isPast
        ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
        : isNear
          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
          : "dark:bg-zinc-900/80"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", config.bg)}>
              <Gavel className={cn("w-4 h-4", config.color)} />
            </div>
            <div>
              <p className={cn(
                "font-semibold text-sm",
                isPast ? "text-zinc-500" : isNear ? "text-amber-800 dark:text-amber-300" : "text-zinc-900 dark:text-zinc-100"
              )}>
                {format(parseISO(audiencia.data), "dd/MM/yyyy")} às {audiencia.hora}
              </p>
              <p className="text-xs text-zinc-500">
                {isNear && !isPast ? `Em ${differenceInDays(parseISO(audiencia.data), new Date())} dias` : ""}
              </p>
            </div>
          </div>
          <Badge className={cn("border-0", config.bg, config.color)}>
            {config.icon}
            <span className="ml-1">{audiencia.status}</span>
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">{audiencia.tipo}</p>
          <p className="text-xs text-zinc-500">{audiencia.vara}</p>
          <p className="text-[10px] text-zinc-400 font-mono">{audiencia.processoNumero}</p>
        </div>

        {audiencia.observacoes && (
          <div className="mt-3 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <Info className="w-3 h-3 inline mr-1" />
              {audiencia.observacoes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Demanda Card
function DemandaCard({ demanda }: { demanda: Demanda }) {
  const isOverdue = demanda.dataLimite && isBefore(parseISO(demanda.dataLimite), new Date()) && demanda.status !== "concluida";
  const statusCfg = statusDemandaConfig[demanda.status];
  const prioridadeCfg = prioridadeConfig[demanda.prioridade];

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-sm dark:bg-zinc-900/80",
      isOverdue && "border-rose-300 dark:border-rose-800"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={statusCfg.color}>{statusCfg.icon}</span>
            <Badge variant="outline" className={cn("text-[10px]", prioridadeCfg.color)}>
              {prioridadeCfg.label}
            </Badge>
          </div>
          {isOverdue && (
            <Badge className="bg-rose-100 text-rose-700 text-[10px] border-0">
              <AlertCircle className="w-3 h-3 mr-1" />
              Atrasada
            </Badge>
          )}
        </div>

        <h4 className="font-medium text-sm mb-1">{demanda.titulo}</h4>
        <p className="text-xs text-zinc-500">{demanda.tipo}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400">
            Criada em {format(parseISO(demanda.dataCriacao), "dd/MM")}
          </span>
          {demanda.dataLimite && (
            <span className={cn(
              "text-[10px]",
              isOverdue ? "text-rose-500" : "text-zinc-500"
            )}>
              Prazo: {format(parseISO(demanda.dataLimite), "dd/MM")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Timeline Item
function TimelineItem({ registro, isLast }: { registro: Registro; isLast: boolean }) {
  const config = tipoRegistroConfig[registro.tipo];

  return (
    <div className="relative pl-8">
      {/* Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
      )}

      {/* Dot */}
      <div className={cn(
        "absolute left-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900",
        config.bgColor
      )}>
        <span className={config.color}>{config.icon}</span>
      </div>

      {/* Content */}
      <Card className={cn(
        "mb-4 transition-all duration-200 hover:shadow-sm",
        registro.importante
          ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
          : "dark:bg-zinc-900/80"
      )}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[10px]", config.color, config.borderColor)}>
                {config.label}
              </Badge>
              {registro.importante && (
                <Badge className="bg-amber-500 text-white text-[10px]">
                  <Star className="w-2.5 h-2.5 mr-1" />
                  Importante
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-zinc-400">
              {format(parseISO(registro.data), "dd/MM/yyyy 'às' HH:mm")}
            </span>
          </div>
          <h4 className="font-medium text-sm mt-2">{registro.titulo}</h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{registro.descricao}</p>
          <p className="text-[10px] text-zinc-400 mt-2">Por {registro.autor}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function AssistidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [isEditing, setIsEditing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(assistidoMock.favorito);
  const [filterTimeline, setFilterTimeline] = useState<string>("todos");

  const assistido = assistidoMock;
  const processos = processosMock;
  const audiencias = audienciasMock;
  const registros = registrosMock;
  const demandas = demandasMock;

  const proximaAudiencia = getProximaAudiencia(audiencias);
  const statusConfig = statusPrisionalConfig[assistido.statusPrisional] || statusPrisionalConfig.SOLTO;
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = assistido.dataPrisao ? calcularTempoPreso(assistido.dataPrisao) : null;

  const { audienciasProximas, demandasUrgentes } = getUrgentItems(audiencias, demandas);

  const filteredRegistros = useMemo(() => {
    if (filterTimeline === "todos") return registros;
    return registros.filter(r => r.tipo === filterTimeline);
  }, [registros, filterTimeline]);

  const counts = {
    processos: processos.length,
    audiencias: audiencias.filter(a => a.status === "agendada").length,
    demandas: demandas.filter(d => d.status !== "concluida").length,
    registros: registros.length,
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        {/* Header Sticky */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/assistidos">
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-14 w-14 border-4 border-white dark:border-zinc-800 shadow-xl ring-2 ring-emerald-500/20">
                      <AvatarImage src={assistido.photoUrl} />
                      <AvatarFallback className={cn(
                        "text-lg font-bold",
                        assistido.statusPrisional !== "SOLTO"
                          ? "bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 dark:from-rose-900/50 dark:to-rose-800/50 dark:text-rose-400"
                          : "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-400"
                      )}>
                        {assistido.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{assistido.nome}</h1>
                      <button
                        onClick={() => setIsFavorite(!isFavorite)}
                        className="text-amber-500 hover:scale-110 transition-transform"
                      >
                        <Star className={cn("w-5 h-5", isFavorite ? "fill-current" : "")} />
                      </button>
                    </div>
                    {assistido.vulgo && (
                      <p className="text-sm text-zinc-500">&ldquo;{assistido.vulgo}&rdquo;</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0 text-xs")}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </Badge>
                      {tempoPreso && (
                        <Badge variant="outline" className="text-rose-600 border-rose-300 text-xs">
                          <Timer className="w-3 h-3 mr-1" />
                          {tempoPreso}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  <QuickActionButton icon={<Phone className="w-4 h-4" />} label="Ligar" variant="success" />
                  <QuickActionButton icon={<Mail className="w-4 h-4" />} label="Email" variant="default" />
                  <QuickActionButton icon={<FolderOpen className="w-4 h-4" />} label="Drive" variant="default" />
                  <QuickActionButton icon={<Share2 className="w-4 h-4" />} label="Compartilhar" variant="default" />
                  <QuickActionButton icon={<Printer className="w-4 h-4" />} label="Imprimir" variant="default" />
                </div>

                <NovoRegistroModal assistidoNome={assistido.nome} assistidoId={assistido.id} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Dados
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-amber-600">
                      <Archive className="w-4 h-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-600"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todos os dados e registros de {assistido.nome} serão permanentemente excluídos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700">
                            Excluir Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <MobileNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <NavigationSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              counts={counts}
            />

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {/* Visão Geral */}
              {activeSection === "visao-geral" && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                      title="Processos Ativos"
                      value={processos.filter(p => p.status === "ativo").length}
                      subtitle={`${processos.length} total`}
                      icon={<Scale className="w-5 h-5" />}
                      color="blue"
                      onClick={() => setActiveSection("processos")}
                    />
                    <KPICard
                      title="Audiências Próximas"
                      value={audiencias.filter(a => a.status === "agendada").length}
                      subtitle={proximaAudiencia ? `Próx: ${format(parseISO(proximaAudiencia.data), "dd/MM")}` : "Nenhuma"}
                      icon={<Gavel className="w-5 h-5" />}
                      color="amber"
                      onClick={() => setActiveSection("audiencias")}
                    />
                    <KPICard
                      title="Demandas Abertas"
                      value={demandas.filter(d => d.status !== "concluida").length}
                      subtitle={demandasUrgentes.length > 0 ? `${demandasUrgentes.length} urgentes` : "Sem urgentes"}
                      icon={<ClipboardList className="w-5 h-5" />}
                      color={demandasUrgentes.length > 0 ? "rose" : "emerald"}
                      onClick={() => setActiveSection("demandas")}
                    />
                    <KPICard
                      title="Tempo Preso"
                      value={tempoPreso || "Solto"}
                      subtitle={assistido.localPrisao || "N/A"}
                      icon={assistido.statusPrisional !== "SOLTO" ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                      color={assistido.statusPrisional !== "SOLTO" ? "rose" : "emerald"}
                    />
                  </div>

                  {/* Alerts Section */}
                  {(audienciasProximas.length > 0 || demandasUrgentes.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <AlertCard
                        type="audiencia"
                        title="Audiências em 7 dias"
                        items={audienciasProximas.map(a => ({
                          id: a.id,
                          label: a.tipo,
                          date: format(parseISO(a.data), "dd/MM"),
                          sublabel: a.vara,
                        }))}
                      />
                      <AlertCard
                        type="demanda"
                        title="Demandas com prazo próximo"
                        items={demandasUrgentes.map(d => ({
                          id: d.id,
                          label: d.titulo,
                          date: d.dataLimite ? format(parseISO(d.dataLimite), "dd/MM") : "",
                          sublabel: d.tipo,
                        }))}
                      />
                    </div>
                  )}

                  {/* Próxima Audiência Destacada */}
                  {proximaAudiencia && (
                    <Card className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white overflow-hidden">
                      <CardContent className="p-6 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/20">
                              <Gavel className="h-8 w-8" />
                            </div>
                            <div>
                              <p className="text-amber-100 text-sm font-medium">Próxima Audiência</p>
                              <p className="text-2xl font-bold">
                                {format(parseISO(proximaAudiencia.data), "dd 'de' MMMM", { locale: ptBR })} às {proximaAudiencia.hora}
                              </p>
                              <p className="text-amber-100 text-sm mt-1">
                                {proximaAudiencia.tipo} • {proximaAudiencia.vara}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-bold">
                              {differenceInDays(parseISO(proximaAudiencia.data), new Date())}
                            </div>
                            <p className="text-amber-100 text-sm">dias</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Info Cards */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Idade</p>
                            <p className="font-semibold">{idade} anos</p>
                            <p className="text-[10px] text-zinc-400">{format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Contato</p>
                            <p className="font-semibold text-sm">{assistido.telefoneContato}</p>
                            <p className="text-[10px] text-zinc-400">{assistido.nomeContato}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600">
                            <Scale className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Atribuição</p>
                            <p className="font-semibold">{assistido.atribuicao}</p>
                            <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{assistido.crimePrincipal}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Timeline */}
                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="w-4 h-4 text-zinc-500" />
                        Atividades Recentes
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600"
                        onClick={() => setActiveSection("timeline")}
                      >
                        Ver todas
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {registros.slice(0, 3).map((registro, index) => {
                          const config = tipoRegistroConfig[registro.tipo];
                          return (
                            <div key={registro.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                              <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                                <span className={config.color}>{config.icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm truncate">{registro.titulo}</p>
                                  <span className="text-[10px] text-zinc-400 shrink-0 ml-2">
                                    {format(parseISO(registro.data), "dd/MM")}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 truncate">{registro.descricao}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Dados Pessoais */}
              {activeSection === "dados" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        Identificação
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-zinc-500">Nome Completo</Label>
                        <p className="font-medium">{assistido.nome}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Vulgo</Label>
                        <p className="font-medium">{assistido.vulgo || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">CPF</Label>
                        <p className="font-medium">{assistido.cpf}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">RG</Label>
                        <p className="font-medium">{assistido.rg}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Data de Nascimento</Label>
                        <p className="font-medium">{format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")} ({idade} anos)</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Naturalidade</Label>
                        <p className="font-medium">{assistido.naturalidade}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Nome da Mãe</Label>
                        <p className="font-medium">{assistido.nomeMae}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Nome do Pai</Label>
                        <p className="font-medium">{assistido.nomePai || "-"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="w-4 h-4 text-zinc-500" />
                        Contato
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-zinc-500">Telefone</Label>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{assistido.telefone || "-"}</p>
                            {assistido.telefone && (
                              <Link href={`/admin/whatsapp/chat?phone=${assistido.telefone.replace(/\D/g, "")}`}>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">E-mail</Label>
                          <p className="font-medium">{assistido.email || "-"}</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-zinc-500">Contato de Referência</Label>
                        <p className="font-medium">{assistido.nomeContato}</p>
                        <p className="text-xs text-zinc-500">{assistido.parentescoContato}</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{assistido.telefoneContato}</p>
                          {assistido.telefoneContato && (
                            <Link href={`/admin/whatsapp/chat?phone=${assistido.telefoneContato.replace(/\D/g, "")}`}>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-zinc-500">Endereço</Label>
                        <p className="font-medium">{assistido.endereco}</p>
                        <p className="text-xs text-zinc-500">{assistido.bairro} - {assistido.cidade}/{assistido.uf} - CEP {assistido.cep}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="w-4 h-4 text-zinc-500" />
                        Situação Prisional
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-zinc-500">Status</Label>
                          <div className="mt-1">
                            <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Regime</Label>
                          <p className="font-medium">{assistido.regimePrisional}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Unidade</Label>
                          <p className="font-medium">{assistido.localPrisao}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Data da Prisão</Label>
                          <p className="font-medium">
                            {assistido.dataPrisao ? format(parseISO(assistido.dataPrisao), "dd/MM/yyyy") : "-"}
                            {tempoPreso && <span className="text-zinc-500 ml-1">({tempoPreso})</span>}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Crime Principal</Label>
                        <p className="font-medium">{assistido.crimePrincipal}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-zinc-500" />
                        Informações Adicionais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-zinc-500">Profissão</Label>
                          <p className="font-medium">{assistido.profissao || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Escolaridade</Label>
                          <p className="font-medium">{assistido.escolaridade || "-"}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Estado Civil</Label>
                          <p className="font-medium">{assistido.estadoCivil || "-"}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Observações</Label>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{assistido.observacoes || "-"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Processos */}
              {activeSection === "processos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Processos ({processos.length})</h2>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3 mr-2" />
                      Vincular Processo
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {processos.map((processo) => (
                      <ProcessoCard key={processo.id} processo={processo} />
                    ))}
                  </div>
                </div>
              )}

              {/* Audiências */}
              {activeSection === "audiencias" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Audiências</h2>
                    <Select defaultValue="todas">
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filtrar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        <SelectItem value="agendada">Agendadas</SelectItem>
                        <SelectItem value="realizada">Realizadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {audiencias.map((audiencia) => (
                      <AudienciaCard key={audiencia.id} audiencia={audiencia} />
                    ))}
                  </div>
                </div>
              )}

              {/* Demandas */}
              {activeSection === "demandas" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Demandas ({demandas.length})</h2>
                    <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600">
                      <Plus className="w-3 h-3 mr-2" />
                      Nova Demanda
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {demandas.map((demanda) => (
                      <DemandaCard key={demanda.id} demanda={demanda} />
                    ))}
                  </div>
                </div>
              )}

              {/* Diligências */}
              {activeSection === "diligencias" && (
                <DiligenciasPanel
                  assistidoId={assistido.id}
                  assistidoNome={assistido.nome}
                />
              )}

              {/* Timeline */}
              {activeSection === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Timeline de Atividades</h2>
                    <Select value={filterTimeline} onValueChange={setFilterTimeline}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filtrar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {Object.entries(tipoRegistroConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span className={config.color}>{config.icon}</span>
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardContent className="p-6">
                      {filteredRegistros.map((registro, index) => (
                        <TimelineItem
                          key={registro.id}
                          registro={registro}
                          isLast={index === filteredRegistros.length - 1}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Documentos */}
              {activeSection === "documentos" && (
                <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        Documentos
                      </CardTitle>
                      {assistido.driveLink && (
                        <a href={assistido.driveLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <FolderOpen className="w-3 h-3 mr-2" />
                            Abrir no Drive
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-zinc-500">
                      <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 w-fit mx-auto mb-4">
                        <FolderOpen className="w-8 h-8 text-zinc-400" />
                      </div>
                      <p className="font-medium">Documentos gerenciados via Google Drive</p>
                      <p className="text-sm mt-1">Clique em &ldquo;Abrir no Drive&rdquo; para acessar a pasta do assistido</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
