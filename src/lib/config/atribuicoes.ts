/**
 * Configuração Centralizada de Atribuições da Defensoria
 * 
 * Cores padrão:
 * - Violência Doméstica (VVD): Amarelo (amber)
 * - Tribunal do Júri (JURI): Verde (emerald)
 * - Execução Penal (EXECUCAO): Azul (blue)
 * - Substituição Criminal (SUBSTITUICAO): Vermelho (rose)
 * - Substituição Não Penal (CIVEL): Laranja (orange)
 * - Grupo Especial do Júri: Verde escuro (teal)
 */

import {
  Gavel,
  Shield,
  Lock,
  Scale,
  Briefcase,
  Users,
  Calendar as CalendarIcon,
  Home,
  RefreshCw,
} from "lucide-react";

// Tipos
export interface AtribuicaoColorConfig {
  border: string;
  bg: string;
  bgSolid: string;
  text: string;
  textMuted: string;
  hoverBg: string;
  indicator: string;
  ring: string;
  dot: string;
  label: string;
  shortLabel: string;
  iconName: string;
  color: string; // Cor sólida hexadecimal para uso em estilos inline
}

// Cores base por atribuição
export const ATRIBUICAO_COLORS = {
  // Todos / Geral
  all: {
    border: "border-l-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-800/50",
    bgSolid: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    textMuted: "text-zinc-500 dark:text-zinc-400",
    hoverBg: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    indicator: "bg-zinc-500",
    ring: "ring-zinc-500/20",
    dot: "bg-zinc-500",
    label: "Todos",
    shortLabel: "Todos",
    iconName: "Calendar",
    color: "#71717a", // zinc-500
  },

  // Violência Doméstica - AMARELO
  VVD: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    bgSolid: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    textMuted: "text-amber-600/70 dark:text-amber-400/70",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    indicator: "bg-amber-500",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    label: "Violência Doméstica",
    shortLabel: "VVD",
    iconName: "Shield",
    color: "#f59e0b", // amber-500
  },
  "Violência Doméstica": {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    bgSolid: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    textMuted: "text-amber-600/70 dark:text-amber-400/70",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    indicator: "bg-amber-500",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    label: "Violência Doméstica",
    shortLabel: "VVD",
    iconName: "Shield",
  },
  VVD_CAMACARI: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    bgSolid: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    textMuted: "text-amber-600/70 dark:text-amber-400/70",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    indicator: "bg-amber-500",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    label: "Violência Doméstica",
    shortLabel: "VVD",
    iconName: "Shield",
  },
  VIOLENCIA_DOMESTICA: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    bgSolid: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    textMuted: "text-amber-600/70 dark:text-amber-400/70",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20",
    indicator: "bg-amber-500",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    label: "Violência Doméstica",
    shortLabel: "VVD",
    iconName: "Shield",
  },

  // Tribunal do Júri - VERDE
  JURI: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-900/10",
    bgSolid: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    textMuted: "text-emerald-600/70 dark:text-emerald-400/70",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Tribunal do Júri",
    shortLabel: "Júri",
    iconName: "Gavel",
  },
  JURI_CAMACARI: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-900/10",
    bgSolid: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    textMuted: "text-emerald-600/70 dark:text-emerald-400/70",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Tribunal do Júri",
    shortLabel: "Júri",
    iconName: "Gavel",
  },
  "Tribunal do Júri": {
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-900/10",
    bgSolid: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    textMuted: "text-emerald-600/70 dark:text-emerald-400/70",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
    indicator: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Tribunal do Júri",
    shortLabel: "Júri",
    iconName: "Gavel",
  },
  "Grupo Especial do Júri": {
    border: "border-l-teal-500",
    bg: "bg-teal-50/50 dark:bg-teal-900/10",
    bgSolid: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-400",
    textMuted: "text-teal-600/70 dark:text-teal-400/70",
    hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-900/20",
    indicator: "bg-teal-500",
    ring: "ring-teal-500/20",
    dot: "bg-teal-500",
    label: "Grupo Especial do Júri",
    shortLabel: "G. Júri",
    iconName: "Gavel",
  },
  GRUPO_JURI: {
    border: "border-l-teal-500",
    bg: "bg-teal-50/50 dark:bg-teal-900/10",
    bgSolid: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-400",
    textMuted: "text-teal-600/70 dark:text-teal-400/70",
    hoverBg: "hover:bg-teal-50 dark:hover:bg-teal-900/20",
    indicator: "bg-teal-500",
    ring: "ring-teal-500/20",
    dot: "bg-teal-500",
    label: "Grupo Especial do Júri",
    shortLabel: "G. Júri",
    iconName: "Gavel",
  },

  // Execução Penal - AZUL
  EXECUCAO: {
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    bgSolid: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    textMuted: "text-blue-600/70 dark:text-blue-400/70",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-500",
    ring: "ring-blue-500/20",
    dot: "bg-blue-500",
    label: "Execução Penal",
    shortLabel: "Exec.",
    iconName: "Lock",
  },
  EXECUCAO_PENAL: {
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    bgSolid: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    textMuted: "text-blue-600/70 dark:text-blue-400/70",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-500",
    ring: "ring-blue-500/20",
    dot: "bg-blue-500",
    label: "Execução Penal",
    shortLabel: "Exec.",
    iconName: "Lock",
  },
  "Execução Penal": {
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    bgSolid: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    textMuted: "text-blue-600/70 dark:text-blue-400/70",
    hoverBg: "hover:bg-blue-50 dark:hover:bg-blue-900/20",
    indicator: "bg-blue-500",
    ring: "ring-blue-500/20",
    dot: "bg-blue-500",
    label: "Execução Penal",
    shortLabel: "Exec.",
    iconName: "Lock",
  },

  // Substituição Criminal - VERMELHO
  SUBSTITUICAO: {
    border: "border-l-rose-500",
    bg: "bg-rose-50/50 dark:bg-rose-900/10",
    bgSolid: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    textMuted: "text-rose-600/70 dark:text-rose-400/70",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-500",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    label: "Substituição Criminal",
    shortLabel: "Subst.",
    iconName: "RefreshCw",
  },
  CRIMINAL: {
    border: "border-l-rose-500",
    bg: "bg-rose-50/50 dark:bg-rose-900/10",
    bgSolid: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    textMuted: "text-rose-600/70 dark:text-rose-400/70",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-500",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    label: "Criminal Geral",
    shortLabel: "Crim.",
    iconName: "Scale",
  },
  "Criminal Geral": {
    border: "border-l-rose-500",
    bg: "bg-rose-50/50 dark:bg-rose-900/10",
    bgSolid: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    textMuted: "text-rose-600/70 dark:text-rose-400/70",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-500",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    label: "Criminal Geral",
    shortLabel: "Crim.",
    iconName: "Scale",
  },
  Substituição: {
    border: "border-l-rose-500",
    bg: "bg-rose-50/50 dark:bg-rose-900/10",
    bgSolid: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    textMuted: "text-rose-600/70 dark:text-rose-400/70",
    hoverBg: "hover:bg-rose-50 dark:hover:bg-rose-900/20",
    indicator: "bg-rose-500",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    label: "Substituição Criminal",
    shortLabel: "Subst.",
    iconName: "RefreshCw",
  },

  // Substituição Não Penal (Cível) - LARANJA
  SUBSTITUICAO_CIVEL: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-900/10",
    bgSolid: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    textMuted: "text-orange-600/70 dark:text-orange-400/70",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    indicator: "bg-orange-500",
    ring: "ring-orange-500/20",
    dot: "bg-orange-500",
    label: "Substituição Não Penal",
    shortLabel: "S. Cível",
    iconName: "Briefcase",
  },
  CIVEL: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-900/10",
    bgSolid: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    textMuted: "text-orange-600/70 dark:text-orange-400/70",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    indicator: "bg-orange-500",
    ring: "ring-orange-500/20",
    dot: "bg-orange-500",
    label: "Cível",
    shortLabel: "Cível",
    iconName: "Briefcase",
  },
  FAMILIA: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-900/10",
    bgSolid: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    textMuted: "text-orange-600/70 dark:text-orange-400/70",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    indicator: "bg-orange-500",
    ring: "ring-orange-500/20",
    dot: "bg-orange-500",
    label: "Família",
    shortLabel: "Fam.",
    iconName: "Users",
  },
  FAZENDA_PUBLICA: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-900/10",
    bgSolid: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    textMuted: "text-orange-600/70 dark:text-orange-400/70",
    hoverBg: "hover:bg-orange-50 dark:hover:bg-orange-900/20",
    indicator: "bg-orange-500",
    ring: "ring-orange-500/20",
    dot: "bg-orange-500",
    label: "Fazenda Pública",
    shortLabel: "Faz. Púb.",
    iconName: "Briefcase",
  },

  // Curadoria Especial - ROXO
  CURADORIA: {
    border: "border-l-purple-500",
    bg: "bg-purple-50/50 dark:bg-purple-900/10",
    bgSolid: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    textMuted: "text-purple-600/70 dark:text-purple-400/70",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    indicator: "bg-purple-500",
    ring: "ring-purple-500/20",
    dot: "bg-purple-500",
    label: "Curadoria Especial",
    shortLabel: "Curad.",
    iconName: "Shield",
  },
  "Curadoria Especial": {
    border: "border-l-purple-500",
    bg: "bg-purple-50/50 dark:bg-purple-900/10",
    bgSolid: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    textMuted: "text-purple-600/70 dark:text-purple-400/70",
    hoverBg: "hover:bg-purple-50 dark:hover:bg-purple-900/20",
    indicator: "bg-purple-500",
    ring: "ring-purple-500/20",
    dot: "bg-purple-500",
    label: "Curadoria Especial",
    shortLabel: "Curad.",
    iconName: "Shield",
  },
} as const;

// Mapeamento de cores sólidas por atribuição (para estilos inline)
export const SOLID_COLOR_MAP: Record<string, string> = {
  all: "#71717a",           // zinc-500
  VVD: "#f59e0b",           // amber-500
  "Violência Doméstica": "#f59e0b",
  VVD_CAMACARI: "#f59e0b",
  VIOLENCIA_DOMESTICA: "#f59e0b",
  JURI: "#10b981",          // emerald-500
  "Tribunal do Júri": "#10b981",
  JURI_CAMACARI: "#10b981",
  "Grupo Especial do Júri": "#14b8a6", // teal-500
  GRUPO_JURI: "#14b8a6",
  EXECUCAO: "#3b82f6",      // blue-500
  EXECUCAO_PENAL: "#3b82f6",
  "Execução Penal": "#3b82f6",
  SUBSTITUICAO: "#f43f5e",  // rose-500
  CRIMINAL: "#f43f5e",
  "Criminal Geral": "#f43f5e",
  Substituição: "#f43f5e",
  SUBSTITUICAO_CIVEL: "#f97316", // orange-500
  CIVEL: "#f97316",
  FAMILIA: "#f97316",
  FAZENDA_PUBLICA: "#f97316",
  CURADORIA: "#8b5cf6",     // violet-500
  "Curadoria Especial": "#8b5cf6",
};

// Função helper para obter cores de uma atribuição
export function getAtribuicaoColors(atribuicao: string | undefined | null) {
  if (!atribuicao) {
    return { ...ATRIBUICAO_COLORS.all, color: SOLID_COLOR_MAP.all };
  }
  const config = ATRIBUICAO_COLORS[atribuicao as keyof typeof ATRIBUICAO_COLORS] || ATRIBUICAO_COLORS.all;
  const color = SOLID_COLOR_MAP[atribuicao] || SOLID_COLOR_MAP.all;
  return { ...config, color };
}

// Lista de opções para filtros
export const ATRIBUICAO_OPTIONS = [
  { value: "all", label: "Todos", shortLabel: "Todos" },
  { value: "VVD", label: "Violência Doméstica", shortLabel: "VVD" },
  { value: "JURI", label: "Tribunal do Júri", shortLabel: "Júri" },
  { value: "EXECUCAO", label: "Execução Penal", shortLabel: "Exec." },
  { value: "SUBSTITUICAO", label: "Substituição Criminal", shortLabel: "Subst." },
  { value: "SUBSTITUICAO_CIVEL", label: "Substituição Não Penal", shortLabel: "S. Cível" },
  { value: "CURADORIA", label: "Curadoria Especial", shortLabel: "Curad." },
];

// Mapeamento de ícones por nome (para uso sem JSX)
export const ATRIBUICAO_ICONS = {
  Calendar: CalendarIcon,
  Gavel: Gavel,
  Shield: Shield,
  Lock: Lock,
  Scale: Scale,
  Briefcase: Briefcase,
  Users: Users,
  RefreshCw: RefreshCw,
  Home: Home,
};

// Função para obter ícone de uma atribuição
export function getAtribuicaoIcon(atribuicao: string | undefined | null) {
  const colors = getAtribuicaoColors(atribuicao);
  return ATRIBUICAO_ICONS[colors.iconName as keyof typeof ATRIBUICAO_ICONS] || CalendarIcon;
}

// Mapeamento de valores do banco para valores de filtro normalizados
const AREA_TO_FILTER_MAP: Record<string, string> = {
  // Violência Doméstica
  VIOLENCIA_DOMESTICA: "VVD",
  VVD_CAMACARI: "VVD",
  VVD: "VVD",
  "Violência Doméstica": "VVD",
  
  // Tribunal do Júri
  JURI: "JURI",
  JURI_CAMACARI: "JURI",
  "Tribunal do Júri": "JURI",
  GRUPO_JURI: "JURI",
  "Grupo Especial do Júri": "JURI",
  
  // Execução Penal
  EXECUCAO: "EXECUCAO",
  EXECUCAO_PENAL: "EXECUCAO",
  "Execução Penal": "EXECUCAO",
  
  // Substituição Criminal
  SUBSTITUICAO: "SUBSTITUICAO",
  CRIMINAL: "SUBSTITUICAO",
  "Criminal Geral": "SUBSTITUICAO",
  Substituição: "SUBSTITUICAO",
  
  // Substituição Não Penal / Cível
  SUBSTITUICAO_CIVEL: "SUBSTITUICAO_CIVEL",
  CIVEL: "SUBSTITUICAO_CIVEL",
  FAMILIA: "SUBSTITUICAO_CIVEL",
  FAZENDA_PUBLICA: "SUBSTITUICAO_CIVEL",
  
  // Curadoria
  CURADORIA: "CURADORIA",
  "Curadoria Especial": "CURADORIA",
};

// Função para normalizar valores de área para o formato de filtro
export function normalizeAreaToFilter(area: string | undefined | null): string {
  if (!area) return "all";
  return AREA_TO_FILTER_MAP[area] || "all";
}

// Função para verificar se uma área corresponde a um filtro
export function areaMatchesFilter(area: string | undefined | null, filter: string): boolean {
  if (filter === "all") return true;
  const normalizedArea = normalizeAreaToFilter(area);
  return normalizedArea === filter;
}
