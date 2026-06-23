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
import { STATUS_PRISIONAL_CONFIG } from "@/lib/config/tipologia/status-prisional";

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

// Configurações de status prisional — derivadas da tipologia central
// (fonte única). Usa o rótulo abreviado (pills compactos) e os campos de card.
export const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> =
  Object.fromEntries(
    Object.entries(STATUS_PRISIONAL_CONFIG).map(([k, v]) => [
      k,
      {
        label: v.labelShort,
        color: v.color,
        bgColor: v.bgColor,
        borderColor: v.borderColor,
        iconBg: v.iconBg,
        priority: v.priority,
      },
    ]),
  );

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
