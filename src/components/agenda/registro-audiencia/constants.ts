import {
  FileText,
  FileStack,
  Gavel,
  X,
  CheckCircle2,
  BellRing,
  Users,
  UserCircle2,
  AlertTriangle,
} from "lucide-react";

// --- Resultado Options por Atribuição ---

export const resultadoOptionsPorAtribuicao: Record<string, Array<{ value: string; label: string; icon: any }>> = {
  "Tribunal do Júri": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Violência Doméstica": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Execução Penal": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
    { value: "deferido", label: "Pedido Deferido", icon: CheckCircle2 },
    { value: "indeferido", label: "Pedido Indeferido", icon: X },
  ],
  "Substituição": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Criminal Geral": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Curadoria": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
};

// --- Motivo de Não Realização ---

export const motivoNaoRealizacaoOptions = [
  { value: "reu-nao-intimado", label: "Réu Não Intimado", icon: BellRing },
  { value: "ausencia-testemunha", label: "Ausência de Testemunha", icon: Users },
  { value: "ausencia-promotor", label: "Ausência do Promotor", icon: UserCircle2 },
  { value: "ausencia-juiz", label: "Ausência do Juiz", icon: Gavel },
  { value: "problemas-tecnicos", label: "Problemas Técnicos", icon: AlertTriangle },
  { value: "outros", label: "Outros", icon: FileText },
];

// --- Tipo de Depoente ---

export interface TipoDepoenteConfig {
  value: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  borderCard: string;
  dotColor: string;
}

export const tipoDepoenteOptions: TipoDepoenteConfig[] = [
  {
    value: "testemunha",
    label: "Testemunha",
    color: "blue",
    bg: "bg-blue-50/40 dark:bg-blue-950/10",
    border: "border-blue-400 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-500",
    borderCard: "border-l-blue-400 dark:border-l-blue-600",
    dotColor: "bg-blue-500",
  },
  {
    value: "vitima",
    label: "Vítima",
    color: "red",
    bg: "bg-red-50/40 dark:bg-red-950/10",
    border: "border-red-400 dark:border-red-700",
    text: "text-red-700 dark:text-red-400",
    icon: "text-red-600 dark:text-red-500",
    borderCard: "border-l-red-400 dark:border-l-red-600",
    dotColor: "bg-red-500",
  },
  {
    value: "reu",
    label: "Réu/Acusado",
    color: "green",
    bg: "bg-green-50/40 dark:bg-green-950/10",
    border: "border-green-600 dark:border-green-800",
    text: "text-green-800 dark:text-green-400",
    icon: "text-green-700 dark:text-green-500",
    borderCard: "border-l-green-600 dark:border-l-green-700",
    dotColor: "bg-green-500",
  },
  {
    value: "perito",
    label: "Perito/Técnico",
    color: "orange",
    bg: "bg-orange-50/40 dark:bg-orange-950/10",
    border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-400",
    icon: "text-orange-600 dark:text-orange-500",
    borderCard: "border-l-orange-400 dark:border-l-orange-600",
    dotColor: "bg-orange-500",
  },
  {
    value: "informante",
    label: "Informante",
    color: "slate",
    bg: "bg-neutral-50/40 dark:bg-neutral-950/10",
    border: "border-neutral-400 dark:border-border",
    text: "text-neutral-700 dark:text-muted-foreground",
    icon: "text-neutral-600 dark:text-neutral-500",
    borderCard: "border-l-neutral-400 dark:border-l-neutral-600",
    dotColor: "bg-neutral-500",
  },
  {
    value: "policial",
    label: "Policial",
    color: "yellow",
    bg: "bg-yellow-50/40 dark:bg-yellow-950/10",
    border: "border-yellow-400 dark:border-yellow-700",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: "text-yellow-600 dark:text-yellow-500",
    borderCard: "border-l-yellow-400 dark:border-l-yellow-600",
    dotColor: "bg-yellow-500",
  },
];

export function getDepoenteStyle(tipo: string): TipoDepoenteConfig {
  return tipoDepoenteOptions.find((opt) => opt.value === tipo) || tipoDepoenteOptions[0];
}
