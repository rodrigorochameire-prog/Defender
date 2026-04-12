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

// Icones para cada atribuicao (Lucide icons)
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

// Configuracoes de status
export const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Publica", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 1 },
  PENITENCIARIA: { label: "Penitenciaria", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custodia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-zinc-800 dark:bg-zinc-700", priority: 7 },
};

// Fases NEUTRAS para reduzir poluicao visual
export const faseConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  INQUERITO: { label: "Inquerito", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: FileText },
  INSTRUCAO: { label: "Instrucao", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Scale },
  SUMARIO_CULPA: { label: "Sumario Culpa", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Gavel },
  ALEGACOES_FINAIS: { label: "Alegacoes Finais", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: FileText },
  SENTENCA: { label: "Sentenca", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Gavel },
  RECURSO: { label: "Recurso", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Scale },
  EXECUCAO: { label: "Execucao", color: "text-neutral-600 dark:text-neutral-400", bgColor: "bg-neutral-100 dark:bg-neutral-800", icon: Clock },
  ARQUIVADO: { label: "Arquivado", color: "text-neutral-400 dark:text-neutral-500", bgColor: "bg-neutral-50 dark:bg-neutral-900", icon: CheckCircle2 },
};

// Areas NEUTRAS para reduzir poluicao visual
export const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Juri", labelFull: "Tribunal do Juri", color: "text-violet-600", bgColor: "bg-violet-50" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execucao Penal", color: "text-blue-600", bgColor: "bg-blue-50" },
  VIOLENCIA_DOMESTICA: { label: "V.D.", labelFull: "Violencia Domestica", color: "text-pink-600", bgColor: "bg-pink-50" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituicao", color: "text-orange-600", bgColor: "bg-orange-50" },
  FAMILIA: { label: "Fam", labelFull: "Familia", color: "text-rose-600", bgColor: "bg-rose-50" },
};
