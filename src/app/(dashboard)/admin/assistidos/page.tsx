"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Filter,
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
  Clock,
  Calendar,
  MessageCircle,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Building2,
  Briefcase,
  Timer,
  ArrowUpRight,
  ExternalLink,
  User,
  Shield,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados expandidos
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida", 
    cpf: "123.456.789-00",
    rg: "12.345.678-90",
    dataNascimento: "1990-05-15",
    nomeMae: "Maria Almeida Santos",
    naturalidade: "Salvador/BA",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    dataPrisao: "2024-11-20",
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria (Mãe)",
    parentescoContato: "Mãe",
    endereco: "Rua das Flores, 123 - Centro, Candeias/BA",
    processosAtivos: 2,
    demandasAbertas: 3,
    ultimaMovimentacao: "2026-01-10",
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Resposta à Acusação",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    observacoes: "Réu preso - prioridade máxima. Audiência de instrução agendada para fevereiro.",
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos", 
    cpf: "987.654.321-00",
    rg: "98.765.432-10",
    dataNascimento: "1985-08-22",
    nomeMae: "Ana Santos Costa",
    naturalidade: "Lauro de Freitas/BA",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 97777-4321",
    telefoneContato: null,
    nomeContato: null,
    parentescoContato: null,
    endereco: "Av. Principal, 456 - Centro, Lauro de Freitas/BA",
    processosAtivos: 1,
    demandasAbertas: 1,
    ultimaMovimentacao: "2026-01-08",
    proximoPrazo: "2026-01-20",
    atoProximoPrazo: "Alegações Finais",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    observacoes: null,
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira", 
    cpf: "456.789.123-00",
    rg: "45.678.912-30",
    dataNascimento: "1978-12-03",
    nomeMae: "Francisca Oliveira",
    naturalidade: "Camaçari/BA",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    dataPrisao: "2023-06-15",
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana (Esposa)",
    parentescoContato: "Esposa",
    endereco: "Rua Nova, 789 - Vila, Camaçari/BA",
    processosAtivos: 3,
    demandasAbertas: 5,
    ultimaMovimentacao: "2026-01-12",
    proximoPrazo: "2026-01-14",
    atoProximoPrazo: "Agravo em Execução",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    observacoes: "Progressão de regime em andamento. Lapso previsto para março/2026.",
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa Ferreira", 
    cpf: "321.654.987-00",
    rg: "32.165.498-70",
    dataNascimento: "1995-03-28",
    nomeMae: "Teresa Costa",
    naturalidade: "Salvador/BA",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro (Irmão)",
    parentescoContato: "Irmão",
    endereco: "Rua do Sol, 321 - Pituba, Salvador/BA",
    processosAtivos: 1,
    demandasAbertas: 2,
    ultimaMovimentacao: "2026-01-05",
    proximoPrazo: "2026-01-18",
    atoProximoPrazo: "Pedido de Revogação",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    observacoes: "Monitoramento eletrônico desde dezembro/2025.",
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima", 
    cpf: "654.321.987-00",
    rg: "65.432.198-70",
    dataNascimento: "1982-07-10",
    nomeMae: "Joana Lima",
    naturalidade: "Dias D'Ávila/BA",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 93333-3333",
    telefoneContato: null,
    nomeContato: null,
    parentescoContato: null,
    endereco: "Av. Central, 555 - Centro, Dias D'Ávila/BA",
    processosAtivos: 2,
    demandasAbertas: 1,
    ultimaMovimentacao: "2026-01-02",
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    observacoes: "Prisão domiciliar por motivo de saúde.",
  },
  { 
    id: 6, 
    nome: "Carlos Eduardo Mendes", 
    cpf: "789.123.456-00",
    rg: "78.912.345-60",
    dataNascimento: "1988-11-18",
    nomeMae: "Regina Mendes",
    naturalidade: "Simões Filho/BA",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Simões Filho",
    dataPrisao: "2025-12-01",
    telefone: null,
    telefoneContato: "(71) 92222-4444",
    nomeContato: "João (Pai)",
    parentescoContato: "Pai",
    endereco: "Rua Industrial, 100 - Centro, Simões Filho/BA",
    processosAtivos: 1,
    demandasAbertas: 4,
    ultimaMovimentacao: "2026-01-11",
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Habeas Corpus",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    observacoes: "Prisão preventiva - aguardando decisão do HC.",
  },
  { 
    id: 7, 
    nome: "Fernanda Souza Lima", 
    cpf: "159.753.486-00",
    rg: "15.975.348-60",
    dataNascimento: "1992-04-25",
    nomeMae: "Lucia Souza",
    naturalidade: "Candeias/BA",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 91111-5555",
    telefoneContato: "(71) 98765-4321",
    nomeContato: "Carlos (Marido)",
    parentescoContato: "Marido",
    endereco: "Av. das Palmeiras, 200 - Jardim, Candeias/BA",
    processosAtivos: 1,
    demandasAbertas: 0,
    ultimaMovimentacao: "2025-12-20",
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dra. Juliane",
    area: "FAMILIA",
    photoUrl: null,
    observacoes: "Processo de família - guarda de menores.",
  },
  { 
    id: 8, 
    nome: "Pedro Santos Neto", 
    cpf: "753.159.486-00",
    rg: "75.315.948-60",
    dataNascimento: "1975-09-08",
    nomeMae: "Antonia Santos",
    naturalidade: "Camaçari/BA",
    statusPrisional: "COP",
    unidadePrisional: "COP - Mata Escura",
    dataPrisao: "2024-03-10",
    telefone: null,
    telefoneContato: "(71) 97777-8888",
    nomeContato: "Marcos (Filho)",
    parentescoContato: "Filho",
    endereco: null,
    processosAtivos: 2,
    demandasAbertas: 3,
    ultimaMovimentacao: "2026-01-09",
    proximoPrazo: "2026-01-16",
    atoProximoPrazo: "Contrarrazões",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    observacoes: "COP - aguardando vaga no regime semiaberto.",
  },
];

// Configurações de status prisional
const statusPrisionalConfig: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }>; priority: number }> = {
  CADEIA_PUBLICA: { 
    label: "Cadeia Pública", 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: AlertOctagon,
    priority: 1
  },
  PENITENCIARIA: { 
    label: "Penitenciária", 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: Building2,
    priority: 2
  },
  COP: { 
    label: "COP", 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: Shield,
    priority: 3
  },
  HOSPITAL_CUSTODIA: { 
    label: "Hosp. Custódia", 
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: AlertTriangle,
    priority: 4
  },
  MONITORADO: { 
    label: "Monitorado", 
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: Timer,
    priority: 5
  },
  DOMICILIAR: { 
    label: "Domiciliar", 
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: MapPin,
    priority: 6
  },
  SOLTO: { 
    label: "Solto", 
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
    priority: 7
  },
};

// Configurações de área
const areaConfig: Record<string, { label: string; className: string }> = {
  JURI: { label: "Júri", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  EXECUCAO_PENAL: { label: "Exec. Penal", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  VIOLENCIA_DOMESTICA: { label: "VVD", className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  SUBSTITUICAO: { label: "Substituição", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CURADORIA: { label: "Curadoria", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  FAMILIA: { label: "Família", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  CIVEL: { label: "Cível", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" },
  FAZENDA_PUBLICA: { label: "Fazenda", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

function getStatusBadge(status: string) {
  const config = statusPrisionalConfig[status] || { label: status, className: "bg-zinc-100 text-zinc-700", icon: User };
  return (
    <Badge className={`${config.className} border font-medium`}>
      {config.label}
    </Badge>
  );
}

function getAreaBadge(area: string) {
  const config = areaConfig[area] || { label: area, className: "bg-zinc-100 text-zinc-700" };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (dias < 0) {
    return { text: "Vencido", className: "text-red-600 bg-red-100", urgent: true };
  }
  if (dias === 0) {
    return { text: "HOJE", className: "text-red-600 bg-red-100 font-bold", urgent: true };
  }
  if (dias === 1) {
    return { text: "Amanhã", className: "text-orange-600 bg-orange-100", urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, className: "text-orange-500 bg-orange-50", urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, className: "text-amber-600 bg-amber-50", urgent: false };
  }
  return { text: `${dias}d`, className: "text-muted-foreground bg-muted", urgent: false };
}

function calcularIdade(dataNascimento: string) {
  const nascimento = parseISO(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

function calcularTempoPreso(dataPrisao: string | null) {
  if (!dataPrisao) return null;
  const prisao = parseISO(dataPrisao);
  const hoje = new Date();
  const dias = differenceInDays(hoje, prisao);
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  const diasRestantes = dias % 30;
  
  if (anos > 0) {
    return `${anos}a ${meses}m`;
  }
  if (meses > 0) {
    return `${meses}m ${diasRestantes}d`;
  }
  return `${dias}d`;
}

// Componente Card do Assistido
interface AssistidoCardProps {
  assistido: typeof mockAssistidos[0];
}

function AssistidoCard({ assistido }: AssistidoCardProps) {
  const statusConfig = statusPrisionalConfig[assistido.statusPrisional] || statusPrisionalConfig.SOLTO;
  const StatusIcon = statusConfig.icon;
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao);

  return (
    <Card className={`group relative overflow-hidden transition-all duration-200 hover:shadow-lg ${
      isPreso ? "border-l-4 border-l-red-500" : ""
    }`}>
      {/* Indicador de Prioridade */}
      {prazoInfo?.urgent && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-red-500">
          <AlertTriangle className="absolute -top-[34px] -right-[6px] h-4 w-4 text-white" />
        </div>
      )}

      <CardContent className="p-4">
        {/* Header do Card */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className={`h-14 w-14 ring-2 ring-offset-2 ${
            isPreso ? "ring-red-500" : "ring-emerald-500"
          }`}>
            <AvatarImage src={assistido.photoUrl || undefined} />
            <AvatarFallback className={`text-lg font-bold ${
              isPreso 
                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" 
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            }`}>
              {getInitials(assistido.nome)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/admin/assistidos/${assistido.id}`}>
                  <h3 className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-1">
                    {assistido.nome}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {idade} anos • {assistido.naturalidade}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <Link href={`/admin/assistidos/${assistido.id}`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Perfil Completo
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Dados
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <Link href={`/admin/processos?assistido=${assistido.id}`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Scale className="h-4 w-4 mr-2" />
                      Ver Processos
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/admin/demandas?assistido=${assistido.id}`}>
                    <DropdownMenuItem className="cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Demandas
                    </DropdownMenuItem>
                  </Link>
                  {assistido.telefone && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => window.open(`https://wa.me/55${assistido.telefone?.replace(/\D/g, '')}`, '_blank')}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Status e Área */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {getStatusBadge(assistido.statusPrisional)}
              {getAreaBadge(assistido.area)}
            </div>
          </div>
        </div>

        {/* Unidade Prisional */}
        {assistido.unidadePrisional && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
            <Building2 className="h-4 w-4 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 truncate">
                {assistido.unidadePrisional}
              </p>
              {tempoPreso && (
                <p className="text-[10px] text-red-600 dark:text-red-500">
                  Preso há {tempoPreso}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{assistido.processosAtivos}</p>
            <p className="text-[10px] text-muted-foreground">Processos</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${
            assistido.demandasAbertas > 2 
              ? "bg-amber-50 dark:bg-amber-900/20" 
              : "bg-muted/50"
          }`}>
            <p className={`text-lg font-bold ${
              assistido.demandasAbertas > 2 ? "text-amber-600" : ""
            }`}>{assistido.demandasAbertas}</p>
            <p className="text-[10px] text-muted-foreground">Demandas</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded-lg bg-muted/50 cursor-help">
                  <p className="text-lg font-bold">{assistido.defensor.split(' ')[0].replace('Dr.', '').replace('Dra.', '')}</p>
                  <p className="text-[10px] text-muted-foreground">Defensor</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{assistido.defensor}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Próximo Prazo */}
        {prazoInfo && assistido.atoProximoPrazo && (
          <div className={`flex items-center gap-2 p-2 rounded-lg border ${
            prazoInfo.urgent 
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50" 
              : "bg-muted/30 border-border/50"
          }`}>
            <Timer className={`h-4 w-4 flex-shrink-0 ${prazoInfo.urgent ? "text-red-600" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${prazoInfo.urgent ? "text-red-700 dark:text-red-400" : ""}`}>
                {assistido.atoProximoPrazo}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {format(parseISO(assistido.proximoPrazo!), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${prazoInfo.className}`}>
              {prazoInfo.text}
            </span>
          </div>
        )}

        {/* Contato */}
        {(assistido.telefone || assistido.telefoneContato) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="truncate">
                {assistido.nomeContato 
                  ? `${assistido.nomeContato}` 
                  : assistido.telefone
                }
              </span>
            </div>
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                Ver mais
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente Row para visualização em lista
function AssistidoRow({ assistido }: AssistidoCardProps) {
  const statusConfig = statusPrisionalConfig[assistido.statusPrisional] || statusPrisionalConfig.SOLTO;
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);

  return (
    <TableRow className={isPreso ? "bg-red-50/30 dark:bg-red-950/10" : ""}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className={`h-10 w-10 ${isPreso ? "ring-2 ring-red-500" : ""}`}>
            <AvatarFallback className={`text-sm font-semibold ${
              isPreso 
                ? "bg-red-100 text-red-700" 
                : "bg-primary/10 text-primary"
            }`}>
              {getInitials(assistido.nome)}
            </AvatarFallback>
          </Avatar>
          <div>
            <Link href={`/admin/assistidos/${assistido.id}`} className="hover:text-primary transition-colors">
              <p className="font-medium text-sm">{assistido.nome}</p>
            </Link>
            {assistido.unidadePrisional && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {assistido.unidadePrisional}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{assistido.cpf}</TableCell>
      <TableCell>{getStatusBadge(assistido.statusPrisional)}</TableCell>
      <TableCell>{getAreaBadge(assistido.area)}</TableCell>
      <TableCell>
        {assistido.telefoneContato || assistido.telefone ? (
          <div className="text-xs">
            <p className="font-medium">{assistido.nomeContato || "Próprio"}</p>
            <p className="text-muted-foreground">{assistido.telefoneContato || assistido.telefone}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline">{assistido.processosAtivos}</Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant={assistido.demandasAbertas > 2 ? "default" : "secondary"}>
          {assistido.demandasAbertas}
        </Badge>
      </TableCell>
      <TableCell>
        {prazoInfo && assistido.atoProximoPrazo ? (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prazoInfo.className}`}>
              {prazoInfo.text}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {assistido.atoProximoPrazo}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <DropdownMenuItem className="cursor-pointer">
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
            </Link>
            <Link href={`/admin/assistidos/${assistido.id}/editar`}>
              <DropdownMenuItem className="cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <Link href={`/admin/processos?assistido=${assistido.id}`}>
              <DropdownMenuItem className="cursor-pointer">
                <Scale className="h-4 w-4 mr-2" />
                Ver Processos
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function AssistidosPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nome" | "prioridade" | "prazo">("prioridade");

  const filteredAssistidos = useMemo(() => {
    let result = mockAssistidos.filter((assistido) => {
      const matchesSearch = 
        assistido.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assistido.cpf.includes(searchTerm) ||
        (assistido.nomeMae && assistido.nomeMae.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || assistido.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || assistido.area === areaFilter;
      return matchesSearch && matchesStatus && matchesArea;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === "nome") {
        return a.nome.localeCompare(b.nome);
      }
      if (sortBy === "prioridade") {
        const prioA = statusPrisionalConfig[a.statusPrisional]?.priority || 99;
        const prioB = statusPrisionalConfig[b.statusPrisional]?.priority || 99;
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
  }, [searchTerm, statusFilter, areaFilter, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: mockAssistidos.length,
    presos: mockAssistidos.filter(a => 
      ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)
    ).length,
    monitorados: mockAssistidos.filter(a => 
      ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)
    ).length,
    soltos: mockAssistidos.filter(a => a.statusPrisional === "SOLTO").length,
    comDemandas: mockAssistidos.filter(a => a.demandasAbertas > 0).length,
    comPrazoUrgente: mockAssistidos.filter(a => {
      if (!a.proximoPrazo) return false;
      const dias = differenceInDays(parseISO(a.proximoPrazo), new Date());
      return dias <= 3;
    }).length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assistidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerenciamento de {stats.total} assistidos da Defensoria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="Exportar">
            <Download className="h-4 w-4" />
          </Button>
          <Link href="/admin/assistidos/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Assistido
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="stat-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card fatal">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.presos}</p>
                <p className="text-xs text-muted-foreground">Presos</p>
              </div>
              <AlertOctagon className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card urgente">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.monitorados}</p>
                <p className="text-xs text-muted-foreground">Monitorados</p>
              </div>
              <Timer className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card andamento">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.soltos}</p>
                <p className="text-xs text-muted-foreground">Soltos</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.comDemandas}</p>
                <p className="text-xs text-muted-foreground">Com Demandas</p>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="stat-card fatal">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.comPrazoUrgente}</p>
                <p className="text-xs text-muted-foreground">Prazo Urgente</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou nome da mãe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="CADEIA_PUBLICA">Cadeia Pública</SelectItem>
              <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="HOSPITAL_CUSTODIA">Hosp. Custódia</SelectItem>
              <SelectItem value="MONITORADO">Monitorado</SelectItem>
              <SelectItem value="DOMICILIAR">Domiciliar</SelectItem>
              <SelectItem value="SOLTO">Solto</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[140px]">
              <Briefcase className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Áreas</SelectItem>
              <SelectItem value="JURI">Júri</SelectItem>
              <SelectItem value="EXECUCAO_PENAL">Exec. Penal</SelectItem>
              <SelectItem value="VIOLENCIA_DOMESTICA">VVD</SelectItem>
              <SelectItem value="SUBSTITUICAO">Substituição</SelectItem>
              <SelectItem value="CURADORIA">Curadoria</SelectItem>
              <SelectItem value="FAMILIA">Família</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v: "nome" | "prioridade" | "prazo") => setSortBy(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Por Prioridade</SelectItem>
              <SelectItem value="nome">Por Nome</SelectItem>
              <SelectItem value="prazo">Por Prazo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAssistidos.length} assistido{filteredAssistidos.length !== 1 ? 's' : ''} encontrado{filteredAssistidos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Content */}
      {filteredAssistidos.length === 0 ? (
        <Card className="section-card">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum assistido encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tente ajustar os filtros de busca ou cadastre um novo assistido.
              </p>
              <Link href="/admin/assistidos/novo">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Assistido
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssistidos.map((assistido) => (
            <AssistidoCard key={assistido.id} assistido={assistido} />
          ))}
        </div>
      ) : (
        <Card className="section-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assistido</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Processos</TableHead>
                  <TableHead className="text-center">Demandas</TableHead>
                  <TableHead>Próximo Prazo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssistidos.map((assistido) => (
                  <AssistidoRow key={assistido.id} assistido={assistido} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
