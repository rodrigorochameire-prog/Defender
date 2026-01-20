"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SwissCard, SwissCardContent } from "@/components/shared/swiss-card";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
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
  Unlock,
  AlertCircle,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";

// Cores alinhadas com os workspaces
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  hoverBg: string;
  indicator: string;
}> = {
  all: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-600"
  },
  JURI: { 
    border: "border-l-emerald-600 dark:border-l-emerald-500", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-600"
  },
  VVD: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20",
    indicator: "bg-violet-600"
  },
  EXECUCAO: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-600"
  },
  CRIMINAL: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-600"
  },
  CIVEL: { 
    border: "border-l-purple-600 dark:border-l-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    indicator: "bg-purple-600"
  },
};

// Atribuições disponíveis para o filtro
// Ícones para cada atribuição (Lucide icons)
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <Users className="w-3.5 h-3.5" />,
  JURI: <Gavel className="w-3.5 h-3.5" />,
  VVD: <AlertTriangle className="w-3.5 h-3.5" />,
  EXECUCAO: <Lock className="w-3.5 h-3.5" />,
  CRIMINAL: <Scale className="w-3.5 h-3.5" />,
  CIVEL: <FileText className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todas", shortLabel: "Todas" },
  { value: "JURI", label: "Júri", shortLabel: "Júri" },
  { value: "VVD", label: "VVD", shortLabel: "VVD" },
  { value: "EXECUCAO", label: "Exec. Penal", shortLabel: "EP" },
  { value: "CRIMINAL", label: "Subst. Criminal", shortLabel: "Crim" },
  { value: "CIVEL", label: "Subst. Cível", shortLabel: "Cível" },
];
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dados mockados expandidos com informações processuais detalhadas
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida",
    vulgo: "Diegão",
    cpf: "123.456.789-00",
    rg: "12.345.678-90 SSP/BA",
    dataNascimento: "1990-05-15",
    nomeMae: "Maria Almeida Santos",
    naturalidade: "Salvador/BA",
    endereco: "Rua das Flores, 123, Centro, Camaçari/BA",
    bairro: "Centro",
    cidade: "Camaçari",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    dataPrisao: "2024-11-20",
    crimePrincipal: "Homicídio Qualificado (Art. 121, §2º, CP)",
    artigos: ["121, §2º", "14, II"],
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria Almeida (Mãe)",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Resposta à Acusação",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    // Informações processuais detalhadas
    faseProcessual: "INSTRUCAO",
    numeroProcesso: "8012906-74.2025.8.05.0039",
    dataFato: "2024-11-15",
    resumoFato: "Suposto homicídio ocorrido no bairro Centro, durante discussão em bar. Vítima: João da Silva.",
    teseDaDefesa: "Legítima defesa. Réu agiu para proteger sua vida após ser atacado com faca.",
    ultimaAudiencia: "2026-01-10",
    tipoUltimaAudiencia: "Instrução e Julgamento",
    proximaAudiencia: "2026-02-20",
    tipoProximaAudiencia: "Continuação de Instrução",
    testemunhasArroladas: [
      { nome: "Maria Silva", tipo: "defesa", ouvida: true, data: "2026-01-10" },
      { nome: "Pedro Santos", tipo: "defesa", ouvida: false, data: null },
      { nome: "José Oliveira", tipo: "acusacao", ouvida: true, data: "2026-01-10" },
      { nome: "Ana Costa", tipo: "acusacao", ouvida: false, data: null },
    ],
    interrogatorioRealizado: false,
    observacoesProcesso: "Réu nega autoria. Alega que estava em legítima defesa após ser atacado primeiro.",
    estrategiaDefesaAtual: "Focar na produção de prova testemunhal que comprove a agressão prévia da vítima. Solicitar perícia nas imagens de câmera de segurança do bar. Preparar quesitação para tese de legítima defesa.",
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos",
    vulgo: null,
    cpf: "987.654.321-00",
    rg: "98.765.432-10 SSP/BA",
    dataNascimento: "1985-08-22",
    nomeMae: "Ana Santos Costa",
    naturalidade: "Lauro de Freitas/BA",
    endereco: "Av. Principal, 456, Itinga, Lauro de Freitas/BA",
    bairro: "Itinga",
    cidade: "Lauro de Freitas",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Lesão Corporal (Art. 129, §9º, CP)",
    artigos: ["129, §9º"],
    telefone: "(71) 97777-4321",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 1,
    demandasAbertas: 1,
    proximoPrazo: "2026-01-20",
    atoProximoPrazo: "Alegações Finais",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    faseProcessual: "ALEGACOES_FINAIS",
    numeroProcesso: "0001234-56.2025.8.05.0039",
    dataFato: "2025-06-10",
    resumoFato: "Discussão com companheiro que a agrediu. Assistida reagiu causando lesões no agressor.",
    teseDaDefesa: "Legítima defesa da mulher agredida. Excludente de ilicitude.",
    ultimaAudiencia: "2025-12-15",
    tipoUltimaAudiencia: "Instrução",
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [
      { nome: "Vizinha Clara", tipo: "defesa", ouvida: true, data: "2025-12-15" },
      { nome: "Filho menor", tipo: "informante", ouvida: true, data: "2025-12-15" },
    ],
    interrogatorioRealizado: true,
    observacoesProcesso: "Instrução encerrada. Aguardando prazo para alegações finais.",
    estrategiaDefesaAtual: "Alegações finais por memoriais. Enfatizar histórico de agressões sofridas pela assistida e laudo pericial que comprova lesões antigas. Requerer absolvição por legítima defesa.",
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira",
    vulgo: "Zé do Morro",
    cpf: "456.789.123-00",
    rg: "45.678.912-30 SSP/BA",
    dataNascimento: "1978-12-03",
    nomeMae: "Francisca Oliveira",
    naturalidade: "Camaçari/BA",
    endereco: "Trav. do Comércio, 78, Phoc II, Camaçari/BA",
    bairro: "Phoc II",
    cidade: "Camaçari",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    dataPrisao: "2023-06-15",
    crimePrincipal: "Tráfico de Drogas (Art. 33, Lei 11.343/06)",
    artigos: ["33, caput", "35"],
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana Oliveira (Esposa)",
    processosAtivos: 3,
    demandasAbertas: 5,
    proximoPrazo: "2026-01-14",
    atoProximoPrazo: "Agravo em Execução",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    faseProcessual: "EXECUCAO",
    numeroProcesso: "0005678-90.2024.8.05.0039",
    dataFato: "2023-06-10",
    resumoFato: "Preso em flagrante com 50g de cocaína em residência. Alega ser usuário.",
    teseDaDefesa: "Desclassificação para porte para uso pessoal. Quantidade compatível com consumo.",
    ultimaAudiencia: null,
    tipoUltimaAudiencia: null,
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [],
    interrogatorioRealizado: true,
    observacoesProcesso: "Condenado em 1º grau. Cumpre pena. Aguardando progressão de regime (2/5 cumprido).",
    estrategiaDefesaAtual: "Acompanhar cálculo de pena na VEP. Preparar pedido de progressão para regime semiaberto (data prevista: Março/2026). Verificar remição por trabalho e estudo.",
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa Ferreira",
    vulgo: "Paulinha",
    cpf: "321.654.987-00",
    rg: "32.165.498-70 SSP/BA",
    dataNascimento: "1995-03-28",
    nomeMae: "Teresa Costa",
    naturalidade: "Salvador/BA",
    endereco: "Rua Nova, 200, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Ameaça (Art. 147, CP)",
    artigos: ["147"],
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro Costa (Irmão)",
    processosAtivos: 1,
    demandasAbertas: 2,
    proximoPrazo: "2026-01-18",
    atoProximoPrazo: "Pedido de Revogação",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    faseProcessual: "INSTRUCAO",
    numeroProcesso: "0002345-67.2025.8.05.0039",
    dataFato: "2025-09-20",
    resumoFato: "Acusada de ameaçar ex-companheiro após término conturbado.",
    teseDaDefesa: "Atipicidade. Discussão verbal sem grave ameaça.",
    ultimaAudiencia: "2025-11-20",
    tipoUltimaAudiencia: "Audiência de Custódia",
    proximaAudiencia: "2026-02-10",
    tipoProximaAudiencia: "Instrução",
    testemunhasArroladas: [
      { nome: "Amiga Carla", tipo: "defesa", ouvida: false, data: null },
      { nome: "Ex-companheiro", tipo: "vitima", ouvida: false, data: null },
    ],
    interrogatorioRealizado: false,
    observacoesProcesso: "Monitoramento eletrônico há 3 meses. Pedido de revogação em andamento.",
    estrategiaDefesaAtual: "Insistir no pedido de revogação do monitoramento (bom comportamento). Na instrução, demonstrar atipicidade da conduta - discussão verbal sem ameaça grave.",
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima",
    vulgo: "Betão",
    cpf: "654.321.987-00",
    rg: "65.432.198-70 SSP/BA",
    dataNascimento: "1982-07-10",
    nomeMae: "Joana Lima",
    naturalidade: "Dias D'Ávila/BA",
    endereco: "Av. Central, 500, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Homicídio Simples (Art. 121, CP)",
    artigos: ["121, caput"],
    telefone: "(71) 93333-3333",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 2,
    demandasAbertas: 1,
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    faseProcessual: "SUMARIO_CULPA",
    numeroProcesso: "0003456-78.2025.8.05.0039",
    dataFato: "2025-01-05",
    resumoFato: "Acidente de trânsito com vítima fatal. Réu conduzia veículo embriagado.",
    teseDaDefesa: "Culpa consciente vs. dolo eventual. Negativa de embriaguez ao volante.",
    ultimaAudiencia: "2025-10-15",
    tipoUltimaAudiencia: "Sumário da Culpa",
    proximaAudiencia: "2026-03-10",
    tipoProximaAudiencia: "Plenário do Júri",
    testemunhasArroladas: [
      { nome: "Perito trânsito", tipo: "acusacao", ouvida: true, data: "2025-10-15" },
      { nome: "Passageiro", tipo: "defesa", ouvida: true, data: "2025-10-15" },
    ],
    interrogatorioRealizado: true,
    observacoesProcesso: "Pronúncia mantida. Plenário designado. Prisão domiciliar por saúde.",
    estrategiaDefesaAtual: "Preparar sustentação oral para plenário. Focar em culpa consciente vs. dolo eventual. Estudar perfil dos jurados. Preparar testemunha de defesa (passageiro) para depor novamente em plenário.",
  },
  { 
    id: 6, 
    nome: "Carlos Eduardo Mendes",
    vulgo: "Cadu",
    cpf: "789.123.456-00",
    rg: "78.912.345-60 SSP/BA",
    dataNascimento: "1988-11-18",
    nomeMae: "Regina Mendes",
    naturalidade: "Simões Filho/BA",
    endereco: "Rua do Sol, 89, Centro, Simões Filho/BA",
    bairro: "Centro",
    cidade: "Simões Filho",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Simões Filho",
    dataPrisao: "2025-12-01",
    crimePrincipal: "Roubo Majorado (Art. 157, §2º, CP)",
    artigos: ["157, §2º"],
    telefone: null,
    telefoneContato: "(71) 92222-4444",
    nomeContato: "João Mendes (Pai)",
    processosAtivos: 1,
    demandasAbertas: 4,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Habeas Corpus",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    faseProcessual: "INQUERITO",
    numeroProcesso: "0006789-01.2025.8.05.0039",
    dataFato: "2025-11-28",
    resumoFato: "Acusado de roubo a transeunte com uso de arma branca.",
    teseDaDefesa: "Negativa de autoria. Reconhecimento fotográfico irregular.",
    ultimaAudiencia: "2025-12-02",
    tipoUltimaAudiencia: "Custódia",
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [],
    interrogatorioRealizado: false,
    observacoesProcesso: "Preso em flagrante. Excesso de prazo na conclusão do IP. HC impetrado.",
    estrategiaDefesaAtual: "Prioridade: obter liberdade via HC por excesso de prazo. Subsidiariamente, questionar validade do reconhecimento fotográfico (súmula 52 SDJE). Preparar defesa para eventual denúncia.",
  },
];

// Configurações de status e fases
const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 1 },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-orange-100 dark:bg-orange-900/40", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", priority: 7 },
};

const faseConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  INQUERITO: { label: "Inquérito", color: "text-slate-600", bgColor: "bg-slate-100", icon: FileText },
  INSTRUCAO: { label: "Instrução", color: "text-blue-600", bgColor: "bg-blue-100", icon: Scale },
  SUMARIO_CULPA: { label: "Sumário Culpa", color: "text-violet-600", bgColor: "bg-violet-100", icon: Gavel },
  ALEGACOES_FINAIS: { label: "Alegações Finais", color: "text-amber-600", bgColor: "bg-amber-100", icon: FileText },
  SENTENCA: { label: "Sentença", color: "text-orange-600", bgColor: "bg-orange-100", icon: Gavel },
  RECURSO: { label: "Recurso", color: "text-purple-600", bgColor: "bg-purple-100", icon: Scale },
  EXECUCAO: { label: "Execução", color: "text-rose-600", bgColor: "bg-rose-100", icon: Clock },
  ARQUIVADO: { label: "Arquivado", color: "text-gray-500", bgColor: "bg-gray-100", icon: CheckCircle2 },
};

const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Júri", labelFull: "Tribunal do Júri", color: "text-violet-600", bgColor: "bg-violet-50" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execução Penal", color: "text-blue-600", bgColor: "bg-blue-50" },
  VIOLENCIA_DOMESTICA: { label: "VVD", labelFull: "Violência Doméstica", color: "text-pink-600", bgColor: "bg-pink-50" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituição", color: "text-orange-600", bgColor: "bg-orange-50" },
  FAMILIA: { label: "Fam", labelFull: "Família", color: "text-rose-600", bgColor: "bg-rose-50" },
};

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 1) return { text: "Amanhã", urgent: true, color: "text-amber-600", bgColor: "bg-amber-50" };
  if (dias <= 3) return { text: `${dias}d`, urgent: true, color: "text-amber-500", bgColor: "bg-amber-50/50" };
  if (dias <= 7) return { text: `${dias}d`, urgent: false, color: "text-sky-600", bgColor: "bg-sky-50/50" };
  return { text: `${dias}d`, urgent: false, color: "text-muted-foreground", bgColor: "" };
}

function calcularIdade(dataNascimento: string) {
  return differenceInYears(new Date(), parseISO(dataNascimento));
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
// CARD DO ASSISTIDO - DESIGN SUÍÇO
// Com Foto • Containers Organizados • Cores Funcionais
// ========================================

interface AssistidoCardProps {
  assistido: typeof mockAssistidos[0];
  onPhotoClick: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

function AssistidoCard({ assistido, onPhotoClick, isPinned, onTogglePin }: AssistidoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Lógica Semântica: Determina se réu está preso
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
  
  // Prazo urgente (≤ 3 dias)
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoUrgente = prazoInfo && prazoInfo.urgent;
  
  // Telefone para contato
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  
  // Copiar número do processo
  const handleCopyProcesso = () => {
    navigator.clipboard.writeText(assistido.numeroProcesso);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cor da borda lateral - ÚNICA cor estrutural do card
  const statusBorderColor = isPreso 
    ? "border-l-rose-600 dark:border-l-rose-500" 
    : "border-l-emerald-600 dark:border-l-emerald-500";

  return (
    <Card className={cn(
      // Base: Fundo limpo, sem gradientes
      "group relative flex flex-col justify-between overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-950",
      "border border-zinc-200 dark:border-zinc-800",
      "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md",
      // Borda lateral colorida - única cor estrutural
      "border-l-[3px]", statusBorderColor,
      // Fixado
      isPinned && "ring-1 ring-amber-400/60 dark:ring-amber-500/40"
    )}>
      
      <div className="p-3 sm:p-4 space-y-3">
        
        {/* 1. TOPO: Foto + Identidade + Status */}
        <div className="flex gap-3 items-start">
          {/* Avatar com botão de upload */}
          <div className="relative group/avatar flex-shrink-0">
            <Avatar 
              className={cn(
                "h-12 w-12 sm:h-14 sm:w-14 ring-2 cursor-pointer transition-all hover:scale-105",
                isPreso ? "ring-rose-400 dark:ring-rose-500" : "ring-emerald-400 dark:ring-emerald-500"
              )}
              onClick={onPhotoClick}
            >
              <AvatarImage src={assistido.photoUrl || undefined} />
              <AvatarFallback 
                className={cn(
                  "text-sm sm:text-base font-bold",
                  isPreso 
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                )}
              >
                {getInitials(assistido.nome)}
              </AvatarFallback>
            </Avatar>
            {/* Botão de câmera sobreposto */}
            <button
              onClick={onPhotoClick}
              className="absolute -bottom-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow-md hover:scale-110"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          
          {/* Info Principal */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Nome */}
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base leading-tight hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors line-clamp-1">
                {assistido.nome}
              </h3>
            </Link>
            
            {/* Badges - ORDENAÇÃO: Fase Processual → Área → Status Prisional */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. FASE PROCESSUAL - Primeiro */}
              {assistido.faseProcessual && faseConfig[assistido.faseProcessual] && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "rounded-md px-1.5 py-0 text-[9px] sm:text-[10px] uppercase font-semibold",
                    faseConfig[assistido.faseProcessual].bgColor,
                    faseConfig[assistido.faseProcessual].color,
                    "border-transparent"
                  )}
                >
                  {faseConfig[assistido.faseProcessual].label}
                </Badge>
              )}

              {/* 2. ÁREA - Segundo */}
              {assistido.area && areaConfig[assistido.area] && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "rounded-md px-1.5 py-0 text-[9px] sm:text-[10px] uppercase font-medium",
                    areaConfig[assistido.area].bgColor,
                    areaConfig[assistido.area].color,
                    "border-transparent"
                  )}
                >
                  {areaConfig[assistido.area].label}
                </Badge>
              )}

              {/* 3. STATUS PRISIONAL - Por último */}
              {isPreso ? (
                <Badge 
                  variant="outline" 
                  className="rounded-md px-1.5 py-0 text-[9px] sm:text-[10px] uppercase font-bold border-rose-300 text-rose-700 bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400"
                >
                  <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Preso
                </Badge>
              ) : isMonitorado ? (
                <Badge 
                  variant="outline" 
                  className="rounded-md px-1.5 py-0 text-[9px] sm:text-[10px] uppercase font-medium border-amber-300 text-amber-700 bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"
                >
                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" /> Monitor.
                </Badge>
              ) : null}
            </div>
            
            {/* Local de prisão - mais compacto */}
            {assistido.unidadePrisional && (
              <span className="flex items-center text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 flex-shrink-0" /> 
                {assistido.unidadePrisional}
              </span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button 
              size="icon" 
              variant="ghost" 
              className={cn(
                "h-6 w-6 sm:h-7 sm:w-7 transition-opacity",
                isPinned 
                  ? "text-amber-500 opacity-100" 
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100"
              )}
              onClick={onTogglePin}
            >
              {isPinned ? <BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 sm:h-7 sm:w-7 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer text-sm" onClick={onPhotoClick}>
                  <Camera className="h-4 w-4 mr-2" />Alterar Foto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Link href={`/admin/assistidos/${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer text-sm">
                    <Eye className="h-4 w-4 mr-2" />Perfil Completo
                  </DropdownMenuItem>
                </Link>
                <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer text-sm">
                    <Brain className="h-4 w-4 mr-2" />Inteligência
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                {telefoneDisplay && (
                  <DropdownMenuItem 
                    className="cursor-pointer text-sm" 
                    onClick={() => window.open(`https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. CONTAINER: Dados do Processo */}
        <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
          {/* Tipificação - Fonte Serifada = Documento Jurídico */}
          {assistido.crimePrincipal && (
            <div className="flex items-start gap-2">
              <Gavel className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-legal text-zinc-700 dark:text-zinc-300 line-clamp-2">
                {assistido.crimePrincipal}
              </span>
            </div>
          )}

          {/* Número do Processo - Clicável para copiar */}
          <div 
            className="flex items-center justify-between group/copy cursor-pointer py-1 px-2 rounded bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800"
            onClick={handleCopyProcesso}
          >
            <div className="flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-zinc-400" />
              <span className="text-[10px] sm:text-xs font-data text-zinc-600 dark:text-zinc-400 tracking-tight">
                {assistido.numeroProcesso}
              </span>
            </div>
            <Copy className={cn(
              "w-3 h-3 transition-all",
              copied 
                ? "text-emerald-500" 
                : "text-zinc-300 dark:text-zinc-600 group-hover/copy:text-zinc-500"
            )} />
          </div>
        </div>

      </div>

      {/* 3. RODAPÉ: Prazo / Ação */}
      <div className={cn(
        "px-3 sm:px-4 py-2 sm:py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between",
        "bg-zinc-50/50 dark:bg-zinc-900/50"
      )}>
        
        {/* Lógica de Urgência no Prazo */}
        {prazoInfo ? (
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <Clock className={cn(
              "w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0",
              prazoUrgente ? "text-rose-600 dark:text-rose-500" : "text-zinc-400"
            )} />
            <span className={cn(
              "text-[10px] sm:text-xs font-medium truncate",
              prazoUrgente 
                ? "text-rose-700 dark:text-rose-400" 
                : "text-zinc-600 dark:text-zinc-400"
            )}>
              {assistido.atoProximoPrazo} 
              <span className="opacity-70 ml-1">• {prazoInfo.text}</span>
            </span>
          </div>
        ) : (
          <span className="text-[10px] sm:text-xs text-zinc-400 italic">Sem prazos</span>
        )}

        {/* Botão expandir */}
        <Button 
          size="icon"
          variant="ghost" 
          className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        </Button>
      </div>

      {/* SEÇÃO EXPANDIDA - Containers Organizados */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-3 sm:px-4 py-3 space-y-2.5 sm:space-y-3 bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800">
            
            {/* Resumo do Fato - Container */}
            {assistido.resumoFato && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <p className="swiss-label">Resumo do Fato</p>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{assistido.resumoFato}</p>
              </div>
            )}

            {/* Tese da Defesa - Container Destacado (Verde sutil) */}
            {assistido.teseDaDefesa && (
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gavel className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Tese da Defesa</p>
                </div>
                <p className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-200 leading-relaxed italic">&ldquo;{assistido.teseDaDefesa}&rdquo;</p>
              </div>
            )}

            {/* Estratégia - Container */}
            {assistido.estrategiaDefesaAtual && (
              <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3 w-3 text-zinc-400" />
                  <p className="swiss-label">Estratégia Atual</p>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{assistido.estrategiaDefesaAtual}</p>
              </div>
            )}

            {/* Audiências - Grid de Cards */}
            {(assistido.ultimaAudiencia || assistido.proximaAudiencia) && (
              <div className="grid grid-cols-2 gap-2">
                {assistido.ultimaAudiencia && (
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[8px] sm:text-[9px] uppercase text-zinc-400 font-semibold tracking-wider mb-0.5">Última Audiência</p>
                    <p className="text-xs sm:text-sm font-data font-semibold text-zinc-700 dark:text-zinc-300">
                      {format(parseISO(assistido.ultimaAudiencia), "dd/MM/yy")}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 truncate">{assistido.tipoUltimaAudiencia}</p>
                  </div>
                )}
                {assistido.proximaAudiencia && (
                  <div className="p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                    <p className="text-[8px] sm:text-[9px] uppercase text-blue-600 dark:text-blue-400 font-semibold tracking-wider mb-0.5">Próxima Audiência</p>
                    <p className="text-xs sm:text-sm font-data font-semibold text-blue-700 dark:text-blue-300">
                      {format(parseISO(assistido.proximaAudiencia), "dd/MM/yy")}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 truncate">{assistido.tipoProximaAudiencia}</p>
                  </div>
                )}
              </div>
            )}

            {/* Testemunhas e Interrogatório - Pills */}
            {assistido.testemunhasArroladas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400">
                  <UserCheck className="h-3 w-3" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {assistido.testemunhasArroladas.filter(t => t.ouvida).length}
                  </span>
                  <span>/{assistido.testemunhasArroladas.length} testemunhas</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs",
                  assistido.interrogatorioRealizado 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                )}>
                  <User className="h-3 w-3" />
                  <span>{assistido.interrogatorioRealizado ? "Interrogado" : "Interrog. Pendente"}</span>
                </div>
              </div>
            )}

            {/* Footer com Defensor */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] sm:text-[11px] text-zinc-400">{assistido.defensor}</span>
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 sm:h-7 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-2"
                >
                  Ver Perfil <ChevronRight className="h-3 w-3 ml-0.5" />
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
// ROW DO ASSISTIDO - DESIGN SUÍÇO (Lista)
// ========================================

function AssistidoRow({ assistido, onPhotoClick, isPinned, onTogglePin }: AssistidoCardProps) {
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoUrgente = prazoInfo && prazoInfo.urgent;
  const testemunhasOuvidas = assistido.testemunhasArroladas.filter(t => t.ouvida).length;
  const totalTestemunhas = assistido.testemunhasArroladas.length;

  return (
    <SwissTableRow className={cn(
      "group transition-colors",
      // Borda lateral semântica
      isPreso ? "border-l-[3px] border-l-rose-500" : "border-l-[3px] border-l-emerald-500",
      isPinned && "bg-amber-50/30 dark:bg-amber-950/10"
    )}>
      {/* Nome */}
      <SwissTableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/admin/assistidos/${assistido.id}`} className="hover:text-zinc-600 dark:hover:text-zinc-300">
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">{assistido.nome}</p>
              </Link>
              {isPinned && <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
            </div>
          </div>
        </div>
      </SwissTableCell>

      {/* Status - Badge minimalista */}
      <SwissTableCell>
        {isPreso ? (
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] uppercase font-medium border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400">
            <Lock className="w-3 h-3 mr-1" /> Preso
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] uppercase font-medium border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400">
            <Unlock className="w-3 h-3 mr-1" /> Solto
          </Badge>
        )}
      </SwissTableCell>

      {/* Crime - Fonte serifada */}
      <SwissTableCell className="max-w-[180px]">
        <p className="text-xs font-legal text-zinc-600 dark:text-zinc-400 truncate">
          {assistido.crimePrincipal || "-"}
        </p>
      </SwissTableCell>

      {/* Processo - Fonte mono */}
      <SwissTableCell className="max-w-[200px]">
        <p className="text-xs font-data text-zinc-500 dark:text-zinc-400 truncate">
          {assistido.numeroProcesso}
        </p>
      </SwissTableCell>

      {/* Testemunhas */}
      <SwissTableCell className="text-center">
        {totalTestemunhas > 0 ? (
          <span className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{testemunhasOuvidas}</span>
            /{totalTestemunhas}
          </span>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">-</span>
        )}
      </SwissTableCell>

      {/* Interrogatório */}
      <SwissTableCell className="text-center">
        <span className={cn(
          "text-xs font-medium",
          assistido.interrogatorioRealizado ? "text-emerald-600" : "text-amber-500"
        )}>
          {assistido.interrogatorioRealizado ? "✓" : "○"}
        </span>
      </SwissTableCell>

      {/* Prazo */}
      <SwissTableCell>
        {prazoInfo ? (
          <span className={cn(
            "text-xs font-medium",
            prazoUrgente ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
          )}>
            {prazoInfo.text}
          </span>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">-</span>
        )}
      </SwissTableCell>

      {/* Ações */}
      <SwissTableCell className="text-right">
        <div className="flex items-center justify-end gap-0.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-7 w-7 transition-opacity",
              isPinned ? "text-amber-500 opacity-100" : "text-zinc-400 opacity-0 group-hover:opacity-100"
            )} 
            onClick={onTogglePin}
          >
            {isPinned ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </SwissTableCell>
    </SwissTableRow>
  );
}

export default function AssistidosPage() {
  // Atribuição do contexto global
  const { currentAssignment } = useAssignment();
  
  // Estados
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nome" | "prioridade" | "prazo">("prioridade");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<typeof mockAssistidos[0] | null>(null);

  const handlePhotoClick = (assistido: typeof mockAssistidos[0]) => {
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
    let result = mockAssistidos.filter((a) => {
      const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.cpf.includes(searchTerm) || (a.vulgo?.toLowerCase().includes(searchTerm.toLowerCase())) || (a.crimePrincipal?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      const matchesPinned = !showPinnedOnly || pinnedIds.has(a.id);
      const matchesAtribuicao = atribuicaoFilter === "all" || a.area === atribuicaoFilter;
      return matchesSearch && matchesStatus && matchesArea && matchesPinned && matchesAtribuicao;
    });

    result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
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
  }, [searchTerm, statusFilter, areaFilter, sortBy, pinnedIds, showPinnedOnly, atribuicaoFilter]);

  const stats = useMemo(() => ({
    total: mockAssistidos.length,
    presos: mockAssistidos.filter(a => ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)).length,
    monitorados: mockAssistidos.filter(a => ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)).length,
    soltos: mockAssistidos.filter(a => a.statusPrisional === "SOLTO").length,
    pinned: pinnedIds.size,
  }), [pinnedIds]);

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[atribuicaoFilter] || ATRIBUICAO_COLORS.all;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header - Design Suíço: limpo, estruturado, tipografia clara */}
      <div className="space-y-4">
        {/* Linha superior: Título + Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 sm:p-2.5 rounded-lg flex-shrink-0",
              atribuicaoColors.bg
            )}>
              <Users className={cn("w-5 h-5 sm:w-6 sm:h-6", atribuicaoColors.text)} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Assistidos
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {stats.total} cadastrados • {stats.presos} presos
                {pinnedIds.size > 0 && <span className="text-amber-600"> • {pinnedIds.size} fixados</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/admin/inteligencia">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm text-violet-600 border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/20">
                <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Inteligência</span>
              </Button>
            </Link>
            <Button variant="outline" size="icon" title="Exportar" className="h-8 w-8 sm:h-9 sm:w-9">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Link href="/admin/assistidos/novo">
              <Button className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Novo Assistido</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Seletor de Atribuição - Tabs compactos com cores dos workspaces */}
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 sm:gap-1.5 min-w-max border-b border-zinc-200 dark:border-zinc-800 pb-px">
            {ATRIBUICAO_OPTIONS.map((option) => {
              const isActive = atribuicaoFilter === option.value;
              const optionColors = ATRIBUICAO_COLORS[option.value] || ATRIBUICAO_COLORS.all;
              const count = option.value === "all" 
                ? mockAssistidos.length 
                : mockAssistidos.filter(a => a.area === option.value).length;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setAtribuicaoFilter(option.value)}
                  className={cn(
                    "relative px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 rounded-t-md",
                    isActive 
                      ? cn("text-zinc-900 dark:text-zinc-100", optionColors.bg)
                      : cn("text-zinc-500 dark:text-zinc-400", optionColors.hoverBg)
                  )}
                >
                  <span className={cn(isActive ? optionColors.text : "text-zinc-400")}>{ATRIBUICAO_ICONS[option.value]}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                    isActive 
                      ? cn(optionColors.text, "bg-white/60 dark:bg-black/20")
                      : "text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
                  )}>
                    {count}
                  </span>
                  {isActive && (
                    <span className={cn(
                      "absolute bottom-0 left-0 right-0 h-0.5 rounded-full",
                      optionColors.indicator
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SwissCard className="border-l-2 border-l-slate-400">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-2 border-l-rose-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-rose-600">{stats.presos}</p>
                <p className="text-xs text-muted-foreground">Presos</p>
              </div>
              <AlertOctagon className="h-8 w-8 text-rose-400" />
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-2 border-l-amber-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.monitorados}</p>
                <p className="text-xs text-muted-foreground">Monitorados</p>
              </div>
              <Timer className="h-8 w-8 text-amber-400" />
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard className="border-l-2 border-l-emerald-500">
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-emerald-600">{stats.soltos}</p>
                <p className="text-xs text-muted-foreground">Soltos</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </SwissCardContent>
        </SwissCard>
        <SwissCard 
          className={`cursor-pointer transition-all border-l-2 ${showPinnedOnly ? "border-amber-500" : "border-slate-300 hover:border-amber-400"}`}
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
        >
          <SwissCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.pinned}</p>
                <p className="text-xs text-muted-foreground">Fixados</p>
              </div>
              <BookmarkCheck className="h-8 w-8 text-amber-400" />
            </div>
          </SwissCardContent>
        </SwissCard>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, vulgo, CPF, crime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CADEIA_PUBLICA">Cadeia</SelectItem>
              <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
              <SelectItem value="MONITORADO">Monitorado</SelectItem>
              <SelectItem value="DOMICILIAR">Domiciliar</SelectItem>
              <SelectItem value="SOLTO">Solto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="JURI">Júri</SelectItem>
              <SelectItem value="EXECUCAO_PENAL">EP</SelectItem>
              <SelectItem value="VIOLENCIA_DOMESTICA">VVD</SelectItem>
              <SelectItem value="FAMILIA">Família</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: "nome" | "prioridade" | "prazo") => setSortBy(v)}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="prazo">Prazo</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAssistidos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium mb-1">Nenhum assistido encontrado</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-1 sm:px-0 items-start">
          {filteredAssistidos.map((a) => (
            <AssistidoCard 
              key={a.id}
              assistido={a} 
              onPhotoClick={() => handlePhotoClick(a)}
              isPinned={pinnedIds.has(a.id)}
              onTogglePin={() => togglePin(a.id)}
            />
          ))}
        </div>
      ) : (
        <SwissCard>
          <SwissCardContent className="p-0">
            <SwissTable>
              <SwissTableHeader>
                <SwissTableRow>
                  <SwissTableHead>Assistido</SwissTableHead>
                  <SwissTableHead>Fase</SwissTableHead>
                  <SwissTableHead>Crime</SwissTableHead>
                  <SwissTableHead>Status</SwissTableHead>
                  <SwissTableHead className="text-center">Test.</SwissTableHead>
                  <SwissTableHead className="text-center">Interr.</SwissTableHead>
                  <SwissTableHead>Prazo</SwissTableHead>
                  <SwissTableHead className="text-right">Ações</SwissTableHead>
                </SwissTableRow>
              </SwissTableHeader>
              <SwissTableBody>
                {filteredAssistidos.map((a) => (
                  <AssistidoRow 
                    key={a.id} 
                    assistido={a}
                    onPhotoClick={() => handlePhotoClick(a)}
                    isPinned={pinnedIds.has(a.id)}
                    onTogglePin={() => togglePin(a.id)}
                  />
                ))}
              </SwissTableBody>
            </SwissTable>
          </SwissCardContent>
        </SwissCard>
      )}

      {/* Photo Dialog */}
      {selectedAssistido && (
        <PhotoUploadDialog
          isOpen={photoDialogOpen}
          onClose={() => { setPhotoDialogOpen(false); setSelectedAssistido(null); }}
          assistidoNome={selectedAssistido.nome}
          currentPhoto={selectedAssistido.photoUrl}
          onUpload={(file) => console.log("Upload:", file)}
        />
      )}
    </div>
  );
}
