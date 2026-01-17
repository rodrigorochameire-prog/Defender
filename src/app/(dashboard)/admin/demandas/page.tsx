"use client";

import { useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";
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
  comarca?: string;
  vara?: string;
  reuPreso: boolean;
  defensor?: string;
  defensorId?: number;
  observacoes?: string;
  googleCalendarEventId?: string;
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

// Status disponíveis - Baseado na planilha VVD Júri (COMPLETO)
const STATUS_OPTIONS = [
  // Grupo 1 - Urgente (vermelho)
  { value: "1_URGENTE", label: "1 - Urgente", color: "bg-red-600", textColor: "text-red-700", description: "Prazo crítico/urgente" },
  // Grupo 2 - Trabalho pendente (amarelo)
  { value: "2_RELATORIO", label: "2 - Relatório", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Analisar/fazer relatório" },
  { value: "2_ANALISAR", label: "2 - Analisar", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Analisar processo" },
  { value: "2_ATENDER", label: "2 - Atender", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Atender assistido" },
  { value: "2_BUSCAR", label: "2 - Buscar", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Buscar informações" },
  { value: "2_INVESTIGAR", label: "2 - Investigar", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Investigar caso" },
  { value: "2_ELABORAR", label: "2 - Elaborar", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Elaborar peça" },
  { value: "2_ELABORANDO", label: "2 - Elaborando", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Em elaboração" },
  { value: "2_REVISAR", label: "2 - Revisar", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Revisar peça" },
  { value: "2_REVISANDO", label: "2 - Revisando", color: "bg-yellow-400", textColor: "text-yellow-700", description: "Em revisão" },
  // Grupo 3 - Protocolar (laranja)
  { value: "3_PROTOCOLAR", label: "3 - Protocolar", color: "bg-orange-500", textColor: "text-orange-700", description: "Pronto para protocolar" },
  // Grupo 4 - Pessoas/Monitorar (azul claro)
  { value: "4_AMANDA", label: "4 - Amanda", color: "bg-cyan-400", textColor: "text-cyan-700", description: "Com Amanda" },
  { value: "4_ESTAGIO_TARISSA", label: "4 - Estágio - Tarissa", color: "bg-cyan-400", textColor: "text-cyan-700", description: "Com Tarissa (estágio)" },
  { value: "4_EMILLY", label: "4 - Emilly", color: "bg-cyan-400", textColor: "text-cyan-700", description: "Com Emilly" },
  { value: "4_MONITORAR", label: "4 - Monitorar", color: "bg-cyan-400", textColor: "text-cyan-700", description: "Monitorando andamento" },
  // Grupo 5 - Fila (azul)
  { value: "5_FILA", label: "5 - Fila", color: "bg-blue-500", textColor: "text-blue-700", description: "Na fila de trabalho" },
  // Grupo 6 - Pendências externas (azul escuro)
  { value: "6_DOCUMENTOS", label: "6 - Documentos", color: "bg-blue-700", textColor: "text-blue-800", description: "Aguardando documentos" },
  { value: "6_TESTEMUNHAS", label: "6 - Testemunhas", color: "bg-blue-700", textColor: "text-blue-800", description: "Aguardando testemunhas" },
  // Grupo 7 - Concluído (verde)
  { value: "7_PROTOCOLADO", label: "7 - Protocolado", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Peça protocolada" },
  { value: "7_SIGAD", label: "7 - Sigad", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Registrado no Sigad" },
  { value: "7_CIENCIA", label: "7 - Ciência", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Ciência tomada" },
  { value: "7_RESOLVIDO", label: "7 - Resolvido", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Caso resolvido" },
  { value: "7_CONSTITUIU_ADVOGADO", label: "7 - Constituiu advogado", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Constituiu advogado particular" },
  { value: "7_SEM_ATUACAO", label: "7 - Sem atuação", color: "bg-emerald-500", textColor: "text-emerald-700", description: "Sem necessidade de atuação" },
];

// Situação Prisional / Unidades - Baseado na planilha VVD (COMPLETO)
const PRISAO_OPTIONS = [
  // Solto
  { value: "", label: "(Não informado)", color: "bg-slate-300" },
  { value: "SOLTO", label: "Solto", color: "bg-green-500" },
  // Bahia - Região Metropolitana
  { value: "CADEIA_PUBLICA", label: "Cadeia Pública", color: "bg-red-600" },
  { value: "CPMS", label: "CPMS - Simões Filho", color: "bg-red-600" },
  { value: "COP", label: "COP - Centro de Obs. Penal", color: "bg-red-700" },
  { value: "PRESIDIO_SSA", label: "Presídio Salvador", color: "bg-red-600" },
  { value: "PLB", label: "PLB - Lemos Brito", color: "bg-red-600" },
  // Bahia - Interior
  { value: "CP_FEIRA", label: "CP Feira de Santana", color: "bg-red-600" },
  { value: "CP_ITABUNA", label: "CP Itabuna", color: "bg-red-600" },
  { value: "CP_VC", label: "CP Vitória da Conquista", color: "bg-red-600" },
  { value: "CP_JEQUIE", label: "CP Jequié", color: "bg-red-600" },
  { value: "CP_ILHEUS", label: "CP Ilhéus", color: "bg-red-600" },
  { value: "CP_BARREIRAS", label: "CP Barreiras", color: "bg-red-600" },
  { value: "CP_JUAZEIRO", label: "CP Juazeiro", color: "bg-red-600" },
  { value: "CP_TEIXEIRA", label: "CP Teixeira de Freitas", color: "bg-red-600" },
  { value: "CP_EUNAPOLIS", label: "CP Eunápolis", color: "bg-red-600" },
  { value: "CP_VALENCA", label: "CP Valença", color: "bg-red-600" },
  { value: "CP_ALAGOINHAS", label: "CP Alagoinhas", color: "bg-red-600" },
  { value: "CP_SERRINHA", label: "CP Serrinha", color: "bg-red-600" },
  { value: "CP_IRECE", label: "CP Irecê", color: "bg-red-600" },
  // Outros estados
  { value: "CPT_IV_PINHEIROS_SP", label: "CPT IV Pinheiros-SP", color: "bg-purple-600" },
  { value: "CDP_BELEM_SP", label: "CDP Belém-SP", color: "bg-purple-600" },
  { value: "PSM_MACEIO", label: "PSM Maceió", color: "bg-purple-600" },
  { value: "SC_JARAGUA_SUL", label: "SC - Presídio Jaraguá do Sul", color: "bg-purple-600" },
  { value: "SP_PRESIDENTE_VENCESLAU", label: "SP - Presidente Venceslau II", color: "bg-purple-600" },
  { value: "MG_EXTREMA", label: "MG - Presídio de Extrema", color: "bg-purple-600" },
  // Especiais
  { value: "HOSPITAL_CUSTODIA", label: "Hospital de Custódia", color: "bg-amber-600" },
  { value: "DOMICILIAR", label: "Prisão Domiciliar", color: "bg-orange-500" },
  { value: "MONITORADO", label: "Monitoramento Eletrônico", color: "bg-amber-500" },
];

// Prioridades
const PRIORIDADE_OPTIONS = [
  { value: "REU_PRESO", label: "Réu Preso", color: "bg-red-700" },
  { value: "URGENTE", label: "Urgente", color: "bg-red-500" },
  { value: "ALTA", label: "Alta", color: "bg-orange-500" },
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    prisao: "",
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
    return { text: `${Math.abs(dias)}d atrasado`, className: "text-red-600 font-bold bg-red-50 dark:bg-red-950/50", icon: AlertTriangle, urgent: true };
  }
  if (isToday(prazo)) {
    return { text: "HOJE", className: "text-red-600 font-bold bg-red-50 dark:bg-red-950/50", icon: Timer, urgent: true };
  }
  if (isTomorrow(prazo)) {
    return { text: "Amanhã", className: "text-orange-600 font-semibold bg-orange-50 dark:bg-orange-950/50", icon: Clock, urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, className: "text-orange-500 bg-orange-50 dark:bg-orange-950/30", icon: Clock, urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: Calendar, urgent: false };
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
  mode = "edit"
}: { 
  demanda?: Demanda | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: Partial<Demanda>) => void;
  mode?: "create" | "edit";
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
      prisao: "",
      prioridade: "NORMAL",
      providencias: "",
      area: "JURI",
      comarca: "CANDEIAS",
      defensor: "",
      reuPreso: false,
      observacoes: "",
    }
  );

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
              <Select value={formData.tipoAto} onValueChange={(v) => setFormData({ ...formData, tipoAto: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_ATO_OPTIONS.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", status.color)} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
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
              <Select value={formData.prisao || ""} onValueChange={(v) => {
                setFormData({ 
                  ...formData, 
                  prisao: v,
                  reuPreso: v === "CADEIA_PUBLICA" || v === "COP" || v === "PENITENCIARIA"
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PRISAO_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value || "none"}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.color)} />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
              <Checkbox
                id="reuPreso"
                checked={formData.reuPreso}
                onCheckedChange={(checked) => setFormData({ ...formData, reuPreso: checked as boolean })}
              />
              <div className="flex-1">
                <Label htmlFor="reuPreso" className="text-red-700 dark:text-red-400 font-semibold cursor-pointer">
                  <Lock className="h-4 w-4 inline mr-2" />
                  Réu Preso
                </Label>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
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

// Componente Principal
export default function DemandasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");
  const [comarcaFilter, setComarcaFilter] = useState("all");
  const [defensorFilter, setDefensorFilter] = useState("all");
  const [reuPresoFilter, setReuPresoFilter] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState<"table" | "kanban" | "timeline">("table");
  const [sortField, setSortField] = useState<"prazo" | "assistido" | "area" | "status" | "comarca">("prazo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [demandas, setDemandas] = useState<Demanda[]>(mockDemandas);
  
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
      return matchesSearch && matchesStatus && matchesArea && matchesPrioridade && matchesComarca && matchesDefensor && matchesReuPreso;
    });

    // Ordenar
    result.sort((a, b) => {
      // Réu preso sempre primeiro
      if (a.reuPreso && !b.reuPreso) return -1;
      if (!a.reuPreso && b.reuPreso) return 1;

      let comparison = 0;
      switch (sortField) {
        case "prazo":
          comparison = new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
          break;
        case "assistido":
          comparison = a.assistido.localeCompare(b.assistido);
          break;
        case "area":
          comparison = a.area.localeCompare(b.area);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "comarca":
          comparison = (a.comarca || "").localeCompare(b.comarca || "");
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [demandas, searchTerm, statusFilter, areaFilter, prioridadeFilter, comarcaFilter, defensorFilter, reuPresoFilter, sortField, sortOrder]);

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
    reuPreso: demandas.filter(d => d.reuPreso || (d.prisao && d.prisao !== "SOLTO" && d.prisao !== "")).length,
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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="icon-primary">
            <FileText />
          </div>
          <div className="page-header-info">
            <h1>Demandas</h1>
            <p>Gestão de prazos e atos processuais</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Stats Cards - Baseado na planilha VVD */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-10">
        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("stat-card", stats.urgente > 0 && "border-red-500 bg-red-50 dark:bg-red-950/30")}>
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xl font-bold", stats.urgente > 0 && "text-red-600")}>{stats.urgente}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Urgente</p>
              </div>
              <AlertTriangle className={cn("h-4 w-4", stats.urgente > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card fatal">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-red-600">{stats.reuPreso}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Preso</p>
              </div>
              <Lock className="h-4 w-4 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-yellow-600">{stats.trabalho}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Trabalho</p>
              </div>
              <Edit className="h-4 w-4 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-orange-600">{stats.protocolar}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Protocolar</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-cyan-600">{stats.delegado}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Delegado</p>
              </div>
              <User className="h-4 w-4 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-blue-600">{stats.fila}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Fila</p>
              </div>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-blue-800">{stats.aguardando}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aguardando</p>
              </div>
              <Eye className="h-4 w-4 text-blue-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card success">
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-emerald-600">{stats.concluido}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Concluído</p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("stat-card", stats.vencidos > 0 && "fatal")}>
          <CardContent className="pt-3 pb-2 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xl font-bold", stats.vencidos > 0 && "text-red-600")}>{stats.vencidos}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vencidos</p>
              </div>
              <AlertTriangle className={cn("h-4 w-4", stats.vencidos > 0 ? "text-red-500" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar assistido, processo, ato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
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
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[130px]">
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
              <SelectTrigger className="w-[130px]">
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
              className="gap-1"
            >
              <Lock className="h-3 w-3" />
              Preso
            </Button>

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
                className="gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Controles de Visualização */}
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="table" className="gap-1">
                <List className="h-4 w-4" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold">Colunas Visíveis</div>
                <DropdownMenuSeparator />
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={value}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, [key]: checked })}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Visualização em Tabela */}
        <TabsContent value="table" className="mt-0">
          <Card className="section-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
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
                            "hover:bg-muted/30 transition-colors",
                            demanda.reuPreso && "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30",
                            prazoInfo.urgent && !demanda.reuPreso && "bg-orange-50/30 dark:bg-orange-950/10"
                          )}
                        >
                          {/* Ordem: Status, Prisão, Data, Assistido, Autos, Ato, Prazo, Providências */}
                          {visibleColumns.status && (
                            <TableCell>
                              <Select
                                value={demanda.status}
                                onValueChange={(v) => handleUpdateStatus(demanda.id, v)}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs">
                                  <StatusBadge status={demanda.status} />
                                </SelectTrigger>
                                <SelectContent>
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
                            </TableCell>
                          )}
                          {visibleColumns.prisao && (
                            <TableCell>
                              {demanda.prisao ? (
                                <Badge 
                                  className={cn(
                                    "text-[10px] font-medium",
                                    demanda.prisao === "CADEIA_PUBLICA" && "bg-red-600 text-white",
                                    demanda.prisao === "COP" && "bg-red-700 text-white",
                                    demanda.prisao === "PENITENCIARIA" && "bg-red-800 text-white",
                                    demanda.prisao === "SOLTO" && "bg-green-500 text-white",
                                    demanda.prisao === "DOMICILIAR" && "bg-orange-500 text-white",
                                    demanda.prisao === "MONITORADO" && "bg-amber-500 text-white",
                                  )}
                                >
                                  {PRISAO_OPTIONS.find(p => p.value === demanda.prisao)?.label || demanda.prisao}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.dataEntrada && (
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {demanda.dataEntrada ? format(parseISO(demanda.dataEntrada), "dd/MM/yy", { locale: ptBR }) : "-"}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.assistido && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(demanda.reuPreso || demanda.prisao === "CADEIA_PUBLICA" || demanda.prisao === "COP") && (
                                  <Lock className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                )}
                                <span className="font-medium text-sm">{demanda.assistido}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.processo && (
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">{demanda.processo || "-"}</span>
                            </TableCell>
                          )}
                          {visibleColumns.ato && (
                            <TableCell>
                              <span className="font-medium text-sm">{demanda.ato || "-"}</span>
                            </TableCell>
                          )}
                          {visibleColumns.prazo && (
                            <TableCell>
                              {demanda.prazo ? (
                                <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit", prazoInfo.className)}>
                                  <PrazoIcon className="h-3.5 w-3.5" />
                                  <span className="text-xs font-semibold">{prazoInfo.text}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.providencias && (
                            <TableCell className="min-w-[200px] max-w-[300px]">
                              <p className="text-xs text-muted-foreground line-clamp-2" title={demanda.providencias || ""}>
                                {demanda.providencias || "-"}
                              </p>
                            </TableCell>
                          )}
                          {visibleColumns.tipoAto && (
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {TIPO_ATO_OPTIONS.find(t => t.value === demanda.tipoAto)?.label || demanda.tipoAto}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.area && (
                            <TableCell><AreaBadge area={demanda.area} /></TableCell>
                          )}
                          {visibleColumns.comarca && (
                            <TableCell>
                              <span className="text-xs">
                                {COMARCA_OPTIONS.find(c => c.value === demanda.comarca)?.label || demanda.comarca || "-"}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.prioridade && (
                            <TableCell>
                              <PrioridadeBadge prioridade={demanda.prioridade} reuPreso={demanda.reuPreso} />
                            </TableCell>
                          )}
                          {visibleColumns.defensor && (
                            <TableCell>
                              <span className="text-sm">{demanda.defensor || "-"}</span>
                            </TableCell>
                          )}
                          {visibleColumns.dataIntimacao && (
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {demanda.dataIntimacao ? format(parseISO(demanda.dataIntimacao), "dd/MM", { locale: ptBR }) : "-"}
                              </span>
                            </TableCell>
                          )}
                          {visibleColumns.observacoes && (
                            <TableCell className="max-w-[150px]">
                              <p className="text-xs text-muted-foreground truncate" title={demanda.observacoes}>
                                {demanda.observacoes || "-"}
                              </p>
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
                  </TableBody>
                </Table>
              </div>

              {filteredDemandas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">Nenhuma demanda encontrada</p>
                  <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou adicione uma nova demanda</p>
                  <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Demanda
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contador de resultados */}
          {filteredDemandas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Mostrando <span className="font-semibold text-foreground">{filteredDemandas.length}</span> de{" "}
                <span className="font-semibold text-foreground">{demandas.length}</span> demandas
              </p>
              <p>
                <span className="font-semibold text-red-600">{stats.reuPreso}</span> réus presos •{" "}
                <span className="font-semibold text-orange-600">{stats.urgente + stats.hoje}</span> urgentes
              </p>
            </div>
          )}
        </TabsContent>

        {/* Visualização Kanban */}
        <TabsContent value="kanban" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Coluna Atender */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400">Atender</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    {demandas.filter(d => d.status === "2_ATENDER").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "2_ATENDER").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-red-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Em Fila */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">Em Fila</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {demandas.filter(d => d.status === "5_FILA" || d.status === "6_ELABORANDO").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "5_FILA" || d.status === "6_ELABORANDO").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-amber-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Monitorar */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">Monitorar</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {demandas.filter(d => d.status === "4_MONITORAR").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "4_MONITORAR").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-blue-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Protocolado */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Protocolado</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    {demandas.filter(d => d.status === "7_PROTOCOLADO" || d.status === "7_CIENCIA").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "7_PROTOCOLADO" || d.status === "7_CIENCIA").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className="p-3 rounded-xl border bg-card border-border hover:border-emerald-300 cursor-pointer transition-all hover:shadow-md"
                  >
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge className="bg-emerald-500 text-white text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                        Concluído
                      </Badge>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
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
      />
    </div>
  );
}
