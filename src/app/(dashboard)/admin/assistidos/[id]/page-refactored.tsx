"use client";

import { useState, use, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// TIPOS
// ============================================
interface Registro {
  id: string;
  tipo: "atendimento" | "diligencia" | "informacao" | "peticao" | "anotacao" | "audiencia";
  titulo: string;
  descricao: string;
  data: string;
  autor: string;
  importante: boolean;
}

// ============================================
// HELPERS
// ============================================
const statusPrisionalConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-400", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
  HOSPITAL_CUSTODIA: { label: "Hospital de Custódia", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  DOMICILIAR: { label: "Prisão Domiciliar", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  MONITORADO: { label: "Monitoramento", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
};

function calcularIdade(dataNascimento: string | Date | null): number | null {
  if (!dataNascimento) return null;
  const nascimento = typeof dataNascimento === "string" ? parseISO(dataNascimento) : dataNascimento;
  return differenceInYears(new Date(), nascimento);
}

function calcularTempoPreso(dataPrisao: string | Date | null): string | null {
  if (!dataPrisao) return null;
  const prisao = typeof dataPrisao === "string" ? parseISO(dataPrisao) : dataPrisao;
  const dias = differenceInDays(new Date(), prisao);
  if (dias < 30) return `${dias} dias`;
  if (dias < 365) return `${Math.floor(dias / 30)} meses`;
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  return meses > 0 ? `${anos} ano(s) e ${meses} mês(es)` : `${anos} ano(s)`;
}

// ============================================
// LOADING SKELETON
// ============================================
function AssistidoSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// NOT FOUND
// ============================================
function AssistidoNotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-6 flex items-center justify-center">
      <Card className="max-w-md w-full p-8 text-center">
        <User className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Assistido não encontrado
        </h2>
        <p className="text-zinc-500 mb-6">
          O assistido solicitado não existe ou foi removido do sistema.
        </p>
        <Link href="/admin/assistidos">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </Button>
        </Link>
      </Card>
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function AssistidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const assistidoId = parseInt(resolvedParams.id);
  
  const [activeTab, setActiveTab] = useState("timeline");
  const [isEditing, setIsEditing] = useState(false);

  // ==========================================
  // BUSCAR DADOS REAIS DO BANCO
  // ==========================================
  const { data: assistido, isLoading: loadingAssistido, error } = trpc.assistidos.getById.useQuery(
    { id: assistidoId },
    { enabled: !isNaN(assistidoId) }
  );

  // Buscar processos do assistido
  const { data: processos = [], isLoading: loadingProcessos } = trpc.processos.list.useQuery({
    assistidoId: assistidoId,
    limit: 50,
  });

  // Buscar audiências do assistido
  const { data: audiencias = [], isLoading: loadingAudiencias } = trpc.audiencias.list.useQuery({
    assistidoId: assistidoId,
    limit: 30,
  });

  // Buscar casos do assistido
  const { data: casos = [], isLoading: loadingCasos } = trpc.casos.list.useQuery({
    assistidoId: assistidoId,
    limit: 20,
  });

  // ==========================================
  // ESTADOS DE LOADING E ERRO
  // ==========================================
  const isLoading = loadingAssistido || loadingProcessos || loadingAudiencias;

  if (isLoading) {
    return <AssistidoSkeleton />;
  }

  if (error || !assistido) {
    return <AssistidoNotFound />;
  }

  // ==========================================
  // DADOS CALCULADOS
  // ==========================================
  const statusConfig = statusPrisionalConfig[assistido.statusPrisional || "SOLTO"] || statusPrisionalConfig.SOLTO;
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = assistido.dataPrisao ? calcularTempoPreso(assistido.dataPrisao) : null;

  // Próxima audiência
  const proximaAudiencia = audiencias
    .filter((a: any) => a.data && new Date(a.data) > new Date())
    .sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())[0];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/admin/assistidos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-white dark:border-zinc-800 shadow-lg">
              <AvatarFallback className={cn(
                "text-2xl font-semibold",
                assistido.statusPrisional && assistido.statusPrisional !== "SOLTO" 
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
              )}>
                {assistido.nome?.split(" ").map(n => n[0]).slice(0, 2).join("") || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{assistido.nome}</h1>
                  {assistido.vulgo && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">&ldquo;{assistido.vulgo}&rdquo;</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Dados
                      </DropdownMenuItem>
                      {assistido.linkDrive && (
                        <DropdownMenuItem asChild>
                          <a href={assistido.linkDrive} target="_blank" rel="noopener noreferrer">
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Abrir Pasta Drive
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-amber-600">
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                  {assistido.statusPrisional && assistido.statusPrisional !== "SOLTO" 
                    ? <Lock className="w-3 h-3 mr-1" /> 
                    : <Unlock className="w-3 h-3 mr-1" />
                  }
                  {statusConfig.label}
                </Badge>
                {assistido.localPrisao && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {assistido.localPrisao}
                  </Badge>
                )}
                {tempoPreso && (
                  <Badge variant="outline" className="text-xs">
                    <Timer className="w-3 h-3 mr-1" />
                    {tempoPreso}
                  </Badge>
                )}
                {idade && (
                  <Badge variant="outline" className="text-xs">
                    {idade} anos
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">CPF</p>
                  <p className="font-medium">{assistido.cpf || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">RG</p>
                  <p className="font-medium">{assistido.rg || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Data de Nascimento</p>
                  <p className="font-medium">
                    {assistido.dataNascimento 
                      ? format(new Date(assistido.dataNascimento), "dd/MM/yyyy")
                      : "—"
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Nome da Mãe</p>
                  <p className="font-medium">{assistido.nomeMae || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Profissão</p>
                  <p className="font-medium">{assistido.profissao || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Estado Civil</p>
                  <p className="font-medium">{assistido.estadoCivil || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Telefone</p>
                  <p className="font-medium">{assistido.telefone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">E-mail</p>
                  <p className="font-medium">{assistido.email || "—"}</p>
                </div>
                {assistido.nomeContato && (
                  <>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Contato de Emergência</p>
                      <p className="font-medium">{assistido.nomeContato}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Telefone do Contato</p>
                      <p className="font-medium">{assistido.telefoneContato || "—"}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-violet-600" />
                  Processos
                  <Badge variant="secondary">{processos.length}</Badge>
                </div>
                <Link href={`/admin/processos?assistidoId=${assistidoId}`}>
                  <Button variant="ghost" size="sm">
                    Ver todos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {processos.length === 0 ? (
                <div className="text-center py-8">
                  <Scale className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                  <p className="text-sm text-zinc-500">Nenhum processo vinculado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processos.slice(0, 5).map((processo: any) => (
                    <Link key={processo.id} href={`/admin/processos/${processo.id}`}>
                      <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-sm font-medium">{processo.numeroAutos}</p>
                            <p className="text-xs text-zinc-500 mt-1">{processo.vara}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {processo.fase || "Em andamento"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Próxima Audiência */}
          {proximaAudiencia && (
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Próxima Audiência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {format(new Date(proximaAudiencia.data), "dd/MM")}
                </p>
                <p className="text-sm text-zinc-500">
                  {proximaAudiencia.horario || format(new Date(proximaAudiencia.data), "HH:mm")}
                </p>
                <p className="text-sm mt-2">{proximaAudiencia.tipo || "Audiência"}</p>
              </CardContent>
            </Card>
          )}

          {/* Casos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Casos
                <Badge variant="secondary" className="text-xs">{casos.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {casos.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">
                  Nenhum caso vinculado
                </p>
              ) : (
                <div className="space-y-2">
                  {casos.slice(0, 3).map((caso: any) => (
                    <Link key={caso.id} href={`/admin/casos/${caso.id}`}>
                      <div className="p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <p className="text-sm font-medium truncate">{caso.titulo}</p>
                        <p className="text-xs text-zinc-500">{caso.area || "Geral"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          {assistido.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                  {assistido.observacoes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
