import React from "react";
import {
  Users,
  Gavel,
  AlertTriangle,
  Lock,
  Scale,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";

// Ícones para cada atribuição (Lucide icons)
export const ATRIBUICAO_ICONS: Record<string, React.ReactNode> = {
  all: React.createElement(Users, { className: "w-3.5 h-3.5" }),
  JURI: React.createElement(Gavel, { className: "w-3.5 h-3.5" }),
  VVD: React.createElement(AlertTriangle, { className: "w-3.5 h-3.5" }),
  EXECUCAO: React.createElement(Lock, { className: "w-3.5 h-3.5" }),
  CRIMINAL: React.createElement(Scale, { className: "w-3.5 h-3.5" }),
  SUBSTITUICAO: React.createElement(Scale, { className: "w-3.5 h-3.5" }),
  SUBSTITUICAO_CIVEL: React.createElement(FileText, { className: "w-3.5 h-3.5" }),
  CIVEL: React.createElement(FileText, { className: "w-3.5 h-3.5" }),
  CURADORIA: React.createElement(Users, { className: "w-3.5 h-3.5" }),
};

// Configurações de status
export const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 1 },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 7 },
};

// Fases NEUTRAS para reduzir poluição visual
export const faseConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  INQUERITO: { label: "Inquérito", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: FileText },
  INSTRUCAO: { label: "Instrução", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Scale },
  SUMARIO_CULPA: { label: "Sumário Culpa", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Gavel },
  ALEGACOES_FINAIS: { label: "Alegações Finais", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: FileText },
  SENTENCA: { label: "Sentença", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Gavel },
  RECURSO: { label: "Recurso", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Scale },
  EXECUCAO: { label: "Execução", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Clock },
  ARQUIVADO: { label: "Arquivado", color: "text-neutral-400 dark:text-neutral-500", bgColor: "bg-neutral-50 dark:bg-neutral-900", icon: CheckCircle2 },
};

// Áreas NEUTRAS para reduzir poluição visual
export const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Júri", labelFull: "Tribunal do Júri", color: "text-violet-600", bgColor: "bg-violet-50" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execução Penal", color: "text-blue-600", bgColor: "bg-blue-50" },
  VIOLENCIA_DOMESTICA: { label: "V.D.", labelFull: "Violência Doméstica", color: "text-pink-600", bgColor: "bg-pink-50" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituição", color: "text-orange-600", bgColor: "bg-orange-50" },
  FAMILIA: { label: "Fam", labelFull: "Família", color: "text-rose-600", bgColor: "bg-rose-50" },
};
