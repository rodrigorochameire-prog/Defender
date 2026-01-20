"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  FileText, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
  Calendar,
  X,
  Save,
  Trash2,
  Copy,
  ArrowUpRight,
  BarChart3,
  Target,
  List,
  LayoutGrid,
  Lock,
  User,
  Scale,
  Gavel,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Columns,
  Settings2,
  PlusCircle,
  Palette,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAssignment, type Assignment } from "@/contexts/assignment-context";

// Cores alinhadas com os workspaces
const ATRIBUICAO_COLORS: Record<string, { 
  border: string; 
  bg: string; 
  text: string;
  activeBg: string;
  hoverBg: string;
}> = {
  all: { 
    border: "border-l-zinc-400", 
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    activeBg: "bg-zinc-600 hover:bg-zinc-700",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800"
  },
  JURI_CAMACARI: { 
    border: "border-l-emerald-600 dark:border-l-emerald-500", 
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    activeBg: "bg-emerald-600 hover:bg-emerald-700",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
  },
  GRUPO_JURI: { 
    border: "border-l-orange-600 dark:border-l-orange-500", 
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    activeBg: "bg-orange-600 hover:bg-orange-700",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20"
  },
  VVD_CAMACARI: { 
    border: "border-l-violet-600 dark:border-l-violet-500",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
    activeBg: "bg-violet-600 hover:bg-violet-700",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-900/20"
  },
  EXECUCAO_PENAL: { 
    border: "border-l-blue-600 dark:border-l-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    activeBg: "bg-blue-600 hover:bg-blue-700",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20"
  },
  SUBSTITUICAO: { 
    border: "border-l-rose-600 dark:border-l-rose-500",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    activeBg: "bg-rose-600 hover:bg-rose-700",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20"
  },
  SUBSTITUICAO_CIVEL: { 
    border: "border-l-purple-600 dark:border-l-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    activeBg: "bg-purple-600 hover:bg-purple-700",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20"
  },
};

// Mapeamento de área para atribuição
const AREA_TO_ASSIGNMENT: Record<string, string[]> = {
  JURI: ["JURI_CAMACARI", "GRUPO_JURI"],
  VVD: ["VVD_CAMACARI"],
  EXECUCAO: ["EXECUCAO_PENAL"],
  CRIMINAL: ["SUBSTITUICAO"],
  CIVEL: ["SUBSTITUICAO_CIVEL"],
  FAMILIA: ["SUBSTITUICAO_CIVEL"],
  FAZENDA: ["SUBSTITUICAO_CIVEL"],
  CONSUMIDOR: ["SUBSTITUICAO_CIVEL"],
};

// Atribuições disponíveis para o filtro
// Ícones para cada atribuição (Lucide icons)
const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: <LayoutGrid className="w-3.5 h-3.5" />,
  JURI_CAMACARI: <Gavel className="w-3.5 h-3.5" />,
  GRUPO_JURI: <Target className="w-3.5 h-3.5" />,
  VVD_CAMACARI: <AlertTriangle className="w-3.5 h-3.5" />,
  EXECUCAO_PENAL: <Lock className="w-3.5 h-3.5" />,
  SUBSTITUICAO: <Scale className="w-3.5 h-3.5" />,
  SUBSTITUICAO_CIVEL: <FileText className="w-3.5 h-3.5" />,
};

const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todas", shortLabel: "Todas" },
  { value: "JURI_CAMACARI", label: "Júri Camaçari", shortLabel: "Júri" },
  { value: "GRUPO_JURI", label: "Grupo Esp. Júri", shortLabel: "GEJ" },
  { value: "VVD_CAMACARI", label: "VVD", shortLabel: "VVD" },
  { value: "EXECUCAO_PENAL", label: "Exec. Penal", shortLabel: "EP" },
  { value: "SUBSTITUICAO", label: "Subst. Criminal", shortLabel: "Crim" },
  { value: "SUBSTITUICAO_CIVEL", label: "Subst. Cível", shortLabel: "Cível" },
];

// Tipos para opções customizáveis
interface OptionItem {
  value: string;
  label: string;
  color: string;
  textColor?: string;
  description?: string;
  group?: string;
  isCustom?: boolean;
}

// Tipos
interface Demanda {
  id: number;
  assistido: string;
  assistidoId?: number;
  processo: string;
  processoId?: number;
  ato: string;
  tipoAto: string;
  prazo: string;
  dataEntrada: string;
  dataIntimacao?: string;
  dataConclusao?: string;
  status: string;
  prisao: string; // Situação prisional
  prioridade: string;
  providencias: string | null;
  area: string;
  atribuicao?: string; // Atribuição/workspace
  comarca?: string;
  vara?: string;
  reuPreso: boolean;
  defensor?: string;
  defensorId?: number;
  observacoes?: string;
  googleCalendarEventId?: string;
  arquivado?: boolean; // Se a demanda está arquivada
}

// Comarcas disponíveis
const COMARCA_OPTIONS = [
  { value: "CAMACARI", label: "Camaçari" },
  { value: "CANDEIAS", label: "Candeias" },
  { value: "DIAS_DAVILA", label: "Dias D'Ávila" },
  { value: "SIMOES_FILHO", label: "Simões Filho" },
  { value: "LAURO_DE_FREITAS", label: "Lauro de Freitas" },
  { value: "SALVADOR", label: "Salvador" },
];

// Status disponíveis - Estilo Notion com cores de fundo vibrantes
const STATUS_OPTIONS: OptionItem[] = [
  // Grupo Urgente (vermelho intenso)
  { value: "1_URGENTE", label: "Urgente", color: "bg-red-500", textColor: "text-white", group: "Urgente", description: "Prazo crítico/urgente" },
  // Grupo Trabalho (amarelo vibrante) - ordem alfabética
  { value: "2_ANALISAR", label: "Analisar", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Analisar processo" },
  { value: "2_ATENDER", label: "Atender", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Atender assistido" },
  { value: "2_BUSCAR", label: "Buscar", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Buscar informações" },
  { value: "2_ELABORANDO", label: "Elaborando", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Em elaboração" },
  { value: "2_ELABORAR", label: "Elaborar", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Elaborar peça" },
  { value: "2_INVESTIGAR", label: "Investigar", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Investigar caso" },
  { value: "2_RELATORIO", label: "Relatório", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Analisar/fazer relatório" },
  { value: "2_REVISANDO", label: "Revisando", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Em revisão" },
  { value: "2_REVISAR", label: "Revisar", color: "bg-amber-400", textColor: "text-amber-950", group: "Trabalho", description: "Revisar peça" },
  // Grupo Protocolar (laranja vibrante)
  { value: "3_PROTOCOLAR", label: "Protocolar", color: "bg-orange-500", textColor: "text-white", group: "Protocolar", description: "Pronto para protocolar" },
  // Grupo Delegado (azul vibrante) - ordem alfabética
  { value: "4_AMANDA", label: "Amanda", color: "bg-sky-500", textColor: "text-white", group: "Delegado", description: "Com Amanda" },
  { value: "4_EMILLY", label: "Emilly", color: "bg-sky-500", textColor: "text-white", group: "Delegado", description: "Com Emilly" },
  { value: "4_MONITORAR", label: "Monitorar", color: "bg-sky-500", textColor: "text-white", group: "Delegado", description: "Monitorando andamento" },
  { value: "4_ESTAGIO_TARISSA", label: "Tarissa (Estágio)", color: "bg-sky-500", textColor: "text-white", group: "Delegado", description: "Com Tarissa (estágio)" },
  // Grupo Fila (roxo vibrante)
  { value: "5_FILA", label: "Fila", color: "bg-violet-500", textColor: "text-white", group: "Fila", description: "Na fila de trabalho" },
  // Grupo Aguardando (cinza escuro) - ordem alfabética
  { value: "6_DOCUMENTOS", label: "Documentos", color: "bg-slate-500", textColor: "text-white", group: "Aguardando", description: "Aguardando documentos" },
  { value: "6_TESTEMUNHAS", label: "Testemunhas", color: "bg-slate-500", textColor: "text-white", group: "Aguardando", description: "Aguardando testemunhas" },
  // Grupo Concluído (verde vibrante) - ordem alfabética
  { value: "7_CIENCIA", label: "Ciência", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Ciência tomada" },
  { value: "7_CONSTITUIU_ADVOGADO", label: "Constituiu advogado", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Constituiu advogado particular" },
  { value: "7_PROTOCOLADO", label: "Protocolado", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Peça protocolada" },
  { value: "7_RESOLVIDO", label: "Resolvido", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Caso resolvido" },
  { value: "7_SEM_ATUACAO", label: "Sem atuação", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Sem necessidade de atuação" },
  { value: "7_SIGAD", label: "Sigad", color: "bg-emerald-500", textColor: "text-white", group: "Concluído", description: "Registrado no Sigad" },
];

// Situação Prisional / Unidades - Cores suaves e premium
const PRISAO_OPTIONS: OptionItem[] = [
  // Solto / Não informado
  { value: "NAO_INFORMADO", label: "(Não informado)", color: "bg-slate-200", group: "Geral" },
  { value: "SOLTO", label: "Solto", color: "bg-emerald-200", group: "Geral" },
  // Bahia - Região Metropolitana (rose suave)
  { value: "CADEIA_PUBLICA", label: "Cadeia Pública", color: "bg-rose-300", group: "RMS" },
  { value: "COP", label: "COP - Centro de Obs. Penal", color: "bg-rose-300", group: "RMS" },
  { value: "CPMS", label: "CPMS - Simões Filho", color: "bg-rose-300", group: "RMS" },
  { value: "PLB", label: "PLB - Lemos Brito", color: "bg-rose-300", group: "RMS" },
  { value: "PRESIDIO_SSA", label: "Presídio Salvador", color: "bg-rose-300", group: "RMS" },
  // Bahia - Interior (pink suave)
  { value: "CP_ALAGOINHAS", label: "CP Alagoinhas", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_BARREIRAS", label: "CP Barreiras", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_EUNAPOLIS", label: "CP Eunápolis", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_FEIRA", label: "CP Feira de Santana", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_ILHEUS", label: "CP Ilhéus", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_IRECE", label: "CP Irecê", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_ITABUNA", label: "CP Itabuna", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_JEQUIE", label: "CP Jequié", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_JUAZEIRO", label: "CP Juazeiro", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_SERRINHA", label: "CP Serrinha", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_TEIXEIRA", label: "CP Teixeira de Freitas", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_VALENCA", label: "CP Valença", color: "bg-pink-200", group: "Interior BA" },
  { value: "CP_VC", label: "CP Vitória da Conquista", color: "bg-pink-200", group: "Interior BA" },
  // Outros estados (violet suave)
  { value: "CDP_BELEM_SP", label: "CDP Belém-SP", color: "bg-violet-200", group: "Outros Estados" },
  { value: "CPT_IV_PINHEIROS_SP", label: "CPT IV Pinheiros-SP", color: "bg-violet-200", group: "Outros Estados" },
  { value: "MG_EXTREMA", label: "MG - Presídio de Extrema", color: "bg-violet-200", group: "Outros Estados" },
  { value: "PSM_MACEIO", label: "PSM Maceió", color: "bg-violet-200", group: "Outros Estados" },
  { value: "SC_JARAGUA_SUL", label: "SC - Presídio Jaraguá do Sul", color: "bg-violet-200", group: "Outros Estados" },
  { value: "SP_PRESIDENTE_VENCESLAU", label: "SP - Presidente Venceslau II", color: "bg-violet-200", group: "Outros Estados" },
  // Especiais (amber suave)
  { value: "DOMICILIAR", label: "Prisão Domiciliar", color: "bg-amber-200", group: "Especiais" },
  { value: "HOSPITAL_CUSTODIA", label: "Hospital de Custódia", color: "bg-amber-200", group: "Especiais" },
  { value: "MONITORADO", label: "Monitoramento Eletrônico", color: "bg-amber-200", group: "Especiais" },
];

// Prioridades - Cores suaves
const PRIORIDADE_OPTIONS = [
  { value: "REU_PRESO", label: "Réu Preso", color: "bg-rose-400" },
  { value: "URGENTE", label: "Urgente", color: "bg-rose-300" },
  { value: "ALTA", label: "Alta", color: "bg-amber-300" },
  { value: "NORMAL", label: "Normal", color: "bg-slate-400" },
  { value: "BAIXA", label: "Baixa", color: "bg-slate-300" },
];

// Áreas
const AREA_OPTIONS = [
  { value: "JURI", label: "Júri", icon: Gavel, color: "purple" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal", icon: Lock, color: "blue" },
  { value: "VIOLENCIA_DOMESTICA", label: "Violência Doméstica", icon: User, color: "pink" },
  { value: "SUBSTITUICAO", label: "Substituição", icon: RefreshCw, color: "orange" },
  { value: "CURADORIA", label: "Curadoria", icon: User, color: "teal" },
  { value: "FAMILIA", label: "Família", icon: User, color: "green" },
  { value: "CIVEL", label: "Cível", icon: Scale, color: "slate" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Pública", icon: Scale, color: "indigo" },
];

// Tipos de Ato - Baseado na planilha VVD Júri (COMPLETO)
const TIPO_ATO_OPTIONS = [
  // Defesa - Primeira fase
  { value: "resposta_acusacao", label: "Resposta à Acusação", group: "Defesa", color: "bg-blue-100" },
  { value: "diligencias_422", label: "Diligências do 422", group: "Defesa", color: "bg-blue-100" },
  { value: "alegacoes_finais", label: "Alegações finais", group: "Defesa", color: "bg-green-100" },
  // Recursos
  { value: "apelacao", label: "Apelação", group: "Recursos", color: "bg-orange-100" },
  { value: "contrarrazoes_apelacao", label: "Contrarrazões de apelação", group: "Recursos", color: "bg-yellow-100" },
  { value: "razoes_apelacao", label: "Razões de apelação", group: "Recursos", color: "bg-yellow-100" },
  { value: "rese", label: "RESE", group: "Recursos", color: "bg-green-100" },
  { value: "razoes_rese", label: "Razões de RESE", group: "Recursos", color: "bg-green-100" },
  // Ações específicas do Júri
  { value: "incidente_insanidade", label: "Incidente de insanidade", group: "Júri", color: "bg-purple-100" },
  { value: "desaforamento", label: "Desaforamento", group: "Júri", color: "bg-pink-100" },
  // Liberdade
  { value: "revogacao_prisao", label: "Revogação da prisão preventiva", group: "Liberdade", color: "bg-cyan-100" },
  { value: "relaxamento_prisao", label: "Relaxamento da prisão preventiva", group: "Liberdade", color: "bg-cyan-100" },
  { value: "habeas_corpus", label: "Habeas Corpus", group: "Liberdade", color: "bg-teal-100" },
  // Petições
  { value: "restituicao_coisa", label: "Restituição de coisa apreendida", group: "Petições", color: "bg-amber-100" },
  { value: "oficio", label: "Ofício", group: "Petições", color: "bg-amber-100" },
  { value: "peticao_intermediaria", label: "Petição intermediária", group: "Petições", color: "bg-pink-100" },
  { value: "prosseguimento_feito", label: "Prosseguimento do feito", group: "Petições", color: "bg-pink-100" },
  { value: "atualizacao_endereco", label: "Atualização de endereço", group: "Petições", color: "bg-pink-100" },
  // Ciências (verde claro)
  { value: "ciencia_habilitacao_dpe", label: "Ciência habilitação DPE", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_decisao", label: "Ciência de decisão", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_pronuncia", label: "Ciência da pronúncia", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_impronuncia", label: "Ciência da impronúncia", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_absolvicao_sumaria", label: "Ciência da absolvição sumária imprópria", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_desclassificacao", label: "Ciência desclassificação", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_prescricao", label: "Ciência da prescrição", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_laudo_insanidade", label: "Ciência laudo de exame de insanidade", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia_revogacao_prisao", label: "Ciência revogação prisão", group: "Ciências", color: "bg-emerald-50" },
  { value: "ciencia", label: "Ciência", group: "Ciências", color: "bg-emerald-50" },
  // Outros
  { value: "outro", label: "Outro", group: "Outros", color: "bg-slate-100" },
];

// Dados importados da planilha VVD Júri
const mockDemandas: Demanda[] = [
  { 
    id: 1, 
    assistido: "Jailson do Nascimento Versoza",
    processo: "8015678-10.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "",
    dataEntrada: "",
    status: "2_ATENDER",
    prisao: "CADEIA_PUBLICA",
    prioridade: "REU_PRESO",
    providencias: null,
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 2, 
    assistido: "Nailton Gonçalves dos Santos",
    processo: "8009582-13.2024.8.05.0039",
    ato: "Diligências do 422",
    tipoAto: "diligencias_422",
    prazo: "",
    dataEntrada: "",
    status: "2_ATENDER",
    prisao: "NAO_INFORMADO",
    prioridade: "URGENTE",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 3, 
    assistido: "José Raimundo Ramalho dos Santos",
    processo: "0000704-32.2010.8.05.0039",
    ato: "Atualização de endereço",
    tipoAto: "atualizacao_endereco",
    prazo: "",
    dataEntrada: "2025-09-25",
    status: "2_BUSCAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 4, 
    assistido: "Vanderlon dos Santos Vanderlei",
    processo: "0301546-94.2014.8.05.0039",
    ato: "Ofício",
    tipoAto: "oficio",
    prazo: "",
    dataEntrada: "2025-11-14",
    status: "2_ELABORAR",
    prisao: "SOLTO",
    prioridade: "NORMAL",
    providencias: "Solicitar exame médico",
    area: "JURI",
    reuPreso: false,
    observacoes: "Agendado para sexta 11 hrs",
  },
  { 
    id: 5, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Ofício",
    tipoAto: "oficio",
    prazo: "",
    dataEntrada: "2025-11-28",
    status: "2_ELABORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Requerer diligências para verificar atuação policial (câmeras de monitoramento). Juntar notícias sobre o fato indicando armas apreendidas.",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 6, 
    assistido: "José Fabrício Cardoso de França",
    processo: "8013962-79.2024.8.05.0039",
    ato: "Petição intermediária",
    tipoAto: "peticao_intermediaria",
    prazo: "",
    dataEntrada: "2025-09-09",
    status: "2_ELABORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Pensar que diligências podem ser requeridas na defesa de José Fabrício",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 7, 
    assistido: "Clementino Oliveira Santos",
    processo: "0006337-97.2005.8.05.0039",
    ato: "Petição intermediária",
    tipoAto: "peticao_intermediaria",
    prazo: "",
    dataEntrada: "2025-11-07",
    status: "2_ELABORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Informar que o assistido informou ter advogado, e que foi efetivamente citado em 07 de novembro, tendo prazo de 10 dias para apresentar RA mediante seu advogado",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 8, 
    assistido: "Jefferson Monteiro dos Santos",
    processo: "8008977-04.2023.8.05.0039",
    ato: "RESE",
    tipoAto: "rese",
    prazo: "",
    dataEntrada: "",
    status: "2_ELABORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 9, 
    assistido: "André Francisco Fernandes de Jesus",
    processo: "8013727-15.2024.8.05.0039",
    ato: "",
    tipoAto: "outro",
    prazo: "",
    dataEntrada: "",
    status: "2_RELATORIO",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Analisar processo - MP atualizou endereços das testemunhas",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 10, 
    assistido: "Marcos André",
    processo: "",
    ato: "Apelação",
    tipoAto: "apelacao",
    prazo: "",
    dataEntrada: "",
    status: "3_PROTOCOLAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 11, 
    assistido: "Cleber",
    processo: "8017821-74.2022.8.05.0039",
    ato: "Razões de apelação",
    tipoAto: "razoes_apelacao",
    prazo: "2025-12-10",
    dataEntrada: "2025-11-24",
    status: "4_EMILLY",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Atualizar endereços de testemunhas",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 12, 
    assistido: "Marcos Gomes dos Santos",
    processo: "8006117-59.2025.8.05.0039",
    ato: "Habeas Corpus",
    tipoAto: "habeas_corpus",
    prazo: "",
    dataEntrada: "2025-11-27",
    status: "4_EMILLY",
    prisao: "NAO_INFORMADO",
    prioridade: "ALTA",
    providencias: "Coleta antecipada designada - impugnar com HC, pois o fato é recente e não houve tentativa de localização do endereço",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 13, 
    assistido: "João Victor Moura Ramos",
    processo: "8013687-96.2025.8.05.0039",
    ato: "Ciência revogação prisão",
    tipoAto: "ciencia_revogacao",
    prazo: "",
    dataEntrada: "2025-11-09",
    status: "4_MONITORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Hospital Juliano Moreira indicou não ter leito em hospital geral",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 14, 
    assistido: "Elias Oliveira Santos",
    processo: "0011054-45.2011.8.05.0039",
    ato: "Outro",
    tipoAto: "outro",
    prazo: "",
    dataEntrada: "2025-05-10",
    status: "4_MONITORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: "Juntar relatório atualizado do réu. Enviada mensagem a filha Luzinete para que ela informe situação médica atual de Elias. Filha Elane atendida, afirmou que Elias já não está mais internado, mas que teve membro amputado.",
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 15, 
    assistido: "Weverton de Jesus Pereira (corréus)",
    processo: "8009626-32.2024.8.05.0039",
    ato: "Petição intermediária",
    tipoAto: "peticao_intermediaria",
    prazo: "",
    dataEntrada: "2025-09-19",
    status: "4_MONITORAR",
    prisao: "NAO_INFORMADO",
    prioridade: "ALTA",
    providencias: "Buscar unidade para atender o assistido. Elaborar RA. Requerer recambiamento do réu para Bahia. Buscar familiares de Weverton.",
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 16, 
    assistido: "Rafael Costa Araújo",
    processo: "8006656-59.2024.8.05.0039",
    ato: "Revogação da prisão preventiva",
    tipoAto: "revogacao_prisao",
    prazo: "",
    dataEntrada: "2025-07-08",
    status: "5_FILA",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 17, 
    assistido: "Marcus Vinicius Morais Oliveira",
    processo: "0500281-63.2020.8.05.0039",
    ato: "Revogação da prisão preventiva",
    tipoAto: "revogacao_prisao",
    prazo: "",
    dataEntrada: "",
    status: "5_FILA",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 18, 
    assistido: "Fernando Barbosa dos Reis",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "2025-12-17",
    dataEntrada: "2025-11-17",
    status: "7_PROTOCOLADO",
    prisao: "COP",
    prioridade: "REU_PRESO",
    providencias: null,
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 19, 
    assistido: "Joalison Neves Santos",
    processo: "8014445-75.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "",
    dataEntrada: "",
    status: "7_PROTOCOLADO",
    prisao: "CADEIA_PUBLICA",
    prioridade: "REU_PRESO",
    providencias: null,
    area: "JURI",
    reuPreso: true,
    observacoes: "Agendado sexta 09 hrs",
  },
  { 
    id: 20, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "",
    dataEntrada: "2025-11-28",
    status: "7_PROTOCOLADO",
    prisao: "CADEIA_PUBLICA",
    prioridade: "REU_PRESO",
    providencias: "Requerer diligências para verificar atuação policial (câmeras de monitoramento). Juntar notícias sobre o fato indicando armas apreendidas.",
    area: "JURI",
    reuPreso: true,
  },
  { 
    id: 21, 
    assistido: "Alexandre dos Reis Bispo",
    processo: "8008136-38.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "2025-12-13",
    dataEntrada: "2025-11-13",
    status: "7_PROTOCOLADO",
    prisao: "CADEIA_PUBLICA",
    prioridade: "REU_PRESO",
    providencias: null,
    area: "JURI",
    reuPreso: true,
    observacoes: "Agendado sexta 09 hrs",
  },
  { 
    id: 22, 
    assistido: "Adenilson da Silva",
    processo: "8003969-75.2025.8.05.0039",
    ato: "Diligências do 422",
    tipoAto: "diligencias_422",
    prazo: "2025-12-04",
    dataEntrada: "2025-11-14",
    status: "7_PROTOCOLADO",
    prisao: "CADEIA_PUBLICA",
    prioridade: "REU_PRESO",
    providencias: "Tuberculose - requerer atendimento médico para averiguar saúde de Adenilson",
    area: "JURI",
    reuPreso: true,
    observacoes: "Agendado sexta 11 hrs",
  },
  { 
    id: 23, 
    assistido: "Breno Conceição dos Santos",
    processo: "8012452-94.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "",
    dataEntrada: "",
    status: "7_PROTOCOLADO",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 24, 
    assistido: "Reidson da Cruz Barros",
    processo: "8012452-94.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "resposta_acusacao",
    prazo: "",
    dataEntrada: "",
    status: "7_PROTOCOLADO",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
  { 
    id: 25, 
    assistido: "Leandro de Jesus Santos",
    processo: "0506924-08.2018.8.05.0039",
    ato: "Razões de apelação",
    tipoAto: "razoes_apelacao",
    prazo: "",
    dataEntrada: "",
    status: "7_PROTOCOLADO",
    prisao: "NAO_INFORMADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
  },
];

// Funções utilitárias
function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[2];
}

function getPrioridadeConfig(prioridade: string) {
  return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[3];
}

function getAreaConfig(area: string) {
  return AREA_OPTIONS.find(a => a.value === area) || AREA_OPTIONS[0];
}

function getPrazoInfo(prazoStr: string) {
  // Retorna valor padrão se não há prazo
  if (!prazoStr || prazoStr.trim() === "") {
    return { text: "-", className: "text-muted-foreground", icon: Calendar, urgent: false };
  }
  
  const prazo = parseISO(prazoStr);
  
  // Verifica se a data é válida
  if (isNaN(prazo.getTime())) {
    return { text: "-", className: "text-muted-foreground", icon: Calendar, urgent: false };
  }
  
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { text: `${Math.abs(dias)}d atrasado`, className: "text-rose-600 font-medium bg-rose-50/80 dark:bg-rose-950/30", icon: AlertTriangle, urgent: true };
  }
  if (isToday(prazo)) {
    return { text: "HOJE", className: "text-rose-600 font-medium bg-rose-50/80 dark:bg-rose-950/30", icon: Timer, urgent: true };
  }
  if (isTomorrow(prazo)) {
    return { text: "Amanhã", className: "text-amber-600 font-medium bg-amber-50/80 dark:bg-amber-950/30", icon: Clock, urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, className: "text-amber-500 bg-amber-50/60 dark:bg-amber-950/20", icon: Clock, urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, className: "text-sky-600 bg-sky-50/60 dark:bg-sky-950/20", icon: Calendar, urgent: false };
  }
  return { text: format(prazo, "dd/MM", { locale: ptBR }), className: "text-muted-foreground", icon: Calendar, urgent: false };
}

// Componente de Badge de Status
function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge className={cn("font-semibold", config.color, "text-white hover:opacity-90")}>
      {config.label}
    </Badge>
  );
}

// Componente de Badge de Prioridade
function PrioridadeBadge({ prioridade, reuPreso }: { prioridade: string; reuPreso: boolean }) {
  if (reuPreso) {
    return (
      <Badge className="bg-red-700 text-white font-bold animate-pulse">
        <Lock className="h-3 w-3 mr-1" />
        RÉU PRESO
      </Badge>
    );
  }
  const config = getPrioridadeConfig(prioridade);
  return (
    <Badge className={cn("font-semibold", config.color, "text-white")}>
      {config.label}
    </Badge>
  );
}

// Componente de Badge de Área
function AreaBadge({ area }: { area: string }) {
  const config = getAreaConfig(area);
  const colorClasses: Record<string, string> = {
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    slate: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", colorClasses[config.color])}>
      {config.label}
    </Badge>
  );
}

// Modal de Edição/Criação de Demanda
function DemandaModal({ 
  demanda, 
  isOpen, 
  onClose, 
  onSave,
  mode = "edit",
  statusOptions = STATUS_OPTIONS,
  prisaoOptions = PRISAO_OPTIONS,
  tipoAtoOptions = TIPO_ATO_OPTIONS,
  onAddStatusOption,
  onAddPrisaoOption,
  onAddAtoOption,
}: { 
  demanda?: Demanda | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: Partial<Demanda>) => void;
  mode?: "create" | "edit";
  statusOptions?: OptionItem[];
  prisaoOptions?: OptionItem[];
  tipoAtoOptions?: OptionItem[];
  onAddStatusOption?: () => void;
  onAddPrisaoOption?: () => void;
  onAddAtoOption?: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Demanda>>(
    demanda || {
      assistido: "",
      processo: "",
      ato: "",
      tipoAto: "resposta_acusacao",
      prazo: "",
      dataEntrada: format(new Date(), "yyyy-MM-dd"),
      dataIntimacao: "",
      status: "5_FILA",
      prisao: "NAO_INFORMADO",
      prioridade: "NORMAL",
      providencias: "",
      area: "JURI",
      comarca: "CANDEIAS",
      defensor: "",
      reuPreso: false,
      observacoes: "",
    }
  );

  // Atualizar formData quando demanda mudar
  useEffect(() => {
    if (demanda) {
      setFormData(demanda);
    } else {
      setFormData({
        assistido: "",
        processo: "",
        ato: "",
        tipoAto: "resposta_acusacao",
        prazo: "",
        dataEntrada: format(new Date(), "yyyy-MM-dd"),
        dataIntimacao: "",
        status: "5_FILA",
        prisao: "NAO_INFORMADO",
        prioridade: "NORMAL",
        providencias: "",
        area: "JURI",
        comarca: "CANDEIAS",
        defensor: "",
        reuPreso: false,
        observacoes: "",
      });
    }
  }, [demanda]);

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {mode === "create" ? "Nova Demanda" : "Editar Demanda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Preencha os dados da nova demanda" : "Atualize os dados da demanda"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Assistido e Processo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assistido">Assistido *</Label>
              <Input
                id="assistido"
                value={formData.assistido || ""}
                onChange={(e) => setFormData({ ...formData, assistido: e.target.value })}
                placeholder="Nome do assistido"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processo">Nº do Processo *</Label>
              <Input
                id="processo"
                value={formData.processo || ""}
                onChange={(e) => setFormData({ ...formData, processo: e.target.value })}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
              />
            </div>
          </div>

          {/* Ato e Tipo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ato">Ato Processual *</Label>
              <Input
                id="ato"
                value={formData.ato || ""}
                onChange={(e) => setFormData({ ...formData, ato: e.target.value })}
                placeholder="Ex: Resposta à Acusação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoAto">Tipo de Ato</Label>
              <div className="flex gap-2">
                <Select value={formData.tipoAto} onValueChange={(v) => {
                  setFormData({ ...formData, tipoAto: v });
                  const atoLabel = tipoAtoOptions.find(t => t.value === v)?.label || v;
                  if (!formData.ato) {
                    setFormData((prev) => ({ ...prev, ato: atoLabel }));
                  }
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoAtoOptions.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", tipo.color)} />
                          {tipo.label}
                        </div>
                      </SelectItem>
                    ))}
                    {onAddAtoOption && (
                      <>
                        <DropdownMenuSeparator />
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            onAddAtoOption();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm cursor-pointer"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Adicionar tipo...
                        </button>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo Fatal *</Label>
              <Input
                id="prazo"
                type="date"
                value={formData.prazo || ""}
                onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataEntrada">Data de Entrada</Label>
              <Input
                id="dataEntrada"
                type="date"
                value={formData.dataEntrada || ""}
                onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataIntimacao">Data da Intimação</Label>
              <Input
                id="dataIntimacao"
                type="date"
                value={formData.dataIntimacao || ""}
                onChange={(e) => setFormData({ ...formData, dataIntimacao: e.target.value })}
              />
            </div>
          </div>

          {/* Status, Prioridade, Área */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue>
                    {formData.status && (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", statusOptions.find(s => s.value === formData.status)?.color)} />
                        {statusOptions.find(s => s.value === formData.status)?.label}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", status.color)} />
                        {status.label}
                        {status.isCustom && <Badge variant="outline" className="text-[9px] ml-1">Custom</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                  {onAddStatusOption && (
                    <>
                      <DropdownMenuSeparator />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onAddStatusOption();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Adicionar status...
                      </button>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.color)} />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comarca e Defensor */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Comarca</Label>
              <Select value={formData.comarca || ""} onValueChange={(v) => setFormData({ ...formData, comarca: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a comarca" />
                </SelectTrigger>
                <SelectContent>
                  {COMARCA_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defensor">Defensor</Label>
              <Input
                id="defensor"
                value={formData.defensor || ""}
                onChange={(e) => setFormData({ ...formData, defensor: e.target.value })}
                placeholder="Nome do defensor"
              />
            </div>
          </div>

          {/* Situação Prisional */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Situação Prisional</Label>
              <Select value={formData.prisao || "NAO_INFORMADO"} onValueChange={(v) => {
                const isPreso = Boolean(v && v !== "SOLTO" && v !== "" && v !== "none");
                setFormData({ 
                  ...formData, 
                  prisao: v === "none" ? "NAO_INFORMADO" : v,
                  reuPreso: isPreso
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {formData.prisao && (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", prisaoOptions.find(p => p.value === formData.prisao)?.color)} />
                        {prisaoOptions.find(p => p.value === formData.prisao)?.label}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {prisaoOptions.map((p) => (
                    <SelectItem key={p.value || "empty"} value={p.value || "none"}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.color)} />
                        {p.label}
                        {p.isCustom && <Badge variant="outline" className="text-[9px] ml-1">Custom</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                  {onAddPrisaoOption && (
                    <>
                      <DropdownMenuSeparator />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onAddPrisaoOption();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Adicionar local...
                      </button>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30">
              <Checkbox
                id="reuPreso"
                checked={formData.reuPreso}
                onCheckedChange={(checked) => setFormData({ ...formData, reuPreso: checked as boolean })}
              />
              <div className="flex-1">
                <Label htmlFor="reuPreso" className="text-rose-700 dark:text-rose-400 font-medium cursor-pointer">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Réu Preso
                </Label>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                  Prioridade máxima
                </p>
              </div>
            </div>
          </div>

          {/* Providências */}
          <div className="space-y-2">
            <Label htmlFor="providencias">Providências / O que fazer</Label>
            <Textarea
              id="providencias"
              value={formData.providencias || ""}
              onChange={(e) => setFormData({ ...formData, providencias: e.target.value })}
              placeholder="Descreva as providências necessárias..."
              rows={3}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes || ""}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="h-4 w-4" />
            {mode === "create" ? "Criar Demanda" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cores disponíveis para novas opções
const AVAILABLE_COLORS = [
  { value: "bg-red-500", label: "Vermelho", preview: "#ef4444" },
  { value: "bg-red-600", label: "Vermelho Escuro", preview: "#dc2626" },
  { value: "bg-orange-500", label: "Laranja", preview: "#f97316" },
  { value: "bg-amber-500", label: "Âmbar", preview: "#f59e0b" },
  { value: "bg-yellow-400", label: "Amarelo", preview: "#facc15" },
  { value: "bg-lime-500", label: "Lima", preview: "#84cc16" },
  { value: "bg-green-500", label: "Verde", preview: "#22c55e" },
  { value: "bg-emerald-500", label: "Esmeralda", preview: "#10b981" },
  { value: "bg-teal-500", label: "Teal", preview: "#14b8a6" },
  { value: "bg-cyan-400", label: "Ciano", preview: "#22d3ee" },
  { value: "bg-blue-500", label: "Azul", preview: "#3b82f6" },
  { value: "bg-blue-700", label: "Azul Escuro", preview: "#1d4ed8" },
  { value: "bg-indigo-500", label: "Índigo", preview: "#6366f1" },
  { value: "bg-purple-500", label: "Roxo", preview: "#a855f7" },
  { value: "bg-pink-500", label: "Rosa", preview: "#ec4899" },
  { value: "bg-slate-400", label: "Cinza", preview: "#94a3b8" },
];

// Modal para adicionar nova opção
function AddOptionModal({
  isOpen,
  onClose,
  onAdd,
  type,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (option: OptionItem) => void;
  type: "status" | "prisao" | "ato";
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("bg-slate-400");
  const [group, setGroup] = useState("");

  const typeLabels = {
    status: "Status",
    prisao: "Local/Prisão",
    ato: "Tipo de Ato",
  };

  const handleSubmit = () => {
    if (!label.trim()) return;
    
    const value = label.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
    onAdd({
      value: `CUSTOM_${value}`,
      label: label.trim(),
      color,
      textColor: color.includes("yellow") || color.includes("amber") ? "text-black" : "text-white",
      group: group || "Personalizado",
      isCustom: true,
    });
    
    setLabel("");
    setColor("bg-slate-400");
    setGroup("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Adicionar {typeLabels[type]}
          </DialogTitle>
          <DialogDescription>
            Crie uma nova opção personalizada para o menu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="optionLabel">Nome da opção *</Label>
            <Input
              id="optionLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`Ex: ${type === "status" ? "Em revisão" : type === "prisao" ? "CDP Feira" : "Embargos"}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-8 gap-2">
              {AVAILABLE_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    c.value,
                    color === c.value && "ring-2 ring-offset-2 ring-primary"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {type === "status" && (
            <div className="space-y-2">
              <Label htmlFor="optionGroup">Grupo (opcional)</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Urgente</SelectItem>
                  <SelectItem value="2">2 - Trabalho</SelectItem>
                  <SelectItem value="3">3 - Protocolar</SelectItem>
                  <SelectItem value="4">4 - Delegado</SelectItem>
                  <SelectItem value="5">5 - Fila</SelectItem>
                  <SelectItem value="6">6 - Aguardando</SelectItem>
                  <SelectItem value="7">7 - Concluído</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted/50 border">
            <Label className="text-xs text-muted-foreground">Prévia:</Label>
            <div className="mt-2 flex items-center gap-2">
              <Badge className={cn(color, "text-white")}>
                {label || "Nova opção"}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!label.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente de célula editável inline
function EditableCell({
  value,
  onChange,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSubmit = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className={cn("h-7 text-xs", className)}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors min-h-[24px] flex items-center",
        className
      )}
      title="Clique para editar"
    >
      {value || <span className="text-muted-foreground italic">-</span>}
    </div>
  );
}

// Select com opção de adicionar - Estilo Notion Premium
function SelectWithAdd({
  value,
  options,
  onChange,
  onAddOption,
  placeholder,
  className,
  compact = false,
  notionStyle = false, // Novo: estilo com fundo preenchido
}: {
  value: string;
  options: OptionItem[];
  onChange: (value: string) => void;
  onAddOption: () => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  notionStyle?: boolean;
}) {
  // Agrupar opções por grupo
  const groupedOptions = useMemo(() => {
    const groups: Record<string, OptionItem[]> = {};
    options.forEach((opt) => {
      const group = opt.group || "Outros";
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [options]);

  const hasGroups = Object.keys(groupedOptions).length > 1;
  const selectedOption = options.find(o => o.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger 
        className={cn(
          compact && "h-8 text-xs border-0 shadow-none",
          notionStyle && selectedOption && "border-0 shadow-none hover:opacity-90 transition-opacity",
          className
        )}
        style={notionStyle && selectedOption ? {
          backgroundColor: "transparent",
          padding: 0,
        } : undefined}
      >
        <SelectValue placeholder={placeholder}>
          {value && selectedOption && (
            notionStyle ? (
              <div 
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs shadow-sm",
                  selectedOption.color,
                  selectedOption.textColor || "text-white"
                )}
              >
                <span className="truncate">{selectedOption.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", selectedOption.color)} />
                <span className="truncate font-medium">{selectedOption.label}</span>
              </div>
            )
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {hasGroups ? (
          Object.entries(groupedOptions).map(([group, opts]) => (
            <SelectGroup key={group}>
              <SelectLabel className="text-xs text-muted-foreground">{group}</SelectLabel>
              {opts.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", opt.color)} />
                    <span>{opt.label}</span>
                    {opt.isCustom && <Badge variant="outline" className="text-[9px] ml-1">Custom</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))
        ) : (
          options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", opt.color)} />
                <span>{opt.label}</span>
                {opt.isCustom && <Badge variant="outline" className="text-[9px] ml-1">Custom</Badge>}
              </div>
            </SelectItem>
          ))
        )}
        <DropdownMenuSeparator />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddOption();
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-primary hover:bg-muted rounded-sm cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Adicionar opção...
        </button>
      </SelectContent>
    </Select>
  );
}

// Componente Principal
export default function DemandasPage() {
  // Atribuição atual do contexto
  const { currentAssignment } = useAssignment();
  
  // Filtro de atribuição local (pode ser diferente do contexto global)
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");
  const [comarcaFilter, setComarcaFilter] = useState("all");
  const [defensorFilter, setDefensorFilter] = useState("all");
  const [reuPresoFilter, setReuPresoFilter] = useState<boolean | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [activeView, setActiveView] = useState<"grid" | "list" | "kanban" | "timeline">("grid");
  const [largerFontMode, setLargerFontMode] = useState(false);
  const [sortField, setSortField] = useState<"prazo" | "assistido" | "area" | "status" | "comarca">("status");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [demandas, setDemandas] = useState<Demanda[]>(mockDemandas);
  
  // Estados para opções customizáveis
  const [statusOptions, setStatusOptions] = useState<OptionItem[]>(STATUS_OPTIONS);
  const [prisaoOptions, setPrisaoOptions] = useState<OptionItem[]>(PRISAO_OPTIONS);
  const [tipoAtoOptions, setTipoAtoOptions] = useState<OptionItem[]>(TIPO_ATO_OPTIONS);
  
  // Modal para adicionar opção
  const [addOptionModal, setAddOptionModal] = useState<{
    isOpen: boolean;
    type: "status" | "prisao" | "ato";
  }>({ isOpen: false, type: "status" });

  // Handler para adicionar nova opção
  const handleAddOption = useCallback((option: OptionItem) => {
    switch (addOptionModal.type) {
      case "status":
        setStatusOptions((prev) => [...prev, option]);
        break;
      case "prisao":
        setPrisaoOptions((prev) => [...prev, option]);
        break;
      case "ato":
        setTipoAtoOptions((prev) => [...prev, option]);
        break;
    }
  }, [addOptionModal.type]);

  // Handler para atualizar campo inline
  const handleInlineUpdate = useCallback((id: number, field: keyof Demanda, value: string | boolean) => {
    setDemandas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }, []);
  
  // Lista de defensores para filtro
  const defensores = useMemo(() => {
    const unique = Array.from(new Set(demandas.map(d => d.defensor).filter(Boolean)));
    return unique.sort();
  }, [demandas]);

  // Colunas visíveis - baseado na planilha VVD
  const [visibleColumns, setVisibleColumns] = useState({
    status: true,
    prisao: true,
    dataEntrada: true,
    assistido: true,
    processo: true,
    ato: true,
    prazo: true,
    providencias: true,
    tipoAto: false,
    area: false,
    comarca: false,
    prioridade: false,
    defensor: false,
    dataIntimacao: false,
    observacoes: false,
  });

  // Filtrar e ordenar demandas
  const filteredDemandas = useMemo(() => {
    let result = demandas.filter((demanda) => {
      // Filtro de arquivados
      const isArchived = demanda.arquivado === true;
      if (showArchived !== isArchived) return false;
      
      const matchesSearch = 
        demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demanda.processo.includes(searchTerm) ||
        demanda.ato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (demanda.providencias?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (demanda.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || demanda.status === statusFilter;
      const matchesArea = areaFilter === "all" || demanda.area === areaFilter;
      const matchesPrioridade = prioridadeFilter === "all" || demanda.prioridade === prioridadeFilter;
      const matchesComarca = comarcaFilter === "all" || demanda.comarca === comarcaFilter;
      const matchesDefensor = defensorFilter === "all" || demanda.defensor === defensorFilter;
      const matchesReuPreso = reuPresoFilter === null || demanda.reuPreso === reuPresoFilter;
      
      // Filtro de atribuição
      let matchesAtribuicao = true;
      if (atribuicaoFilter !== "all") {
        // Verifica se a demanda tem atribuição direta
        if (demanda.atribuicao) {
          matchesAtribuicao = demanda.atribuicao === atribuicaoFilter;
        } else {
          // Fallback para o mapeamento por área
          const areasForAtribuicao = Object.entries(AREA_TO_ASSIGNMENT)
            .filter(([_, assignments]) => assignments.includes(atribuicaoFilter as Assignment))
            .map(([area]) => area);
          matchesAtribuicao = areasForAtribuicao.includes(demanda.area);
        }
      }
      
      return matchesSearch && matchesStatus && matchesArea && matchesPrioridade && matchesComarca && matchesDefensor && matchesReuPreso && matchesAtribuicao;
    });

    // Função para obter prioridade do status
    const getStatusPriority = (status: string): number => {
      // Ordem: Protocolar > Urgente > Trabalho > Delegado > Fila > Aguardando > Concluído
      if (status.startsWith("3_")) return 1; // Protocolar - PRIMEIRO (pronto para enviar)
      if (status.startsWith("1_")) return 2; // Urgente
      if (status.startsWith("2_")) return 3; // Trabalho (amarelo)
      if (status.startsWith("4_")) return 4; // Delegado (azul)
      if (status.startsWith("5_")) return 5; // Fila (violeta)
      if (status.startsWith("6_")) return 6; // Aguardando
      if (status.startsWith("7_")) return 7; // Concluído
      return 8;
    };

    // Ordenar
    result.sort((a, b) => {
      // Réu preso sempre primeiro dentro do mesmo grupo
      if (a.reuPreso && !b.reuPreso) return -1;
      if (!a.reuPreso && b.reuPreso) return 1;

      // Se ordenação manual está ativa, usar ela
      if (sortField !== "status") {
        let comparison = 0;
        switch (sortField) {
          case "prazo":
            comparison = new Date(a.prazo || "9999-12-31").getTime() - new Date(b.prazo || "9999-12-31").getTime();
            break;
          case "assistido":
            comparison = a.assistido.localeCompare(b.assistido);
            break;
          case "area":
            comparison = a.area.localeCompare(b.area);
            break;
          case "comarca":
            comparison = (a.comarca || "").localeCompare(b.comarca || "");
            break;
        }
        return sortOrder === "asc" ? comparison : -comparison;
      }

      // Ordenação padrão por prioridade de status
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      
      if (priorityA !== priorityB) {
        return sortOrder === "asc" ? priorityA - priorityB : priorityB - priorityA;
      }

      // Dentro do mesmo status, ordenar por prazo (mais próximo primeiro)
      const prazoA = a.prazo ? new Date(a.prazo).getTime() : Infinity;
      const prazoB = b.prazo ? new Date(b.prazo).getTime() : Infinity;
      return prazoA - prazoB;
    });

    return result;
  }, [demandas, searchTerm, statusFilter, areaFilter, prioridadeFilter, comarcaFilter, defensorFilter, reuPresoFilter, atribuicaoFilter, sortField, sortOrder, showArchived]);

  // Estatísticas baseadas nos status da planilha VVD (COMPLETO)
  const stats = useMemo(() => ({
    total: demandas.length,
    urgente: demandas.filter(d => d.status === "1_URGENTE").length,
    trabalho: demandas.filter(d => d.status.startsWith("2_")).length, // Todo grupo 2
    protocolar: demandas.filter(d => d.status === "3_PROTOCOLAR").length,
    delegado: demandas.filter(d => d.status.startsWith("4_")).length, // Amanda, Emilly, Tarissa, Monitorar
    fila: demandas.filter(d => d.status === "5_FILA").length,
    aguardando: demandas.filter(d => d.status.startsWith("6_")).length, // Documentos, Testemunhas
    concluido: demandas.filter(d => d.status.startsWith("7_")).length, // Todos os concluídos
    reuPreso: demandas.filter(d => d.reuPreso || (d.prisao && d.prisao !== "SOLTO" && d.prisao !== "NAO_INFORMADO" && d.prisao !== "")).length,
    vencidos: demandas.filter(d => d.prazo && isPast(parseISO(d.prazo)) && !isToday(parseISO(d.prazo)) && !d.status.startsWith("7_")).length,
    hoje: demandas.filter(d => d.prazo && isToday(parseISO(d.prazo))).length,
  }), [demandas]);

  // Handlers
  const handleOpenCreate = () => {
    setSelectedDemanda(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (demanda: Demanda) => {
    setSelectedDemanda(demanda);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = (data: Partial<Demanda>) => {
    if (modalMode === "create") {
      const newDemanda: Demanda = {
        ...data as Demanda,
        id: Math.max(...demandas.map(d => d.id)) + 1,
      };
      setDemandas([...demandas, newDemanda]);
    } else if (selectedDemanda) {
      setDemandas(demandas.map(d => d.id === selectedDemanda.id ? { ...d, ...data } : d));
    }
  };

  const handleUpdateStatus = (id: number, newStatus: string) => {
    setDemandas(demandas.map(d => d.id === id ? { ...d, status: newStatus } : d));
  };

  const handleDelete = (id: number) => {
    setDemandas(demandas.filter(d => d.id !== id));
  };

  // Arquivar/Desarquivar demanda
  const handleArchive = (id: number) => {
    setDemandas(demandas.map(d => 
      d.id === id ? { ...d, arquivado: !d.arquivado } : d
    ));
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Configuração visual da atribuição selecionada
  const atribuicaoColors = ATRIBUICAO_COLORS[atribuicaoFilter] || ATRIBUICAO_COLORS.all;
  const atribuicaoOption = ATRIBUICAO_OPTIONS.find(opt => opt.value === atribuicaoFilter);

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
              <FileText className={cn("w-5 h-5 sm:w-6 sm:h-6", atribuicaoColors.text)} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Demandas
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Prazos e atos processuais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="icon" title="Exportar" className="h-8 w-8 sm:h-9 sm:w-9">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" size="icon" title="Atualizar" className="h-8 w-8 sm:h-9 sm:w-9">
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button onClick={handleOpenCreate} className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Nova Demanda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* Seletor de Atribuição - Tabs compactos com cores dos workspaces */}
        <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 sm:gap-1.5 min-w-max border-b border-zinc-200 dark:border-zinc-800 pb-px">
            {ATRIBUICAO_OPTIONS.map((option) => {
              const isActive = atribuicaoFilter === option.value;
              const optionColors = ATRIBUICAO_COLORS[option.value] || ATRIBUICAO_COLORS.all;
              const count = option.value === "all" 
                ? demandas.length 
                : demandas.filter(d => {
                    const areasForAtribuicao = Object.entries(AREA_TO_ASSIGNMENT)
                      .filter(([_, assignments]) => assignments.includes(option.value))
                      .map(([area]) => area);
                    return areasForAtribuicao.includes(d.area);
                  }).length;
              
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
                      option.value === "all" && "bg-zinc-600",
                      option.value === "JURI_CAMACARI" && "bg-emerald-600",
                      option.value === "VVD_CAMACARI" && "bg-violet-600",
                      option.value === "EXECUCAO_PENAL" && "bg-blue-600",
                      option.value === "SUBSTITUICAO" && "bg-rose-600",
                      option.value === "SUBSTITUICAO_CIVEL" && "bg-purple-600",
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards - Scroll horizontal no mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex sm:grid gap-2 sm:gap-3 sm:grid-cols-5 lg:grid-cols-10 min-w-max sm:min-w-0">
          {/* Total */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                </div>
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Urgente */}
          <Card className={cn("stat-card flex-shrink-0 w-[100px] sm:w-auto", stats.urgente > 0 && "border-rose-200/60 bg-rose-50/30 dark:bg-rose-950/10")}>
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cn("text-lg sm:text-xl font-semibold", stats.urgente > 0 ? "text-rose-600" : "text-foreground")}>{stats.urgente}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Urgente</p>
                </div>
                <AlertTriangle className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0", stats.urgente > 0 ? "text-rose-400" : "text-muted-foreground")} />
              </div>
            </CardContent>
          </Card>

          {/* Réu Preso */}
          <Card className={cn("stat-card flex-shrink-0 w-[100px] sm:w-auto", stats.reuPreso > 0 && "border-rose-200/60 bg-rose-50/30 dark:bg-rose-950/10")}>
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cn("text-lg sm:text-xl font-semibold", stats.reuPreso > 0 ? "text-rose-600" : "text-foreground")}>{stats.reuPreso}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Preso</p>
                </div>
                <Lock className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0", stats.reuPreso > 0 ? "text-rose-400" : "text-muted-foreground")} />
              </div>
            </CardContent>
          </Card>

          {/* Trabalho */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-amber-600">{stats.trabalho}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Trabalho</p>
                </div>
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Protocolar */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-orange-500">{stats.protocolar}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Protocolar</p>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Delegado - hidden on small mobile */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto hidden sm:block">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-sky-600">{stats.delegado}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Delegado</p>
                </div>
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Fila - hidden on mobile */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto hidden lg:block">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-indigo-600">{stats.fila}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Fila</p>
                </div>
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Aguardando - hidden on mobile */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto hidden lg:block">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-slate-600">{stats.aguardando}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Aguardando</p>
                </div>
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Concluído */}
          <Card className="stat-card flex-shrink-0 w-[100px] sm:w-auto">
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg sm:text-xl font-semibold text-emerald-600">{stats.concluido}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Concluído</p>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Vencidos */}
          <Card className={cn("stat-card flex-shrink-0 w-[100px] sm:w-auto", stats.vencidos > 0 && "border-rose-200/60 bg-rose-50/30 dark:bg-rose-950/10")}>
            <CardContent className="pt-2.5 pb-2 px-2.5 sm:pt-3 sm:px-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cn("text-lg sm:text-xl font-semibold", stats.vencidos > 0 ? "text-rose-600" : "text-foreground")}>{stats.vencidos}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">Vencidos</p>
                </div>
                <AlertTriangle className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0", stats.vencidos > 0 ? "text-rose-400" : "text-muted-foreground")} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs de Visualização */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3">
          {/* Search + View Toggle Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar assistido, processo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>

            {/* View Toggle */}
            <TabsList className="h-9">
              <TabsTrigger value="grid" className="gap-1 h-7 px-2 sm:px-3">
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs">Grade</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1 h-7 px-2 sm:px-3">
                <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1 h-7 px-2 sm:px-3">
                <Columns className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1 h-7 px-2 sm:px-3">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline text-xs">Timeline</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Botões de Controle */}
            <div className="flex items-center gap-1">
              {/* Toggle Letra Maior */}
              <Button
                variant={largerFontMode ? "default" : "outline"}
                size="sm"
                onClick={() => setLargerFontMode(!largerFontMode)}
                className="h-9 px-2 sm:px-3 text-xs"
                title="Modo letra maior"
              >
                <span className={cn("font-bold", largerFontMode ? "text-base" : "text-sm")}>A</span>
              </Button>
              
              {/* Toggle Arquivados */}
              <Button
                variant={showArchived ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="h-9 px-2 sm:px-3 text-xs gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showArchived ? "Ativos" : "Arquivo"}</span>
              </Button>
            </div>
          </div>

          {/* Filtros - Scroll horizontal no mobile */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[110px] sm:w-[140px] h-8 text-xs flex-shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", s.color)} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs flex-shrink-0">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                {AREA_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={comarcaFilter} onValueChange={setComarcaFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs flex-shrink-0 hidden sm:flex">
                <SelectValue placeholder="Comarca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Comarcas</SelectItem>
                {COMARCA_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={defensorFilter} onValueChange={setDefensorFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs flex-shrink-0 hidden md:flex">
                <SelectValue placeholder="Defensor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Defensores</SelectItem>
                {defensores.map((d) => (
                  <SelectItem key={d} value={d!}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={reuPresoFilter === true ? "destructive" : "outline"}
              size="sm"
              onClick={() => setReuPresoFilter(reuPresoFilter === true ? null : true)}
              className="gap-1 h-8 text-xs flex-shrink-0 px-2 sm:px-3"
            >
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Preso</span>
            </Button>

            {/* Ordenação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs flex-shrink-0 px-2 sm:px-3">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">Ordenar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => { setSortField("status"); setSortOrder("asc"); }} className="cursor-pointer">
                  <Target className="h-4 w-4 mr-2" />
                  Por Prioridade (padrão)
                  {sortField === "status" && sortOrder === "asc" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortField("prazo"); setSortOrder("asc"); }} className="cursor-pointer">
                  <Clock className="h-4 w-4 mr-2" />
                  Prazo (mais próximo)
                  {sortField === "prazo" && sortOrder === "asc" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortField("prazo"); setSortOrder("desc"); }} className="cursor-pointer">
                  <Clock className="h-4 w-4 mr-2" />
                  Prazo (mais distante)
                  {sortField === "prazo" && sortOrder === "desc" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortField("status"); setSortOrder("desc"); }} className="cursor-pointer">
                  <Target className="h-4 w-4 mr-2" />
                  Status (concluído primeiro)
                  {sortField === "status" && sortOrder === "desc" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSortField("assistido"); setSortOrder("asc"); }} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Assistido (A-Z)
                  {sortField === "assistido" && sortOrder === "asc" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSortField("area"); setSortOrder("asc"); }} className="cursor-pointer">
                  <Scale className="h-4 w-4 mr-2" />
                  Área
                  {sortField === "area" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(statusFilter !== "all" || areaFilter !== "all" || comarcaFilter !== "all" || defensorFilter !== "all" || reuPresoFilter !== null || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setAreaFilter("all");
                  setComarcaFilter("all");
                  setDefensorFilter("all");
                  setReuPresoFilter(null);
                }}
                className="gap-1 text-muted-foreground h-8 text-xs flex-shrink-0 px-2"
              >
                <X className="h-3 w-3" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Visualização em Grade (Cards) */}
        <TabsContent value="grid" className="mt-0 space-y-3">
          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredDemandas.map((demanda) => {
              const prazoInfo = getPrazoInfo(demanda.prazo);
              const PrazoIcon = prazoInfo.icon;
              const statusConfig = getStatusConfig(demanda.status);
              const areaConfig = getAreaConfig(demanda.area);
              const prisaoConfig = prisaoOptions.find(p => p.value === demanda.prisao);
              const tipoAtoConfig = tipoAtoOptions.find(t => t.value === demanda.tipoAto);
              const comarcaConfig = COMARCA_OPTIONS.find(c => c.value === demanda.comarca);
              
              // Cor da borda baseada no status
              const getBorderColor = (status: string) => {
                if (status.startsWith("1_")) return "border-l-red-500"; // Urgente
                if (status.startsWith("2_")) return "border-l-amber-400"; // Trabalho
                if (status.startsWith("3_")) return "border-l-orange-500"; // Protocolar
                if (status.startsWith("4_")) return "border-l-sky-500"; // Delegado
                if (status.startsWith("5_")) return "border-l-violet-500"; // Fila
                if (status.startsWith("6_")) return "border-l-slate-500"; // Aguardando
                if (status.startsWith("7_")) return "border-l-emerald-500"; // Concluído
                return "border-l-zinc-300";
              };

              const getBgGradient = (status: string) => {
                if (status.startsWith("1_")) return "bg-gradient-to-r from-red-50/40 to-transparent dark:from-red-950/20";
                if (status.startsWith("2_")) return "bg-gradient-to-r from-amber-50/40 to-transparent dark:from-amber-950/20";
                if (status.startsWith("3_")) return "bg-gradient-to-r from-orange-50/40 to-transparent dark:from-orange-950/20";
                if (status.startsWith("4_")) return "bg-gradient-to-r from-sky-50/40 to-transparent dark:from-sky-950/20";
                if (status.startsWith("5_")) return "bg-gradient-to-r from-violet-50/40 to-transparent dark:from-violet-950/20";
                if (status.startsWith("6_")) return "bg-gradient-to-r from-slate-50/40 to-transparent dark:from-slate-950/20";
                if (status.startsWith("7_")) return "bg-gradient-to-r from-emerald-50/40 to-transparent dark:from-emerald-950/20";
                return "";
              };

              return (
                <Collapsible key={demanda.id} className="group">
                  <Card 
                    className={cn(
                      "overflow-hidden transition-all duration-200 hover:shadow-lg border-l-4",
                      getBorderColor(demanda.status),
                      getBgGradient(demanda.status)
                    )}
                  >
                    {/* HEADER - Sempre visível */}
                    <CardContent className={cn("p-3 sm:p-4", largerFontMode && "p-4 sm:p-5")}>
                      {/* Linha 1: Badges de Status e Prioridade */}
                      <div className={cn("flex items-center justify-between gap-2", largerFontMode ? "mb-3" : "mb-2")}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {demanda.reuPreso && (
                            <Badge className={cn(
                              "bg-rose-600 text-white px-1.5 sm:px-2 py-0 animate-pulse",
                              largerFontMode ? "text-xs h-6" : "text-[9px] sm:text-[10px] h-5"
                            )}>
                              <Lock className={cn(largerFontMode ? "h-3 w-3" : "h-2.5 w-2.5", "mr-0.5")} />
                              PRESO
                            </Badge>
                          )}
                          <Badge className={cn(
                            "px-1.5 sm:px-2 py-0", 
                            statusConfig.color, 
                            statusConfig.textColor || "text-white",
                            largerFontMode ? "text-xs h-6" : "text-[9px] sm:text-[10px] h-5"
                          )}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(demanda)} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(demanda.id, "7_PROTOCOLADO")}
                                className="cursor-pointer text-emerald-600"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Protocolado
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleArchive(demanda.id)}
                                className="cursor-pointer"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {showArchived ? "Desarquivar" : "Arquivar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(demanda.id)}
                                className="cursor-pointer text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Linha 2: Assistido */}
                      <h3 className={cn(
                        "font-semibold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-1",
                        largerFontMode ? "text-base sm:text-lg" : "text-sm sm:text-base"
                      )}>
                        {demanda.assistido}
                      </h3>

                      {/* Linha 3: Tipo de Ato + Ato Processual */}
                      <div className={cn("flex items-center gap-2", largerFontMode ? "mb-3" : "mb-2")}>
                        {tipoAtoConfig && (
                          <Badge variant="outline" className={cn(
                            "px-1.5 py-0 bg-zinc-100 dark:bg-zinc-800",
                            largerFontMode ? "text-xs h-6" : "text-[9px] sm:text-[10px] h-5"
                          )}>
                            {tipoAtoConfig.label}
                          </Badge>
                        )}
                        <p className={cn(
                          "text-zinc-700 dark:text-zinc-300 font-medium line-clamp-1 flex-1",
                          largerFontMode ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                        )}>
                          {demanda.ato || "Sem ato definido"}
                        </p>
                      </div>

                      {/* Linha 4: Processo completo */}
                      {demanda.processo && (
                        <div className={cn(
                          "flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400",
                          largerFontMode ? "mb-3 text-sm" : "mb-2 text-[10px] sm:text-xs"
                        )}>
                          <Scale className={cn(largerFontMode ? "h-4 w-4" : "h-3 w-3", "flex-shrink-0")} />
                          <span className="font-mono">{demanda.processo}</span>
                        </div>
                      )}

                      {/* Linha 5: Prazo com data final destacada */}
                      <div className={cn("flex items-center gap-3", largerFontMode ? "mb-3" : "mb-2")}>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md font-medium",
                          largerFontMode ? "text-sm sm:text-base" : "text-xs sm:text-sm",
                          prazoInfo.urgent 
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" 
                            : demanda.prazo 
                              ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {demanda.prazo 
                              ? `Prazo: ${format(parseISO(demanda.prazo), "dd/MM/yyyy", { locale: ptBR })}`
                              : "Sem prazo definido"
                            }
                          </span>
                          {prazoInfo.urgent && demanda.prazo && (
                            <span className="text-[10px] font-bold ml-1">({prazoInfo.text})</span>
                          )}
                        </div>
                      </div>

                      {/* Linha 6: Grid de Metadados */}
                      <div className={cn(
                        "grid grid-cols-2 sm:grid-cols-3 gap-2",
                        largerFontMode ? "text-sm" : "text-[10px] sm:text-xs"
                      )}>

                        {/* Local/Comarca */}
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                          <MapPin className={cn(largerFontMode ? "h-4 w-4" : "h-3 w-3", "flex-shrink-0")} />
                          <span className="truncate">{comarcaConfig?.label || demanda.comarca || "Camaçari"}</span>
                        </div>

                        {/* Data Entrada/Expedição */}
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                          <Calendar className={cn(largerFontMode ? "h-4 w-4" : "h-3 w-3", "flex-shrink-0")} />
                          <span>
                            {demanda.dataEntrada 
                              ? format(parseISO(demanda.dataEntrada), "dd/MM/yy", { locale: ptBR })
                              : "Sem data"
                            }
                          </span>
                        </div>

                        {/* Área */}
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                          <Gavel className={cn(largerFontMode ? "h-4 w-4" : "h-3 w-3", "flex-shrink-0")} />
                          <span>{areaConfig.label}</span>
                        </div>

                        {/* Situação Prisional (se preso) */}
                        {demanda.reuPreso && prisaoConfig && prisaoConfig.value !== "NAO_INFORMADO" && (
                          <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                            <Lock className={cn(largerFontMode ? "h-4 w-4" : "h-3 w-3", "flex-shrink-0")} />
                            <span className="truncate">{prisaoConfig.label}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    {/* CONTEÚDO EXPANDIDO */}
                    <CollapsibleContent>
                      <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 sm:p-4 space-y-4">
                        {/* Providências */}
                        {demanda.providencias && (
                          <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                              Providências
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/50 rounded-lg p-2 sm:p-3 border border-zinc-100 dark:border-zinc-700">
                              {demanda.providencias}
                            </p>
                          </div>
                        )}

                        {/* Observações */}
                        {demanda.observacoes && (
                          <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                              Observações
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800/50 rounded-lg p-2 sm:p-3 border border-zinc-100 dark:border-zinc-700">
                              {demanda.observacoes}
                            </p>
                          </div>
                        )}

                        {/* Grid de Detalhes */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {/* Número completo do processo */}
                          {demanda.processo && (
                            <div className="space-y-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Processo
                              </p>
                              <p className="text-xs sm:text-sm font-mono text-zinc-700 dark:text-zinc-300 break-all">
                                {demanda.processo}
                              </p>
                            </div>
                          )}

                          {/* Tipo de Ato */}
                          <div className="space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                              Tipo de Ato
                            </p>
                            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                              {tipoAtoConfig?.label || demanda.tipoAto || "-"}
                            </p>
                          </div>

                          {/* Data Intimação */}
                          {demanda.dataIntimacao && (
                            <div className="space-y-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Data Intimação
                              </p>
                              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                                {format(parseISO(demanda.dataIntimacao), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          )}

                          {/* Defensor */}
                          {demanda.defensor && (
                            <div className="space-y-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Defensor
                              </p>
                              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                                {demanda.defensor}
                              </p>
                            </div>
                          )}

                          {/* Vara */}
                          {demanda.vara && (
                            <div className="space-y-1">
                              <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Vara
                              </p>
                              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                                {demanda.vara}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => handleOpenEdit(demanda)}
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            onClick={() => handleUpdateStatus(demanda.id, "3_PROTOCOLAR")}
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            Protocolar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleUpdateStatus(demanda.id, "7_PROTOCOLADO")}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Concluir
                          </Button>
                          {demanda.processo && (
                            <Link href={`/admin/processos?q=${demanda.processo}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Ver Processo
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>

          {/* Adicionar nova demanda */}
          {filteredDemandas.length > 0 && (
            <Button
              variant="outline"
              onClick={handleOpenCreate}
              className="w-full justify-center gap-2 h-10 border-dashed border-2"
            >
              <Plus className="h-4 w-4" />
              Nova demanda
            </Button>
          )}

          {/* Tabela escondida para manter a lógica existente */}
          <Card className="section-card overflow-hidden border-0 shadow-lg hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="notion-table">
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700">
                      {/* Ordem: Status, Prisão, Data, Assistido, Autos, Ato, Prazo, Providências */}
                      {visibleColumns.status && (
                        <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === "status" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.prisao && <TableHead className="w-[100px]">Prisão</TableHead>}
                      {visibleColumns.dataEntrada && <TableHead className="w-[80px]">Data</TableHead>}
                      {visibleColumns.assistido && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("assistido")}>
                          <div className="flex items-center gap-1">
                            Assistido
                            {sortField === "assistido" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.processo && <TableHead>Autos</TableHead>}
                      {visibleColumns.ato && <TableHead>Ato</TableHead>}
                      {visibleColumns.prazo && (
                        <TableHead className="w-[90px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("prazo")}>
                          <div className="flex items-center gap-1">
                            Prazo
                            {sortField === "prazo" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.providencias && <TableHead className="min-w-[200px]">Providências</TableHead>}
                      {visibleColumns.tipoAto && <TableHead>Tipo</TableHead>}
                      {visibleColumns.area && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("area")}>
                          <div className="flex items-center gap-1">
                            Área
                            {sortField === "area" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.comarca && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("comarca")}>
                          <div className="flex items-center gap-1">
                            Comarca
                            {sortField === "comarca" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.prioridade && <TableHead>Prioridade</TableHead>}
                      {visibleColumns.defensor && <TableHead>Defensor</TableHead>}
                      {visibleColumns.dataIntimacao && <TableHead>Intimação</TableHead>}
                      {visibleColumns.observacoes && <TableHead className="max-w-[150px]">Obs</TableHead>}
                      <TableHead className="w-[50px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemandas.map((demanda) => {
                      const prazoInfo = getPrazoInfo(demanda.prazo);
                      const PrazoIcon = prazoInfo.icon;
                      return (
                        <TableRow 
                          key={demanda.id} 
                          className={cn(
                            "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-150 group border-b border-slate-100 dark:border-slate-800",
                            demanda.reuPreso && "border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10",
                            prazoInfo.urgent && !demanda.reuPreso && "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
                          )}
                        >
                          {/* Ordem: Status, Prisão, Data, Assistido, Autos, Ato, Prazo, Providências */}
                          {visibleColumns.status && (
                            <TableCell className="p-2">
                              <SelectWithAdd
                                value={demanda.status}
                                options={statusOptions}
                                onChange={(v) => handleInlineUpdate(demanda.id, "status", v)}
                                onAddOption={() => setAddOptionModal({ isOpen: true, type: "status" })}
                                compact
                                notionStyle
                                className="w-[150px]"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.prisao && (
                            <TableCell className="p-1">
                              <SelectWithAdd
                                value={demanda.prisao || "NAO_INFORMADO"}
                                options={prisaoOptions}
                                onChange={(v) => {
                                  handleInlineUpdate(demanda.id, "prisao", v);
                                  // Auto-update reuPreso
                                  const isPreso = v && v !== "SOLTO" && v !== "";
                                  handleInlineUpdate(demanda.id, "reuPreso", isPreso);
                                }}
                                onAddOption={() => setAddOptionModal({ isOpen: true, type: "prisao" })}
                                placeholder="Local"
                                compact
                                className="w-[120px]"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.dataEntrada && (
                            <TableCell className="p-1">
                              <EditableCell
                                value={demanda.dataEntrada || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "dataEntrada", v)}
                                type="date"
                                className="w-[100px] text-xs"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.assistido && (
                            <TableCell className="p-1">
                              <div className="flex items-center gap-1">
                                {(demanda.reuPreso || demanda.prisao === "CADEIA_PUBLICA" || demanda.prisao === "COP") && (
                                  <Lock className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                                )}
                                <EditableCell
                                  value={demanda.assistido}
                                  onChange={(v) => handleInlineUpdate(demanda.id, "assistido", v)}
                                  className="font-medium text-sm flex-1"
                                />
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.processo && (
                            <TableCell className="p-1">
                              <EditableCell
                                value={demanda.processo}
                                onChange={(v) => handleInlineUpdate(demanda.id, "processo", v)}
                                className="font-mono text-xs text-muted-foreground"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.ato && (
                            <TableCell className="p-1">
                              <SelectWithAdd
                                value={demanda.tipoAto}
                                options={tipoAtoOptions}
                                onChange={(v) => {
                                  handleInlineUpdate(demanda.id, "tipoAto", v);
                                  const atoLabel = tipoAtoOptions.find(t => t.value === v)?.label || v;
                                  handleInlineUpdate(demanda.id, "ato", atoLabel);
                                }}
                                onAddOption={() => setAddOptionModal({ isOpen: true, type: "ato" })}
                                compact
                                className="w-[150px]"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.prazo && (
                            <TableCell className="p-1">
                              <div className="flex items-center gap-1">
                                {demanda.prazo && (
                                  <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", prazoInfo.className)}>
                                    <PrazoIcon className="h-3 w-3" />
                                    <span className="font-semibold">{prazoInfo.text}</span>
                                  </div>
                                )}
                                <EditableCell
                                  value={demanda.prazo}
                                  onChange={(v) => handleInlineUpdate(demanda.id, "prazo", v)}
                                  type="date"
                                  className={cn("w-[90px] text-xs", demanda.prazo && "hidden group-hover:block")}
                                />
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.providencias && (
                            <TableCell className="p-1 min-w-[200px] max-w-[350px]">
                              <EditableCell
                                value={demanda.providencias || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "providencias", v)}
                                className="text-xs text-muted-foreground"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.tipoAto && (
                            <TableCell className="p-1">
                              <span className="text-xs text-muted-foreground">
                                {tipoAtoOptions.find(t => t.value === demanda.tipoAto)?.label || demanda.tipoAto}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.area && (
                            <TableCell className="p-1"><AreaBadge area={demanda.area} /></TableCell>
                          )}
                          {visibleColumns.comarca && (
                            <TableCell className="p-1">
                              <EditableCell
                                value={demanda.comarca || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "comarca", v)}
                                className="text-xs"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.prioridade && (
                            <TableCell className="p-1">
                              <PrioridadeBadge prioridade={demanda.prioridade} reuPreso={demanda.reuPreso} />
                            </TableCell>
                          )}
                          {visibleColumns.defensor && (
                            <TableCell className="p-1">
                              <EditableCell
                                value={demanda.defensor || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "defensor", v)}
                                className="text-sm"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.dataIntimacao && (
                            <TableCell className="p-1">
                              <EditableCell
                                value={demanda.dataIntimacao || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "dataIntimacao", v)}
                                type="date"
                                className="text-xs"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.observacoes && (
                            <TableCell className="p-1 max-w-[200px]">
                              <EditableCell
                                value={demanda.observacoes || ""}
                                onChange={(v) => handleInlineUpdate(demanda.id, "observacoes", v)}
                                className="text-xs text-muted-foreground"
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(demanda)} className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(demanda.id, "7_PROTOCOLADO")}
                                  className="cursor-pointer text-emerald-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Marcar Protocolado
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(demanda.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Linha para adicionar nova demanda */}
                    <TableRow className="bg-muted/10 hover:bg-muted/20 border-t-2 border-dashed border-primary/20">
                      <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleOpenCreate}
                          className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar nova demanda...
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

            </CardContent>
          </Card>

          {/* Empty State Unificado */}
          {filteredDemandas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-muted flex items-center justify-center mb-3 sm:mb-4">
                <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <p className="text-sm sm:text-lg font-medium text-muted-foreground mb-1">Nenhuma demanda encontrada</p>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Tente ajustar os filtros ou adicione uma nova demanda</p>
              <Button onClick={handleOpenCreate} className="gap-1.5 sm:gap-2">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Nova Demanda
              </Button>
            </div>
          )}

          {/* Contador de resultados */}
          {filteredDemandas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-muted-foreground px-1 sm:px-0">
              <p>
                <span className="font-semibold text-foreground">{filteredDemandas.length}</span>
                <span className="hidden sm:inline"> de {demandas.length}</span> demandas
              </p>
              <p className="text-[10px] sm:text-sm">
                <span className="font-semibold text-rose-600">{stats.reuPreso}</span> presos •{" "}
                <span className="font-semibold text-orange-600">{stats.urgente + stats.hoje}</span> urgentes
              </p>
            </div>
          )}
        </TabsContent>

        {/* Visualização em Lista (Horizontal) */}
        <TabsContent value="list" className="mt-0 space-y-2">
          {/* Cabeçalho da tabela (desktop) */}
          <div className="hidden lg:grid grid-cols-[1fr_180px_140px_100px_100px_100px_80px] gap-3 px-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
            <span>Assistido / Ato</span>
            <span>Processo</span>
            <span>Prazo</span>
            <span>Status</span>
            <span>Área</span>
            <span>Comarca</span>
            <span className="text-right">Ações</span>
          </div>
          
          {/* Lista de itens */}
          <div className="space-y-1.5">
            {filteredDemandas.map((demanda) => {
              const prazoInfo = getPrazoInfo(demanda.prazo);
              const statusConfig = getStatusConfig(demanda.status);
              const areaConfig = getAreaConfig(demanda.area);
              const comarcaConfig = COMARCA_OPTIONS.find(c => c.value === demanda.comarca);
              
              const getBorderColor = (status: string) => {
                if (status.startsWith("1_")) return "border-l-red-500";
                if (status.startsWith("2_")) return "border-l-amber-400";
                if (status.startsWith("3_")) return "border-l-orange-500";
                if (status.startsWith("4_")) return "border-l-sky-500";
                if (status.startsWith("5_")) return "border-l-violet-500";
                if (status.startsWith("6_")) return "border-l-slate-500";
                if (status.startsWith("7_")) return "border-l-emerald-500";
                return "border-l-zinc-300";
              };

              return (
                <div
                  key={demanda.id}
                  className={cn(
                    "group bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg border-l-4 transition-all hover:shadow-md",
                    getBorderColor(demanda.status),
                    demanda.reuPreso && "ring-1 ring-rose-200 dark:ring-rose-900/50"
                  )}
                >
                  {/* Layout responsivo - Mobile: Stack / Desktop: Grid */}
                  <div className={cn(
                    "flex flex-col lg:grid lg:grid-cols-[1fr_180px_140px_100px_100px_100px_80px] gap-2 lg:gap-3 lg:items-center p-3 lg:py-2.5",
                    largerFontMode && "p-4 lg:py-3"
                  )}>
                    {/* Coluna 1: Assistido + Ato */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {demanda.reuPreso && (
                          <Badge className={cn(
                            "bg-rose-600 text-white px-1.5 py-0 h-5",
                            largerFontMode ? "text-xs" : "text-[9px]"
                          )}>
                            <Lock className={cn("mr-0.5", largerFontMode ? "h-3 w-3" : "h-2.5 w-2.5")} />
                            PRESO
                          </Badge>
                        )}
                        <h4 className={cn(
                          "font-semibold text-zinc-900 dark:text-zinc-100 truncate",
                          largerFontMode ? "text-base" : "text-sm"
                        )}>
                          {demanda.assistido}
                        </h4>
                      </div>
                      <p className={cn(
                        "text-zinc-600 dark:text-zinc-400 truncate",
                        largerFontMode ? "text-sm" : "text-xs"
                      )}>
                        {demanda.ato || "Sem ato definido"}
                      </p>
                    </div>

                    {/* Coluna 2: Processo */}
                    <div className="lg:block">
                      <span className={cn(
                        "font-mono text-zinc-500 dark:text-zinc-400 truncate block",
                        largerFontMode ? "text-sm" : "text-[11px]"
                      )}>
                        {demanda.processo || "-"}
                      </span>
                    </div>

                    {/* Coluna 3: Prazo */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md w-fit lg:w-auto",
                      prazoInfo.urgent 
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400" 
                        : demanda.prazo 
                          ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          : "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
                    )}>
                      <Clock className={cn(largerFontMode ? "h-4 w-4" : "h-3.5 w-3.5")} />
                      <span className={cn("font-medium", largerFontMode ? "text-sm" : "text-xs")}>
                        {demanda.prazo 
                          ? format(parseISO(demanda.prazo), "dd/MM", { locale: ptBR })
                          : "Sem prazo"
                        }
                        {prazoInfo.urgent && demanda.prazo && (
                          <span className={cn("font-bold ml-1", largerFontMode ? "text-xs" : "text-[10px]")}>
                            ({prazoInfo.text})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Coluna 4: Status */}
                    <div>
                      <Badge className={cn(
                        "px-2 py-0 h-5",
                        statusConfig.color, 
                        statusConfig.textColor || "text-white",
                        largerFontMode ? "text-xs" : "text-[10px]"
                      )}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Coluna 5: Área */}
                    <div className="hidden lg:block">
                      <span className={cn(
                        "text-zinc-600 dark:text-zinc-400",
                        largerFontMode ? "text-sm" : "text-xs"
                      )}>
                        {areaConfig.label}
                      </span>
                    </div>

                    {/* Coluna 6: Comarca */}
                    <div className="hidden lg:block">
                      <span className={cn(
                        "text-zinc-500 dark:text-zinc-400",
                        largerFontMode ? "text-sm" : "text-xs"
                      )}>
                        {comarcaConfig?.label || demanda.comarca || "-"}
                      </span>
                    </div>

                    {/* Coluna 7: Ações */}
                    <div className="flex items-center justify-end gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(largerFontMode ? "h-9 w-9" : "h-7 w-7")}
                        onClick={() => handleOpenEdit(demanda)}
                      >
                        <Edit className={cn(largerFontMode ? "h-4 w-4" : "h-3.5 w-3.5")} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className={cn(largerFontMode ? "h-9 w-9" : "h-7 w-7")}>
                            <MoreHorizontal className={cn(largerFontMode ? "h-4 w-4" : "h-3.5 w-3.5")} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(demanda)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleUpdateStatus(demanda.id, "7_PROTOCOLADO")}
                            className="cursor-pointer text-emerald-600"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Protocolado
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleArchive(demanda.id)}
                            className="cursor-pointer"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {showArchived ? "Desarquivar" : "Arquivar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(demanda.id)}
                            className="cursor-pointer text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contador de resultados */}
          {filteredDemandas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-muted-foreground px-1 sm:px-0">
              <p>
                <span className="font-semibold text-foreground">{filteredDemandas.length}</span>
                <span className="hidden sm:inline"> de {demandas.filter(d => !d.arquivado).length}</span> demandas
                {showArchived && <span className="text-amber-600 ml-1">(arquivo)</span>}
              </p>
            </div>
          )}

          {/* Empty State */}
          {filteredDemandas.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium mb-1">
                  {showArchived ? "Nenhuma demanda arquivada" : "Nenhuma demanda encontrada"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {showArchived ? "Itens arquivados aparecerão aqui" : "Ajuste os filtros ou crie uma nova demanda"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Visualização Kanban */}
        <TabsContent value="kanban" className="mt-0">
          {/* Kanban horizontal scroll no mobile */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 pb-2">
            <div className="flex sm:grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-max sm:min-w-0">
            {/* Coluna Atender */}
            <Card className="section-card overflow-hidden w-[280px] sm:w-auto flex-shrink-0">
              <CardHeader className="p-2.5 sm:pb-3 border-b border-amber-100 dark:border-amber-900/30 bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400" />
                    <CardTitle className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400">Atender</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50/50 text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {demandas.filter(d => d.status === "2_ATENDER").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:pt-3 space-y-1.5 sm:space-y-2 min-h-[200px] sm:min-h-[300px] max-h-[400px] overflow-y-auto">
                {demandas.filter(d => d.status === "2_ATENDER").map((demanda) => {
                  const prazoInfo = getPrazoInfo(demanda.prazo);
                  const tipoAtoConfig = tipoAtoOptions.find(t => t.value === demanda.tipoAto);
                  return (
                    <div
                      key={demanda.id}
                      onClick={() => handleOpenEdit(demanda)}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        demanda.reuPreso 
                          ? "border-l-3 border-l-rose-500 bg-card hover:bg-rose-50/30 dark:hover:bg-rose-950/10" 
                          : "bg-card border-border/60 hover:border-amber-300"
                      )}
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {demanda.reuPreso && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 h-4">
                            <Lock className="h-2 w-2 mr-0.5" />
                            PRESO
                          </Badge>
                        )}
                        {tipoAtoConfig && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-zinc-100 dark:bg-zinc-800">
                            {tipoAtoConfig.label}
                          </Badge>
                        )}
                      </div>
                      {/* Assistido */}
                      <p className="font-semibold text-xs sm:text-sm line-clamp-1 text-zinc-900 dark:text-zinc-100">{demanda.assistido}</p>
                      {/* Ato */}
                      <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{demanda.ato || "Sem ato"}</p>
                      {/* Processo */}
                      {demanda.processo && (
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-1 truncate">
                          {demanda.processo}
                        </p>
                      )}
                      {/* Prazo */}
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-[10px] sm:text-xs px-1.5 py-0.5 rounded w-fit",
                        prazoInfo.urgent 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-medium" 
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        <Clock className="h-2.5 w-2.5" />
                        {demanda.prazo ? format(parseISO(demanda.prazo), "dd/MM/yy", { locale: ptBR }) : "Sem prazo"}
                        {prazoInfo.urgent && <span className="font-bold">({prazoInfo.text})</span>}
                      </div>
                      {/* Providências preview */}
                      {demanda.providencias && (
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1.5 line-clamp-2 italic">
                          {demanda.providencias}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Coluna Em Fila */}
            <Card className="section-card overflow-hidden w-[300px] sm:w-auto flex-shrink-0">
              <CardHeader className="p-2.5 sm:pb-3 border-b border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-r from-indigo-50/80 to-transparent dark:from-indigo-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-400" />
                    <CardTitle className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-400">Em Fila</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50/50 text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {demandas.filter(d => d.status === "5_FILA" || d.status === "2_ELABORANDO").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:pt-3 space-y-1.5 sm:space-y-2 min-h-[200px] sm:min-h-[300px] max-h-[400px] overflow-y-auto">
                {demandas.filter(d => d.status === "5_FILA" || d.status === "2_ELABORANDO").map((demanda) => {
                  const prazoInfo = getPrazoInfo(demanda.prazo);
                  const tipoAtoConfig = tipoAtoOptions.find(t => t.value === demanda.tipoAto);
                  return (
                    <div
                      key={demanda.id}
                      onClick={() => handleOpenEdit(demanda)}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        demanda.reuPreso 
                          ? "border-l-3 border-l-rose-500 bg-card hover:bg-rose-50/30 dark:hover:bg-rose-950/10" 
                          : "bg-card border-border/60 hover:border-indigo-300"
                      )}
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {demanda.reuPreso && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 h-4">
                            <Lock className="h-2 w-2 mr-0.5" />
                            PRESO
                          </Badge>
                        )}
                        {tipoAtoConfig && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-zinc-100 dark:bg-zinc-800">
                            {tipoAtoConfig.label}
                          </Badge>
                        )}
                      </div>
                      {/* Assistido */}
                      <p className="font-semibold text-xs sm:text-sm line-clamp-1 text-zinc-900 dark:text-zinc-100">{demanda.assistido}</p>
                      {/* Ato */}
                      <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{demanda.ato || "Sem ato"}</p>
                      {/* Processo */}
                      {demanda.processo && (
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-1 truncate">
                          {demanda.processo}
                        </p>
                      )}
                      {/* Prazo */}
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-[10px] sm:text-xs px-1.5 py-0.5 rounded w-fit",
                        prazoInfo.urgent 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-medium" 
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        <Clock className="h-2.5 w-2.5" />
                        {demanda.prazo ? format(parseISO(demanda.prazo), "dd/MM/yy", { locale: ptBR }) : "Sem prazo"}
                        {prazoInfo.urgent && <span className="font-bold">({prazoInfo.text})</span>}
                      </div>
                      {/* Providências preview */}
                      {demanda.providencias && (
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1.5 line-clamp-2 italic">
                          {demanda.providencias}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Coluna Monitorar */}
            <Card className="section-card overflow-hidden w-[300px] sm:w-auto flex-shrink-0">
              <CardHeader className="p-2.5 sm:pb-3 border-b border-sky-100 dark:border-sky-900/30 bg-gradient-to-r from-sky-50/80 to-transparent dark:from-sky-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-sky-400" />
                    <CardTitle className="text-xs sm:text-sm font-medium text-sky-700 dark:text-sky-400">Monitorar</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-sky-600 border-sky-200 bg-sky-50/50 text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {demandas.filter(d => d.status === "4_MONITORAR").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:pt-3 space-y-1.5 sm:space-y-2 min-h-[200px] sm:min-h-[300px] max-h-[400px] overflow-y-auto">
                {demandas.filter(d => d.status === "4_MONITORAR").map((demanda) => {
                  const prazoInfo = getPrazoInfo(demanda.prazo);
                  const tipoAtoConfig = tipoAtoOptions.find(t => t.value === demanda.tipoAto);
                  return (
                    <div
                      key={demanda.id}
                      onClick={() => handleOpenEdit(demanda)}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        demanda.reuPreso 
                          ? "border-l-3 border-l-rose-500 bg-card hover:bg-rose-50/30 dark:hover:bg-rose-950/10" 
                          : "bg-card border-border/60 hover:border-sky-300"
                      )}
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {demanda.reuPreso && (
                          <Badge className="bg-rose-600 text-white text-[8px] px-1 py-0 h-4">
                            <Lock className="h-2 w-2 mr-0.5" />
                            PRESO
                          </Badge>
                        )}
                        {tipoAtoConfig && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-zinc-100 dark:bg-zinc-800">
                            {tipoAtoConfig.label}
                          </Badge>
                        )}
                      </div>
                      {/* Assistido */}
                      <p className="font-semibold text-xs sm:text-sm line-clamp-1 text-zinc-900 dark:text-zinc-100">{demanda.assistido}</p>
                      {/* Ato */}
                      <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{demanda.ato || "Sem ato"}</p>
                      {/* Processo */}
                      {demanda.processo && (
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-1 truncate">
                          {demanda.processo}
                        </p>
                      )}
                      {/* Prazo */}
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-[10px] sm:text-xs px-1.5 py-0.5 rounded w-fit",
                        prazoInfo.urgent 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-medium" 
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        <Clock className="h-2.5 w-2.5" />
                        {demanda.prazo ? format(parseISO(demanda.prazo), "dd/MM/yy", { locale: ptBR }) : "Sem prazo"}
                        {prazoInfo.urgent && <span className="font-bold">({prazoInfo.text})</span>}
                      </div>
                      {/* Providências preview */}
                      {demanda.providencias && (
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-1.5 line-clamp-2 italic">
                          {demanda.providencias}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Coluna Protocolado */}
            <Card className="section-card overflow-hidden w-[300px] sm:w-auto flex-shrink-0">
              <CardHeader className="p-2.5 sm:pb-3 border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400" />
                    <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">Concluído</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {demandas.filter(d => d.status.startsWith("7_")).length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:pt-3 space-y-1.5 sm:space-y-2 min-h-[200px] sm:min-h-[300px] max-h-[400px] overflow-y-auto">
                {demandas.filter(d => d.status.startsWith("7_")).map((demanda) => {
                  const tipoAtoConfig = tipoAtoOptions.find(t => t.value === demanda.tipoAto);
                  const statusConfig = getStatusConfig(demanda.status);
                  return (
                    <div
                      key={demanda.id}
                      onClick={() => handleOpenEdit(demanda)}
                      className="p-2.5 sm:p-3 rounded-lg border bg-card border-border/60 hover:border-emerald-300 cursor-pointer transition-all hover:shadow-md"
                    >
                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[8px] px-1 py-0 h-4">
                          <CheckCircle2 className="h-2 w-2 mr-0.5" />
                          {statusConfig.label}
                        </Badge>
                        {tipoAtoConfig && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-zinc-100 dark:bg-zinc-800">
                            {tipoAtoConfig.label}
                          </Badge>
                        )}
                      </div>
                      {/* Assistido */}
                      <p className="font-semibold text-xs sm:text-sm line-clamp-1 text-zinc-900 dark:text-zinc-100">{demanda.assistido}</p>
                      {/* Ato */}
                      <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1">{demanda.ato || "Sem ato"}</p>
                      {/* Processo */}
                      {demanda.processo && (
                        <p className="text-[9px] sm:text-[10px] text-zinc-500 dark:text-zinc-500 font-mono mt-1 truncate">
                          {demanda.processo}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Edição/Criação */}
      <DemandaModal
        demanda={selectedDemanda}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDemanda(null);
        }}
        onSave={handleSave}
        mode={modalMode}
        statusOptions={statusOptions}
        prisaoOptions={prisaoOptions}
        tipoAtoOptions={tipoAtoOptions}
        onAddStatusOption={() => setAddOptionModal({ isOpen: true, type: "status" })}
        onAddPrisaoOption={() => setAddOptionModal({ isOpen: true, type: "prisao" })}
        onAddAtoOption={() => setAddOptionModal({ isOpen: true, type: "ato" })}
      />

      {/* Modal de Adicionar Opção */}
      <AddOptionModal
        isOpen={addOptionModal.isOpen}
        onClose={() => setAddOptionModal({ ...addOptionModal, isOpen: false })}
        onAdd={handleAddOption}
        type={addOptionModal.type}
      />
    </div>
  );
}
