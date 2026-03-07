"use client";

import React, { useState, useMemo, useRef, useCallback, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
  SwissTableContainer,
} from "@/components/shared/swiss-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Users, 
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertOctagon,
  Phone,
  Scale,
  LayoutGrid,
  List,
  MapPin,
  FileText,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Timer,
  Camera,
  Upload,
  User,
  Brain,
  Bookmark,
  BookmarkCheck,
  Gavel,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Info,
  CircleDot,
  Circle,
  Target,
  Lock,
  AlertCircle,
  Copy,
  Filter,
  XCircle,
  Zap,
  ArrowUpDown,
  FolderOpen,
  HardDrive,
  Link2Off,
  ExternalLink,
  FileStack,
  Sun,
  Loader2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { useProgressiveList } from "@/hooks/use-progressive-list";
import { getOfflineAssistidos } from "@/lib/offline/queries";
import { Skeleton } from "@/components/ui/skeleton";

// Componentes estruturais padronizados
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/section-header";
import { FilterTab, FilterTabsGroup } from "@/components/shared/filter-tabs";
import { StatsCard, StatsGrid } from "@/components/shared/stats-card";
import { SearchToolbar, FilterSelect } from "@/components/shared/search-toolbar";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { 
  PageContainer, 
  PageSection, 
  ContentGrid,
  Divider,
  StatBlock,
  InfoBlock
} from "@/components/shared/page-structure";

import { 
  ATRIBUICAO_OPTIONS,
  getAtribuicaoColors,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";

// Icones para cada atribuicao (Lucide icons)
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Users className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VVD: <AlertTriangle className="w-3.5 h-3.5" />,
  EXECUCAO: <Lock className="w-3.5 h-3.5" />,
  CRIMINAL: <Scale className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  SUBSTITUICAO_CIVEL: <FileText className="w-3.5 h-3.5" />,
  CIVEL: <FileText className="w-3.5 h-3.5" />,
  CURADORIA: <Users className="w-3.5 h-3.5" />,
};
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { format, differenceInDays, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { ProcessingQueuePanel } from "@/components/drive/ProcessingQueuePanel";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { toast } from "sonner";

// Interface para o tipo Assistido usado na UI
interface AssistidoUI {
  id: number;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  naturalidade: string;
  statusPrisional: string;
  localPrisao: string;
  unidadePrisional: string;
  telefone: string;
  telefoneContato: string;
  nomeContato: string;
  endereco: string;
  photoUrl: string;
  observacoes: string;
  area: string;
  areas?: string[]; // Lista de áreas para múltiplas cores
  atribuicoes?: string[]; // Lista de atribuições para múltiplas cores
  vulgo: string;
  crimePrincipal: string;
  defensor: string;
  processoPrincipal: string;
  processosAtivos?: number;
  demandasAbertas: number;
  proximoPrazo: string | null;
  prioridadeAI: string;
  createdAt: string;
  // Campos adicionais para compatibilidade com o componente
  testemunhasArroladas: Array<{ nome: string; ouvida: boolean }>;
  interrogatorioRealizado: boolean;
  tipoProximaAudiencia: string;
  proximaAudiencia: string | null;
  // Novos campos
  comarcas?: string[];
  scoreComplexidade?: number;
  ultimoEvento?: { tipo: string; data: string; titulo: string } | null;
  atoProximoPrazo?: string;
  dataPrisao?: string | null;
  numeroProcesso?: string;
  faseProcessual?: string;
  driveFolderId?: string | null;
  driveFilesCount?: number;
}

// Configuracoes de status e fases
const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Publica", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 1 },
  PENITENCIARIA: { label: "Penitenciaria", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custodia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-orange-100 dark:bg-orange-900/40", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", priority: 7 },
};

// Fases NEUTRAS para reduzir poluicao visual
const faseConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  INQUERITO: { label: "Inquerito", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: FileText },
  INSTRUCAO: { label: "Instrucao", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Scale },
  SUMARIO_CULPA: { label: "Sumario Culpa", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Gavel },
  ALEGACOES_FINAIS: { label: "Alegacoes Finais", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: FileText },
  SENTENCA: { label: "Sentenca", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Gavel },
  RECURSO: { label: "Recurso", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Scale },
  EXECUCAO: { label: "Execucao", color: "text-zinc-600 dark:text-zinc-400", bgColor: "bg-zinc-100 dark:bg-zinc-800", icon: Clock },
  ARQUIVADO: { label: "Arquivado", color: "text-zinc-400 dark:text-zinc-500", bgColor: "bg-zinc-50 dark:bg-zinc-900", icon: CheckCircle2 },
};

// Areas NEUTRAS para reduzir poluicao visual
const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Juri", labelFull: "Tribunal do Juri", color: "text-violet-600", bgColor: "bg-violet-50" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execucao Penal", color: "text-blue-600", bgColor: "bg-blue-50" },
  VIOLENCIA_DOMESTICA: { label: "V.D.", labelFull: "Violencia Domestica", color: "text-pink-600", bgColor: "bg-pink-50" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituicao", color: "text-orange-600", bgColor: "bg-orange-50" },
  FAMILIA: { label: "Fam", labelFull: "Familia", color: "text-rose-600", bgColor: "bg-rose-50" },
};

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 1) return { text: "Amanha", urgent: true, color: "text-amber-600", bgColor: "bg-amber-50" };
  if (dias <= 3) return { text: `${dias}d`, urgent: true, color: "text-amber-500", bgColor: "bg-amber-50/50" };
  if (dias <= 7) return { text: `${dias}d`, urgent: false, color: "text-sky-600", bgColor: "bg-sky-50/50" };
  return { text: `${dias}d`, urgent: false, color: "text-muted-foreground", bgColor: "" };
}

function calcularIdade(dataNascimento: string | null | undefined) {
  if (!dataNascimento) return null;
  try {
    const data = parseISO(dataNascimento);
    if (isNaN(data.getTime())) return null;
    return differenceInYears(new Date(), data);
  } catch {
    return null;
  }
}

function calcularTempoPreso(dataPrisao: string | null) {
  if (!dataPrisao) return null;
  const dias = differenceInDays(new Date(), parseISO(dataPrisao));
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos > 0) return `${anos}a ${meses}m`;
  if (meses > 0) return `${meses}m`;
  return `${dias}d`;
}

// Upload Dialog
function PhotoUploadDialog({ isOpen, onClose, assistidoNome, currentPhoto, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  assistidoNome: string;
  currentPhoto: string | null;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto do Assistido</DialogTitle>
          <DialogDescription>{assistidoNome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview || undefined} />
              <AvatarFallback className="text-3xl bg-muted">{getInitials(assistidoNome)}</AvatarFallback>
            </Avatar>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Arraste uma imagem ou</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onClose}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// CARD DO ASSISTIDO - DESIGN PREMIUM EXTRAORDINÁRIO
// Quick Actions + Mini Dashboard + Indicadores + Timeline + Score
// ========================================

interface AssistidoCardProps {
  assistido: AssistidoUI;
  onPhotoClick: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  hasDuplicates?: boolean;
  duplicateCount?: number;
}

function AssistidoCard({ assistido, onPhotoClick, isPinned, onTogglePin, hasDuplicates, duplicateCount }: AssistidoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Referência para fechar o overlay ao clicar fora
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Lógica Semântica: Determina se réu está preso
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);

  // Prazo urgente (<= 3 dias)
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoUrgente = prazoInfo && prazoInfo.urgent;
  const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";

  // Audiência hoje ou amanhã
  const diasAteAudiencia = assistido.proximaAudiencia
    ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
    : null;
  const audienciaHoje = diasAteAudiencia === 0;
  const audienciaAmanha = diasAteAudiencia === 1;
  const audienciaProxima = diasAteAudiencia !== null && diasAteAudiencia >= 0 && diasAteAudiencia <= 7;

  // Score de complexidade (visual)
  const score = assistido.scoreComplexidade || Math.floor(Math.random() * 100);
  const scoreLevel = score >= 70 ? "crítico" : score >= 40 ? "atenção" : "normal";

  // Telefone para contato (WhatsApp)
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefoneDisplay
    ? `https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`
    : null;

  // Tempo de prisão
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);

  // Idade
  const idade = calcularIdade(assistido.dataNascimento);

  // Copiar número do processo
  const handleCopyProcesso = () => {
    if (!assistido.numeroProcesso) return;
    navigator.clipboard.writeText(assistido.numeroProcesso);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cores das atribuições/áreas
  const atribuicoesUnicas = assistido.atribuicoes || assistido.areas || [];
  const primaryAttrValue = atribuicoesUnicas.length > 0
    ? (() => {
        const normalizedAttr = atribuicoesUnicas[0].toUpperCase().replace(/_/g, ' ');
        const option = ATRIBUICAO_OPTIONS.find(o =>
          o.value.toUpperCase() === normalizedAttr ||
          o.label.toUpperCase().includes(normalizedAttr) ||
          normalizedAttr.includes(o.value.toUpperCase())
        );
        return option?.value || null;
      })()
    : null;
  const primaryColor = primaryAttrValue ? SOLID_COLOR_MAP[primaryAttrValue] || '#6b7280' : '#6b7280';

  // Determinar o status visual do card
  const getCardGlow = () => {
    if (isPreso) return "hover:shadow-rose-500/20";
    if (prazoVencido) return "hover:shadow-rose-500/10";
    if (audienciaHoje) return "hover:shadow-amber-500/15";
    if (prazoUrgente) return "hover:shadow-amber-500/10";
    return "hover:shadow-emerald-500/5";
  };

  // Indicador de urgência
  const getUrgencyLevel = () => {
    if (isPreso && (prazoVencido || audienciaHoje)) return { level: "crítico", color: "rose", pulse: true };
    if (isPreso) return { level: "alto", color: "rose", pulse: false };
    if (prazoVencido) return { level: "vencido", color: "rose", pulse: true };
    if (audienciaHoje) return { level: "hoje", color: "amber", pulse: true };
    if (audienciaAmanha || prazoUrgente) return { level: "urgente", color: "amber", pulse: false };
    return null;
  };

  const urgency = getUrgencyLevel();

  // Determinar a cor do destaque superior baseado no status
  const getTopBorderColor = () => {
    if (isPreso) return { color: "#f43f5e", gradient: "from-rose-500 via-rose-400 to-rose-500" };
    if (prazoVencido) return { color: "#f43f5e", gradient: "from-rose-500 via-rose-400 to-rose-500" };
    if (audienciaHoje) return { color: "#f59e0b", gradient: "from-amber-500 via-amber-400 to-amber-500" };
    if (isMonitorado) return { color: "#f59e0b", gradient: "from-amber-500 via-amber-400 to-amber-500" };
    return { color: primaryColor, gradient: `from-[${primaryColor}] via-[${primaryColor}]/80 to-[${primaryColor}]` };
  };

  const topBorder = getTopBorderColor();

  return (
    <Card className={cn(
      // Base Premium - Design clean e harmonioso
      "group relative flex flex-col justify-between overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-900",
      "border border-zinc-200/80 dark:border-zinc-800/80",
      "rounded-2xl",
      "shadow-apple dark:shadow-apple-dark",
      "hover:shadow-lg dark:hover:shadow-apple-dark-hover",
      "hover:-translate-y-1",
      getCardGlow(),
      // Fixado
      isPinned && "ring-2 ring-amber-400/50 dark:ring-amber-500/30"
    )}
    >
      {/* Borda superior premium — sempre visível com cor da atribuição */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 rounded-t-xl transition-opacity duration-300",
          urgency?.pulse && "animate-pulse"
        )}
        style={{
          background: `linear-gradient(to right, transparent, ${topBorder.color}, transparent)`
        }}
      />

      {/* Gradiente de fundo */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-60 pointer-events-none rounded-xl transition-opacity duration-300"
        style={{
          background: `linear-gradient(to bottom right, ${topBorder.color}10 0%, ${topBorder.color}05 30%, transparent 60%)`
        }}
      />

      {/* Quick Actions Overlay - Aparece ao clicar no botão ⚡ */}
      {showQuickActions && (
        <div
          className="absolute inset-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setShowQuickActions(false)}
        >
          {/* Botão Fechar */}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
            onClick={() => setShowQuickActions(false)}
          >
            <XCircle className="w-5 h-5" />
          </button>

          {/* Nome do assistido */}
          <p className="text-white/60 text-xs mb-3">{assistido.nome}</p>

          <div className="grid grid-cols-3 gap-3 p-4" onClick={(e) => e.stopPropagation()}>
            {[
              { icon: Eye, label: "Ver Perfil", href: `/admin/assistidos/${assistido.id}`, color: "emerald" },
              { icon: Scale, label: "Processos", href: `/admin/processos?assistido=${assistido.id}`, color: "violet" },
              { icon: FileText, label: "Demandas", href: `/admin/demandas?assistido=${assistido.id}`, color: "blue" },
              { icon: FolderOpen, label: "Drive", href: `/admin/drive?assistido=${assistido.id}`, color: "amber" },
              { icon: Plus, label: "Nova Demanda", href: `/admin/demandas/nova?assistido=${assistido.id}`, color: "emerald" },
              ...(whatsappUrl ? [{ icon: MessageCircle, label: "WhatsApp", href: whatsappUrl, external: true, color: "emerald" }] : []),
            ].map((action, idx) => (
              action.external ? (
                <a
                  key={idx}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all hover:scale-105"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{action.label}</span>
                </a>
              ) : (
                <Link
                  key={idx}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all hover:scale-105"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{action.label}</span>
                </Link>
              )
            ))}
          </div>

          {/* Dica */}
          <p className="text-white/40 text-[10px] mt-3">Clique fora para fechar</p>
        </div>
      )}

      <div className="p-4 space-y-3 relative z-10">

        {/* 1. HEADER: Avatar + Info + Badges */}
        <div className="flex gap-3 items-start">
          {/* Avatar Premium - Cor neutra com indicador de status */}
          <AssistidoAvatar
            nome={assistido.nome}
            photoUrl={assistido.photoUrl}
            size="lg"
            atribuicao={primaryAttrValue}
            statusPrisional={assistido.statusPrisional}
            showStatusDot
            onClick={onPhotoClick}
          />

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            {/* Nome */}
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1">
                {assistido.nome}
              </h3>
            </Link>

            {/* Vulgo */}
            {assistido.vulgo && (
              <p className="text-[10px] text-zinc-400 italic truncate">&ldquo;{assistido.vulgo}&rdquo;</p>
            )}

            {/* Meta Info - Simplificado */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Status Badge - Mais discreto */}
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                isPreso && "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
                isMonitorado && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                !isPreso && !isMonitorado && "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              )}>
                {statusConfig[assistido.statusPrisional]?.label || "Solto"}
              </span>

              {/* Tempo Preso */}
              {isPreso && tempoPreso && (
                <span className="text-[10px] text-zinc-400 font-mono tabular-nums">{tempoPreso}</span>
              )}

              {/* Idade */}
              {idade && (
                <span className="text-[10px] text-zinc-400">{idade}a</span>
              )}
            </div>
          </div>

          {/* Drive + Pin Buttons */}
          <div className="flex items-center gap-1">
            {/* Drive Link Indicator with Counter & Quick Action */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {assistido.driveFolderId ? (
                    <a
                      href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "h-7 rounded-md flex items-center gap-1.5 px-2 transition-all cursor-pointer",
                        "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
                        "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
                        "border border-emerald-200/50 dark:border-emerald-800/30"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      {(assistido.driveFilesCount ?? 0) > 0 && (
                        <span className="text-[10px] font-medium tabular-nums">
                          {assistido.driveFilesCount}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ) : (
                    <div
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                        "text-zinc-300 hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {assistido.driveFolderId
                    ? `Abrir pasta no Drive${(assistido.driveFilesCount ?? 0) > 0 ? ` (${assistido.driveFilesCount} arquivo${(assistido.driveFilesCount ?? 0) > 1 ? 's' : ''})` : ''}`
                    : "Sem pasta no Drive"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Pin Button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 transition-all",
                isPinned
                  ? "text-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                  : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              )}
              onClick={onTogglePin}
            >
              {isPinned ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 2. Badges de Atribuição - Simplificados */}
        <div className="flex items-center justify-between gap-2">
          {/* Atribuições - NEUTRAS com apenas bolinha colorida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {atribuicoesUnicas.slice(0, 3).map((attr, idx) => {
              const normalizedAttr = attr.toUpperCase().replace(/_/g, ' ');
              const option = ATRIBUICAO_OPTIONS.find(o =>
                o.value.toUpperCase() === normalizedAttr ||
                o.label.toUpperCase().includes(normalizedAttr) ||
                normalizedAttr.includes(o.value.toUpperCase())
              );
              const color = option ? SOLID_COLOR_MAP[option.value] || '#6b7280' : '#6b7280';
              const shortLabel = option?.shortLabel || attr.substring(0, 4);

              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {shortLabel}
                </span>
              );
            })}
            {atribuicoesUnicas.length > 3 && (
              <span className="text-[10px] text-zinc-400">+{atribuicoesUnicas.length - 3}</span>
            )}
          </div>

          {/* Badge de Urgência - Apenas quando realmente urgente */}
          {urgency && urgency.level !== "normal" && (
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              urgency.color === "rose" && "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
              urgency.color === "amber" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
              urgency.pulse && "animate-pulse"
            )}>
              <AlertCircle className="w-3 h-3" />
              {urgency.level}
            </span>
          )}
        </div>

        {/* 3. Local de Prisão (se preso) */}
        {isPreso && assistido.unidadePrisional && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs text-rose-700 dark:text-rose-400 truncate">{assistido.unidadePrisional}</span>
          </div>
        )}

        {/* 4. Inline Stats */}
        <div className="flex items-center gap-3 px-1">
          <Link
            href={`/admin/processos?assistido=${assistido.id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{assistido.processosAtivos || 0}</span>
            <span>proc.</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <Link
            href={`/admin/demandas?assistido=${assistido.id}`}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              assistido.demandasAbertas > 0
                ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                : "text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="font-semibold">{assistido.demandasAbertas || 0}</span>
            <span>dem.</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">·</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Brain className="w-3.5 h-3.5" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{score}</span>
          </div>
        </div>

        {/* 5. Próxima Audiência Compact */}
        {assistido.proximaAudiencia && (
          <div className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200 hover:shadow-sm",
            audienciaHoje
              ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40"
              : audienciaAmanha
                ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/40"
                : "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              audienciaHoje && "bg-amber-500 text-white",
              audienciaAmanha && "bg-blue-500 text-white",
              !audienciaHoje && !audienciaAmanha && "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            )}>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  audienciaHoje && "text-amber-700 dark:text-amber-400",
                  audienciaAmanha && "text-blue-700 dark:text-blue-400",
                  !audienciaHoje && !audienciaAmanha && "text-zinc-600 dark:text-zinc-300"
                )}>
                  {audienciaHoje ? "HOJE" : audienciaAmanha ? "AMANHÃ" : format(parseISO(assistido.proximaAudiencia), "dd/MM")}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {format(parseISO(assistido.proximaAudiencia), "HH:mm")}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  · {assistido.tipoProximaAudiencia || "Audiência"}
                </span>
              </div>
            </div>
            {(audienciaHoje || audienciaAmanha) && (
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                audienciaHoje && "bg-amber-500 animate-pulse",
                audienciaAmanha && "bg-blue-500"
              )} />
            )}
          </div>
        )}

        {/* 6. Crime Principal — inline */}
        {assistido.crimePrincipal && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 px-1">
            <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mr-1">Tipo:</span>
            {assistido.crimePrincipal}
          </p>
        )}

        {/* 7. Número do Processo — inline */}
        {assistido.numeroProcesso && (
          <div
            className="flex items-center gap-1.5 px-1 cursor-pointer group/copy"
            onClick={handleCopyProcesso}
          >
            <Scale className="w-3 h-3 text-zinc-400" />
            <span className="font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-500 truncate flex-1">
              {assistido.numeroProcesso}
            </span>
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-300 group-hover/copy:text-zinc-400 transition-colors" />
            )}
          </div>
        )}
      </div>

      {/* Footer com ações e expansão */}
      <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        {/* Ações Rápidas Inline */}
        <div className="flex items-center gap-1">
          {/* Botão Quick Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                onClick={() => setShowQuickActions(true)}
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Ações Rápidas</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {whatsappUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/drive?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                  <FolderOpen className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Drive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Nova Demanda</TooltipContent>
          </Tooltip>
        </div>

        {/* Botão Expandir */}
        <button
          className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? "Menos detalhes" : "Mais detalhes"}</span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </button>
      </div>

      {/* Seção Expandida Premium */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-4 py-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/50 dark:to-zinc-900">

            {/* Contato Premium */}
            {(assistido.telefone || assistido.telefoneContato) && (
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Contato
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {assistido.telefone || assistido.telefoneContato}
                    </p>
                    {assistido.nomeContato && (
                      <p className="text-[10px] text-zinc-400">Responsável: {assistido.nomeContato}</p>
                    )}
                  </div>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Premium */}
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Timeline
              </p>
              <div className="relative pl-4 space-y-3 border-l-2 border-zinc-200 dark:border-zinc-700">
                {/* Próxima audiência */}
                {assistido.proximaAudiencia && (
                  <div className="relative">
                    <div className={cn(
                      "absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                      audienciaHoje ? "bg-amber-500" : audienciaAmanha ? "bg-blue-500" : "bg-violet-500"
                    )}>
                      <Calendar className="w-2 h-2 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className={cn(
                        "text-xs font-semibold",
                        audienciaHoje && "text-amber-600 dark:text-amber-400",
                        audienciaAmanha && "text-blue-600 dark:text-blue-400",
                        !audienciaHoje && !audienciaAmanha && "text-violet-600 dark:text-violet-400"
                      )}>
                        {format(parseISO(assistido.proximaAudiencia), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {assistido.tipoProximaAudiencia || "Audiência"} • Próxima
                      </p>
                    </div>
                  </div>
                )}
                {/* Último evento */}
                {assistido.ultimoEvento && (
                  <div className="relative">
                    <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-400 flex items-center justify-center">
                      <CircleDot className="w-2 h-2 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {assistido.ultimoEvento.data ? format(parseISO(assistido.ultimoEvento.data), "dd/MM/yyyy") : ""}
                      </p>
                      <p className="text-[10px] text-zinc-500">{assistido.ultimoEvento.titulo}</p>
                    </div>
                  </div>
                )}
                {/* Cadastro */}
                <div className="relative">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                    <User className="w-2 h-2 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-zinc-400">
                      {format(new Date(assistido.createdAt), "dd/MM/yyyy")}
                    </p>
                    <p className="text-[10px] text-zinc-400">Cadastro no sistema</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Completas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/admin/processos?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                    <Scale className="w-3 h-3" />
                    Processos
                  </Button>
                </Link>
                <Link href={`/admin/audiencias?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                    <Calendar className="w-3 h-3" />
                    Audiências
                  </Button>
                </Link>
              </div>
              <Link href={`/admin/assistidos/${assistido.id}`} className="flex-shrink-0">
                <Button size="sm" className="h-6 text-[10px] px-2 gap-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600">
                  Ver Perfil
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ========================================
// CARD-ROW DO ASSISTIDO — 2 LINHAS STACKED
// ========================================

function AssistidoRow({ assistido, onPhotoClick, isPinned, onTogglePin }: AssistidoCardProps) {
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);
  const idade = calcularIdade(assistido.dataNascimento);
  const statusCfg = statusConfig[assistido.statusPrisional];

  const diasAteAudiencia = assistido.proximaAudiencia
    ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
    : null;
  const audienciaHoje = diasAteAudiencia === 0;
  const audienciaAmanha = diasAteAudiencia === 1;

  const atribuicoesUnicas = assistido.atribuicoes || assistido.areas || [];
  const primaryAttrOption = atribuicoesUnicas.length > 0
    ? (() => {
        const normalizedAttr = atribuicoesUnicas[0].toUpperCase().replace(/_/g, ' ');
        return ATRIBUICAO_OPTIONS.find(o =>
          o.value.toUpperCase() === normalizedAttr ||
          o.label.toUpperCase().includes(normalizedAttr) ||
          normalizedAttr.includes(o.value.toUpperCase())
        );
      })()
    : null;
  const primaryColor = primaryAttrOption ? SOLID_COLOR_MAP[primaryAttrOption.value] || '#6b7280' : '#6b7280';

  const telefone = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : null;
  const isUrgent = isPreso || prazoVencido || audienciaHoje;
  const procCount = assistido.processosAtivos || 0;
  const demCount = assistido.demandasAbertas || 0;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white dark:bg-zinc-900 px-4 py-3 transition-all duration-200 cursor-pointer",
        "border-zinc-200/80 dark:border-zinc-800/80",
        "hover:shadow-md hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
        isPinned && "ring-1 ring-amber-400/40 dark:ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/5",
        isUrgent && !isPinned && "bg-rose-50/15 dark:bg-rose-950/5",
      )}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: isPreso ? '#f43f5e' : isMonitorado ? '#f59e0b' : prazoVencido ? '#ef4444' : 'transparent',
      }}
    >
      {/* ═══ LINHA 1: Avatar + Nome + Status + Atribuição + Idade ═══ Ações ═══ */}
      <div className="flex items-center justify-between gap-3">
        {/* Esquerda: Avatar + Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <AssistidoAvatar
            nome={assistido.nome}
            photoUrl={assistido.photoUrl}
            size="md"
            atribuicao={primaryAttrOption?.value}
            statusPrisional={assistido.statusPrisional}
            showStatusDot
            onClick={onPhotoClick}
          />

          {/* Nome + Badges inline */}
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <Link
              href={`/admin/assistidos/${assistido.id}`}
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {assistido.nome}
            </Link>

            {isPinned && <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}

            {/* Status badge */}
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
              isPreso && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
              isMonitorado && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
              !isPreso && !isMonitorado && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isPreso && "bg-rose-500",
                isMonitorado && "bg-amber-500",
                !isPreso && !isMonitorado && "bg-emerald-500",
              )} />
              {statusCfg?.label || assistido.statusPrisional}
              {isPreso && tempoPreso && (
                <span className="font-mono tabular-nums text-rose-400 dark:text-rose-500 ml-0.5">{tempoPreso}</span>
              )}
            </div>

            {/* Atribuição chip */}
            {primaryAttrOption && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                {primaryAttrOption.shortLabel}
              </span>
            )}

            {/* Idade */}
            {idade !== null && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex-shrink-0">{idade}a</span>
            )}

            {/* Vulgo */}
            {assistido.vulgo && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic truncate max-w-[80px] flex-shrink-0">&ldquo;{assistido.vulgo}&rdquo;</span>
            )}
          </div>
        </div>

        {/* Direita: Ações — sempre visíveis */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {whatsappUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    <MessageCircle className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/drive?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Drive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Nova Demanda</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-all",
              isPinned
                ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                : "text-zinc-300 dark:text-zinc-600 hover:text-amber-500",
            )}
            onClick={onTogglePin}
          >
            {isPinned ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </Button>
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Ver
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══ LINHA 2: Crime + Processo + Audiência + Vínculos ═══ */}
      <div className="flex items-center gap-3 mt-1.5 ml-[52px] text-xs flex-wrap">
        {/* Crime */}
        {assistido.crimePrincipal ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[200px] cursor-help">{assistido.crimePrincipal}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[300px]">{assistido.crimePrincipal}</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-600 italic text-[10px]">Sem tipificação</span>
        )}

        {/* Separador */}
        {assistido.numeroProcesso && <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>}

        {/* Processo */}
        {assistido.numeroProcesso && (
          <span className="font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[180px]">
            {assistido.numeroProcesso.length > 25 ? `${assistido.numeroProcesso.slice(0, 25)}...` : assistido.numeroProcesso}
          </span>
        )}

        {/* Separador */}
        {(assistido.proximaAudiencia || prazoInfo) && <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>}

        {/* Próxima audiência / prazo */}
        {assistido.proximaAudiencia ? (
          <div className={cn(
            "inline-flex items-center gap-1",
            audienciaHoje && "text-amber-600 dark:text-amber-400 font-semibold",
            audienciaAmanha && "text-sky-600 dark:text-sky-400 font-medium",
            !audienciaHoje && !audienciaAmanha && "text-zinc-500 dark:text-zinc-400",
          )}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanhã" : format(parseISO(assistido.proximaAudiencia), "dd/MM")}</span>
            <span className="text-[10px] text-zinc-400">{format(parseISO(assistido.proximaAudiencia), "HH:mm")}</span>
            {audienciaHoje && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        ) : prazoInfo ? (
          <div className={cn(
            "inline-flex items-center gap-1 text-[10px] font-medium",
            prazoVencido ? "text-rose-600 dark:text-rose-400" : prazoInfo.urgent ? "text-amber-600 dark:text-amber-400" : "text-zinc-400",
          )}>
            {prazoVencido && <AlertCircle className="w-3 h-3" />}
            <span>{prazoInfo.text}</span>
          </div>
        ) : null}

        {/* Separador */}
        {(procCount > 0 || demCount > 0) && <span className="text-zinc-300 dark:text-zinc-700">&middot;</span>}

        {/* Vínculos */}
        {procCount > 0 && (
          <Link href={`/admin/processos?assistido=${assistido.id}`} className="inline-flex items-center gap-1 hover:text-emerald-600 transition-colors text-zinc-500 dark:text-zinc-400">
            <Scale className="w-3 h-3" />
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{procCount}</span>
            <span className="text-[10px]">proc</span>
          </Link>
        )}
        {demCount > 0 && (
          <Link href={`/admin/demandas?assistido=${assistido.id}`} className="inline-flex items-center gap-1 hover:text-emerald-600 transition-colors text-zinc-500 dark:text-zinc-400">
            <FileText className="w-3 h-3" />
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{demCount}</span>
            <span className="text-[10px]">dem</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ========================================
// FILTROS - PADRÃO DEMANDAS
// ========================================

const estadosPrisionais = [
  { value: "CADEIA_PUBLICA", label: "Preso", color: "#ef4444" },
  { value: "PENITENCIARIA", label: "Penitenciária", color: "#dc2626" },
  { value: "MONITORADO", label: "Monitorado", color: "#3b82f6" },
  { value: "DOMICILIAR", label: "Domiciliar", color: "#f59e0b" },
  { value: "SOLTO", label: "Solto", color: "#22c55e" },
];

interface FilterSectionAssistidosProps {
  selectedAtribuicao: string;
  setSelectedAtribuicao: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedComarca: string;
  setSelectedComarca: (value: string) => void;
  comarcas: string[];
  sortBy: string;
  setSortBy: (value: string) => void;
  groupBy: string;
  setGroupBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}

function FilterSectionAssistidos({
  selectedAtribuicao,
  setSelectedAtribuicao,
  selectedStatus,
  setSelectedStatus,
  selectedComarca,
  setSelectedComarca,
  comarcas,
  sortBy,
  setSortBy,
  groupBy,
  setGroupBy,
  viewMode,
  setViewMode,
}: FilterSectionAssistidosProps) {
  const { activeCount } = useProcessingQueue();
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    atribuicoes: false,
    status: false,
    comarca: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const totalFilters =
    (selectedAtribuicao !== "all" ? 1 : 0) +
    (selectedStatus !== "all" ? 1 : 0) +
    (selectedComarca !== "all" ? 1 : 0);

  const handleClearAll = () => {
    setSelectedAtribuicao("all");
    setSelectedStatus("all");
    setSelectedComarca("all");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div 
          onClick={() => setIsMainExpanded(!isMainExpanded)}
          className="flex items-center gap-3 cursor-pointer flex-1 group"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filtros</h3>
            <p className="text-[10px] text-zinc-400">
              {totalFilters > 0 ? `${totalFilters} ativo${totalFilters > 1 ? 's' : ''}` : 'Nenhum filtro aplicado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalFilters > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="h-7 text-[10px] px-2 text-zinc-400 hover:text-zinc-600"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
          <div 
            onClick={() => setIsMainExpanded(!isMainExpanded)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {isMainExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
      </div>

      {/* Seções de Filtro */}
      {isMainExpanded && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {/* Atribuição */}
          <div>
            <button
              onClick={() => toggleSection('atribuicoes')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Atribuição</span>
                {selectedAtribuicao !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: SOLID_COLOR_MAP[selectedAtribuicao] || '#71717a' }}
                  >
                    {ATRIBUICAO_OPTIONS.find(o => o.value === selectedAtribuicao)?.shortLabel}
                  </span>
                )}
              </div>
              {expandedSections.atribuicoes ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.atribuicoes && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {ATRIBUICAO_OPTIONS.filter(o => o.value !== "all").map((option) => {
                  const isSelected = selectedAtribuicao === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedAtribuicao(isSelected ? "all" : option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: SOLID_COLOR_MAP[option.value] || '#71717a' }} 
                      />
                      {option.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado Prisional */}
          <div>
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Estado Prisional</span>
                {selectedStatus !== "all" && (
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: estadosPrisionais.find(e => e.value === selectedStatus)?.color }}
                  >
                    {estadosPrisionais.find(e => e.value === selectedStatus)?.label}
                  </span>
                )}
              </div>
              {expandedSections.status ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            
            {expandedSections.status && (
              <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                {estadosPrisionais.map((estado) => {
                  const isSelected = selectedStatus === estado.value;
                  return (
                    <button
                      key={estado.value}
                      onClick={() => setSelectedStatus(isSelected ? "all" : estado.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                        isSelected
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                          : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: estado.color }} 
                      />
                      {estado.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comarca */}
          {comarcas.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('comarca')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Comarca</span>
                  {selectedComarca !== "all" && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      {selectedComarca}
                    </span>
                  )}
                </div>
                {expandedSections.comarca ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
              
              {expandedSections.comarca && (
                <div className="mt-1.5 px-2 flex flex-wrap gap-1.5">
                  {comarcas.map((comarca) => {
                    const isSelected = selectedComarca === comarca;
                    return (
                      <button
                        key={comarca}
                        onClick={() => setSelectedComarca(isSelected ? "all" : comarca)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all",
                          isSelected
                            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                            : "bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                        )}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {comarca}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barra de Ações (Ordenação, View) */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        {/* Botões de Ordenação */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400 mr-1">Ordenar:</span>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            {[
              { id: "nome", label: "Nome" },
              { id: "prioridade", label: "Prioridade" },
              { id: "complexidade", label: "Complexidade" },
              { id: "prazo", label: "Prazo" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                  sortBy === opt.id
                    ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ProcessingQueuePanel>
            <button
              className={cn(
                "h-8 w-8 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
                activeCount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title="Fila de processamento"
            >
              <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
              {activeCount > 0 && (
                <span className="text-[10px] font-medium">{activeCount}</span>
              )}
            </button>
          </ProcessingQueuePanel>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1 px-2.5 h-7 text-xs font-medium rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssistidosPage() {
  // Atribuicao do contexto global
  const { currentAssignment } = useAssignment();
  const utils = trpc.useUtils();

  // Buscar assistidos do banco de dados (com fallback offline)
  const assistidosQuery = trpc.assistidos.list.useQuery({ limit: 100 });
  const { data: assistidosData, isLoading } = useOfflineQuery(
    assistidosQuery,
    getOfflineAssistidos,
  );
  
  // Transformar dados do banco para o formato esperado pela UI
  const realAssistidos = useMemo(() => {
    if (!assistidosData) return [];
    return assistidosData.map((a) => {
      // Extrair atribuições e áreas como arrays (suporte para snake_case e camelCase)
      const atribuicoesStr = ((a as any).atribuicoes || "") as string;
      const areasStr = ((a as any).areas || "") as string;
      const atribuicoes = atribuicoesStr ? atribuicoesStr.split(',').filter(Boolean) : [];
      const areas = areasStr ? areasStr.split(',').filter(Boolean) : [];
      const comarcasStr = ((a as any).comarcas || "") as string;
      
      return {
        id: a.id,
        nome: a.nome,
        cpf: a.cpf || "",
        rg: a.rg || "",
        dataNascimento: a.dataNascimento || "",
        naturalidade: a.naturalidade || "",
        statusPrisional: a.statusPrisional || "SOLTO",
        localPrisao: a.localPrisao || "",
        unidadePrisional: a.unidadePrisional || "",
        telefone: a.telefone || "",
        telefoneContato: a.telefoneContato || "",
        nomeContato: a.nomeContato || "",
        endereco: a.endereco || "",
        photoUrl: a.photoUrl || "",
        observacoes: a.observacoes || "",
        // Campos derivados usando dados reais do banco
        area: areas[0] || "CRIMINAL",
        areas: areas, // Lista de áreas para múltiplas cores
        atribuicoes: atribuicoes, // Lista de atribuições para múltiplas cores
        vulgo: "",
        crimePrincipal: (a as any).crimePrincipal || "",
        defensor: "Não atribuído",
        processoPrincipal: (a as any).processoPrincipal || "",
        // Usar dados reais da query (Drizzle retorna camelCase)
        demandasAbertas: (a as any).demandasAbertasCount || 0,
        processosAtivos: (a as any).processosCount || 0,
        proximoPrazo: (a as any).proximoPrazo || null,
        proximaAudiencia: (a as any).proximaAudiencia || null,
        prioridadeAI: "NORMAL" as const,
        createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
        // Campos adicionais para compatibilidade com o componente
        testemunhasArroladas: [] as Array<{ nome: string; ouvida: boolean }>,
        interrogatorioRealizado: false,
        tipoProximaAudiencia: "",
        dataPrisao: a.dataPrisao || null,
        faseProcessual: "INSTRUCAO" as const,
        numeroProcesso: (a as any).processoPrincipal || "",
        dataFato: null as string | null,
        resumoFato: "",
        teseDaDefesa: "",
        ultimaAudiencia: null as string | null,
        tipoUltimaAudiencia: "",
        observacoesProcesso: "",
        estrategiaDefesaAtual: "",
        atoProximoPrazo: "",
        nomeMae: a.nomeMae || "",
        bairro: "",
        cidade: "Camaçari",
        // Novos campos
        comarcas: comarcasStr ? comarcasStr.split(',').filter(Boolean) : [],
        // Score calculado no cliente para evitar query pesada
        scoreComplexidade: ((a as any).processosCount || 0) * 10 +
          ((a as any).demandasAbertasCount || 0) * 5 +
          (["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional || "") ? 20 : 0),
        ultimoEvento: null,
        // Drive integration
        driveFolderId: a.driveFolderId || null,
        driveFilesCount: (a as any).driveFilesCount || 0,
      };
    });
  }, [assistidosData]);
  
  // Estados
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [comarcaFilter, setComarcaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nome" | "prioridade" | "prazo" | "complexidade">("nome");
  const [groupBy, setGroupBy] = useState<"none" | "comarca" | "area" | "status">("none");
  const [showNaoIdentificados, setShowNaoIdentificados] = useState(false);
  const [showArquivados, setShowArquivados] = useState(false);

  // Contagem de não identificados
  const naoIdentificadosCount = useMemo(() => {
    return realAssistidos.filter(a => 
      a.nome.toLowerCase().includes("não identificado") || 
      a.nome.toLowerCase().includes("nao identificado") ||
      a.nome === "" ||
      a.nome === "-"
    ).length;
  }, [realAssistidos]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<typeof realAssistidos[0] | null>(null);

  // Batch Solar export state
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set());
  const [batchResultOpen, setBatchResultOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{
    assistidoId: number;
    nome?: string;
    success: boolean;
    ja_existia_solar?: boolean;
    verificacao_processo?: boolean | null;
    sigad_processo?: string | null;
    campos_enriquecidos?: string[];
    error?: string | null;
    message?: string | null;
  }>>([]);

  const exportarBatch = trpc.solar.exportarBatch.useMutation({
    onSuccess: (result) => {
      setBatchResults(result.results);
      setBatchResultOpen(true);
      setBatchSelectMode(false);
      setBatchSelectedIds(new Set());
    },
    onError: (err) => {
      import("sonner").then(({ toast }) => toast.error(err.message));
    },
  });

  const toggleBatchSelect = (id: number, hasCpf: boolean) => {
    if (!hasCpf) return;
    setBatchSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Extrair comarcas únicas dos assistidos
  const comarcasUnicas = useMemo(() => {
    const allComarcas = new Set<string>();
    realAssistidos.forEach(a => {
      (a.comarcas || []).forEach(c => allComarcas.add(c));
    });
    return Array.from(allComarcas).sort();
  }, [realAssistidos]);

  const handlePhotoClick = (assistido: typeof realAssistidos[0]) => {
    setSelectedAssistido(assistido);
    setPhotoDialogOpen(true);
  };

  const togglePin = useCallback((id: number) => {
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const filteredAssistidos = useMemo(() => {
    let result = realAssistidos.filter((a) => {
      // Verificar se é "Não Identificado"
      const isNaoIdentificado = 
        a.nome.toLowerCase().includes("não identificado") || 
        a.nome.toLowerCase().includes("nao identificado") ||
        a.nome === "" ||
        a.nome === "-";
      
      // Se estiver no modo "Não Identificados", mostrar apenas esses
      if (showNaoIdentificados) {
        return isNaoIdentificado;
      }
      
      // Caso contrário, excluir os não identificados da lista normal
      if (isNaoIdentificado) return false;
      
      const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.cpf.includes(searchTerm) || (a.vulgo?.toLowerCase().includes(searchTerm.toLowerCase())) || (a.crimePrincipal?.toLowerCase().includes(searchTerm.toLowerCase())) || (a.numeroProcesso?.includes(searchTerm));
      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      const matchesPinned = !showPinnedOnly || pinnedIds.has(a.id);
      const matchesAtribuicao = atribuicaoFilter === "all" || a.area === atribuicaoFilter;
      const matchesComarca = comarcaFilter === "all" || (a.comarcas || []).includes(comarcaFilter);
      return matchesSearch && matchesStatus && matchesArea && matchesPinned && matchesAtribuicao && matchesComarca;
    });

    result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
      if (sortBy === "complexidade") {
        return (b.scoreComplexidade || 0) - (a.scoreComplexidade || 0);
      }
      if (sortBy === "prioridade") {
        const prioA = statusConfig[a.statusPrisional]?.priority || 99;
        const prioB = statusConfig[b.statusPrisional]?.priority || 99;
        if (prioA !== prioB) return prioA - prioB;
        return b.demandasAbertas - a.demandasAbertas;
      }
      if (sortBy === "prazo") {
        if (!a.proximoPrazo && !b.proximoPrazo) return 0;
        if (!a.proximoPrazo) return 1;
        if (!b.proximoPrazo) return -1;
        return new Date(a.proximoPrazo).getTime() - new Date(b.proximoPrazo).getTime();
      }
      return 0;
    });

    return result;
  }, [realAssistidos, searchTerm, statusFilter, areaFilter, comarcaFilter, sortBy, pinnedIds, showPinnedOnly, atribuicaoFilter, showNaoIdentificados]);

  // Progressive rendering — show first 24 instantly (6 cols × 4 rows), render rest incrementally
  const { visibleItems: visibleAssistidos } = useProgressiveList(filteredAssistidos, 24, 24);

  // Detectar potenciais duplicados (nomes muito similares) - Otimizado com hash map
  const potentialDuplicates = useMemo(() => {
    const duplicateMap: Record<number, number[]> = {};
    
    // Agrupar por primeiro+último nome usando hash map (O(n) em vez de O(n²))
    const firstLastNameMap: Record<string, number[]> = {};
    
    const normalizeName = (name: string) => {
      return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };
    
    const getFirstLastName = (name: string) => {
      const parts = name.split(" ");
      if (parts.length < 2) return name;
      return `${parts[0]} ${parts[parts.length - 1]}`;
    };
    
    // Primeira passada: agrupar por primeiro+último nome
    realAssistidos.forEach((a) => {
      const key = getFirstLastName(normalizeName(a.nome));
      if (!firstLastNameMap[key]) firstLastNameMap[key] = [];
      firstLastNameMap[key].push(a.id);
    });
    
    // Segunda passada: marcar duplicados (apenas grupos com 2+ itens)
    Object.values(firstLastNameMap).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => {
          duplicateMap[id] = ids.filter(otherId => otherId !== id);
        });
      }
    });
    
    return duplicateMap;
  }, [realAssistidos]);

  // Agrupamento inteligente
  const groupedAssistidos = useMemo(() => {
    if (groupBy === "none") return null;
    
    const groups: Record<string, typeof filteredAssistidos> = {};
    
    filteredAssistidos.forEach(a => {
      let key = "";
      if (groupBy === "comarca") {
        key = (a.comarcas || [])[0] || "Sem comarca";
      } else if (groupBy === "area") {
        key = (a.areas || [])[0] || a.area || "Sem área";
      } else if (groupBy === "status") {
        key = statusConfig[a.statusPrisional]?.label || a.statusPrisional;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAssistidos, groupBy]);

  // Estatísticas Premium
  const stats = useMemo(() => {
    const total = realAssistidos.length;
    const presos = realAssistidos.filter(a => ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)).length;
    const monitorados = realAssistidos.filter(a => ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)).length;
    const soltos = realAssistidos.filter(a => a.statusPrisional === "SOLTO").length;
    const pinned = pinnedIds.size;

    // Audiências
    const audienciasHoje = realAssistidos.filter(a => {
      if (!a.proximaAudiencia) return false;
      return differenceInDays(parseISO(a.proximaAudiencia), new Date()) === 0;
    }).length;

    const audienciasSemana = realAssistidos.filter(a => {
      if (!a.proximaAudiencia) return false;
      const dias = differenceInDays(parseISO(a.proximaAudiencia), new Date());
      return dias >= 0 && dias <= 7;
    }).length;

    // Prazos
    const prazosVencidos = realAssistidos.filter(a => {
      if (!a.proximoPrazo) return false;
      return differenceInDays(parseISO(a.proximoPrazo), new Date()) < 0;
    }).length;

    const prazosUrgentes = realAssistidos.filter(a => {
      if (!a.proximoPrazo) return false;
      const dias = differenceInDays(parseISO(a.proximoPrazo), new Date());
      return dias >= 0 && dias <= 3;
    }).length;

    // Com demandas abertas
    const comDemandas = realAssistidos.filter(a => a.demandasAbertas > 0).length;

    return {
      total,
      presos,
      monitorados,
      soltos,
      pinned,
      audienciasHoje,
      audienciasSemana,
      prazosVencidos,
      prazosUrgentes,
      comDemandas,
    };
  }, [realAssistidos, pinnedIds]);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        {/* Header skeleton */}
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 flex-1 max-w-md rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
        
        <div className="p-4 md:p-6 space-y-4">
          {/* Stats skeleton - 2 colunas em mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          
          {/* Cards skeleton */}
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Visual config da atribuicao selecionada
  const atribuicaoColors = getAtribuicaoColors(atribuicaoFilter);

  // Preparar filtros ativos
  const activeFilters = [
    statusFilter !== "all" && { 
      key: "status", 
      label: "Status", 
      value: statusConfig[statusFilter]?.label || statusFilter 
    },
    areaFilter !== "all" && { 
      key: "area", 
      label: "Área", 
      value: areaConfig[areaFilter]?.labelFull || areaFilter 
    },
    sortBy !== "prioridade" && { 
      key: "sort", 
      label: "Ordenação", 
      value: sortBy === "nome" ? "Nome" : "Prazo" 
    },
  ].filter(Boolean) as Array<{ key: string; label: string; value: string }>;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Premium */}
      <div className="relative px-4 sm:px-5 md:px-8 py-5 sm:py-6 md:py-8 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent dark:from-emerald-950/15 dark:via-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg ring-4 ring-zinc-900/5 dark:ring-white/10 shrink-0">
              <Users className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">Assistidos</h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Cadastro e gestão de assistidos</p>
            </div>
          </div>
          
          {/* Busca + Ações */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF, vulgo..."
                className="pl-8 w-[140px] sm:w-[200px] md:w-[280px] h-8 text-xs border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors"
              />
            </div>
            <Link href="/admin/inteligencia">
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Inteligência"
              >
                <Brain className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Exportar"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            {/* Botão batch Solar export */}
            {!batchSelectMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-medium rounded-md"
                onClick={() => setBatchSelectMode(true)}
                title="Exportar múltiplos assistidos ao Solar via SIGAD"
              >
                <Sun className="w-3.5 h-3.5 mr-1" />
                Solar
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">
                  {batchSelectedIds.size} selecionados
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-zinc-200 text-zinc-500"
                  onClick={() => {
                    setBatchSelectMode(false);
                    setBatchSelectedIds(new Set());
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md"
                  disabled={batchSelectedIds.size === 0 || exportarBatch.isPending}
                  onClick={() =>
                    exportarBatch.mutate({
                      assistidoIds: Array.from(batchSelectedIds),
                    })
                  }
                >
                  {exportarBatch.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sun className="w-3 h-3 mr-1" />
                  )}
                  {exportarBatch.isPending
                    ? `Exportando ${batchSelectedIds.size}...`
                    : `Exportar ${batchSelectedIds.size} ao Solar`}
                </Button>
              </div>
            )}
            <Link href="/admin/assistidos/novo">
              <Button
                size="sm"
                className="h-9 px-4 ml-1 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Assistido
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-5 md:p-8 space-y-5 md:space-y-7">

      {/* Alerta de Não Identificados - Discreto */}
      {naoIdentificadosCount > 0 && !showNaoIdentificados && (
        <button
          onClick={() => setShowNaoIdentificados(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-left group"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {naoIdentificadosCount} sem identificação
          </span>
          <span className="text-[10px] text-amber-500 dark:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Regularizar →
          </span>
        </button>
      )}

      {/* Banner modo Não Identificados */}
      {showNaoIdentificados && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Modo Regularização - Assistidos Não Identificados
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Edite cada registro para adicionar o nome correto do assistido
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-amber-500 text-amber-700 hover:bg-amber-200"
            onClick={() => setShowNaoIdentificados(false)}
          >
            <XCircle className="w-3.5 h-3.5 mr-2" />
            Voltar à Lista Normal
          </Button>
        </div>
      )}

      {/* KPI Cards Premium - Padrão Defender (cores neutras) */}
      {!showNaoIdentificados && (
      <>
        {/* Stats Ribbon — compact inline KPIs */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
          {[
            { icon: Users, value: stats.total - naoIdentificadosCount, label: "assistidos", onClick: () => { setStatusFilter("all"); setShowPinnedOnly(false); }, active: statusFilter === "all" && !showPinnedOnly },
            { icon: Lock, value: stats.presos, label: "presos", onClick: () => { setStatusFilter(statusFilter === "CADEIA_PUBLICA" ? "all" : "CADEIA_PUBLICA"); setShowPinnedOnly(false); }, active: statusFilter === "CADEIA_PUBLICA", alert: stats.presos > 0 },
            { icon: Timer, value: stats.monitorados, label: "monitorados", onClick: () => { setStatusFilter(statusFilter === "MONITORADO" ? "all" : "MONITORADO"); setShowPinnedOnly(false); }, active: statusFilter === "MONITORADO" },
            { icon: Calendar, value: stats.audienciasHoje, label: "aud. hoje", sublabel: `${stats.audienciasSemana} semana`, alert: stats.audienciasHoje > 0 },
            { icon: FileText, value: stats.comDemandas, label: "demandas" },
            { icon: BookmarkCheck, value: stats.pinned, label: "fixados", onClick: () => { setShowPinnedOnly(!showPinnedOnly); setStatusFilter("all"); }, active: showPinnedOnly },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Fragment key={index}>
                {index > 0 && <div className="w-px h-4 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />}
                <button
                  onClick={stat.onClick}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg transition-colors",
                    stat.onClick && "cursor-pointer",
                    stat.active ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    stat.alert && !stat.active ? "bg-rose-50 dark:bg-rose-950/20" : ""
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", stat.alert ? "text-rose-500 dark:text-rose-400" : stat.active ? "text-emerald-500 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500")} />
                  <span className={cn("font-bold tabular-nums", stat.alert ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-100")}>{stat.value}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">{stat.label}</span>
                </button>
              </Fragment>
            );
          })}
          <div className="flex-1" />
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px] tabular-nums whitespace-nowrap">{stats.total - naoIdentificadosCount} total</span>
        </div>

        {/* Alertas de Urgência */}
        {(stats.prazosVencidos > 0 || stats.audienciasHoje > 0) && (
          <div className="flex items-center gap-3 flex-wrap">
            {stats.prazosVencidos > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-medium text-rose-700 dark:text-rose-400">
                  {stats.prazosVencidos} prazo{stats.prazosVencidos > 1 ? 's' : ''} vencido{stats.prazosVencidos > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {stats.audienciasHoje > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {stats.audienciasHoje} audiência{stats.audienciasHoje > 1 ? 's' : ''} hoje
                </span>
              </div>
            )}
            {stats.prazosUrgentes > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {stats.prazosUrgentes} prazo{stats.prazosUrgentes > 1 ? 's' : ''} urgente{stats.prazosUrgentes > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </>
      )}

      {/* Card de Filtros */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-apple dark:shadow-apple-dark">
        <FilterSectionAssistidos
          selectedAtribuicao={atribuicaoFilter}
          setSelectedAtribuicao={setAtribuicaoFilter}
          selectedStatus={statusFilter}
          setSelectedStatus={setStatusFilter}
          selectedComarca={comarcaFilter}
          setSelectedComarca={setComarcaFilter}
          comarcas={comarcasUnicas}
          sortBy={sortBy}
          setSortBy={(v) => setSortBy(v as "nome" | "prioridade" | "prazo" | "complexidade")}
          groupBy={groupBy}
          setGroupBy={(v) => setGroupBy(v as "none" | "comarca" | "area" | "status")}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </Card>

      {/* Card de Listagem */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {filteredAssistidos.length} assistido{filteredAssistidos.length !== 1 && 's'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
      {filteredAssistidos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum assistido encontrado"
          description="Ajuste os filtros ou cadastre um novo assistido."
          action={{
            label: "Novo Assistido",
            onClick: () => {},
            icon: Plus,
          }}
          variant={searchTerm ? "search" : "default"}
        />
      ) : viewMode === "grid" ? (
        groupedAssistidos ? (
          // Exibição agrupada
          <div className="space-y-6">
            {groupedAssistidos.map(([groupName, items]) => (
              <div key={groupName}>
                {/* Cabeçalho do Grupo */}
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                      {groupName}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>
                {/* Cards do Grupo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                  {items.map((a) => (
                    <div key={a.id} className="relative">
                      {batchSelectMode && (
                        <button
                          onClick={() => toggleBatchSelect(a.id, !!a.cpf)}
                          className={cn(
                            "absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            !a.cpf
                              ? "border-zinc-300 bg-zinc-100 cursor-not-allowed opacity-40"
                              : batchSelectedIds.has(a.id)
                              ? "border-amber-500 bg-amber-500"
                              : "border-zinc-300 bg-white hover:border-amber-400"
                          )}
                          title={!a.cpf ? "Assistido sem CPF — não pode ser exportado" : undefined}
                        >
                          {batchSelectedIds.has(a.id) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </button>
                      )}
                      <AssistidoCard
                        assistido={a}
                        onPhotoClick={() => handlePhotoClick(a)}
                        isPinned={pinnedIds.has(a.id)}
                        onTogglePin={() => togglePin(a.id)}
                        hasDuplicates={(potentialDuplicates[a.id]?.length || 0) > 0}
                        duplicateCount={potentialDuplicates[a.id]?.length || 0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Exibição normal (sem agrupamento)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
            {visibleAssistidos.map((a) => (
              <div key={a.id} className="relative">
                {batchSelectMode && (
                  <button
                    onClick={() => toggleBatchSelect(a.id, !!a.cpf)}
                    className={cn(
                      "absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      !a.cpf
                        ? "border-zinc-300 bg-zinc-100 cursor-not-allowed opacity-40"
                        : batchSelectedIds.has(a.id)
                        ? "border-amber-500 bg-amber-500"
                        : "border-zinc-300 bg-white hover:border-amber-400"
                    )}
                    title={!a.cpf ? "Assistido sem CPF — não pode ser exportado" : undefined}
                  >
                    {batchSelectedIds.has(a.id) && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                )}
                <AssistidoCard
                  assistido={a}
                  onPhotoClick={() => handlePhotoClick(a)}
                  isPinned={pinnedIds.has(a.id)}
                  onTogglePin={() => togglePin(a.id)}
                  hasDuplicates={(potentialDuplicates[a.id]?.length || 0) > 0}
                  duplicateCount={potentialDuplicates[a.id]?.length || 0}
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-1">
          {visibleAssistidos.map((a) => (
            <AssistidoRow
              key={a.id}
              assistido={a}
              onPhotoClick={() => handlePhotoClick(a)}
              isPinned={pinnedIds.has(a.id)}
              onTogglePin={() => togglePin(a.id)}
            />
          ))}
        </div>
      )}
        </div>
      </Card>

      {/* Photo Dialog */}
      {selectedAssistido && (
        <PhotoUploadDialog
          isOpen={photoDialogOpen}
          onClose={() => { setPhotoDialogOpen(false); setSelectedAssistido(null); }}
          assistidoNome={selectedAssistido.nome}
          currentPhoto={selectedAssistido.photoUrl}
          onUpload={async (file) => {
            try {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const base64 = (reader.result as string).split(',')[1];
                  await utils.client.assistidos.uploadPhoto.mutate({
                    assistidoId: selectedAssistido!.id,
                    imageBase64: base64,
                    fileName: file.name,
                    contentType: file.type,
                  });
                  utils.assistidos.list.invalidate();
                  toast.success("Foto atualizada!");
                  setPhotoDialogOpen(false);
                  setSelectedAssistido(null);
                } catch (err) {
                  console.error("Upload error:", err);
                  toast.error("Erro ao fazer upload da foto");
                }
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.error("File read error:", err);
              toast.error("Erro ao ler arquivo");
            }
          }}
        />
      )}

      {/* Batch Solar Export Results Dialog */}
      <Dialog open={batchResultOpen} onOpenChange={setBatchResultOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4 text-amber-600" />
              Resultado da Exportação ao Solar
            </DialogTitle>
            <DialogDescription className="text-xs">
              {batchResults.filter((r) => r.success).length} exportados com sucesso /{" "}
              {batchResults.filter((r) => !r.success).length} com falha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {batchResults.map((r) => (
              <div
                key={r.assistidoId}
                className={cn(
                  "flex items-start gap-2 p-2.5 rounded-lg border text-xs",
                  r.success
                    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
                    : r.error === "processo_nao_corresponde"
                    ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                    : "border-rose-200 bg-rose-50 dark:bg-rose-950/20"
                )}
              >
                {r.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : r.error === "processo_nao_corresponde" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {r.nome ?? `Assistido #${r.assistidoId}`}
                  </span>
                  <p
                    className={cn(
                      "mt-0.5",
                      r.success ? "text-emerald-700" : r.error === "processo_nao_corresponde" ? "text-amber-700" : "text-rose-600"
                    )}
                  >
                    {r.success
                      ? r.ja_existia_solar
                        ? "Já cadastrado no Solar"
                        : r.campos_enriquecidos && r.campos_enriquecidos.length > 0
                        ? `Exportado ✓ · Dados atualizados: ${r.campos_enriquecidos.join(", ")}`
                        : "Exportado ao Solar com sucesso"
                      : r.error === "sem_cpf"
                      ? "Sem CPF cadastrado no OMBUDS"
                      : r.error === "nao_encontrado"
                      ? "Não encontrado no SIGAD"
                      : r.error === "processo_nao_corresponde"
                      ? `Processo SIGAD não corresponde: ${r.sigad_processo ?? "?"}`
                      : r.message ?? r.error ?? "Erro desconhecido"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
}
