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

interface Processo {
  id: number;
  numero: string;
  tipo: string;
  vara: string;
  fase: string;
  ultimaMovimentacao: string;
  proximaAudiencia?: string;
}

interface Audiencia {
  id: number;
  data: string;
  hora: string;
  tipo: string;
  vara: string;
  processoNumero: string;
  status: "agendada" | "realizada" | "adiada" | "cancelada";
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
  },
  {
    id: 2,
    numero: "0005678-90.2024.8.05.0039",
    tipo: "Execução Penal",
    vara: "VEP Camaçari",
    fase: "Aguardando progressão",
    ultimaMovimentacao: "2025-01-20",
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
    status: "agendada",
  },
  {
    id: 2,
    data: "2025-01-10",
    hora: "14:00",
    tipo: "Audiência de Custódia",
    vara: "Central de Custódia",
    processoNumero: "0001234-56.2024.8.05.0039",
    status: "realizada",
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
  },
];

// ============================================
// HELPERS
// ============================================
const tipoRegistroConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  atendimento: { label: "Atendimento", icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/30" },
  diligencia: { label: "Diligência", icon: <Search className="w-3.5 h-3.5" />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/30" },
  informacao: { label: "Informação", icon: <Info className="w-3.5 h-3.5" />, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/30" },
  peticao: { label: "Petição", icon: <FileText className="w-3.5 h-3.5" />, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/30" },
  anotacao: { label: "Anotação", icon: <PenLine className="w-3.5 h-3.5" />, color: "text-zinc-600", bgColor: "bg-zinc-50 dark:bg-zinc-800" },
  audiencia: { label: "Audiência", icon: <Gavel className="w-3.5 h-3.5" />, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-900/30" },
};

const statusPrisionalConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700", bgColor: "bg-rose-100" },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700", bgColor: "bg-rose-100" },
  COP: { label: "COP", color: "text-rose-700", bgColor: "bg-rose-100" },
  MONITORADO: { label: "Monitorado", color: "text-amber-700", bgColor: "bg-amber-100" },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700", bgColor: "bg-orange-100" },
  SOLTO: { label: "Solto", color: "text-emerald-700", bgColor: "bg-emerald-100" },
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

// ============================================
// COMPONENTE: Novo Registro Modal
// ============================================
function NovoRegistroModal({ assistidoNome }: { assistidoNome: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("atendimento");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Novo Registro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Registro</DialogTitle>
          <DialogDescription>
            Registrar atividade para {assistidoNome}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Tipo de Registro</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {Object.entries(tipoRegistroConfig).filter(([key]) => key !== "audiencia").map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setTipo(key)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors",
                    tipo === key 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" 
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                  )}
                >
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-xs">{config.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Título</Label>
            <Input 
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo breve..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do registro..."
              className="mt-1 min-h-[100px]"
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

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function AssistidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState("timeline");
  const [isEditing, setIsEditing] = useState(false);
  
  const assistido = assistidoMock;
  const processos = processosMock;
  const audiencias = audienciasMock;
  const registros = registrosMock;
  
  const proximaAudiencia = getProximaAudiencia(audiencias);
  const statusConfig = statusPrisionalConfig[assistido.statusPrisional] || statusPrisionalConfig.SOLTO;
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = assistido.dataPrisao ? calcularTempoPreso(assistido.dataPrisao) : null;

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
              <AvatarImage src={assistido.photoUrl} />
              <AvatarFallback className={cn(
                "text-2xl font-semibold",
                assistido.statusPrisional !== "SOLTO" 
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
              )}>
                {assistido.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
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
                  <NovoRegistroModal assistidoNome={assistido.nome} />
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
                      <DropdownMenuItem>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Abrir Pasta Drive
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
              
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
                  {assistido.statusPrisional !== "SOLTO" ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
                  {statusConfig.label}
                </Badge>
                {tempoPreso && (
                  <Badge variant="outline" className="text-rose-600 border-rose-300">
                    <Timer className="w-3 h-3 mr-1" />
                    {tempoPreso} preso
                  </Badge>
                )}
                <Badge variant="outline">
                  <Scale className="w-3 h-3 mr-1" />
                  {assistido.atribuicao}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Próxima Audiência Destacada */}
        {proximaAudiencia && (
          <Card className="mb-4 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
                    <Gavel className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Próxima Audiência</p>
                    <p className="text-lg font-bold text-amber-900 dark:text-amber-200">
                      {format(parseISO(proximaAudiencia.data), "dd 'de' MMMM", { locale: ptBR })} às {proximaAudiencia.hora}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">{proximaAudiencia.tipo} - {proximaAudiencia.vara}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-amber-500 text-white">
                    {differenceInDays(parseISO(proximaAudiencia.data), new Date())} dias
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Rápida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-xs">Idade</span>
              </div>
              <p className="font-semibold">{idade} anos</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs">Contato</span>
              </div>
              <p className="font-semibold text-sm">{assistido.telefoneContato}</p>
              <p className="text-xs text-zinc-500">{assistido.nomeContato}</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Scale className="w-3.5 h-3.5" />
                <span className="text-xs">Processos</span>
              </div>
              <p className="font-semibold">{processos.length} ativos</p>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <History className="w-3.5 h-3.5" />
                <span className="text-xs">Registros</span>
              </div>
              <p className="font-semibold">{registros.length} atividades</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-1 mb-4">
          <TabsTrigger value="timeline" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <History className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="dados" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <User className="w-4 h-4 mr-2" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="processos" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Scale className="w-4 h-4 mr-2" />
            Processos
          </TabsTrigger>
          <TabsTrigger value="audiencias" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Gavel className="w-4 h-4 mr-2" />
            Audiências
          </TabsTrigger>
          <TabsTrigger value="documentos" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <FileText className="w-4 h-4 mr-2" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Timeline */}
        <TabsContent value="timeline">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Histórico de Atividades</CardTitle>
                <Select defaultValue="todos">
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="atendimento">Atendimentos</SelectItem>
                    <SelectItem value="diligencia">Diligências</SelectItem>
                    <SelectItem value="peticao">Petições</SelectItem>
                    <SelectItem value="audiencia">Audiências</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Linha do tempo */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
                
                <div className="space-y-4">
                  {registros.map((registro, index) => {
                    const config = tipoRegistroConfig[registro.tipo];
                    return (
                      <div key={registro.id} className="relative pl-10">
                        {/* Ponto */}
                        <div className={cn(
                          "absolute left-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900",
                          config.bgColor
                        )}>
                          <span className={config.color}>{config.icon}</span>
                        </div>
                        
                        {/* Card */}
                        <div className={cn(
                          "p-3 rounded-lg border",
                          registro.importante 
                            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20" 
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                        )}>
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px]", config.color)}>
                                {config.label}
                              </Badge>
                              {registro.importante && (
                                <Badge className="bg-amber-500 text-white text-[10px]">Importante</Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {format(parseISO(registro.data), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                          <h4 className="font-medium text-sm">{registro.titulo}</h4>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{registro.descricao}</p>
                          <p className="text-[10px] text-zinc-400 mt-2">Por {registro.autor}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="dados">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Identificação
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-zinc-500">Nome Completo</Label>
                  <p className="font-medium">{assistido.nome}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Vulgo</Label>
                  <p className="font-medium">{assistido.vulgo || "-"}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">CPF</Label>
                  <p className="font-medium">{assistido.cpf}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">RG</Label>
                  <p className="font-medium">{assistido.rg}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Data de Nascimento</Label>
                  <p className="font-medium">{format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")} ({idade} anos)</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Naturalidade</Label>
                  <p className="font-medium">{assistido.naturalidade}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Nome da Mãe</Label>
                  <p className="font-medium">{assistido.nomeMae}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Nome do Pai</Label>
                  <p className="font-medium">{assistido.nomePai || "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-500">Telefone</Label>
                    <p className="font-medium">{assistido.telefone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-500">E-mail</Label>
                    <p className="font-medium">{assistido.email || "-"}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-zinc-500">Contato de Referência</Label>
                  <p className="font-medium">{assistido.nomeContato}</p>
                  <p className="text-xs text-zinc-500">{assistido.parentescoContato}</p>
                  <p className="font-medium">{assistido.telefoneContato}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-zinc-500">Endereço</Label>
                  <p className="font-medium">{assistido.endereco}</p>
                  <p className="text-xs text-zinc-500">{assistido.bairro} - {assistido.cidade}/{assistido.uf} - CEP {assistido.cep}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Situação Prisional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-500">Status</Label>
                    <Badge className={cn(statusConfig.bgColor, statusConfig.color, "border-0 mt-1")}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-zinc-500">Regime</Label>
                    <p className="font-medium">{assistido.regimePrisional}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-500">Unidade</Label>
                    <p className="font-medium">{assistido.localPrisao}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-500">Data da Prisão</Label>
                    <p className="font-medium">
                      {assistido.dataPrisao ? format(parseISO(assistido.dataPrisao), "dd/MM/yyyy") : "-"}
                      {tempoPreso && <span className="text-zinc-500 ml-1">({tempoPreso})</span>}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-500">Crime Principal</Label>
                  <p className="font-medium">{assistido.crimePrincipal}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-500">Profissão</Label>
                    <p className="font-medium">{assistido.profissao || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-500">Escolaridade</Label>
                    <p className="font-medium">{assistido.escolaridade || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-500">Estado Civil</Label>
                    <p className="font-medium">{assistido.estadoCivil || "-"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-500">Observações</Label>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{assistido.observacoes || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Processos */}
        <TabsContent value="processos">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Processos ({processos.length})</CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="w-3 h-3 mr-2" />
                  Vincular Processo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {processos.map((processo) => (
                <div key={processo.id} className="p-4 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-sm font-medium">{processo.numero}</p>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{processo.tipo} - {processo.vara}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{processo.fase}</Badge>
                        {processo.proximaAudiencia && (
                          <Badge className="bg-amber-100 text-amber-700 border-0">
                            <Gavel className="w-3 h-3 mr-1" />
                            Audiência: {format(parseISO(processo.proximaAudiencia), "dd/MM")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/admin/processos/${processo.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Audiências */}
        <TabsContent value="audiencias">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Audiências</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {audiencias.map((audiencia) => {
                const isPast = parseISO(audiencia.data) < new Date();
                return (
                  <div 
                    key={audiencia.id} 
                    className={cn(
                      "p-4 rounded-lg border",
                      isPast 
                        ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50" 
                        : "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "font-semibold",
                            isPast ? "text-zinc-500" : "text-amber-800 dark:text-amber-300"
                          )}>
                            {format(parseISO(audiencia.data), "dd/MM/yyyy")} às {audiencia.hora}
                          </span>
                          <Badge variant="outline" className={
                            audiencia.status === "agendada" ? "text-amber-600" :
                            audiencia.status === "realizada" ? "text-emerald-600" :
                            "text-zinc-500"
                          }>
                            {audiencia.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{audiencia.tipo}</p>
                        <p className="text-xs text-zinc-500">{audiencia.vara}</p>
                        <p className="text-xs text-zinc-400 mt-1">Processo: {audiencia.processoNumero}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Documentos</CardTitle>
                <div className="flex gap-2">
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-zinc-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm">Documentos são gerenciados via Google Drive</p>
                <p className="text-xs mt-1">Clique em &ldquo;Abrir no Drive&rdquo; para acessar a pasta do assistido</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
