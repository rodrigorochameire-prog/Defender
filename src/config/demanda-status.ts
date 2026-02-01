import {
  AlertCircle,
  ClipboardList,
  FileSearch,
  User,
  Search,
  Eye,
  Edit,
  FileCheck,
  Send,
  Users,
  Inbox,
  FileText,
  CheckCircle2,
  FolderOpen,
  Scale,
  XCircle,
  Flame,
  Activity,
} from "lucide-react";

export type StatusGroup = 
  | "urgente" 
  | "preparacao" 
  | "delegacao" 
  | "monitoramento" 
  | "fila" 
  | "diligencias" 
  | "concluida";

export const STATUS_GROUPS = {
  urgente: {
    label: "Urgente",
    color: "#D4A4A4",  // Rosa/vermelho pastel
    icon: Flame,
  },
  preparacao: {
    label: "Preparação",
    color: "#E8C87A",  // Amarelo pastel suave
    icon: Activity,
  },
  delegacao: {
    label: "Delegação",
    color: "#D4A574",  // Âmbar/laranja pastel
    icon: Send,
  },
  monitoramento: {
    label: "Monitoramento",
    color: "#B8A4C9",  // Roxo pastel
    icon: Eye,
  },
  fila: {
    label: "Fila",
    color: "#A1A1AA",  // Cinza neutro
    icon: Inbox,
  },
  diligencias: {
    label: "Diligências",
    color: "#8DB4D2",  // Azul pastel
    icon: FileText,
  },
  concluida: {
    label: "Concluída",
    color: "#84CC9B",  // Verde pastel
    icon: CheckCircle2,
  },
} as const;

export const DEMANDA_STATUS = {
  // Urgente
  urgente: { label: "Urgente", group: "urgente" as StatusGroup, icon: AlertCircle },
  
  // Preparação
  relatorio: { label: "Relatório", group: "preparacao" as StatusGroup, icon: ClipboardList },
  analisar: { label: "Analisar", group: "preparacao" as StatusGroup, icon: FileSearch },
  atender: { label: "Atender", group: "preparacao" as StatusGroup, icon: User },
  buscar: { label: "Buscar", group: "preparacao" as StatusGroup, icon: Search },
  investigar: { label: "Investigar", group: "preparacao" as StatusGroup, icon: Eye },
  elaborar: { label: "Elaborar", group: "preparacao" as StatusGroup, icon: Edit },
  elaborando: { label: "Elaborando", group: "preparacao" as StatusGroup, icon: Edit },
  revisar: { label: "Revisar", group: "preparacao" as StatusGroup, icon: FileCheck },
  revisando: { label: "Revisando", group: "preparacao" as StatusGroup, icon: FileCheck },
  
  // Delegação
  protocolar: { label: "Protocolar", group: "delegacao" as StatusGroup, icon: Send },
  
  // Monitoramento
  amanda: { label: "Amanda", group: "monitoramento" as StatusGroup, icon: User },
  taissa: { label: "Taíssa", group: "monitoramento" as StatusGroup, icon: User },
  emilly: { label: "Emilly", group: "monitoramento" as StatusGroup, icon: User },
  monitorar: { label: "Monitorar", group: "monitoramento" as StatusGroup, icon: Eye },
  
  // Fila
  fila: { label: "Fila", group: "fila" as StatusGroup, icon: Inbox },
  
  // Diligências
  documentos: { label: "Documentos", group: "diligencias" as StatusGroup, icon: FileText },
  testemunhas: { label: "Testemunhas", group: "diligencias" as StatusGroup, icon: Users },
  
  // Concluída
  protocolado: { label: "Protocolado", group: "concluida" as StatusGroup, icon: CheckCircle2 },
  solar: { label: "Solar", group: "concluida" as StatusGroup, icon: FolderOpen },
  ciencia: { label: "Ciência", group: "concluida" as StatusGroup, icon: Eye },
  resolvido: { label: "Resolvido", group: "concluida" as StatusGroup, icon: CheckCircle2 },
  constituiu_advogado: { label: "Constituiu advogado", group: "concluida" as StatusGroup, icon: Scale },
  sem_atuacao: { label: "Sem atuação", group: "concluida" as StatusGroup, icon: XCircle },
} as const;

export function getStatusConfig(status: string) {
  // Validação para evitar erro quando status é undefined ou null
  if (!status) {
    return {
      label: "Pendente",
      group: "fila" as StatusGroup,
      icon: Inbox,
    };
  }
  
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return DEMANDA_STATUS[normalizedStatus as keyof typeof DEMANDA_STATUS] || {
    label: status,
    group: "fila" as StatusGroup,
    icon: Inbox,
  };
}