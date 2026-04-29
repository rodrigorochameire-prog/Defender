import {
  Users,
  MapPin,
  StickyNote,
  CheckSquare,
  Send,
  BookOpen,
  Pen,
  type LucideIcon,
} from "lucide-react";

export type TipoRegistro =
  | "atendimento"
  | "diligencia"
  | "anotacao"
  | "providencia"
  | "delegacao"
  | "pesquisa"
  | "elaboracao";

export interface TipoConfig {
  label: string;
  shortLabel: string;
  color: string; // hex pra style inline (ring-color etc)
  bg: string; // tw class — background do chip
  text: string; // tw class — texto do chip
  Icon: LucideIcon;
}

export const REGISTRO_TIPOS: Record<TipoRegistro, TipoConfig> = {
  atendimento: {
    label: "Atendimento",
    shortLabel: "Atend.",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    Icon: Users,
  },
  diligencia: {
    label: "Diligência",
    shortLabel: "Dilig.",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    Icon: MapPin,
  },
  anotacao: {
    label: "Anotação",
    shortLabel: "Anot.",
    color: "#64748b",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-700 dark:text-slate-400",
    Icon: StickyNote,
  },
  providencia: {
    label: "Providência",
    shortLabel: "Prov.",
    color: "#3b82f6",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    Icon: CheckSquare,
  },
  delegacao: {
    label: "Delegação",
    shortLabel: "Deleg.",
    color: "#a855f7",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    Icon: Send,
  },
  pesquisa: {
    label: "Pesquisa",
    shortLabel: "Pesq.",
    color: "#6366f1",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-400",
    Icon: BookOpen,
  },
  elaboracao: {
    label: "Elaboração",
    shortLabel: "Elab.",
    color: "#8b5cf6",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-400",
    Icon: Pen,
  },
};

export const TIPO_KEYS = Object.keys(REGISTRO_TIPOS) as TipoRegistro[];
