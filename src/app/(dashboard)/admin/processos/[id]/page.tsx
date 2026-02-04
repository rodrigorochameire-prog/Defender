"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Scale,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Gavel,
  ExternalLink,
  User,
  MapPin,
  Calendar,
  FolderOpen,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Link as LinkIcon,
  GitBranch,
  Shield,
  Upload,
  Radar,
  BarChart3,
  ChevronRight,
  Copy,
  Phone,
  Mail,
  Share2,
  Printer,
  Download,
  MoreVertical,
  Timer,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  AlertCircle,
  Bell,
  ClipboardList,
  History,
  Search,
  Eye,
  Building2,
  Users,
  Target,
  Zap,
  Star,
  BookOpen,
  MessageSquare,
  Info,
  CircleDot,
  CircleDashed,
  CheckCircle,
  Ban,
  RefreshCw,
  PenLine,
  FileCheck,
  Bookmark,
  Archive,
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DiligenciasPanel } from "@/components/diligencias";

// ==========================================
// TIPOS
// ==========================================

interface ProcessoAssociado {
  id: number;
  numero: string;
  classe: string;
  tipoRelacao: "origem" | "apenso" | "recurso" | "cautelar";
  fase: string;
}

interface AtosImportantes {
  id: number;
  data: string;
  descricao: string;
  tipo: "audiencia" | "decisao" | "peticao" | "prisao" | "despacho" | "sentenca";
}

interface Audiencia {
  id: number;
  data: string;
  hora: string;
  tipo: string;
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
}

// ==========================================
// DADOS MOCK (Estendidos)
// ==========================================

const mockProcesso = {
  id: 1,
  numeroAutos: "8012906-74.2025.8.05.0039",
  assistido: {
    id: 1,
    nome: "Diego Bonfim Almeida",
    cpf: "123.456.789-00",
    statusPrisional: "preso",
    telefoneContato: "(71) 98888-7777",
    nomeContato: "Maria Almeida (mãe)",
    localPrisao: "Conjunto Penal de Camaçari",
  },
  comarca: "Candeias",
  vara: "1ª Vara Criminal",
  area: "JURI",
  classeProcessual: "Ação Penal de Competência do Júri",
  assunto: "Homicídio Qualificado (Art. 121, §2º, CP)",
  parteContraria: "Ministério Público do Estado da Bahia",
  fase: "instrucao",
  situacao: "ativo",
  isJuri: true,
  dataSessaoJuri: "2025-03-15",
  resultadoJuri: null,
  observacoes: "Réu preso preventivamente. Aguardando designação de sessão do Tribunal do Júri.",
  linkDrive: "https://drive.google.com/folder/exemplo",
  defensor: {
    id: 1,
    nome: "Dr. João Silva",
  },
  createdAt: "2025-01-10",
  updatedAt: "2025-01-15",
  dataPrisao: "2024-11-20",
  favorito: true,

  // Processos Associados
  processosAssociados: [
    { id: 101, numero: "0001111-22.2024.8.05.0039", classe: "Inquérito Policial", tipoRelacao: "origem", fase: "Arquivado" },
    { id: 102, numero: "8005555-44.2025.8.05.0000", classe: "Habeas Corpus", tipoRelacao: "recurso", fase: "Julgado" },
    { id: 103, numero: "0003333-44.2024.8.05.0039", classe: "Pedido de Prisão Preventiva", tipoRelacao: "cautelar", fase: "Concluído" },
  ] as ProcessoAssociado[],

  // Atos Importantes
  atosImportantes: [
    { id: 1, data: "2024-11-20", descricao: "Prisão em Flagrante", tipo: "prisao" },
    { id: 2, data: "2024-11-21", descricao: "Conversão em Preventiva", tipo: "decisao" },
    { id: 3, data: "2025-01-10", descricao: "Recebimento da Denúncia", tipo: "decisao" },
    { id: 4, data: "2025-01-20", descricao: "Resposta à Acusação", tipo: "peticao" },
    { id: 5, data: "2025-02-05", descricao: "Despacho saneador", tipo: "despacho" },
  ] as AtosImportantes[],
};

const audienciasMock: Audiencia[] = [
  {
    id: 1,
    data: "2025-02-20",
    hora: "09:00",
    tipo: "Instrução e Julgamento",
    status: "agendada",
    observacoes: "Ouvir testemunhas de acusação",
  },
  {
    id: 2,
    data: "2025-01-10",
    hora: "14:00",
    tipo: "Audiência de Custódia",
    status: "realizada",
  },
];

const demandasMock: Demanda[] = [
  {
    id: "1",
    titulo: "Preparar alegações finais",
    tipo: "Petição",
    status: "pendente",
    prioridade: "alta",
    dataCriacao: "2025-01-28",
    dataLimite: "2025-02-15",
  },
  {
    id: "2",
    titulo: "Solicitar perícia técnica",
    tipo: "Diligência",
    status: "em_andamento",
    prioridade: "media",
    dataCriacao: "2025-01-20",
  },
  {
    id: "3",
    titulo: "Coletar documentos testemunhas",
    tipo: "Diligência",
    status: "pendente",
    prioridade: "urgente",
    dataCriacao: "2025-02-01",
    dataLimite: "2025-02-10",
  },
];

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const faseProcessualConfig: Record<string, { label: string; order: number; color: string }> = {
  inquerito: { label: "Inquérito", order: 1, color: "text-zinc-600" },
  denuncia: { label: "Denúncia", order: 2, color: "text-amber-600" },
  instrucao: { label: "Instrução", order: 3, color: "text-blue-600" },
  alegacoes: { label: "Alegações", order: 4, color: "text-purple-600" },
  sentenca: { label: "Sentença", order: 5, color: "text-emerald-600" },
  recurso: { label: "Recurso", order: 6, color: "text-rose-600" },
  transito: { label: "Trânsito", order: 7, color: "text-zinc-800" },
};

const faseJuriConfig: Record<string, { label: string; order: number; color: string }> = {
  inquerito: { label: "Inquérito", order: 1, color: "text-zinc-600" },
  denuncia: { label: "Denúncia", order: 2, color: "text-amber-600" },
  instrucao: { label: "Instrução", order: 3, color: "text-blue-600" },
  pronuncia: { label: "Pronúncia", order: 4, color: "text-purple-600" },
  plenario: { label: "Plenário", order: 5, color: "text-rose-600" },
  sentenca: { label: "Sentença", order: 6, color: "text-emerald-600" },
};

const atoConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  audiencia: { icon: <Gavel className="w-3.5 h-3.5" />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/30" },
  decisao: { icon: <FileCheck className="w-3.5 h-3.5" />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/30" },
  peticao: { icon: <FileText className="w-3.5 h-3.5" />, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/30" },
  prisao: { icon: <Lock className="w-3.5 h-3.5" />, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/30" },
  despacho: { icon: <PenLine className="w-3.5 h-3.5" />, color: "text-zinc-600", bgColor: "bg-zinc-50 dark:bg-zinc-800" },
  sentenca: { icon: <Scale className="w-3.5 h-3.5" />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/30" },
};

const statusDemandaConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente: { label: "Pendente", color: "text-zinc-500", icon: <CircleDashed className="w-3.5 h-3.5" /> },
  em_andamento: { label: "Em Andamento", color: "text-blue-500", icon: <CircleDot className="w-3.5 h-3.5" /> },
  concluida: { label: "Concluída", color: "text-emerald-500", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

const prioridadeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: "Baixa", color: "text-zinc-600", bgColor: "bg-zinc-100" },
  media: { label: "Média", color: "text-blue-600", bgColor: "bg-blue-100" },
  alta: { label: "Alta", color: "text-amber-600", bgColor: "bg-amber-100" },
  urgente: { label: "Urgente", color: "text-rose-600", bgColor: "bg-rose-100" },
};

// ==========================================
// UTILS
// ==========================================

function getAreaBadge(area: string) {
  const configs: Record<string, { label: string; color: string; bgColor: string }> = {
    JURI: { label: "Júri", color: "text-purple-700", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
    EXECUCAO_PENAL: { label: "Execução Penal", color: "text-amber-700", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
    VIOLENCIA_DOMESTICA: { label: "V. Doméstica", color: "text-pink-700", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
    SUBSTITUICAO: { label: "Substituição", color: "text-zinc-700", bgColor: "bg-zinc-100 dark:bg-zinc-800" },
    CRIMINAL: { label: "Criminal", color: "text-blue-700", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  };

  const config = configs[area] || { label: area, color: "text-zinc-700", bgColor: "bg-zinc-100" };

  return (
    <Badge className={cn(config.bgColor, config.color, "border-0 text-xs")}>
      {config.label}
    </Badge>
  );
}

function getRelacaoBadge(tipo: string) {
  const configs: Record<string, { color: string; bgColor: string }> = {
    origem: { color: "text-zinc-600", bgColor: "bg-zinc-100" },
    apenso: { color: "text-blue-600", bgColor: "bg-blue-100" },
    recurso: { color: "text-purple-600", bgColor: "bg-purple-100" },
    cautelar: { color: "text-amber-600", bgColor: "bg-amber-100" },
  };

  const config = configs[tipo] || { color: "text-zinc-600", bgColor: "bg-zinc-100" };

  return (
    <Badge variant="outline" className={cn(config.color, "text-[10px] border-0", config.bgColor)}>
      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
    </Badge>
  );
}

function calcularProgressoFase(fase: string, isJuri: boolean) {
  const config = isJuri ? faseJuriConfig : faseProcessualConfig;
  const faseAtual = config[fase];
  if (!faseAtual) return 0;

  const totalFases = Object.keys(config).length;
  return (faseAtual.order / totalFases) * 100;
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

// ==========================================
// COMPONENTES
// ==========================================

// Navigation Sidebar
function NavigationSidebar({
  activeSection,
  onSectionChange,
  counts
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  counts: { audiencias: number; demandas: number; atos: number };
}) {
  const sections = [
    { id: "visao-geral", label: "Visão Geral", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "dados", label: "Dados Processuais", icon: <FileText className="w-4 h-4" /> },
    { id: "audiencias", label: "Audiências", icon: <Gavel className="w-4 h-4" />, count: counts.audiencias },
    { id: "demandas", label: "Demandas", icon: <ClipboardList className="w-4 h-4" />, count: counts.demandas },
    { id: "diligencias", label: "Diligências", icon: <Search className="w-4 h-4" /> },
    { id: "timeline", label: "Timeline", icon: <History className="w-4 h-4" />, count: counts.atos },
    { id: "associados", label: "Processos Vinculados", icon: <GitBranch className="w-4 h-4" /> },
    { id: "documentos", label: "Documentos", icon: <FolderOpen className="w-4 h-4" /> },
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
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
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
    { id: "dados", label: "Dados", icon: <FileText className="w-4 h-4" /> },
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
                ? "bg-blue-500 text-white"
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

// KPI Card
function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  onClick
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "blue" | "amber" | "rose" | "emerald" | "purple";
  onClick?: () => void;
}) {
  const colorConfig = {
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
    rose: { bg: "bg-rose-50 dark:bg-rose-900/20", icon: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
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
    success: "bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-100 dark:bg-rose-900/30 hover:bg-rose-200 text-rose-700 dark:text-rose-400",
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

// Progress Bar do Processo
function ProcessProgressBar({ fase, isJuri }: { fase: string; isJuri: boolean }) {
  const config = isJuri ? faseJuriConfig : faseProcessualConfig;
  const fases = Object.entries(config).sort((a, b) => a[1].order - b[1].order);
  const faseAtual = config[fase];
  const faseAtualOrder = faseAtual?.order || 1;

  return (
    <Card className="border-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white overflow-hidden">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-medium">Progresso Processual</p>
              <p className="text-2xl font-bold">{faseAtual?.label || "Desconhecida"}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{Math.round(calcularProgressoFase(fase, isJuri))}%</div>
              <p className="text-blue-100 text-sm">concluído</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1 mt-4">
            {fases.map(([key, value], index) => (
              <div
                key={key}
                className="flex-1 flex items-center"
              >
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all",
                    value.order < faseAtualOrder
                      ? "bg-white"
                      : value.order === faseAtualOrder
                        ? "bg-white/80"
                        : "bg-white/30"
                  )}
                />
              </div>
            ))}
          </div>

          {/* Phase Labels */}
          <div className="flex justify-between mt-2">
            {fases.map(([key, value]) => (
              <span
                key={key}
                className={cn(
                  "text-[10px] font-medium",
                  value.order <= faseAtualOrder ? "text-white" : "text-white/50"
                )}
              >
                {value.label}
              </span>
            ))}
          </div>
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

        <p className="text-sm font-medium">{audiencia.tipo}</p>

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

// Timeline Ato Item
function TimelineAtoItem({ ato, isLast }: { ato: AtosImportantes; isLast: boolean }) {
  const config = atoConfig[ato.tipo] || atoConfig.despacho;

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
      <Card className="mb-4 dark:bg-zinc-900/80">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className={cn("text-[10px]", config.color)}>
              {ato.tipo.charAt(0).toUpperCase() + ato.tipo.slice(1)}
            </Badge>
            <span className="text-[10px] text-zinc-400 font-mono">
              {format(parseISO(ato.data), "dd/MM/yyyy")}
            </span>
          </div>
          <h4 className="font-medium text-sm mt-2">{ato.descricao}</h4>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// PÁGINA
// ==========================================

export default function ProcessoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("visao-geral");
  const [isFavorite, setIsFavorite] = useState(mockProcesso.favorito);

  const processoId = params.id;
  const processo = mockProcesso;
  const audiencias = audienciasMock;
  const demandas = demandasMock;

  const proximaAudiencia = audiencias.find(a => a.status === "agendada" && isAfter(parseISO(a.data), new Date()));
  const tempoPreso = processo.dataPrisao ? calcularTempoPreso(processo.dataPrisao) : null;

  const counts = {
    audiencias: audiencias.filter(a => a.status === "agendada").length,
    demandas: demandas.filter(d => d.status !== "concluida").length,
    atos: processo.atosImportantes.length,
  };

  const handleDelete = () => {
    console.log("Deletando processo:", processoId);
    setShowDeleteDialog(false);
    router.push("/admin/processos");
  };

  const copyNumero = () => {
    navigator.clipboard.writeText(processo.numeroAutos);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        {/* Header Sticky */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/processos">
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Icon & Info */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                    <Scale className="h-6 w-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getAreaBadge(processo.area)}
                      <Badge variant="outline" className="capitalize text-xs">{processo.situacao}</Badge>
                      {processo.isJuri && (
                        <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-0 text-xs">
                          <Gavel className="w-3 h-3 mr-1" />
                          Tribunal do Júri
                        </Badge>
                      )}
                      <button
                        onClick={() => setIsFavorite(!isFavorite)}
                        className="text-amber-500 hover:scale-110 transition-transform"
                      >
                        <Star className={cn("w-4 h-4", isFavorite ? "fill-current" : "")} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {processo.numeroAutos}
                      </h1>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyNumero}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {processo.vara} • {processo.comarca}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  <QuickActionButton icon={<ExternalLink className="w-4 h-4" />} label="Abrir no PJe" variant="default" />
                  <QuickActionButton icon={<FolderOpen className="w-4 h-4" />} label="Drive" variant="default" />
                  <QuickActionButton icon={<Upload className="w-4 h-4" />} label="Anexar PDF" variant="default" />
                  <QuickActionButton icon={<Share2 className="w-4 h-4" />} label="Compartilhar" variant="default" />
                  <QuickActionButton icon={<Printer className="w-4 h-4" />} label="Imprimir" variant="default" />
                </div>

                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Demanda
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/processos/${processoId}/editar`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Processo
                      </Link>
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
                    <DropdownMenuItem
                      className="text-rose-600"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
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
                  {/* Progress Bar */}
                  <ProcessProgressBar fase={processo.fase} isJuri={processo.isJuri} />

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard
                      title="Audiências Agendadas"
                      value={counts.audiencias}
                      subtitle={proximaAudiencia ? `Próx: ${format(parseISO(proximaAudiencia.data), "dd/MM")}` : "Nenhuma"}
                      icon={<Gavel className="w-5 h-5" />}
                      color="amber"
                      onClick={() => setActiveSection("audiencias")}
                    />
                    <KPICard
                      title="Demandas Abertas"
                      value={counts.demandas}
                      subtitle={`${demandas.filter(d => d.prioridade === "urgente").length} urgentes`}
                      icon={<ClipboardList className="w-5 h-5" />}
                      color="rose"
                      onClick={() => setActiveSection("demandas")}
                    />
                    <KPICard
                      title="Marcos Processuais"
                      value={counts.atos}
                      subtitle="atos registrados"
                      icon={<History className="w-5 h-5" />}
                      color="purple"
                      onClick={() => setActiveSection("timeline")}
                    />
                    <KPICard
                      title={processo.assistido.statusPrisional === "preso" ? "Tempo Preso" : "Status"}
                      value={tempoPreso || "Solto"}
                      subtitle={processo.assistido.localPrisao || "Em liberdade"}
                      icon={processo.assistido.statusPrisional === "preso" ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                      color={processo.assistido.statusPrisional === "preso" ? "rose" : "emerald"}
                    />
                  </div>

                  {/* Assistido Card */}
                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        Assistido
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-lg">
                            {processo.assistido.nome.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/admin/assistidos/${processo.assistido.id}`}
                              className="font-semibold hover:text-blue-600 transition-colors"
                            >
                              {processo.assistido.nome}
                            </Link>
                            <p className="text-sm text-zinc-500">{processo.assistido.cpf}</p>
                            {processo.assistido.statusPrisional === "preso" && (
                              <Badge className="mt-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-0 text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Preso - {processo.assistido.localPrisao}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Link href={`/admin/assistidos/${processo.assistido.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Ficha
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {processo.assistido.statusPrisional === "preso" && (
                        <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Réu Preso</p>
                              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                                Prioridade legal. Verifique os prazos de prisão cautelar.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Próxima Audiência */}
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
                              <p className="text-amber-100 text-sm mt-1">{proximaAudiencia.tipo}</p>
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

                  {/* Júri Panel */}
                  {processo.isJuri && (
                    <Card className="border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
                          <Gavel className="w-4 h-4" />
                          Painel do Júri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">Sessão Plenária</p>
                            <p className="font-semibold text-lg">
                              {processo.dataSessaoJuri
                                ? format(parseISO(processo.dataSessaoJuri), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                : "Aguardando designação"}
                            </p>
                          </div>
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            <Radar className="w-4 h-4 mr-2" />
                            Preparar Plenário
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Investigation Card */}
                  <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
                            <Radar className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-700 dark:text-emerald-400">Central de Investigação</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Gerencie diligências, pesquise testemunhas e colete provas
                            </p>
                          </div>
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
                          <Link href={`/admin/juri/investigacao?processoId=${processoId}`}>
                            <Search className="w-4 h-4 mr-2" />
                            Abrir Central
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Dados Processuais */}
              {activeSection === "dados" && (
                <div className="space-y-4">
                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        Dados do Processo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-zinc-500">Número dos Autos</Label>
                          <p className="font-mono font-medium">{processo.numeroAutos}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Classe Processual</Label>
                          <p className="font-medium">{processo.classeProcessual}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Assunto</Label>
                          <p className="font-medium">{processo.assunto}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Fase Atual</Label>
                          <p className="font-medium capitalize">{processo.fase}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-zinc-500">Comarca</Label>
                          <p className="font-medium">{processo.comarca}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Vara</Label>
                          <p className="font-medium">{processo.vara}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Parte Contrária</Label>
                          <p className="font-medium">{processo.parteContraria}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-zinc-500">Defensor Responsável</Label>
                          <p className="font-medium">{processo.defensor.nome}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {processo.observacoes && (
                    <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Info className="w-4 h-4 text-zinc-500" />
                          Observações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{processo.observacoes}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-xs text-zinc-500 space-y-1">
                    <p>Cadastrado em: {format(parseISO(processo.createdAt), "dd/MM/yyyy")}</p>
                    <p>Última atualização: {format(parseISO(processo.updatedAt), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              )}

              {/* Audiências */}
              {activeSection === "audiencias" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Audiências</h2>
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500">
                      <Plus className="w-3 h-3 mr-2" />
                      Nova Audiência
                    </Button>
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
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600">
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
                  processoId={processo.id}
                  processoNumero={processo.numeroAutos}
                />
              )}

              {/* Timeline */}
              {activeSection === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Marcos Processuais</h2>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3 mr-2" />
                      Adicionar Marco
                    </Button>
                  </div>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardContent className="p-6">
                      {processo.atosImportantes.map((ato, index) => (
                        <TimelineAtoItem
                          key={ato.id}
                          ato={ato}
                          isLast={index === processo.atosImportantes.length - 1}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Processos Associados */}
              {activeSection === "associados" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Processos Vinculados</h2>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3 mr-2" />
                      Vincular Processo
                    </Button>
                  </div>

                  <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
                    <CardContent className="p-4 space-y-3">
                      {/* Processo Principal */}
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-blue-500 mb-1"></div>
                          <div className="h-full w-px bg-blue-500/20"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-blue-700 dark:text-blue-400">{processo.numeroAutos}</span>
                            <Badge className="bg-blue-500 text-white text-xs">Atual</Badge>
                          </div>
                          <p className="text-xs text-zinc-500">{processo.classeProcessual}</p>
                        </div>
                      </div>

                      {/* Processos Associados */}
                      {processo.processosAssociados.map((proc) => (
                        <div key={proc.id} className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                          <LinkIcon className="h-4 w-4 text-zinc-400" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{proc.numero}</span>
                                {getRelacaoBadge(proc.tipoRelacao)}
                              </div>
                              <span className="text-xs text-zinc-500">{proc.fase}</span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">{proc.classe}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
                        <FolderOpen className="w-4 h-4 text-zinc-500" />
                        Documentos
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Upload className="w-3 h-3 mr-2" />
                          Anexar Autos (PDF)
                        </Button>
                        {processo.linkDrive && (
                          <a href={processo.linkDrive} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <FolderOpen className="w-3 h-3 mr-2" />
                              Abrir no Drive
                              <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 text-zinc-500">
                      <div className="p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 w-fit mx-auto mb-4">
                        <FolderOpen className="w-8 h-8 text-zinc-400" />
                      </div>
                      <p className="font-medium">Documentos gerenciados via Google Drive</p>
                      <p className="text-sm mt-1">Clique em &ldquo;Abrir no Drive&rdquo; para acessar a pasta do processo</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Dialog de Exclusão */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Processo</DialogTitle>
              <DialogDescription>
                Esta ação removerá permanentemente o processo <strong>{processo.numeroAutos}</strong> e todas as suas demandas associadas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete}>Confirmar Exclusão</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
